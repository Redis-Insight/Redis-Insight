import {
  HttpException, Injectable, InternalServerErrorException, Logger,
} from '@nestjs/common';
import { get, isArray, set } from 'lodash';
import { Database } from 'src/modules/database/models/database';
import { plainToClass } from 'class-transformer';
import { ConnectionType, Compressor } from 'src/modules/database/entities/database.entity';
import { DatabaseRepository } from 'src/modules/database/repositories/database.repository';
import {
  DatabaseImportResponse,
  DatabaseImportResult,
  DatabaseImportStatus,
} from 'src/modules/database-import/dto/database-import.response';
import { ValidationError, Validator } from 'class-validator';
import { ImportDatabaseDto } from 'src/modules/database-import/dto/import.database.dto';
import { classToClass } from 'src/utils';
import { DatabaseImportAnalytics } from 'src/modules/database-import/database-import.analytics';
import {
  NoDatabaseImportFileProvidedException,
  SizeLimitExceededDatabaseImportFileException,
  UnableToParseDatabaseImportFileException,
  InvalidCompressorException,
} from 'src/modules/database-import/exceptions';
import { ValidationException } from 'src/common/exceptions';
import { CertificateImportService } from 'src/modules/database-import/certificate-import.service';
import { SshImportService } from 'src/modules/database-import/ssh-import.service';
import { SessionMetadata } from 'src/common/models';

@Injectable()
export class DatabaseImportService {
  private logger = new Logger('DatabaseImportService');

  private validator = new Validator();

  private fieldsMapSchema: Array<[string, string[]]> = [
    ['name', ['name', 'connectionName']],
    ['username', ['username']],
    ['password', ['password', 'auth']],
    ['host', ['host']],
    ['port', ['port']],
    ['db', ['db']],
    ['provider', ['provider']],
    ['isCluster', ['cluster']],
    ['type', ['type']],
    ['connectionType', ['connectionType']],
    ['tls', ['tls', 'ssl']],
    ['tlsServername', ['tlsServername']],
    ['tlsCaName', ['caCert.name']],
    ['tlsCaCert', ['caCert.certificate', 'caCert', 'sslOptions.ca', 'ssl_ca_cert_path']],
    ['tlsClientName', ['clientCert.name']],
    ['tlsClientCert', ['clientCert.certificate', 'certificate', 'sslOptions.cert', 'ssl_local_cert_path']],
    ['tlsClientKey', ['clientCert.key', 'keyFile', 'sslOptions.key', 'ssl_private_key_path']],
    ['sentinelMasterName', ['sentinelMaster.name', 'sentinelOptions.masterName', 'sentinelOptions.name']],
    ['sentinelMasterUsername', ['sentinelMaster.username']],
    ['sentinelMasterPassword', [
      'sentinelMaster.password', 'sentinelOptions.nodePassword', 'sentinelOptions.sentinelPassword',
    ]],
    ['sshHost', ['sshOptions.host', 'ssh_host', 'sshHost']],
    ['sshPort', ['sshOptions.port', 'ssh_port', 'sshPort']],
    ['sshUsername', ['sshOptions.username', 'ssh_user', 'sshUser']],
    ['sshPassword', ['sshOptions.password', 'ssh_password', 'sshPassword']],
    ['sshPrivateKey', ['sshOptions.privateKey', 'sshOptions.privatekey', 'ssh_private_key_path', 'sshKeyFile']],
    ['sshPassphrase', ['sshOptions.passphrase', 'sshKeyPassphrase']],
    ['sshAgentPath', ['ssh_agent_path']],
    ['compressor', ['compressor']],
    ['modules', ['modules']],
  ];

  constructor(
    private readonly certificateImportService: CertificateImportService,
    private readonly sshImportService: SshImportService,
    private readonly databaseRepository: DatabaseRepository,
    private readonly analytics: DatabaseImportAnalytics,
  ) {}

  /**
   * Import databases from the file
   * @param sessionMetadata
   * @param file
   */
  public async import(sessionMetadata: SessionMetadata, file): Promise<DatabaseImportResponse> {
    try {
      // todo: create FileValidation class
      if (!file) {
        throw new NoDatabaseImportFileProvidedException('No import file provided');
      }
      if (file?.size > 1024 * 1024 * 10) {
        throw new SizeLimitExceededDatabaseImportFileException('Import file is too big. Maximum 10mb allowed');
      }

      const items = DatabaseImportService.parseFile(file);

      if (!isArray(items) || !items?.length) {
        let filename = file?.originalname || 'import file';
        if (filename.length > 50) {
          filename = `${filename.slice(0, 50)}...`;
        }
        throw new UnableToParseDatabaseImportFileException(`Unable to parse ${filename}`);
      }

      let response = {
        total: items.length,
        success: [],
        partial: [],
        fail: [],
      };

      // it is very important to insert databases on-by-one to avoid db constraint errors
      await items.reduce((prev, item, index) => prev.finally(() => this.createDatabase(sessionMetadata, item, index)
        .then((result) => {
          switch (result.status) {
            case DatabaseImportStatus.Fail:
              response.fail.push(result);
              break;
            case DatabaseImportStatus.Partial:
              response.partial.push(result);
              break;
            case DatabaseImportStatus.Success:
              response.success.push(result);
              break;
            default:
                // do not include into repost, since some unexpected behaviour
          }
        })), Promise.resolve());

      response = plainToClass(DatabaseImportResponse, response);

      this.analytics.sendImportResults(response);

      return response;
    } catch (e) {
      this.logger.warn(`Unable to import databases: ${e?.constructor?.name || 'UncaughtError'}`, e);

      this.analytics.sendImportFailed(e);

      throw e;
    }
  }

  /**
   * Map data to known model, validate it and create database if possible
   * Note: will not create connection, simply create database
   * @parama sessionMetadata
   * @param item
   * @param index
   * @private
   */
  private async createDatabase(
    sessionMetadata: SessionMetadata,
    item: any,
    index: number,
  ): Promise<DatabaseImportResult> {
    try {
      let status = DatabaseImportStatus.Success;
      const errors = [];
      const data: any = {};

      // set this is a new connection
      data.new = true;

      this.fieldsMapSchema.forEach(([field, paths]) => {
        let value;
        paths.every((path) => {
          value = get(item, path);
          return value === undefined;
        });

        set(data, field, value);
      });

      // set database name if needed
      if (!data.name) {
        data.name = `${data.host}:${data.port}`;
      }

      data.connectionType = DatabaseImportService.determineConnectionType(data);

      if (data?.sentinelMasterName) {
        data.sentinelMaster = {
          name: data.sentinelMasterName,
          username: data.sentinelMasterUsername || undefined,
          password: data.sentinelMasterPassword,
        };
        data.nodes = [{
          host: data.host,
          port: parseInt(data.port, 10),
        }];
      }

      if (data?.sshHost || data?.sshAgentPath) {
        data.ssh = true;
        try {
          data.sshOptions = await this.sshImportService.processSshOptions(data);
        } catch (e) {
          status = DatabaseImportStatus.Partial;
          data.ssh = false;
          errors.push(e);
        }
      }

      if (data?.tlsCaCert) {
        try {
          data.tls = true;
          data.caCert = await this.certificateImportService.processCaCertificate({
            certificate: data.tlsCaCert,
            name: data?.tlsCaName,
          });
        } catch (e) {
          status = DatabaseImportStatus.Partial;
          errors.push(e);
        }
      }

      if (data?.tlsClientCert || data?.tlsClientKey) {
        try {
          data.tls = true;
          data.clientCert = await this.certificateImportService.processClientCertificate({
            certificate: data.tlsClientCert,
            key: data.tlsClientKey,
            name: data?.tlsClientName,
          });
        } catch (e) {
          status = DatabaseImportStatus.Partial;
          errors.push(e);
        }
      }

      if (data?.compressor && !(data.compressor in Compressor)) {
        status = DatabaseImportStatus.Partial;
        data.compressor = Compressor.NONE;
        errors.push(new InvalidCompressorException());
      }

      const dto = plainToClass(
        ImportDatabaseDto,
        // additionally replace empty strings ("") with null
        Object.keys(data)
          .reduce((acc, key) => {
            acc[key] = data[key] === '' ? null : data[key];
            return acc;
          }, {}),
        {
          groups: ['security'],
        },
      );

      await this.validator.validateOrReject(dto, {
        whitelist: true,
      });

      const database = classToClass(Database, dto);

      await this.databaseRepository.create(sessionMetadata, database, false);

      return {
        index,
        status,
        host: database.host,
        port: database.port,
        errors: errors?.length ? errors : undefined,
      };
    } catch (e) {
      let errors = [e];
      if (isArray(e)) {
        errors = e;
      }

      errors = errors.map((error) => {
        if (error instanceof ValidationError) {
          const messages = Object.values(error?.constraints || {});
          return new ValidationException(messages[messages.length - 1] || 'Bad request');
        }

        if (!(error instanceof HttpException)) {
          return new InternalServerErrorException(error?.message);
        }

        return error;
      });

      this.logger.warn(`Unable to import database: ${errors[0]?.constructor?.name || 'UncaughtError'}`, errors[0]);

      return {
        index,
        status: DatabaseImportStatus.Fail,
        host: item?.host,
        port: item?.port,
        errors,
      };
    }
  }

  /**
   * Try to determine connection type based on input data
   * Should return NOT_CONNECTED when it is not possible
   * @param data
   */
  static determineConnectionType(data: any = {}): ConnectionType {
    if (data?.connectionType) {
      return (data.connectionType in ConnectionType)
        ? ConnectionType[data.connectionType]
        : ConnectionType.NOT_CONNECTED;
    }

    if (data?.type) {
      switch (data.type) {
        case 'cluster':
          return ConnectionType.CLUSTER;
        case 'sentinel':
          return ConnectionType.SENTINEL;
        case 'standalone':
          return ConnectionType.STANDALONE;
        default:
          return ConnectionType.NOT_CONNECTED;
      }
    }

    if (data?.isCluster === true) {
      return ConnectionType.CLUSTER;
    }

    if (data?.sentinelMasterName) {
      return ConnectionType.SENTINEL;
    }

    return ConnectionType.NOT_CONNECTED;
  }

  /**
   * Try to parse file based on mimetype and known\supported formats
   * @param file
   */
  static parseFile(file): any {
    const data = file?.buffer?.toString();

    let databases = DatabaseImportService.parseJson(data);

    if (!databases) {
      databases = DatabaseImportService.parseBase64(data);
    }

    return databases;
  }

  static parseBase64(data: string): any {
    try {
      return JSON.parse((Buffer.from(data, 'base64')).toString('utf8'));
    } catch (e) {
      return null;
    }
  }

  static parseJson(data: string): any {
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }
}
