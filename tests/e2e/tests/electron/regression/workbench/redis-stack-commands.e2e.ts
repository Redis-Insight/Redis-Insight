import { t } from 'testcafe';
import { DatabaseHelper } from '../../../../helpers/database';
import { WorkbenchPage, MyRedisDatabasePage, BrowserPage } from '../../../../pageObjects';
import { commonUrl, ossStandaloneConfig } from '../../../../helpers/conf';
import { ExploreTabs, KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';

const myRedisDatabasePage = new MyRedisDatabasePage();
const workbenchPage = new WorkbenchPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();
const browserPage = new BrowserPage();

const keyNameGraph = 'bikes_graph';

fixture `Redis Stack command in Workbench`
    .meta({ type: 'regression', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    })
    .afterEach(async() => {
        // Drop key and database
        await t.switchToMainWindow();
        await workbenchPage.sendCommandInWorkbench(`GRAPH.DELETE ${keyNameGraph}`);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    });
//skipped due the inaccessibility of the iframe
test.skip('Verify that user can switches between Graph and Text for GRAPH command and see results corresponding to their views', async t => {
    // Send Graph command
    await workbenchPage.InsightsPanel.togglePanel(true);
    const tutorials = await workbenchPage.InsightsPanel.setActiveTab(ExploreTabs.Tutorials);
    await t.click(tutorials.redisStackTutorialsButton);
    await t.click(tutorials.tutorialsWorkingWithGraphLink);
    await tutorials.runBlockCode('Create a bike node');
    await t.click(workbenchPage.submitCommandButton);
    // Switch to Text view and check result
    await workbenchPage.selectViewTypeText();
    await t.expect(workbenchPage.queryCardContainer.nth(0).find(workbenchPage.cssQueryTextResult).exists).ok('The text view is not switched for GRAPH command');
    // Switch to Graph view and check result
    await workbenchPage.selectViewTypeGraph();
    await t.switchToIframe(workbenchPage.iframe);
    await t.expect(workbenchPage.queryCardContainer.nth(0).find(workbenchPage.queryGraphContainer).exists).ok('The Graph view is not switched for GRAPH command');
});
//skipped due to Graph no longer displayed in tutorials
test.skip('Verify that user can see "No data to visualize" message for Graph command', async t => {
    // Send Graph command
    await workbenchPage.InsightsPanel.togglePanel(true);
    const tutorials = await workbenchPage.InsightsPanel.setActiveTab(ExploreTabs.Tutorials);
    await t.click(tutorials.redisStackTutorialsButton);
    await tutorials.runBlockCode('Show all sales per region');
    await t.click(workbenchPage.submitCommandButton);
    // Check result
    await t.switchToIframe(workbenchPage.iframe);
    await t.expect(workbenchPage.responseInfo.textContent).eql('No data to visualize. Raw information is presented below.', 'The info message is not displayed for Graph');

    // Get result text content
    const graphModeText = await workbenchPage.parsedRedisReply.textContent;
    // Switch to Text view and check result
    await t.switchToMainWindow();
    await workbenchPage.selectViewTypeText();
    await t.expect(workbenchPage.queryTextResult.exists).ok('The result in text view is not displayed');
    // Verify that when there is nothing to visualize in RedisGraph, user can see just text result
    await t.expect(workbenchPage.queryTextResult.textContent).notEql(graphModeText, 'Text of command in Graph mode is the same as in Text mode');
});
