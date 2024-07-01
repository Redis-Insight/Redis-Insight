import { ClientFunction } from 'testcafe';
import { KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { DatabaseHelper } from '../../../../helpers/database';
import { BrowserPage, WorkbenchPage } from '../../../../pageObjects';
import { commonUrl, ossStandaloneV5Config } from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';

const browserPage = new BrowserPage();
const workbenchPage = new WorkbenchPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();

const commandForSend = 'FT._LIST';
const getPageUrl = ClientFunction(() => window.location.href);

fixture `Redisearch module not available`
    .meta({ type: 'regression', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneV5Config);
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    })
    .afterEach(async() => {
        // Delete database
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneV5Config);
    });
// Skipped as outdated after implementing RI-4230
test.skip('Verify that user can see the "Create your free Redis database with RediSearch on Redis Cloud" button and click on it in Workbench when module in not loaded', async t => {
    const link = 'https://redis.io/try-free/?utm_source=redis&utm_medium=app&utm_campaign=redisinsight_redisearch';

    // Send command with 'FT.'
    await workbenchPage.sendCommandInWorkbench(commandForSend);
    // Verify the button in the results
    await t.expect(await workbenchPage.queryCardNoModuleButton.visible).ok('The "Create your free Redis database with RediSearch on Redis Cloud" button is not visible');
    // Click on the button in the results
    await t.click(workbenchPage.queryCardNoModuleButton);
    await t.expect(getPageUrl()).contains(link, 'The Try Redis Enterprise page is not opened');
    await t.switchToParentWindow();
});
// https://redislabs.atlassian.net/browse/RI-4230
test('Verify that user can see options on what can be done to work with capabilities in Workbench for docker', async t => {
    const commandJSON = 'JSON.ARRAPPEND key value';
    const commandFT = 'FT.LIST';

    await workbenchPage.InsightsPanel.togglePanel(true);
    await workbenchPage.sendCommandInWorkbench(commandJSON);
    // Verify change screens when capability not available - 'JSON'
    await t.expect(await workbenchPage.commandExecutionResult.withText('RedisJSON is not available').visible)
        .ok('Missing RedisJSON title is not visible');
    await workbenchPage.sendCommandInWorkbench(commandFT);
    // Verify change screens when capability not available - 'Search'
    await t.expect(await workbenchPage.commandExecutionResult.withText('RediSearch is not available').visible)
        .ok('Missing RedisSearch title is not visible');
});
