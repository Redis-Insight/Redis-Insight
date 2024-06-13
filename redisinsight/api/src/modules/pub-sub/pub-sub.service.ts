import { HttpException, Injectable, Logger } from '@nestjs/common';
import { UserSessionProvider } from 'src/modules/pub-sub/providers/user-session.provider';
import { UserClient } from 'src/modules/pub-sub/model/user-client';
import { SubscribeDto } from 'src/modules/pub-sub/dto';
import { SubscriptionProvider } from 'src/modules/pub-sub/providers/subscription.provider';
import { PublishResponse } from 'src/modules/pub-sub/dto/publish.response';
import { PublishDto } from 'src/modules/pub-sub/dto/publish.dto';
import { PubSubAnalyticsService } from 'src/modules/pub-sub/pub-sub.analytics.service';
import { catchAclError } from 'src/utils';
import { ClientMetadata, SessionMetadata } from 'src/common/models';
import { DatabaseClientFactory } from 'src/modules/database/providers/database.client.factory';

@Injectable()
export class PubSubService {
  private logger: Logger = new Logger('PubSubService');

  constructor(
    private readonly sessionProvider: UserSessionProvider,
    private readonly subscriptionProvider: SubscriptionProvider,
    private databaseClientFactory: DatabaseClientFactory,
    private analyticsService: PubSubAnalyticsService,
  ) {}

  /**
   * Subscribe to multiple channels
   * @param userClient
   * @param dto
   */
  async subscribe(sessionMetadata: SessionMetadata, userClient: UserClient, dto: SubscribeDto) {
    try {
      this.logger.log('Subscribing to channels(s)');

      const session = await this.sessionProvider.getOrCreateUserSession(sessionMetadata, userClient);
      await Promise.all(dto.subscriptions.map((subDto) => session.subscribe(
        this.subscriptionProvider.createSubscription(userClient, subDto),
      )));
      this.analyticsService.sendChannelSubscribeEvent(userClient.getDatabaseId());
    } catch (e) {
      this.logger.error('Unable to create subscriptions', e);

      if (e instanceof HttpException) {
        throw e;
      }

      throw catchAclError(e);
    }
  }

  /**
   * Unsubscribe from multiple channels
   * @param userClient
   * @param dto
   */
  async unsubscribe(sessionMetadata: SessionMetadata, userClient: UserClient, dto: SubscribeDto) {
    try {
      this.logger.log('Unsubscribing from channels(s)');

      const session = await this.sessionProvider.getOrCreateUserSession(sessionMetadata, userClient);
      await Promise.all(dto.subscriptions.map((subDto) => session.unsubscribe(
        this.subscriptionProvider.createSubscription(userClient, subDto),
      )));
      this.analyticsService.sendChannelUnsubscribeEvent(userClient.getDatabaseId());
    } catch (e) {
      this.logger.error('Unable to unsubscribe', e);

      if (e instanceof HttpException) {
        throw e;
      }

      throw catchAclError(e);
    }
  }

  /**
   * Publish a message to a particular channel
   * @param clientMetadata
   * @param dto
   */
  async publish(clientMetadata: ClientMetadata, dto: PublishDto): Promise<PublishResponse> {
    try {
      this.logger.log('Publishing message.');

      const client = await this.databaseClientFactory.getOrCreateClient(clientMetadata);

      const affected = await client.publish(dto.channel, dto.message);

      this.analyticsService.sendMessagePublishedEvent(clientMetadata.databaseId, affected);

      return {
        affected,
      };
    } catch (e) {
      this.logger.error('Unable to publish a message', e);

      if (e instanceof HttpException) {
        throw e;
      }

      throw catchAclError(e);
    }
  }

  /**
   * Handle Socket disconnection event
   * Basically destroy the UserSession to remove Redis connection
   * @param id
   */
  async handleDisconnect(id: string) {
    this.logger.log(`Handle disconnect event: ${id}`);
    const session = this.sessionProvider.getUserSession(id);

    if (session) {
      session.destroy();
      this.sessionProvider.removeUserSession(id);
    }
  }
}
