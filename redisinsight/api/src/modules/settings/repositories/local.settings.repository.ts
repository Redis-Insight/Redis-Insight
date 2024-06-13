import { SettingsRepository } from 'src/modules/settings/repositories/settings.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingsEntity } from 'src/modules/settings/entities/settings.entity';
import { Settings } from 'src/modules/settings/models/settings';
import { classToClass } from 'src/utils';
import { SessionMetadata } from 'src/common/models';

export class LocalSettingsRepository extends SettingsRepository {
  constructor(
    @InjectRepository(SettingsEntity)
    private readonly repository: Repository<SettingsEntity>,
  ) {
    super();
  }

  async getOrCreate(): Promise<Settings> {
    let entity = await this.repository.findOneBy({});

    if (!entity) {
      entity = await this.repository.save(this.repository.create());
    }

    return classToClass(Settings, entity);
  }

  async update(_: SessionMetadata, settings: Settings): Promise<Settings> {
    await this.repository.update({}, classToClass(SettingsEntity, settings));

    return this.getOrCreate();
  }
}
