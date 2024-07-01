import { ExploreTabs, KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { DatabaseHelper } from '../../../../helpers/database';
import { BrowserPage, MyRedisDatabasePage, WorkbenchPage } from '../../../../pageObjects';
import { commonUrl, ossStandaloneConfig } from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';

const myRedisDatabasePage = new MyRedisDatabasePage();
const workbenchPage = new WorkbenchPage();
const browserPage = new BrowserPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();

const speed = 0.4;

fixture `Workbench Context`
    .meta({ type: 'regression', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        // Go to Workbench page
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    })
    .afterEach(async() => {
        // Delete database
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    });
test('Verify that user can see saved CLI state when navigates away to any other page', async t => {
    // Expand CLI and navigate to Browser
    await t.click(workbenchPage.Cli.cliExpandButton);
    await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
    // Return back to Workbench and check CLI
    await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    await t.expect(workbenchPage.Cli.cliCollapseButton.exists).ok('CLI is not expanded');
});
// Update after resolving https://redislabs.atlassian.net/browse/RI-3299
test('Verify that user can see saved CLI size when navigates away to any other page', async t => {
    const offsetY = 200;

    await t.click(workbenchPage.Cli.cliExpandButton);
    const cliAreaHeight = await workbenchPage.Cli.cliArea.clientHeight;
    const cliAreaHeightEnd = cliAreaHeight + 150;
    const cliResizeButton = workbenchPage.Cli.cliResizeButton;
    await t.hover(cliResizeButton);
    // Resize CLI 50px up and navigate to the Redis Databases page
    await t.drag(cliResizeButton, 0, -offsetY, { speed: 0.01 });
    await t.click(myRedisDatabasePage.NavigationPanel.myRedisDBButton);
    // Navigate back to the database Workbench and check CLI size
    await myRedisDatabasePage.clickOnDBByName(ossStandaloneConfig.databaseName);
    await t.expect(await workbenchPage.Cli.cliArea.clientHeight > cliAreaHeightEnd).ok('Saved context for resizable cli is incorrect');
});
test('Verify that user can see all the information removed when reloads the page', async t => {
    const command = 'FT._LIST';
    // Create context modificaions and navigate to Browser
    await t.typeText(workbenchPage.queryInput, command, { replace: true, speed: speed });
    await t.click(workbenchPage.Cli.cliExpandButton);
    await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
    // Open Workbench page and verify context
    await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    await t.expect(workbenchPage.Cli.cliCollapseButton.exists).ok('CLI is not expanded');
    await t.expect(workbenchPage.queryInputScriptArea.textContent).eql(command, 'Input in Editor is not saved');
    // Reload the window and chek context
    await workbenchPage.reloadPage();
    await t.expect(workbenchPage.Cli.cliCollapseButton.exists).notOk('CLI is not collapsed');
    await t.expect(workbenchPage.queryInputScriptArea.textContent).eql('', 'Input in Editor is not removed');
});
test('Verify that user can see saved state of the Enablement area when navigates back to the Workbench from other page', async t => {
    // Collapse the Enablement area and open Settings
    await workbenchPage.InsightsPanel.togglePanel(true);
    const tutorials = await workbenchPage.InsightsPanel.setActiveTab(ExploreTabs.Tutorials);
    await workbenchPage.InsightsPanel.togglePanel(false);
    await t.expect(tutorials.preselectArea.exists).notOk('the panel is not closed');
    await workbenchPage.InsightsPanel.togglePanel(true);
    await t.click(workbenchPage.NavigationPanel.browserButton);
    await t.expect(tutorials.preselectArea.exists).ok('the panel is opened');
    await t.click(browserPage.InsightsPanel.closeButton);
    await t.expect(tutorials.preselectArea.exists).notOk('the panel is not closed');

});
