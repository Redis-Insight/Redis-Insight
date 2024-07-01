import { DatabaseHelper } from '../../../../helpers/database';
import { BrowserPage, WorkbenchPage } from '../../../../pageObjects';
import { commonUrl, ossStandaloneConfig } from '../../../../helpers/conf';
import { KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';

const browserPage = new BrowserPage();
const workbenchPage = new WorkbenchPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();

fixture `Scripting area at Workbench`
    .meta({ type: 'smoke', rte: rte.standalone })
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
test('Verify that user can comment out any characters in scripting area and all these characters in this raw number are not send in the request', async t => {
    const command1 = 'info';
    const command2 = 'command';
    const commandForSend = [
        '// some comment before command',
        '\n',
        command1,
        '\n',
        '// some comment between commands with slashes // ** //',
        '\n',
        `${command2} // comment in the row with command`,
        '\n',
        '// some comment after command'
    ];
        // Send command
    await workbenchPage.sendCommandInWorkbench(commandForSend.join(''));
    // Check that 2 results are shown
    await t.expect(workbenchPage.queryCardContainer.count).eql(2);
    // Check that we have results with sent commands
    const sentCommandText1 = workbenchPage.queryCardCommand.withExactText(command1);
    await t.expect(sentCommandText1.exists).ok('Result of sent command not exists');
    const sentCommandText2 = workbenchPage.queryCardCommand.withExactText(command2);
    await t.expect(sentCommandText2.exists).ok('Result of sent command not exists');
});
test('Verify that user can run multiple commands in one query in Workbench', async t => {
    const commandForSend1 = 'info';
    const commandForSend2 = 'FT._LIST';
    const multipleCommands = [
        'info',
        'command',
        'FT.SEARCH idx *'
    ];
        // Send commands
    await workbenchPage.sendCommandInWorkbench(commandForSend1);
    await t.expect(workbenchPage.executionCommandTime.exists).ok('Execution command time is not displayed for single command');
    await t.expect(workbenchPage.executionCommandTime.exists).ok('Execution time icon is not displayed for single command');
    await workbenchPage.sendCommandInWorkbench(commandForSend2);
    // Check that all the previous run commands are saved and displayed
    await workbenchPage.reloadPage();
    await t.expect(workbenchPage.queryCardCommand.withExactText(commandForSend1).exists).ok('The previous run commands are not saved');
    await t.expect(workbenchPage.queryCardCommand.withExactText(commandForSend2).exists).ok('The previous run commands are not saved');
    // Send multiple commands in one query
    await workbenchPage.sendCommandInWorkbench(multipleCommands.join('\n'), 0.75);
    // Check that the results for all commands are displayed
    for(const command of multipleCommands) {
        await t.expect(workbenchPage.queryCardCommand.withExactText(command).exists).ok(`The command ${command} from multiple query is not displayed`);
    }
    // Reload page and validate that time executions are displayed for collapsed commands
    await workbenchPage.reloadPage();
    const countCommandsInHistory = await workbenchPage.queryCardCommand.count;
    const countExecutionTime = await workbenchPage.executionCommandTime.count;
    const countExecutionIcon = await workbenchPage.executionCommandIcon.count;
    await t.expect(countExecutionTime).eql(countCommandsInHistory, 'Not correct number of execution time');
    await t.expect(countExecutionIcon).eql(countCommandsInHistory, 'Not correct number of execution time');
});
