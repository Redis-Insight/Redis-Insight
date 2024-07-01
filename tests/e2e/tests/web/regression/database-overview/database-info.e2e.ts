import { DatabaseHelper } from '../../../../helpers/database';
import {
    MyRedisDatabasePage,
    WorkbenchPage,
    BrowserPage
} from '../../../../pageObjects';
import { KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { commonUrl, ossStandaloneConfig } from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';

const myRedisDatabasePage = new MyRedisDatabasePage();
const workbenchPage = new WorkbenchPage();
const browserPage = new BrowserPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();

fixture `Database info tooltips`
    .meta({ type: 'regression', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async() => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
    })
    .afterEach(async() => {
        // Delete database
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    });
test('Verify that user can see DB name, endpoint, connection type, Redis version, user name in tooltip when hover over the (i) icon', async t => {
    const version = /[0-9].[0-9].[0-9]/;
    const logicalDbText = 'Select logical databases to work with in Browser, Workbench, and Database Analysis.';

    await t.hover(browserPage.OverviewPanel.databaseInfoIcon);
    await t.expect(browserPage.OverviewPanel.databaseInfoToolTip.textContent).contains(ossStandaloneConfig.databaseName, 'User can see database name in tooltip');
    await t.expect(browserPage.OverviewPanel.databaseInfoToolTip.textContent).contains(`${ossStandaloneConfig.host}:${ossStandaloneConfig.port}`, 'User can see endpoint in tooltip');
    await t.expect(browserPage.OverviewPanel.databaseInfoToolTip.textContent).contains('Standalone', 'User can not see connection type in tooltip');
    await t.expect(browserPage.OverviewPanel.databaseInfoToolTip.textContent).match(version, 'User can not see Redis version in tooltip');
    await t.expect(browserPage.OverviewPanel.databaseInfoToolTip.textContent).contains('Default', 'User can not see user name in tooltip');
    // Verify that user can see the tooltip by hovering on index control switcher
    await t.expect(browserPage.OverviewPanel.databaseInfoToolTip.textContent).contains('Logical Databases', 'Logical Databases text not displayed in tooltip');
    await t.expect(browserPage.OverviewPanel.databaseInfoToolTip.textContent).contains(logicalDbText, 'Logical Databases text not displayed in tooltip');

    // Verify that user can see an (i) icon next to the database name on Browser and Workbench pages
    await t.expect(browserPage.OverviewPanel.databaseInfoIcon.visible).ok('User can not see (i) icon on Browser page', { timeout: 10000 });
    // Move to the Workbench page and check icon
    await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    await t.expect(workbenchPage.OverviewPanel.overviewTotalMemory.visible).ok('User can not see (i) icon on Workbench page', { timeout: 10000 });
});
