import {
  Injectable, Logger, NotImplementedException, OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { merge } from 'lodash';
import { Repository } from 'typeorm';
import { SessionMetadata } from 'src/common/models';
import { CaCertificateRepository } from 'src/modules/certificate/repositories/ca-certificate.repository';
import { ClientCertificateRepository } from 'src/modules/certificate/repositories/client-certificate.repository';
import { ConstantsProvider } from 'src/modules/constants/providers/constants.provider';
import { ConnectionType, DatabaseEntity } from 'src/modules/database/entities/database.entity';
import { Database } from 'src/modules/database/models/database';
import { LocalDatabaseRepository } from 'src/modules/database/repositories/local.database.repository';
import { EncryptionService } from 'src/modules/encryption/encryption.service';
import { SshOptionsEntity } from 'src/modules/ssh/entities/ssh-options.entity';
import config from 'src/utils/config';

const REDIS_STACK_CONFIG = config.get('redisStack');

@Injectable()
export class StackDatabasesRepository extends LocalDatabaseRepository implements OnApplicationBootstrap {
  protected logger = new Logger('StackDatabasesRepository');

  constructor(
    @InjectRepository(DatabaseEntity)
    protected readonly repository: Repository<DatabaseEntity>,
    @InjectRepository(SshOptionsEntity)
    protected readonly sshOptionsRepository: Repository<SshOptionsEntity>,
    protected readonly caCertificateRepository: CaCertificateRepository,
    protected readonly clientCertificateRepository: ClientCertificateRepository,
    protected readonly encryptionService: EncryptionService,
    protected readonly constantsProvider: ConstantsProvider,
  ) {
    super(repository, sshOptionsRepository, caCertificateRepository, clientCertificateRepository, encryptionService);
  }

  async onApplicationBootstrap() {
    const sessionMetadata = this.constantsProvider.getSystemSessionMetadata(); // TODO: [USER_CONTEXT]
    await this.setPredefinedDatabase(
      sessionMetadata,
      merge({
        name: 'Redis Stack',
        host: 'localhost',
        port: '6379',
      }, REDIS_STACK_CONFIG),
    );
  }

  /**
   * @inheritDoc
   */
  async exists(sessionMetadata: SessionMetadata): Promise<boolean> {
    return super.exists(sessionMetadata, REDIS_STACK_CONFIG.id);
  }

  /**
   * @inheritDoc
   */
  async get(
    sessionMetadata: SessionMetadata,
    id: string,
    ignoreEncryptionErrors: boolean = false,
    omitFields: string[] = [],
  ): Promise<Database> {
    return super.get(sessionMetadata, REDIS_STACK_CONFIG.id, ignoreEncryptionErrors, omitFields);
  }

  /**
   * @inheritDoc
   */
  async list(sessionMetadata: SessionMetadata): Promise<Database[]> {
    return [await this.get(sessionMetadata, REDIS_STACK_CONFIG.id)];
  }

  /**
   * @inheritDoc
   */
  async create() {
    return Promise.reject(new NotImplementedException('This functionality is not supported'));
  }

  /**
   * @inheritDoc
   */
  async update(sessionMetadata: SessionMetadata, id: string, data: Database) {
    return super.update(sessionMetadata, REDIS_STACK_CONFIG.id, data);
  }

  /**
   * Create database entity for Stack
   *
   * @param options
   */
  private async setPredefinedDatabase(
    sessionMetadata: SessionMetadata,
    options: { id: string; name: string; host: string; port: string; },
  ): Promise<void> {
    try {
      const {
        id, name, host, port,
      } = options;
      const isExist = await this.exists(sessionMetadata);
      if (!isExist) {
        await super.create(
          sessionMetadata,
          {
            id,
            host,
            port: parseInt(port, 10),
            name,
            tls: false,
            verifyServerCert: false,
            connectionType: ConnectionType.STANDALONE,
            lastConnection: null,
          },
          false,
        );
      }
      this.logger.log(`Succeed to set predefined database ${id}`);
    } catch (error) {
      this.logger.error('Failed to set predefined database', error);
    }
  }
}
