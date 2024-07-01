// import { ClientFunction } from 'testcafe';
import { KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { DatabaseHelper } from '../../../../helpers/database';
import { BrowserPage, MyRedisDatabasePage, SettingsPage, WorkbenchPage } from '../../../../pageObjects';
import { commonUrl, ossStandaloneBigConfig } from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';
import { Common } from '../../../../helpers/common';

const myRedisDatabasePage = new MyRedisDatabasePage();
const workbenchPage = new WorkbenchPage();
const browserPage = new BrowserPage();
const settingsPage = new SettingsPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();

const externalPageLink = 'https://redis.io/docs/latest/develop/use/pipelining/';
const pipelineValues = ['-5', '5', '4', '20'];
const commandForSend = '100 scan 0 match * count 5000';

fixture `Workbench Pipeline`
    .meta({ type: 'regression', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneBigConfig);
        // Go to Settings page - Pipeline mode
        await t.click(myRedisDatabasePage.NavigationPanel.settingsButton);
        await t.click(settingsPage.accordionWorkbenchSettings);
    })
    .afterEach(async() => {
        // Delete database
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneBigConfig);
    });
test('Verify that user can see the text in settings for pipeline with link', async t => {
    const pipelineText = 'Sets the size of a command batch for the pipeline(opens in a new tab or window) mode in Workbench. 0 or 1 pipelines every command.';

    // Verify that user can enter only numbers >0 in "Commands in pipeline" input
    await t.hover(settingsPage.commandsInPipelineValue);
    await t.click(settingsPage.commandsInPipelineInput);
    await t.typeText(settingsPage.commandsInPipelineInput, pipelineValues[0], { replace: true });
    // Verify that negative number converted to positive
    await t.expect(settingsPage.commandsInPipelineInput.value).eql(pipelineValues[1], 'Value is incorrect');

    // Verify text in setting for pipeline
    await t.expect(settingsPage.accordionWorkbenchSettings.textContent).contains(pipelineText, 'Text is incorrect');
    // Unskip after updating testcafe with opening links support https://redislabs.atlassian.net/browse/RI-5565
    // await t.click(settingsPage.pipelineLink);
    // // Check new opened window page with the correct URL
    // await Common.checkURL(externalPageLink);
});
test.skip('Verify that only chosen in pipeline number of commands is loading at the same time in Workbench', async t => {
    await settingsPage.changeCommandsInPipeline(pipelineValues[1]);
    // Go to Workbench page
    await t.click(settingsPage.NavigationPanel.browserButton);
    await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    await workbenchPage.sendCommandInWorkbench(commandForSend, 0.01);
    // Verify that only selected pipeline number of commands are loaded at the same time
    await t.expect(workbenchPage.loadedCommand.count).eql(Number(pipelineValues[1]), 'The number of sending commands is incorrect');
});
test.skip('Verify that user can see spinner over Run button and grey preloader for each command', async t => {
    await settingsPage.changeCommandsInPipeline(pipelineValues[3]);
    // Go to Workbench page
    await t.click(settingsPage.NavigationPanel.browserButton);
    await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    await workbenchPage.sendCommandInWorkbench(commandForSend, 0.01);
    // Verify that user can`t start new commands from the Workbench while command(s) is executing
    await t.expect(workbenchPage.submitCommandButton.withAttribute('disabled').exists).ok('Run button is not disabled', { timeout: 5000 });
    // Verify that user can see spinner over the disabled and shrunk Run button
    await t.expect(workbenchPage.runButtonSpinner.exists).ok('Loading spinner is not displayed for Run button', { timeout: 5000 });
    await t.expect(workbenchPage.queryCardContainer.find(workbenchPage.cssDeleteCommandButton).withAttribute('disabled').count).eql(Number(pipelineValues[3]), 'The number of commands is incorrect');
});
test('Verify that user can interact with the Editor while command(s) in progress', async t => {
    const valueInEditor = '100';

    await settingsPage.changeCommandsInPipeline(pipelineValues[2]);
    // Go to Workbench page
    await t.click(settingsPage.NavigationPanel.browserButton);
    await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    await workbenchPage.sendCommandInWorkbench(commandForSend);
    await t.typeText(workbenchPage.queryInput, commandForSend, { replace: true, paste: true });
    await t.pressKey('enter');
    // 'Verify that user can interact with the Editor
    await t.expect(workbenchPage.queryInputScriptArea.textContent).contains(valueInEditor, { timeout: 5000 });
});
test('Verify that command results are added to history in order most recent - on top', async t => {
    const multipleCommands = [
        'INFO',
        'FT._LIST',
        'FT.INFO',
        'RANDOMKEY',
        'CLIENT LIST'
    ];
    const reverseCommands = multipleCommands.slice().reverse();

    await settingsPage.changeCommandsInPipeline(pipelineValues[2]);
    // Go to Workbench page
    await t.click(settingsPage.NavigationPanel.browserButton);
    await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    await workbenchPage.sendCommandInWorkbench(multipleCommands.join('\n'));
    // Check that the results for all commands are displayed in workbench history in reverse order (most recent - on top)
    for (let i = 0; i < multipleCommands.length; i++) {
        await t.expect(workbenchPage.queryCardCommand.nth(i).textContent).contains(reverseCommands[i], 'Wrong order of commands');
    }
});
