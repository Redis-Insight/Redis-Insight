import { BrowserPage, MyRedisDatabasePage, WorkbenchPage } from '../../../../pageObjects';
import { Compatibility, ExploreTabs, KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { DatabaseHelper } from '../../../../helpers/database';
import {
    commonUrl,
    ossStandaloneConfig,
    ossStandaloneV5Config
} from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';

const browserPage = new BrowserPage();
const workbenchPage = new WorkbenchPage();
const myRedisDatabasePage = new MyRedisDatabasePage();

const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();

fixture `Open insights panel`
    .meta({ type: 'regression', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async() => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
    })
    .afterEach(async() => {
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    });
test
    .before(async() => {
        await databaseHelper.acceptLicenseTerms();
        await databaseAPIRequests.deleteAllDatabasesApi();
        await databaseAPIRequests.addNewStandaloneDatabaseApi(ossStandaloneV5Config);
        await databaseAPIRequests.addNewStandaloneDatabaseApi(ossStandaloneConfig, true);
        await browserPage.reloadPage();
        await myRedisDatabasePage.clickOnDBByName(ossStandaloneV5Config.databaseName);
    })
    .after(async() => {
        await databaseAPIRequests.deleteAllDatabasesApi();
    })('Verify that insights panel is opened in cloud db if users db does not have some module', async t => {
        await t.click(browserPage.redisearchModeBtn);
        await t.click(browserPage.closeDialogButton);
        await t.click(browserPage.NavigationPanel.myRedisDBButton);
        await myRedisDatabasePage.clickOnDBByName(ossStandaloneConfig.databaseName);
        await t.expect(browserPage.InsightsPanel.sidePanel.exists).ok('Insights panel is not opened');
        await t.expect(await browserPage.InsightsPanel.existsCompatibilityPopover.textContent).contains('Search and query capability', 'popover is not displayed');
        const tab = await browserPage.InsightsPanel.setActiveTab(ExploreTabs.Tutorials);
        await t.expect(tab.preselectArea.textContent).contains('How To Query Your Data', 'the tutorial is incorrect');

        await t.click(browserPage.NavigationPanel.myRedisDBButton);
        await myRedisDatabasePage.clickOnDBByName(ossStandaloneV5Config.databaseName);
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
        await workbenchPage.sendCommandInWorkbench('TS.');

        await t.click(browserPage.NavigationPanel.myRedisDBButton);
        await myRedisDatabasePage.clickOnDBByName(ossStandaloneConfig.databaseName);
        await t.expect(browserPage.InsightsPanel.sidePanel.exists).ok('Insights panel is not opened');
        await t.expect(await browserPage.InsightsPanel.existsCompatibilityPopover.textContent).contains('Time series data', 'popover is not displayed');
        await t.expect(tab.preselectArea.textContent).contains('Time Series', 'the tutorial is incorrect');
    });

test
    .before(async() => {
        await databaseAPIRequests.deleteAllDatabasesApi();
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
    })
    .after(async() => {
        await databaseAPIRequests.deleteAllDatabasesApi();
    })('Verify that insights panel can be opened from Overview page', async t => {
        const myRedisTutorial = 'How To Query Your Data';

        await t.click(browserPage.NavigationPanel.myRedisDBButton);
        await myRedisDatabasePage.CompatibilityPromotion.clickOnLinkByName(Compatibility.SearchAndQuery);
        await t.expect(await myRedisDatabasePage.InsightsPanel.getActiveTabName()).eql(ExploreTabs.Tutorials);
        let tab = await myRedisDatabasePage.InsightsPanel.setActiveTab(ExploreTabs.Tutorials);
        await t.expect(tab.preselectArea.textContent).contains(myRedisTutorial, 'the tutorial is incorrect');
        await t.click(tab.nextPageButton);
        await tab.runBlockCode('Create the bike shop idx:bicycle');
        await t.expect(tab.openDatabasePopover.exists).ok('Open a database popover is not displayed');
        await myRedisDatabasePage.InsightsPanel.togglePanel(false);
    });
test('Verify that user can open Explore tab into Insights panel by clicking on Explore Redis button', async t => {
    await t.click(browserPage.NavigationPanel.myRedisDBButton);
    await t.click(myRedisDatabasePage.exploreRedisBtn);
    await t.expect(browserPage.InsightsPanel.sidePanel.exists).ok('Insights panel is not opened');
    await t.expect(await browserPage.InsightsPanel.getActiveTabName()).eql(ExploreTabs.Tutorials);
    await browserPage.InsightsPanel.setActiveTab(ExploreTabs.Tips);
    await browserPage.InsightsPanel.togglePanel(false);
    await t.click(myRedisDatabasePage.exploreRedisBtn);
    await t.expect(browserPage.InsightsPanel.sidePanel.exists).ok('Insights panel is not opened');
    await t.expect(await browserPage.InsightsPanel.getActiveTabName()).eql(ExploreTabs.Tutorials);
});
