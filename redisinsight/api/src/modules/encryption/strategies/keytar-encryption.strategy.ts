import { Injectable, Logger } from '@nestjs/common';
import {
  createDecipheriv, createCipheriv, randomBytes, createHash,
} from 'crypto';
import { EncryptionResult, EncryptionStrategy } from 'src/modules/encryption/models';
import { IEncryptionStrategy } from 'src/modules/encryption/strategies/encryption-strategy.interface';
import {
  KeytarDecryptionErrorException,
  KeytarEncryptionErrorException,
  KeytarUnavailableException,
} from 'src/modules/encryption/exceptions';
import config from 'src/utils/config';

const SERVICE = 'redisinsight';
const ACCOUNT = 'app';
const ALGORITHM = 'aes-256-cbc';
const SERVER_CONFIG = config.get('server');

@Injectable()
export class KeytarEncryptionStrategy implements IEncryptionStrategy {
  private logger = new Logger('KeytarEncryptionStrategy');

  private readonly keytar;

  private cipherKey;

  constructor() {
    try {
      // Have to require keytar here since during tests of keytar module
      // at some point it threw an error when OS secure storage was unavailable
      // Since it is difficult to reproduce we keep module require here to be
      // ready for such cases
      // eslint-disable-next-line global-require
      this.keytar = require('keytar');
    } catch (e) {
      this.logger.error('Failed to initialize keytar module', e);
    }
  }

  /**
   * Generates random password
   */
  private generatePassword(): string {
    return SERVER_CONFIG.secretStoragePassword || randomBytes(20).toString('base64');
  }

  /**
   * Get password from the OS secret storage
   * @private
   */
  private async getPassword(): Promise<string | null> {
    try {
      return await this.keytar.getPassword(SERVICE, ACCOUNT);
    } catch (error) {
      this.logger.error('Unable to get password');
      throw new KeytarUnavailableException();
    }
  }

  /**
   * Save password in the OS secret storage
   * @param password
   * @private
   */
  private async setPassword(password: string): Promise<void> {
    try {
      await this.keytar.setPassword(SERVICE, ACCOUNT, password);
    } catch (error) {
      this.logger.error('Unable to set password');
      throw new KeytarUnavailableException();
    }
  }

  /**
   * Get password from storage and create cipher key
   * Note: Will generate new password if it doesn't exists yet
   */
  private async getCipherKey(): Promise<Buffer> {
    if (!this.cipherKey) {
      let password = await this.getPassword();
      if (!password) {
        await this.setPassword(this.generatePassword());
        password = await this.getPassword();
      }

      this.cipherKey = await createHash('sha256')
        .update(password, 'utf8')
        .digest();
    }

    return this.cipherKey;
  }

  /**
   * Checks if Keytar functionality is available
   * Basically just try to get a password and checks if this call fails
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.keytar.getPassword(SERVICE, ACCOUNT);
      return true;
    } catch (e) {
      return false;
    }
  }

  async encrypt(data: string): Promise<EncryptionResult> {
    const cipherKey = await this.getCipherKey();
    try {
      const cipher = createCipheriv(ALGORITHM, cipherKey, Buffer.alloc(16, 0));
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return {
        encryption: EncryptionStrategy.KEYTAR,
        data: encrypted,
      };
    } catch (error) {
      this.logger.error('Unable to encrypt data', error);
      throw new KeytarEncryptionErrorException();
    }
  }

  async decrypt(data: string, encryptedWith: string): Promise<string | null> {
    if (encryptedWith !== EncryptionStrategy.KEYTAR) {
      return null;
    }

    const cipherKey = await this.getCipherKey();
    try {
      const decipher = createDecipheriv(ALGORITHM, cipherKey, Buffer.alloc(16, 0));
      let decrypted = decipher.update(data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.logger.error('Unable to decrypt data', error);
      throw new KeytarDecryptionErrorException();
    }
  }
}
