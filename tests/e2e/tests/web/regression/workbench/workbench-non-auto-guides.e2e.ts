import { DatabaseHelper } from '../../../../helpers/database';
import { WorkbenchPage, MyRedisDatabasePage, BrowserPage } from '../../../../pageObjects';
import { KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { commonUrl, ossStandaloneConfig } from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';
import { Common } from '../../../../helpers/common';
import { APIKeyRequests } from '../../../../helpers/api/api-keys';

const myRedisDatabasePage = new MyRedisDatabasePage();
const workbenchPage = new WorkbenchPage();
const browserPage = new BrowserPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();
const apiKeyRequests = new APIKeyRequests();

const counter = 7;
const unicodeValue = '山女馬 / 马目 abc 123';
const keyName = Common.generateWord(10);
const keyValue = '\\xe5\\xb1\\xb1\\xe5\\xa5\\xb3\\xe9\\xa6\\xac / \\xe9\\xa9\\xac\\xe7\\x9b\\xae abc 123';
const parameters = [
    '[results=group]',
    '[mode=raw]',
    '[mode=raw;results=group;pipeline=3]',
    '[mode=ascii;results=single]',
    '[mode=ascii;mode=raw;results=single]',
    '[mode=raw;results=silent;pipeline=3]',
    '[mode=ascii;results=silent;pipeline=1]'
];
const commands = [
    `${counter} INFO`,
    `${counter} get ${keyName}`,
    `get ${keyName}`,
    'invalidCommand'
];

fixture `Workbench modes to non-auto guides`
    .meta({ type: 'regression', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    })
    .afterEach(async() => {
        // Delete database
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    });
test
    .before(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
        await workbenchPage.sendCommandInWorkbench(`set ${keyName} "${keyValue}"`);
    })
    .after(async t => {
        // Clear and delete database
        await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
        await apiKeyRequests.deleteKeyByNameApi(keyName, ossStandaloneConfig.databaseName);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    })('Workbench modes from editor', async t => {
        const groupCommandResultName = `${counter} Command(s) - ${counter} success, 0 error(s)`;
        const containerOfCommand = await workbenchPage.getCardContainerByCommand(groupCommandResultName);

        // Verify that results parameter applied from the first raw in the Workbench Editor
        await workbenchPage.sendMultipleCommandsInWorkbench([parameters[0], commands[0]]);
        await t.expect(workbenchPage.queryCardCommand.textContent).eql(groupCommandResultName, 'Group mode not applied');
        await t.hover(workbenchPage.parametersAnchor);
        // Verify that group mode icon is displayed
        await t.expect(workbenchPage.groupModeIcon.exists).ok('Group mode icon not displayed');

        // Verify that mode parameter applied from the first raw in the Workbench Editor
        await workbenchPage.sendMultipleCommandsInWorkbench([parameters[1], commands[2]]);
        await workbenchPage.checkWorkbenchCommandResult(commands[2], `"${unicodeValue}"`);
        await t.hover(workbenchPage.parametersAnchor);
        // Verify that raw mode icon is displayed
        await t.expect(workbenchPage.rawModeIcon.exists).ok('Raw mode icon not displayed');

        // Verify that multiple parameters applied from the first raw in the Workbench Editor
        await workbenchPage.sendMultipleCommandsInWorkbench([parameters[2], commands[1]]);
        await t.expect(workbenchPage.queryCardCommand.textContent).eql(groupCommandResultName, 'Group mode not applied');
        const actualCommandResult = await workbenchPage.queryCardContainer.nth(0).find(workbenchPage.cssQueryTextResult).textContent;
        await t.expect(actualCommandResult).contains(`"${unicodeValue}"`, 'Actual command result is not equal to executed');

        await t.hover(workbenchPage.parametersAnchor);
        // Verify that raw and group mode icons are displayed
        await t.expect(workbenchPage.groupModeIcon.exists).ok('Group mode icon not displayed');
        await t.expect(workbenchPage.rawModeIcon.exists).ok('Raw mode icon not displayed');

        // Add text with parameters in Workbench editor input
        await t.typeText(workbenchPage.queryInput, parameters[4], { replace: true });
        // Re-run the last command in results
        await t.click(containerOfCommand.find(workbenchPage.cssReRunCommandButton));
        // Verify that on re-run any command from history the same parameters specified regardless of Workbench editor input
        await t.expect(actualCommandResult).contains(`"${unicodeValue}"`, 'The command is not re-executed');

        // Clear value in input
        await t.click(workbenchPage.submitCommandButton);
        // Turn on raw and group modes
        await t.click(workbenchPage.rawModeBtn);
        await t.click(workbenchPage.groupMode);
        await workbenchPage.sendMultipleCommandsInWorkbench([parameters[3], commands[1]]);
        // Verify that Workbench Editor parameters have more priority than manually clicked modes
        await t.expect(workbenchPage.queryTextResult.textContent).contains(`"${keyValue}"`, 'The mode is not applied from editor parameters');
        await t.expect(workbenchPage.queryCardCommand.textContent).eql(`get ${keyName}`, 'The result is not applied from editor parameters');

        // Turn off raw and group modes
        await t.click(workbenchPage.rawModeBtn);
        await t.click(workbenchPage.groupMode);
        // Verify that if user specifies the same parameters he can see the first one is applied
        await workbenchPage.sendMultipleCommandsInWorkbench([parameters[4], commands[1]]);
        await t.expect(workbenchPage.queryTextResult.textContent).contains(`"${keyValue}"`, 'The first duplicated parameter not applied');
    });
test('Workbench Silent mode', async t => {
    const silentCommandSuccessResultName = `${counter} Command(s) - ${counter} success`;
    const silentCommandErrorsResultName = `${counter + 1} Command(s) - ${counter} success, 1 error(s)`;
    const errorResult = `"ERR unknown command \`${commands[3]}\`, with args beginning with: "`;

    await workbenchPage.sendMultipleCommandsInWorkbench([parameters[5], commands[0]]);
    // Verify that user can see the success command output with header: {number} Command(s) - {number} success
    await t.expect(workbenchPage.queryCardCommand.textContent).eql(silentCommandSuccessResultName, 'Silent mode not applied');
    // Verify that user can see the command output is grouped into one window when run any guide or tutorial with the [results=silent]
    await t.expect(workbenchPage.queryCardContainer.nth(0).find(workbenchPage.cssQueryTextResult).exists).notOk('The result is displayed in silent mode');

    await t.hover(workbenchPage.parametersAnchor);
    // Verify that silent mode icon displayed
    await t.expect(workbenchPage.silentModeIcon.exists).ok('Silent mode icon not displayed');

    await workbenchPage.sendMultipleCommandsInWorkbench([parameters[6], commands[3], commands[0]]);
    // Verify that user can expand the results to see the list of commands with errors and the list of errors per a command
    await t.click(workbenchPage.queryCardContainer.nth(0));
    await t.expect(workbenchPage.queryTextResult.nth(0).textContent).contains(commands[3], 'Silent mode result does not contain error');
    await t.expect(workbenchPage.commandExecutionResultFailed.textContent).contains(errorResult, 'Error message not displayed');
    await t.expect(workbenchPage.queryTextResult.nth(0).textContent).notContains('INFO', 'Silent mode result contains not only errors');
    // Verify that user can see the errors command output with header: {number} Command(s) - {number} success, {number} error(s)
    await t.expect(workbenchPage.queryCardCommand.textContent).eql(silentCommandErrorsResultName, 'Silent mode with errors header text is invalid');
});
