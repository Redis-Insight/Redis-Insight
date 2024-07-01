import { getRandomParagraph } from '../../../../helpers/keys';
import { DatabaseHelper } from '../../../../helpers/database';
import { BrowserPage, WorkbenchPage } from '../../../../pageObjects';
import { KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { commonUrl, ossStandaloneConfig } from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';
import { Common } from '../../../../helpers/common';

const browserPage = new BrowserPage();
const workbenchPage = new WorkbenchPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();

const oneMinuteTimeout = 60000;
let keyName = Common.generateWord(10);
const command = `set ${keyName} test`;

fixture `History of results at Workbench`
    .meta({ type: 'regression' })
    .page(commonUrl)
    .beforeEach(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        // Go to Workbench page
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    })
    .afterEach(async() => {
        // Clear and delete database
        await workbenchPage.Cli.sendCommandInCli(`DEL ${keyName}`);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    });
test
    .meta({ rte: rte.standalone })('Verify that user can see original date and time of command execution in Workbench history after the page update', async t => {
        keyName = Common.generateWord(5);
        // Send command and remember the time
        await workbenchPage.sendCommandInWorkbench(command);
        const dateTime = await workbenchPage.queryCardContainer.nth(0).find(workbenchPage.cssCommandExecutionDateTime).textContent;
        // Wait fo 1 minute, refresh page and check results
        await t.wait(oneMinuteTimeout);
        await workbenchPage.reloadPage();
        await t.expect(workbenchPage.queryCardContainer.nth(0).find(workbenchPage.cssCommandExecutionDateTime).textContent).eql(dateTime, 'The original date and time of command execution is not saved after the page update');
    });
//skipped due the long time execution and hangs of test
test.skip
    .meta({ rte: rte.standalone })
    .after(async() => {
        // Delete database
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    })('Verify that if command result is more than 1 MB and user refreshes the page, the message "Results have been deleted since they exceed 1 MB. Re-run the command to see new results." is displayed', async t => {
        const commandToSend = 'set key';
        const commandToGet = 'get key';
        const commandText = getRandomParagraph(10).repeat(100);

        // Send command with value that exceed 1MB
        await workbenchPage.sendCommandInWorkbench(`${commandToSend} "${commandText}"`);
        await workbenchPage.sendCommandInWorkbench(commandToGet);
        // Refresh the page and check result
        await workbenchPage.reloadPage();
        await t.click(workbenchPage.queryCardContainer.withText(commandToGet));
        await t.expect(workbenchPage.queryTextResult.textContent).eql('"Results have been deleted since they exceed 1 MB. Re-run the command to see new results."', 'The message is not displayed');
    });
test
    .meta({ rte: rte.standalone })('Verify that the first command in workbench history is deleted when user executes 31 command (new the following result replaces the first result)', async t => {
        keyName = Common.generateWord(10);
        const numberOfCommands = 30;
        const firstCommand = 'FT._LIST';

        //Send command the first command
        await workbenchPage.sendCommandInWorkbench(firstCommand);
        await t.expect(workbenchPage.queryCardContainer.nth(0).textContent).contains(firstCommand, 'The first executed command is not in the workbench history');
        // Send 30 commands and check the results
        await workbenchPage.sendCommandInWorkbench(`${numberOfCommands} ${command}`);
        await t.expect(workbenchPage.queryCardCommand.find('span').withExactText(`${firstCommand}`).exists).notOk('The first command is still in the history result');
        await t.expect(workbenchPage.queryCardCommand.count).eql(30, { timeout: 5000 });
    });
test
    .meta({ rte: rte.none })('Verify that user can see cursor is at the first character when Editor is empty', async t => {
        const commands = [
            'FT.INFO',
            'RANDOMKEY'
        ];
        const commandForCheck = 'SET';

        // Send commands
        for(const command of commands) {
            await workbenchPage.sendCommandInWorkbench(command);
        }
        // Verify the quick access to history works when cursor is at the first character
        await t.typeText(workbenchPage.queryInput, commandForCheck);
        await t.pressKey('enter');
        await t.pressKey('up');
        const script = await workbenchPage.scriptsLines.textContent;
        await t.expect(script.replace(/\s/g, ' ')).contains(commandForCheck, 'The command is not changed');
    });
