import { Selector } from 'testcafe';
import { KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { DatabaseHelper } from '../../../../helpers/database';
import { BrowserPage, WorkbenchPage } from '../../../../pageObjects';
import { commonUrl, ossStandaloneBigConfig } from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';

const browserPage = new BrowserPage();
const workbenchPage = new WorkbenchPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();

const counter = 7;
const command = 'RANDOMKEY';
const commands = ['set key test', 'get key', 'del key'];
const commandsResult = ['OK', 'test', '1'];
const commandsNumber = commands.length;
const commandsString = commands.join('\n');

fixture `Workbench Group Mode`
    .meta({ type: 'regression', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneBigConfig);
        // Go to Workbench page
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    })
    .afterEach(async() => {
        // Delete database
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneBigConfig);
    });
test('Verify that user can run the commands from the Editor in the group mode', async t => {
    await t.click(workbenchPage.groupMode);
    // Verify that user can run a command with quantifier and see results in group(10 info)
    await workbenchPage.sendCommandInWorkbench(`${counter} ${command}`);
    // Verify that user can see number of total commands in group, success commands, number of failed commands in header summary in Workbench
    await t.expect(workbenchPage.queryCardCommand.textContent).contains(`${counter} Command(s) - ${counter} success, 0 error(s)`, 'Not valid summary');
    // Verify that if users execute commands in group mode, they see summary of the commands execution
    await t.expect(workbenchPage.executionCommandTime.exists).ok('Execution time is not displayed');
    await t.expect(workbenchPage.executionCommandIcon.exists).ok('Execution time icon is not displayed');
    // Verify that user can see full list of commands with results run in group
    await t.expect(workbenchPage.queryTextResult.find(workbenchPage.cssWorkbenchCommandInHistory).withText(`> ${command}`).count).eql(counter, 'Number of commands is not correct');
    // Verify that if the only one command is executed in group, the result will be displayed as for group mode
    await workbenchPage.sendCommandInWorkbench(`${command}`);
    await t.expect(workbenchPage.queryCardCommand.textContent).eql('1 Command(s) - 1 success, 0 error(s)', 'Not valid summary for 1 command');
    // Turn off group mode
    await t.click(workbenchPage.groupMode);
    await workbenchPage.sendCommandInWorkbench(commandsString);
    await t.expect(workbenchPage.queryCardCommand.textContent).notEql(`${commandsNumber} Command(s) - ${commandsNumber} success, 0 error(s)`, 'Commands are sent in groups');
    for (let i = 0; i++; i < commandsNumber) {
        await workbenchPage.checkWorkbenchCommandResult(command[i], commandsResult[i], i);
    }
});
// Skip due to testcafe doesn't work with clipboard buffer. Need to add client function to check this test
test.skip('Verify that when user clicks on copy icon for group result, all commands are copied', async t => {
    await t.click(workbenchPage.groupMode);
    await workbenchPage.sendCommandInWorkbench(`${commandsString}`); // 3 commands are sent in group mode
    // Copy commands from group result
    await t.click(workbenchPage.copyCommand);
    await t.rightClick(workbenchPage.queryInputScriptArea);
    await t.click(Selector('span').withAttribute('aria-label', 'Paste'));
    await t.pressKey('ctrl+enter');
    await t.expect(workbenchPage.queryCardCommand.textContent).eql(`${commandsNumber} Command(s) - ${commandsNumber} success, 0 error(s)`, 'Not valid summary');
});
test('Verify that user can see group results in full mode', async t => {
    await t.click(workbenchPage.groupMode);
    await workbenchPage.sendCommandInWorkbench(`${commandsString}`); // 3 commands are sent in group mode
    // Open full mode
    await t.click(workbenchPage.fullScreenButton);
    await t.expect(workbenchPage.queryCardCommand.textContent).eql(`${commandsNumber} Command(s) - ${commandsNumber} success, 0 error(s)`, 'Not valid summary');
    await t.expect(workbenchPage.queryTextResult.find(workbenchPage.cssWorkbenchCommandInHistory).withText('> ').count).eql(commandsNumber, 'Number of commands is not correct');
    await t.expect(workbenchPage.queryTextResult.find(workbenchPage.cssWorkbenchCommandInHistory).count).eql(commandsNumber, 'Number of command result is not correct');
});
