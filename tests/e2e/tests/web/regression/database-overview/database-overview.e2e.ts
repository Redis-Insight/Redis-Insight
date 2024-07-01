import { DatabaseHelper } from '../../../../helpers/database';
import {
    MyRedisDatabasePage,
    WorkbenchPage,
    BrowserPage
} from '../../../../pageObjects';
import { KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { commonUrl, ossStandaloneConfig } from '../../../../helpers/conf';
import { Common } from '../../../../helpers/common';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';

const myRedisDatabasePage = new MyRedisDatabasePage();
const workbenchPage = new WorkbenchPage();
const browserPage = new BrowserPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();

let keys: string[];

fixture `Database overview`
    .meta({ type: 'regression', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async() => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
    })
    .afterEach(async() => {
        // Clear and delete database
        await browserPage.Cli.sendCommandInCli(`DEL ${keys.join(' ')}`);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    });
test('Verify that user can connect to DB and see breadcrumbs at the top of the application', async t => {
    // Create new keys
    keys = await Common.createArrayWithKeyValue(10);
    await browserPage.Cli.sendCommandInCli(`MSET ${keys.join(' ')}`);

    // Verify that user can see breadcrumbs in Browser and Workbench views
    await t.expect(browserPage.breadcrumbsContainer.visible).ok('User can not see breadcrumbs in Browser page', { timeout: 10000 });
    await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    await t.expect(browserPage.breadcrumbsContainer.visible).ok('User can not see breadcrumbs in Workbench page', { timeout: 10000 });

    // Verify that user can see total memory and total number of keys updated in DB header in Workbench page
    await t.expect(workbenchPage.OverviewPanel.overviewTotalKeys.exists).ok('User can not see total keys');
    await t.expect(workbenchPage.OverviewPanel.overviewTotalMemory.exists).ok('User can not see total memory');
});
