import { DatabaseHelper } from '../../../../helpers/database';
import { BrowserPage, MyRedisDatabasePage, PubSubPage, WorkbenchPage } from '../../../../pageObjects';
import { commonUrl, ossStandaloneConfig, ossStandaloneV5Config } from '../../../../helpers/conf';
import { KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { verifyMessageDisplayingInPubSub } from '../../../../helpers/pub-sub';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';

const myRedisDatabasePage = new MyRedisDatabasePage();
const pubSubPage = new PubSubPage();
const workbenchPage = new WorkbenchPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();
const browserPage = new BrowserPage();

fixture `Subscribe/Unsubscribe from a channel`
    .meta({ rte: rte.standalone, type: 'critical_path' })
    .page(commonUrl)
    .beforeEach(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        //Go to PubSub page
        await t.click(myRedisDatabasePage.NavigationPanel.pubSubButton);
    })
    .afterEach(async() => {
        await databaseAPIRequests.deleteAllDatabasesApi();
    });
test('Verify that when user subscribe to the pubsub channel he can see all the messages being published to my database from the moment of my subscription', async t => {
    // Verify that the Channel field placeholder is 'Enter Channel Name'
    await t.expect(pubSubPage.channelNameInput.getAttribute('placeholder')).eql('Enter Channel Name', 'No placeholder in Channel field');
    // Verify that the Message field placeholder is 'Enter Message'
    await t.expect(pubSubPage.messageInput.getAttribute('placeholder')).eql('Enter Message', 'No placeholder in Message field');
    // Verify that user is unsubscribed from the pubsub channel when he go to the pubsub window after launching application for the first time
    await t.expect(pubSubPage.subscribeStatus.textContent).eql('You are not subscribed', 'User is not unsubscribed');
    await t.expect(pubSubPage.subscribeButton.textContent).eql('Subscribe', 'Subscribe button is not displayed');

    // Subscribe to channel
    await t.click(pubSubPage.subscribeButton);
    await t.expect(pubSubPage.subscribeStatus.textContent).eql('You are  subscribed', 'User is not subscribed', { timeout: 10000 });
    // Verify that user can publish a message to a channel
    await pubSubPage.publishMessage('test', 'published message');
    await verifyMessageDisplayingInPubSub('published message', true);
    await t.click(pubSubPage.unsubscribeButton);
    //Verify that when user unsubscribe from a pubsub channel he can see no new data being published to the channel from the moment he unsubscribe
    await t.expect(pubSubPage.subscribeStatus.textContent).eql('You are not subscribed', 'User is not unsubscribed', { timeout: 10000 });
    //Verify that user can publish a message regardless of my subscription state.
    await pubSubPage.publishMessage('test', 'message in unsubscribed status');
    //Verify that message is not displayed
    await verifyMessageDisplayingInPubSub('message in unsubscribed status', false);
});
test('Verify that the focus gets always shifted to a newest message (auto-scroll)', async t => {
    await pubSubPage.subsribeToChannelAndPublishMessage('test', 'first message');
    // Verify that when user click Publish and the publication is successful, he can see a response: badge with the number <# of clients received>
    await t.expect(pubSubPage.clientBadge.exists).ok('Client badge is not displayed');
    await t.expect(pubSubPage.clientBadge.textContent).eql('1', 'Client badge is not displayed', { timeout: 10000 });

    // Go to Redis Databases Page
    await t.click(myRedisDatabasePage.NavigationPanel.myRedisDBButton);
    // Go back to PubSub page
    await t.click(myRedisDatabasePage.NavigationPanel.pubSubButton);
    // Verify that my subscription state is preserved when user navigate through the app while connected to current database and in current app session
    await t.expect(pubSubPage.subscribeStatus.textContent).eql('You are  subscribed', 'User is not subscribed', { timeout: 10000 });

    // Publish 100 messages
    await pubSubPage.Cli.sendCommandInCli('100 publish channel test100Message');
    // Verify that the first message is not visible in view port
    await verifyMessageDisplayingInPubSub('first message', false);
    await verifyMessageDisplayingInPubSub('test100Message', true);
});
test
    .before(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabase(ossStandaloneV5Config);
        await t.click(pubSubPage.NavigationPanel.myRedisDBButton);
        await databaseAPIRequests.addNewStandaloneDatabaseApi(ossStandaloneConfig);
        await myRedisDatabasePage.reloadPage();
        await myRedisDatabasePage.clickOnDBByName(ossStandaloneConfig.databaseName);
        // Go to PubSub page
        await t.click(myRedisDatabasePage.NavigationPanel.pubSubButton);
    })
    .after(async() => {
        await databaseAPIRequests.deleteAllDatabasesApi();
    })('Verify that user subscription state is changed to unsubscribed, all the messages are cleared and total message counter is reset when user connect to another database', async t => {
        await t.click(pubSubPage.subscribeButton);
        // Publish 10 messages
        await pubSubPage.Cli.sendCommandInCli('10 publish channel message');
        await verifyMessageDisplayingInPubSub('message', true);
        // Verify that user can see total number of messages received
        await t.expect(pubSubPage.totalMessagesCount.textContent).contains('10', 'Total counter value is incorrect');
        // Connect to second database
        await t.click(myRedisDatabasePage.NavigationPanel.myRedisDBButton);
        await myRedisDatabasePage.clickOnDBByName(ossStandaloneV5Config.databaseName);
        // Verify no subscription, messages and total messages
        await t.click(myRedisDatabasePage.NavigationPanel.pubSubButton);
        await t.expect(pubSubPage.subscribeStatus.textContent).eql('You are not subscribed', 'User is not unsubscribed', { timeout: 10000 });
        await verifyMessageDisplayingInPubSub('message', false);
        await t.expect(pubSubPage.totalMessagesCount.exists).notOk('Total counter is still displayed');
    });
test('Verify that user can see a internal link to pubsub window under word “Pub/Sub” when he tries to run PSUBSCRIBE or SUBSCRIBE commands in CLI or Workbench', async t => {
    const commandFirst = 'PSUBSCRIBE';
    const commandSecond = 'SUBSCRIBE';

    // Go to Browser Page
    await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
    // Verify that user can see a custom message when he tries to run PSUBSCRIBE command in CLI or Workbench: “Use Pub/Sub to see the messages published to all channels in your database”
    await pubSubPage.Cli.sendCommandInCli(commandFirst);
    await t.click(pubSubPage.Cli.cliExpandButton);
    await t.expect(await pubSubPage.Cli.getWarningMessageText(commandFirst)).eql('Use Pub/Sub to see the messages published to all channels in your database.', 'Message is not displayed', { timeout: 10000 });

    // Verify internal link to pubsub page in CLI
    await t.expect(pubSubPage.Cli.cliLinkToPubSub.exists).ok('Link to pubsub page is not displayed');
    await t.click(pubSubPage.Cli.cliLinkToPubSub);
    await t.expect(pubSubPage.pubSubPageContainer.exists).ok('Pubsub page is opened');

    // Verify that user can see a custom message when he tries to run SUBSCRIBE command in CLI: “Use Pub/Sub tool to subscribe to channels.”
    await t.click(pubSubPage.Cli.cliCollapseButton);
    await pubSubPage.Cli.sendCommandInCli(commandSecond);
    await t.click(pubSubPage.Cli.cliExpandButton);
    await t.expect(await pubSubPage.Cli.getWarningMessageText(commandSecond)).eql('Use Pub/Sub tool to subscribe to channels.', 'Message is not displayed', { timeout: 10000 });

    // Verify internal link to pubsub page in CLI
    await t.expect(pubSubPage.Cli.cliLinkToPubSub.exists).ok('Link to pubsub page is not displayed');
    await t.click(pubSubPage.Cli.cliLinkToPubSub);
    await t.expect(pubSubPage.pubSubPageContainer.exists).ok('Pubsub page is opened');

    // Verify that user can see a custom message when he tries to run SUBSCRIBE command in Workbench: “Use Pub/Sub tool to subscribe to channels.”
    await t.click(pubSubPage.NavigationPanel.browserButton);
    await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    await workbenchPage.sendCommandInWorkbench(commandSecond);
    await t.expect(await workbenchPage.queryResult.textContent).eql('Use Pub/Sub tool to subscribe to channels.', 'Message is not displayed', { timeout: 10000 });

});
test('Verify that the Message field input is preserved until user Publish a message', async t => {
    // Fill in Channel and Message inputs
    await t.click(pubSubPage.subscribeButton);
    await t.click(pubSubPage.channelNameInput);
    await t.typeText(pubSubPage.channelNameInput, 'testChannel', { replace: true });
    await t.click(pubSubPage.messageInput);
    await t.typeText(pubSubPage.messageInput, 'message', { replace: true });
    await t.expect(pubSubPage.messageInput.value).eql('message', 'Message input is empty', { timeout: 10000 });
    // Go to Browser Page
    await t.click(myRedisDatabasePage.NavigationPanel.myRedisDBButton);
    // Go to PubSub page
    await t.click(myRedisDatabasePage.NavigationPanel.pubSubButton);
    // Verify that message is preserved until publishing
    await t.expect(pubSubPage.messageInput.value).eql('message', 'Message input is empty', { timeout: 10000 });
    await t.click(pubSubPage.publishButton);
    await t.expect(pubSubPage.messageInput.value).eql('', 'Message input is empty', { timeout: 10000 });
    // Verify that the Channel field input is preserved until user modify it (publishing a message does not clear the field)
    await t.expect(pubSubPage.channelNameInput.value).eql('testChannel', 'Channel input is empty', { timeout: 10000 });
});
test('Verify that user can clear all the messages from the pubsub window', async t => {
    await pubSubPage.subsribeToChannelAndPublishMessage('testChannel', 'message');
    await pubSubPage.publishMessage('testChannel2', 'second m');
    // Verify the tooltip text 'Clear Messages' appears on hover the clear button
    await t.hover(pubSubPage.clearPubSubButton);
    await t.expect(pubSubPage.clearButtonTooltip.textContent).contains('Clear Messages', 'Clear Messages tooltip not displayed');
    await t.click(pubSubPage.clearPubSubButton);
    // Verify that the clear of the messages does not affect the subscription state
    await t.expect(pubSubPage.subscribeStatus.textContent).eql('You are  subscribed', 'User is not subscribed', { timeout: 10000 });
    // Verify that the Messages counter is reset after clear messages
    await t.expect(pubSubPage.totalMessagesCount.textContent).contains('0', 'Total counter value is incorrect');
    // Verify messages are cleared
    await verifyMessageDisplayingInPubSub('message', false);
    await verifyMessageDisplayingInPubSub('second m', false);
});
