import { DatabaseHelper } from '../../../../helpers/database';
import { WorkbenchPage, MyRedisDatabasePage, BrowserPage } from '../../../../pageObjects';
import { commonUrl, ossStandaloneRedisearch } from '../../../../helpers/conf';
import { KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';
import { Common } from '../../../../helpers/common';
import { WorkbenchActions } from '../../../../common-actions/workbench-actions';

const myRedisDatabasePage = new MyRedisDatabasePage();
const workbenchPage = new WorkbenchPage();
const workBenchActions = new WorkbenchActions();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();
const browserPage = new BrowserPage();

const indexName = Common.generateWord(5);
const commandsForIndex = [
    `FT.CREATE ${indexName} ON HASH PREFIX 1 product: SCHEMA price NUMERIC SORTABLE`,
    'HMSET product:1 price 20',
    'HMSET product:2 price 100'
];

fixture `Command results at Workbench`
    .meta({ type: 'regression', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneRedisearch);
        // Add index and data
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
        await workbenchPage.sendCommandsArrayInWorkbench(commandsForIndex);
    })
    .afterEach(async t => {
        // Drop index and database
        await t.switchToMainWindow();
        await workbenchPage.sendCommandInWorkbench(`FT.DROPINDEX ${indexName} DD`);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneRedisearch);
    });
test('Verify that user can switches between Table and Text for FT.INFO and see results corresponding to their views', async t => {
    const infoCommand = `FT.INFO ${indexName}`;

    // Send FT.INFO and switch to Text view
    await workbenchPage.sendCommandInWorkbench(infoCommand);
    await workbenchPage.selectViewTypeText();
    await t.expect(workbenchPage.queryCardContainer.nth(0).find(workbenchPage.cssQueryTextResult).exists).ok('The text view is not switched for command FT.INFO');
    // Switch to Table view and check result
    await workbenchPage.selectViewTypeTable();
    await t.switchToIframe(workbenchPage.iframe);
    await t.expect(workbenchPage.queryTableResult.exists).ok('The table view is not switched for command FT.INFO');
});
test('Verify that user can switches between Table and Text for FT.SEARCH and see results corresponding to their views', async t => {
    const searchCommand = `FT.SEARCH ${indexName} *`;

    // Send FT.SEARCH and switch to Text view
    await workbenchPage.sendCommandInWorkbench(searchCommand);
    await workbenchPage.selectViewTypeText();
    await t.expect(workbenchPage.queryCardContainer.nth(0).find(workbenchPage.cssQueryTextResult).visible).ok('The text view is not switched for command FT.SEARCH');
    // Switch to Table view and check result
    await workbenchPage.selectViewTypeTable();
    await t.switchToIframe(workbenchPage.iframe);
    await t.expect(workbenchPage.queryTableResult.exists).ok('The table view is not switched for command FT.SEARCH');
});
test('Verify that user can switches between Table and Text for FT.AGGREGATE and see results corresponding to their views', async t => {
    const aggregateCommand = `FT.Aggregate ${indexName} * GROUPBY 0 REDUCE MAX 1 @price AS max_price`;

    // Send FT.AGGREGATE and switch to Text view
    await workbenchPage.sendCommandInWorkbench(aggregateCommand);
    await workbenchPage.selectViewTypeText();
    await t.expect(workbenchPage.queryCardContainer.nth(0).find(workbenchPage.cssQueryTextResult).visible).ok('The text view is not switched for command FT.AGGREGATE');
    // Switch to Table view and check result
    await workbenchPage.selectViewTypeTable();
    await t.switchToIframe(workbenchPage.iframe);
    await t.expect(workbenchPage.queryTableResult.exists).ok('The table view is not switched for command FT.AGGREGATE');
});
test('Verify that user can switches between views and see results according to this view in full mode in Workbench', async t => {
    const command = 'CLIENT LIST';

    // Send command and check table view is default in full mode
    await workbenchPage.sendCommandInWorkbench(command);
    await t.click(workbenchPage.fullScreenButton);
    await t.switchToIframe(workbenchPage.iframe);
    await t.expect(workbenchPage.queryTableResult.exists).ok('The search results are displayed in Table view by default');
    // Select Text view from dropdown
    await t.switchToMainWindow();
    await workbenchPage.selectViewTypeText();
    // Verify that search results are displayed in Text view
    await t.expect(workbenchPage.queryCardContainer.nth(0).find(workbenchPage.cssQueryTextResult).exists).ok('The result is displayed in Text view');
});
test('Big output in workbench is visible in virtualized table', async t => {
    // Send commands
    const command = 'graph.query t "UNWIND range(1,1000) AS x return x"';
    const bottomText = 'Query internal execution time';
    let numberOfScrolls = 0;

    // Send command in workbench with Text view type
    await workbenchPage.sendCommandInWorkbench(command);
    await workbenchPage.selectViewTypeText();

    const containerOfCommand = await workbenchPage.getCardContainerByCommand(command);
    const listItems = containerOfCommand.find(workbenchPage.cssRowInVirtualizedTable);
    const lastExpectedItem = listItems.withText(bottomText);

    // Scroll down the virtualized list until the last row
    while (!await lastExpectedItem.exists && numberOfScrolls < 100) {
        const currentLastRenderedItemIndex = await listItems.count - 1;
        const currentLastRenderedItemText = await listItems.nth(currentLastRenderedItemIndex).textContent;
        const currentLastRenderedItem = listItems.withText(currentLastRenderedItemText);

        await t.scrollIntoView(currentLastRenderedItem);
        numberOfScrolls++;
    }

    // Verify that all commands scrolled
    await t.expect(lastExpectedItem.visible).ok('Final execution time message not displayed');
});
test
    .before(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneRedisearch);
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    })
    .after(async t => {
        await t.switchToMainWindow();
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneRedisearch);
    })('Verify that user can see the client List visualization available for all users', async t => {
        const command = 'CLIENT LIST';
        // Send command in workbench to view client list
        await workbenchPage.sendCommandInWorkbench(command);
        await t.expect(workbenchPage.typeSelectedClientsList.exists).ok('client list view button is not visible');
        await workBenchActions.verifyClientListColumnsAreVisible(['id', 'addr', 'name', 'user']);
        // verify table view row count match with text view after client list command
        await workBenchActions.verifyClientListTableViewRowCount();
    });
test('Verify that user can clear all results at once.', async t => {
    await t.click(workbenchPage.clearResultsBtn);
    await t.expect(workbenchPage.queryTextResult.exists).notOk('Clear all button does not remove commands');
});
