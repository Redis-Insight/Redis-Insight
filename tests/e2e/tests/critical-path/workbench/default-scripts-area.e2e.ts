import { addNewStandaloneDatabase } from '../../../helpers/database';
import { WorkbenchPage } from '../../../pageObjects/workbench-page';
import { MyRedisDatabasePage, UserAgreementPage, AddRedisDatabasePage } from '../../../pageObjects';
import {
    commonUrl,
    ossStandaloneConfig
} from '../../../helpers/conf';

const myRedisDatabasePage = new MyRedisDatabasePage();
const userAgreementPage = new UserAgreementPage();
const addRedisDatabasePage = new AddRedisDatabasePage();
const workbenchPage = new WorkbenchPage();

const indexName =  'products';

fixture `Default scripts area at Workbench`
    .meta({type: 'critical_path'})
    .page(commonUrl)
    .beforeEach(async t => {
        await t.maximizeWindow();
        await userAgreementPage.acceptLicenseTerms();
        await t.expect(addRedisDatabasePage.addDatabaseButton.exists).ok('The add redis database view', {timeout: 20000});
        await addNewStandaloneDatabase(ossStandaloneConfig);
        //Connect to DB
        await myRedisDatabasePage.clickOnDBByName(ossStandaloneConfig.databaseName);
        //Go to Workbench page
        await t.click(myRedisDatabasePage.workbenchButton);
    })
    .afterEach(async t => {
        //Drop index and documents
        await workbenchPage.sendCommandInWorkbench('FT.DROPINDEX products DD');
    })
//skipped due the inaccessibility of the iframe
test.skip('Verify that user can edit and run automatically added "FT._LIST" and "FT.INFO {index}" scripts in Workbench and see the results', async t => {
    const commandsForSend = [
        `FT.CREATE ${indexName} ON HASH PREFIX 1 product: SCHEMA name TEXT`,
        'HMSET product:1 name "Apple Juice" ',
        'HMSET product:2 name "Apple Juice"'
    ];
    //Send commands
    await workbenchPage.sendCommandInWorkbench(commandsForSend.join('\n'));
    //Run automatically added "FT._LIST" script
    await t.click(workbenchPage.internalLinkWorkingWithHashes);
    await t.click(workbenchPage.preselectList);
    await t.click(workbenchPage.submitCommandButton);
    //Check the FT._LIST result
    await t.expect(workbenchPage.queryTextResult.textContent).contains(indexName, 'The result of the FT._LIST command');
    //Run automatically added "FT.INFO {index}" script with added index
    await t.click(workbenchPage.preselectIndexInfo);
    let addedScript = await workbenchPage.queryInputScriptArea.nth(3).textContent;
    //Replace the {index} with indexName value in script and send
    addedScript = addedScript.replace('"permits"', indexName);
    addedScript = addedScript.replace(/\s/g, ' ');
    await t.pressKey('ctrl+a delete');
    await workbenchPage.sendCommandInWorkbench(addedScript);
    //Check the FT.INFO result
    await t.switchToIframe(workbenchPage.iframe);
    await t.expect(workbenchPage.queryColumns.textContent).contains('name', 'The result of the FT.INFO command');
    await t.switchToMainWindow();
});
//skipped due the inaccessibility of the iframe
test.skip('Verify that user can edit and run automatically added "Search" script in Workbench and see the results', async t => {
    const commandsForSend = [
        `FT.CREATE ${indexName} ON HASH PREFIX 1 product: SCHEMA name TEXT`,
        'HMSET product:1 name "Apple Juice"',
        'HMSET product:2 name "Apple Juice"'
    ];
    const searchCommand = `FT.SEARCH "${indexName}" "Apple Juice"`;
    //Send commands
    await workbenchPage.sendCommandInWorkbench(commandsForSend.join('\n'));
    //Run automatically added FT.SEARCH script with edits
    await t.click(workbenchPage.internalLinkWorkingWithHashes);
    await t.click(workbenchPage.preselectExactSearch);
    await t.pressKey('ctrl+a delete');
    await workbenchPage.sendCommandInWorkbench(searchCommand);
    //Check the FT.SEARCH result
    await t.switchToIframe(workbenchPage.iframe);
    const key = workbenchPage.queryTableResult.withText('product:1');
    const name = workbenchPage.queryTableResult.withText('Apple Juice');
    await t.expect(key.exists).ok('The added key is in the Search result');
    await t.expect(name.exists).ok('The added key name field is in the Search result');
    await t.switchToMainWindow();
});
//skipped due the inaccessibility of the iframe
test.skip('Verify that user can edit and run automatically added "Aggregate" script in Workbench and see the results', async t => {
    const aggregationResultField = 'max_price';
    const commandsForSend = [
        `FT.CREATE ${indexName} ON HASH PREFIX 1 product: SCHEMA price NUMERIC SORTABLE`,
        'HMSET product:1 price 20',
        'HMSET product:2 price 100'
    ];
    const searchCommand = `FT.Aggregate ${indexName} * GROUPBY 0 REDUCE MAX 1 @price AS ${aggregationResultField}`;
    //Send commands
    await workbenchPage.sendCommandInWorkbench(commandsForSend.join('\n'), 0.5);
    //Run automatically added FT.Aggregate script with edits
    await t.click(workbenchPage.internalLinkWorkingWithHashes);
    await t.click(workbenchPage.preselectGroupBy);
    await t.pressKey('ctrl+a delete');
    await workbenchPage.sendCommandInWorkbench(searchCommand);
    //Check the FT.Aggregate result
    await t.switchToIframe(workbenchPage.iframe);
    await t.expect(workbenchPage.queryTableResult.textContent).contains(aggregationResultField, 'The aggregation field name is in the Search result');
    await t.expect(workbenchPage.queryTableResult.textContent).contains('100', 'The aggregation max value is in the Search result');
    await t.switchToMainWindow();
});
test('Verify that when the “Manual” option clicked, user can see the Editor is automatically prepopulated with the information', async t => {
    const information = [
        '// Workbench is the advanced Redis command-line interface that allows to send commands to Redis, read and visualize the replies sent by the server.',
        '// Enter multiple commands at different rows to run them at once.',
        '// Start a new line with an indent (Tab) to specify arguments for any Redis command in multiple line mode.'
    ];
    //Click on the Manual option
    await t.click(workbenchPage.preselectManual);
    //Resize the scriptiong area
    const offsetY = 200;
    await t.drag(workbenchPage.resizeButtonForScriptingAndResults, 0, offsetY, { speed: 0.4 });
    //Check the result
    const script = await workbenchPage.scriptsLines.textContent;
    for(const info of information) {
        await t.expect(script.replace(/\s/g, ' ')).contains(info, 'Result of Manual command is displayed');
    }
});
