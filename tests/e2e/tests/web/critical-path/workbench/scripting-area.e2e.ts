import { KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { DatabaseHelper } from '../../../../helpers/database';
import { BrowserPage, MyRedisDatabasePage, WorkbenchPage } from '../../../../pageObjects';
import { commonUrl, ossStandaloneConfig } from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';
import { Common } from '../../../../helpers/common';

const myRedisDatabasePage = new MyRedisDatabasePage();
const workbenchPage = new WorkbenchPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();
const browserPage = new BrowserPage();

let indexName = Common.generateWord(5);
let keyName = Common.generateWord(5);

fixture `Scripting area at Workbench`
    .meta({ type: 'critical_path', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        //Go to Workbench page
        await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    })
    .afterEach(async t => {
        await t.switchToMainWindow();
        //Drop index, documents and database
        await workbenchPage.sendCommandInWorkbench(`FT.DROPINDEX ${indexName} DD`);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    });
// Update after resolving https://redislabs.atlassian.net/browse/RI-3299
test('Verify that user can resize scripting area in Workbench', async t => {
    const commandForSend = 'info';
    const offsetY = 130;

    await workbenchPage.sendCommandInWorkbench(commandForSend);
    // Verify that user can run any script from CLI in Workbench and see the results
    await t.expect(workbenchPage.queryCardContainer.exists).ok('Query card was added');
    const sentCommandText = workbenchPage.queryCardCommand.withExactText(commandForSend);
    await t.expect(sentCommandText.exists).ok('Result of sent command exists');

    const inputHeightStart = await workbenchPage.queryInput.clientHeight;

    await t.hover(workbenchPage.resizeButtonForScriptingAndResults);
    await t.drag(workbenchPage.resizeButtonForScriptingAndResults, 0, offsetY, { speed: 0.1 });
    // Verify that user can resize scripting area
    const inputHeightEnd = inputHeightStart + 15;
    await t.expect(await workbenchPage.queryInput.clientHeight).gt(inputHeightEnd, 'Scripting area after resize has incorrect size');
});
test('Verify that user when he have more than 10 results can request to view more results in Workbench', async t => {
    indexName = Common.generateWord(5);
    keyName = Common.generateWord(5);
    const commandsForSendInCli = [
        `HMSET product:1 name "${keyName}"`,
        `HMSET product:2 name "${keyName}"`,
        `HMSET product:3 name "${keyName}"`,
        `HMSET product:4 name "${keyName}"`,
        `HMSET product:5 name "${keyName}"`,
        `HMSET product:6 name "${keyName}"`,
        `HMSET product:7 name "${keyName}"`,
        `HMSET product:8 name "${keyName}"`,
        `HMSET product:9 name "${keyName}"`,
        `HMSET product:10 name "${keyName}"`,
        `HMSET product:11 name "${keyName}"`,
        `HMSET product:12 name "${keyName}"`
    ];
    const commandToCreateSchema = `FT.CREATE ${indexName} ON HASH PREFIX 1 product: SCHEMA name TEXT`;
    const searchCommand = `FT.SEARCH ${indexName} * LIMIT 0 20`;
    //Open CLI
    await t.click(workbenchPage.Cli.cliExpandButton);
    //Create new keys for search
    for(const command of commandsForSendInCli) {
        await t.typeText(workbenchPage.Cli.cliCommandInput, command, { replace: true });
        await t.pressKey('enter');
    }
    await t.click(workbenchPage.Cli.cliCollapseButton);
    //Send commands
    await workbenchPage.sendCommandInWorkbench(commandToCreateSchema);
    //Send search command
    await workbenchPage.sendCommandInWorkbench(searchCommand);
    //Verify that we have pagination buttons
    await t.switchToIframe(workbenchPage.iframe);
    await t.expect(workbenchPage.paginationButtonPrevious.exists).ok('Pagination previous button exists');
    await t.expect(workbenchPage.paginationButtonNext.exists).ok('Pagination next button exists');
});
test('Verify that user can see result in Table and Text views for Hash data types for FT.SEARCH command in Workbench', async t => {
    indexName = Common.generateWord(5);
    keyName = Common.generateWord(5);
    const commandsForSend = [
        `FT.CREATE ${indexName} ON HASH PREFIX 1 product: SCHEMA name TEXT`,
        `HMSET product:1 name "${keyName}"`,
        `HMSET product:2 name "${keyName}"`
    ];
    const searchCommand = `FT.SEARCH ${indexName} * LIMIT 0 20`;
    //Send commands
    await workbenchPage.sendCommandInWorkbench(commandsForSend.join('\n'));
    //Send search command
    await workbenchPage.sendCommandInWorkbench(searchCommand);
    //Check that result is displayed in Table view
    await t.switchToIframe(workbenchPage.iframe);
    await t.expect(workbenchPage.queryTableResult.exists).ok('The result is displayed in Table view');
    //Select Text view type
    await t.switchToMainWindow();
    await workbenchPage.selectViewTypeText();
    //Check that result is displayed in Text view
    await t.expect(workbenchPage.queryTextResult.exists).ok('The result is displayed in Text view');
});
test('Verify that user can run one command in multiple lines in Workbench page', async t => {
    indexName = Common.generateWord(5);
    const multipleLinesCommand = [
        `FT.CREATE ${indexName}`,
        'ON HASH PREFIX 1 product:',
        'SCHEMA price NUMERIC SORTABLE'
    ];
        //Send command in multiple lines
    await workbenchPage.sendCommandInWorkbench(multipleLinesCommand.join('\n\t'), 0.5);
    //Check the result
    const resultCommand = await workbenchPage.queryCardCommand.nth(0).textContent;
    for(const commandPart of multipleLinesCommand) {
        await t.expect(resultCommand).contains(commandPart, 'The multiple lines command is in the result');
    }
});
test('Verify that user can use one indent to indicate command in several lines in Workbench page', async t => {
    indexName = Common.generateWord(5);
    const multipleLinesCommand = [
        `FT.CREATE ${indexName}`,
        'ON HASH PREFIX 1 product: SCHEMA price NUMERIC SORTABLE'
    ];
        //Send command in multiple lines
    await t.typeText(workbenchPage.queryInput, multipleLinesCommand[0]);
    await t.pressKey('enter tab');
    await t.typeText(workbenchPage.queryInput, multipleLinesCommand[1]);
    await t.click(workbenchPage.submitCommandButton);
    //Check the result
    const resultCommand = await workbenchPage.queryCardCommand.nth(0).textContent;
    for(const commandPart of multipleLinesCommand) {
        await t.expect(resultCommand).contains(commandPart, 'The multiple lines command is in the result');
    }
});
