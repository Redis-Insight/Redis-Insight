import { KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { DatabaseHelper } from '../../../../helpers/database';
import { BrowserPage, MyRedisDatabasePage, WorkbenchPage } from '../../../../pageObjects';
import { commonUrl, ossStandaloneConfig } from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';

const myRedisDatabasePage = new MyRedisDatabasePage();
const workbenchPage = new WorkbenchPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();
const browserPage = new BrowserPage();

fixture `Autocomplete for entered commands`
    .meta({ type: 'critical_path', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        // Go to Workbench page
        await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    })
    .afterEach(async() => {
        // Delete database
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    });
test('Verify that when user have selected a command (via “Enter” from the list of auto-suggested commands), user can see the required arguments inserted to the Editor', async t => {
    const commandArguments = [
        'key',
        'index'
    ];

    // Start type characters and select command
    await t.typeText(workbenchPage.queryInput, 'LI', { replace: true });
    // Verify that the list with auto-suggestions is displayed
    await t.expect(workbenchPage.MonacoEditor.monacoSuggestion.exists).ok('Auto-suggestions are displayed');
    // Select command and check result
    await t.pressKey('enter');
    const script = await workbenchPage.queryInputScriptArea.textContent;
    // Verify that user can select a command from the list with auto-suggestions when type in any character in the Editor
    await t.expect(script.replace(/\s/g, ' ')).contains('LINDEX ', 'Result of sent command exists');

    // Check the required arguments inserted
    for (const argument of commandArguments) {
        await t.expect(script).contains(argument, `The required argument ${argument} is inserted`);
    }
});
test('Verify that user can change any required argument inserted', async t => {
    const command = 'HMGET';
    const commandArguments = [
        'key',
        'field'
    ];
    const commandArgumentsForChange = [
        'firstArgument',
        'secondArgument'
    ];

    // Select command via Enter
    await t.typeText(workbenchPage.queryInput, command, { replace: true });
    await t.pressKey('enter');
    // Change required arguments
    const scriptBeforeEdit = await workbenchPage.queryInputScriptArea.textContent;
    await t.typeText(workbenchPage.queryInput, commandArgumentsForChange[0]);
    await t.pressKey('tab');
    await t.typeText(workbenchPage.queryInput, commandArgumentsForChange[1]);
    const scriptAfterEdit = await workbenchPage.queryInputScriptArea.textContent;
    // Verify the command after changes
    await t.expect(scriptBeforeEdit).notEql(scriptAfterEdit, 'The required arguments are not editable');
    await t.expect(scriptAfterEdit).notContains(commandArguments[0], `The argument ${commandArguments[0]} is not changed`);
});
test('Verify that the list of optional arguments will not be inserted with autocomplete', async t => {
    const command = 'ZPOPMAX';
    const commandRequiredArgument = 'key';
    const commandOptionalArgument = 'count';

    // Select command via Enter
    await t.typeText(workbenchPage.queryInput, command, { replace: true });
    await t.pressKey('enter');
    // Verify the command arguments inserted
    const script = await workbenchPage.queryInputScriptArea.textContent;
    await t.expect(script).contains(commandRequiredArgument, 'The required argument is inserted');
    await t.expect(script).notContains(commandOptionalArgument, 'The optional argument is not inserted');
});
