import { KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { DatabaseHelper } from '../../../../helpers/database';
import { BrowserPage, WorkbenchPage } from '../../../../pageObjects';
import { commonUrl, ossStandaloneConfig } from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';

const workbenchPage = new WorkbenchPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();
const browserPage = new BrowserPage();

fixture `Autocomplete for entered commands`
    .meta({ type: 'regression', rte: rte.standalone })
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
test('Verify that user can open the "read more" about the command by clicking on the ">" icon or "ctrl+space"', async t => {
    const command = 'HSET';
    const commandDetails = [
        'HSET key field value [field value ...]',
        'Creates or modifies the value of a field in a hash.',
        'Read more',
        'Arguments:',
        'required key',
        'multiple field value'
    ];

    // Type command
    await t.typeText(workbenchPage.queryInput, command, { replace: true });
    // Open the read more by clicking on the "ctrl+space" and check
    await t.pressKey('ctrl+space');
    await t.expect(workbenchPage.MonacoEditor.monacoCommandDetails.exists).ok('The "read more" about the command is not opened');
    for(const detail of commandDetails) {
        await t.expect(workbenchPage.MonacoEditor.monacoCommandDetails.textContent).contains(detail, `The ${detail} command detail is not displayed`);
    }
    // Close the command details
    await t.pressKey('ctrl+space');
    await t.expect(workbenchPage.MonacoEditor.monacoCommandDetails.exists).notOk('The "read more" about the command is not closed');
});
test('Verify that user can see static list of arguments is displayed when he enters the command in Editor in Workbench', async t => {
    const command = 'AI.SCRIPTEXECUTE';
    const command2 = 'TS.DELETERULE ';

    // Type the command in Editing area
    await t.typeText(workbenchPage.queryInput, command, { replace: true });
    // Check that no hints are displayed
    await t.expect(workbenchPage.MonacoEditor.monacoHintWithArguments.visible).notOk('Hints with arguments are still displayed');
    // Add space after the printed command
    await t.typeText(workbenchPage.queryInput, `${command} `, { replace: true });
    // Check that hint with arguments are displayed
    await t.expect(workbenchPage.MonacoEditor.monacoHintWithArguments.visible).ok('Hints with arguments are not displayed');

    await t.typeText(workbenchPage.queryInput, command2, { replace: true });
    // Check that hint with arguments are displayed
    await t.expect(workbenchPage.MonacoEditor.monacoHintWithArguments.visible).ok('Hints with arguments are not displayed');
    // Remove hints with arguments
    await t.pressKey('esc');
    // Verify that user can close the static list of arguments by pressing “ESC”
    await t.expect(workbenchPage.MonacoEditor.monacoHintWithArguments.visible).notOk('Hints with arguments are still displayed');
});
test('Verify that user can see the static list of arguments when he uses “Ctrl+Shift+Space” combination for already entered command for Windows', async t => {
    const command = 'JSON.ARRAPPEND';
    await t.typeText(workbenchPage.queryInput, command, { replace: true });
    // Verify that the list with auto-suggestions is displayed
    await t.expect(workbenchPage.MonacoEditor.monacoSuggestion.exists).ok('Auto-suggestions are not displayed');
    // Select the command from suggestion list
    await t.pressKey('enter');
    // Check that the command is displayed in Editing area after selecting
    const script = await workbenchPage.queryInputScriptArea.textContent;
    await t.expect(script.replace(/\s/g, ' ')).eql('JSON.ARRAPPEND key value', 'Result of sent command not exists');
    // Check that hint with arguments are displayed
    await t.expect(workbenchPage.MonacoEditor.monacoHintWithArguments.visible).ok('Hints with arguments are not displayed');
    // Remove hints with arguments
    await t.pressKey('esc');
    // Check no hints are displayed
    await t.expect(workbenchPage.MonacoEditor.monacoHintWithArguments.visible).notOk('Hints with arguments are still displayed');
    // Check that using shortcut “Ctrl+Shift+Space” hints are displayed
    await t.pressKey('ctrl+shift+space');
    await t.expect(workbenchPage.MonacoEditor.monacoHintWithArguments.visible).ok('Hints with arguments are not displayed');
});
