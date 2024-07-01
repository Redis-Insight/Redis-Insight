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

fixture `Cypher syntax at Workbench`
    .meta({ type: 'critical_path', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        // Go to Workbench page
        await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    })
    .afterEach(async() => {
        // Drop database
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    });
test('Verify that user can see popover Editor when clicks on “Use Cypher Syntax” popover in the Editor or “Shift+Space”', async t => {
    const command = 'GRAPH.QUERY graph';

    // Type command and put the cursor inside
    await t.typeText(workbenchPage.queryInput, `${command} "query"`, { replace: true });
    await t.pressKey('left');
    // Open popover editor by clicks on “Use Cypher Syntax”
    await t.click(workbenchPage.MonacoEditor.monacoWidget);
    await t.expect(await workbenchPage.queryInput.nth(1).visible).ok('The user can not see opened popover Editor');
    // Close popover editor and re-open by shortcut
    await t.pressKey('esc');
    await t.expect(await workbenchPage.queryInput.nth(1).visible).notOk('The popover Editor is not closed');
    await t.pressKey('shift+space');
    await t.expect(await workbenchPage.queryInput.nth(1).visible).ok('The user can not see opened popover Editor');
});
test('Verify that popover Editor is populated with the script that was detected between the quotes or it is blank if quotes were empty', async t => {
    const command = 'GRAPH.QUERY graph';
    const script = 'query';

    // Type command with empty script and open popover
    await t.typeText(workbenchPage.queryInput, `${command} ""`, { replace: true });
    await t.pressKey('left');
    await t.click(workbenchPage.MonacoEditor.monacoWidget);
    // Verify that the Editor is blank
    await t.expect(workbenchPage.scriptsLines.nth(1).textContent).eql('', 'The user can not see blank Editor');
    // Close popover editor and re-open with added script
    await t.pressKey('esc');
    await t.typeText(workbenchPage.queryInput, `${command} "${script}`, { replace: true });
    await t.pressKey('left');
    await t.click(workbenchPage.MonacoEditor.monacoWidget);
    // Verify that the Editor is populated with the script
    await t.expect(workbenchPage.scriptsLines.nth(1).textContent).eql(script, 'The user can not see editor populated with the script that was detected between the quotes');
});
