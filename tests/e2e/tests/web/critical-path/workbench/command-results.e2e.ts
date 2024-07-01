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

const commandForSend1 = 'info';
const commandForSend2 = 'FT._LIST';
let indexName = Common.generateWord(5);

fixture `Command results at Workbench`
    .meta({ type: 'critical_path', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        // Go to Workbench page
        await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    })
    .afterEach(async t => {
        await t.switchToMainWindow();
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    });
test('Verify that user can see re-run icon near the already executed command and re-execute the command by clicking on the icon in Workbench page', async t => {
    // Send commands
    await workbenchPage.sendCommandInWorkbench(commandForSend1);
    await workbenchPage.sendCommandInWorkbench(commandForSend2);
    const containerOfCommand = await workbenchPage.getCardContainerByCommand(commandForSend1);
    const containerOfCommand2 = await workbenchPage.getCardContainerByCommand(commandForSend2);
    // Verify that re-run icon is displayed
    await t.expect(await workbenchPage.reRunCommandButton.visible).ok('Re-run icon is not displayed');
    // Re-run the last command in results
    await t.click(containerOfCommand.find(workbenchPage.cssReRunCommandButton));
    // Verify that command is re-executed
    await t.expect(workbenchPage.queryCardCommand.textContent).eql(commandForSend1, 'The command is not re-executed');

    // Verify that user can see expanded result after command re-run at the top of results table in Workbench
    await t.expect(await workbenchPage.queryCardContainer.nth(0).find(workbenchPage.cssQueryTextResult).visible)
        .ok('Re-executed command is not expanded');
    await t.expect(workbenchPage.queryCardCommand.nth(0).textContent).eql(commandForSend1, 'The re-executed command is not at the top of results table');

    // Delete the command from results
    await t.click(containerOfCommand2.find(workbenchPage.cssDeleteCommandButton));
    // Verify that user can delete command with result from table with results in Workbench
    await t.expect(workbenchPage.queryCardCommand.withExactText(commandForSend2).exists).notOk(`Command ${commandForSend2} is not deleted from table with results`);
});
test('Verify that user can see the results found in the table view by default for FT.INFO, FT.SEARCH and FT.AGGREGATE', async t => {
    const commands = [
        'FT.INFO',
        'FT.SEARCH',
        'FT.AGGREGATE'
    ];
        // Send commands and check table view is default
    for(const command of commands) {
        await workbenchPage.sendCommandInWorkbench(command);
        await t.expect(workbenchPage.queryCardContainer.nth(0).find(workbenchPage.cssTableViewTypeOption).exists).ok(`The table view is not selected by default for command ${command}`);
    }
});
test
    .after(async() => {
        await workbenchPage.sendCommandInWorkbench(`FT.DROPINDEX ${indexName} DD`);
    })('Verify that user can switches between views and see results according to the view rules in Workbench in results', async t => {
        indexName = Common.generateWord(5);
        const commands = [
            'hset doc:10 title "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud" url "redis.io" author "Test" rate "undefined" review "0" comment "Test comment"',
            `FT.CREATE ${indexName} ON HASH PREFIX 1 doc: SCHEMA title TEXT WEIGHT 5.0 body TEXT url TEXT author TEXT rate TEXT review TEXT comment TEXT`,
            `FT.SEARCH ${indexName} * limit 0 10000`
        ];
        // Send commands and check table view is default for Search command
        for (const command of commands) {
            await workbenchPage.sendCommandInWorkbench(command);
        }
        await t.expect(await workbenchPage.queryCardContainer.nth(0).find(workbenchPage.cssTableViewTypeOption).exists)
            .ok('The table view is not selected by default for command FT.SEARCH');
        await t.switchToIframe(workbenchPage.iframe);
        await t.expect(await workbenchPage.queryTableResult.visible).ok('The table result is not displayed for command FT.SEARCH');
        // Select Text view and check result
        await t.switchToMainWindow();
        await workbenchPage.selectViewTypeText();
        await t.expect(await workbenchPage.queryCardContainer.nth(0).find(workbenchPage.cssQueryTextResult).visible).ok('The result is not displayed in Text view');
    });

test('Verify that user can switches between Table and Text for Client List and see results corresponding to their views', async t => {
    const command = 'CLIENT LIST';
    // Send command and check table view is default
    await workbenchPage.sendCommandInWorkbench(command);
    await t.expect(await workbenchPage.queryCardContainer.nth(0).find(workbenchPage.cssClientListViewTypeOption).exists)
        .ok('The table view is not selected by default for command CLIENT LIST');
    await t.switchToIframe(workbenchPage.iframe);

    await t.expect(await workbenchPage.queryTableResult.visible)
        .ok('The search results are not displayed in Client List Table view by default');
    // Select Text view from dropdown and check search results
    await t.switchToMainWindow();
    await workbenchPage.selectViewTypeText();
    await t.expect(await workbenchPage.queryCardContainer.nth(0).find(workbenchPage.cssQueryTextResult).visible)
        .ok('The result is not displayed in Text view');
});

test
    .after(async() => {
        // remove all keys
        workbenchPage.sendCommandInWorkbench('flushdb');
    })('Verify that user can switches between JSON view and Text view and see proper result', async t => {
        const jsonObj = { a: 2 };
        const json = JSON.stringify(jsonObj);
        const sendCommandsJsonGet = [
            `JSON.SET doc1 $ '${json}'`,
            'JSON.GET doc1'
        ];

        const sendCommandsJsonMGet = [
            `JSON.SET doc2 $ '${json}'`,
            'JSON.MGET doc2 $'
        ];

        const sendCommandsStringGet = [
            `SET doc3 '${json}'`,
            'GET doc3'
        ];

        // Send command and check json view is default for json.get
        await workbenchPage.sendCommandInWorkbench(sendCommandsJsonGet.join('\n'));
        await t.expect(await workbenchPage.queryCardContainer.nth(0).find(workbenchPage.cssJsonViewTypeOption).exists)
            .ok('The json view is not selected by default for command JSON.GET');

        await t.switchToIframe(workbenchPage.iframe);

        let jsonTextActual = await Common.removeEmptySpacesAndBreak(await workbenchPage.queryJsonResult.textContent);
        let jsonTextExpected = await Common.removeEmptySpacesAndBreak(json);
        await t.expect(jsonTextActual).eql(jsonTextExpected);

        await t.switchToMainWindow();
        await workbenchPage.sendCommandInWorkbench(sendCommandsJsonMGet.join('\n'));
        await t.expect(await workbenchPage.queryCardContainer.nth(0).find(workbenchPage.cssJsonViewTypeOption).exists)
            .ok('The json view is not selected by default for command JSON.MGET');

        await t.switchToIframe(workbenchPage.iframe);
        const expectedJsonMGet = JSON.stringify([[jsonObj]]);
        jsonTextActual = await Common.removeEmptySpacesAndBreak(await workbenchPage.queryJsonResult.textContent);
        jsonTextExpected = await Common.removeEmptySpacesAndBreak(expectedJsonMGet);
        await t.expect(jsonTextActual).eql(jsonTextExpected);

        await t.switchToMainWindow();
        await workbenchPage.sendCommandInWorkbench(sendCommandsStringGet.join('\n'));
        await workbenchPage.selectViewTypeJson();

        await t.switchToIframe(workbenchPage.iframe);
        jsonTextActual = await Common.removeEmptySpacesAndBreak(await workbenchPage.queryJsonResult.textContent);
        jsonTextExpected = await Common.removeEmptySpacesAndBreak(json);
        await t.expect(jsonTextActual).eql(jsonTextExpected);
    });

test
    .after(async() => {
        //Drop database
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    })('Verify that user can populate commands in Editor from history by clicking keyboard “up” button', async t => {
        const commands = [
            'FT.INFO',
            'RANDOMKEY',
            'set'
        ];
        // Send commands
        for(const command of commands) {
            await workbenchPage.sendCommandInWorkbench(command);
        }
        // Clear input
        await t
            .click(workbenchPage.queryInput)
            .pressKey('ctrl+a')
            .pressKey('delete');
        // Verify the quick access to command history by up button
        for (const command of commands.reverse()) {
            await t.pressKey('up');
            const script = await workbenchPage.scriptsLines.textContent;
            await t.expect(script.replace(/\s/g, ' ')).contains(command, 'Result of Manual command is not displayed');
        }
    });
