import { KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { DatabaseHelper } from '../../../../helpers/database';
import { BrowserPage, WorkbenchPage } from '../../../../pageObjects';
import { commonUrl, ossStandaloneConfig } from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';

const workbenchPage = new WorkbenchPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();
const browserPage = new BrowserPage();

const command = 'GRAPH.QUERY graph';

fixture `Cypher syntax at Workbench`
    .meta({ type: 'regression', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        // Go to Workbench page
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    })
    .afterEach(async() => {
        // Drop database
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    });
test('Verify that user can see popover “Use Cypher Syntax” when cursor is inside the query argument double/single quotes in the GRAPH command', async t => {
    // Type command and put the cursor inside
    await t.typeText(workbenchPage.queryInput, `${command} "query"`, { replace: true });
    await t.pressKey('left');
    // Check that user can see popover
    await t.expect(await workbenchPage.MonacoEditor.monacoWidget.textContent).contains('Use Cypher Editor', 'The user can not see popover Use Cypher Syntax');
    await t.expect(await workbenchPage.MonacoEditor.monacoWidget.textContent).contains('Shift+Space', 'The user can not see shortcut for Cypher Syntax');
    // Verify the popover with single quotes
    await t.typeText(workbenchPage.queryInput, `${command} ''`, { replace: true });
    await t.pressKey('left');
    await t.expect(await workbenchPage.MonacoEditor.monacoWidget.textContent).contains('Use Cypher Editor', 'The user can not see popover Use Cypher Syntax');
});
test('Verify that when user clicks on the “X” control or use shortcut “ESC” popover Editor is closed and changes are not saved', async t => {
    const cypherCommand = `${command} "query"`;
    // Type command and open the popover editor
    await t.typeText(workbenchPage.queryInput, cypherCommand, { replace: true });
    await t.pressKey('left');
    await t.click(workbenchPage.MonacoEditor.monacoWidget);
    // Do some changes in the Editor and close by “X” control
    await t.typeText(workbenchPage.queryInput.nth(1), 'test', { replace: true });
    await t.click(workbenchPage.EditorButton.cancelBtn);
    // Verify that editor is closed and changes are not saved
    let commandAfter = await workbenchPage.scriptsLines.textContent;
    await t.expect(workbenchPage.queryInput.nth(1).exists).notOk('The popover Editor is not closed');
    await t.expect(commandAfter.replace(/\s/g, ' ')).eql(cypherCommand, 'The changes are still saved from the Editor');
    // Re-open the Editor and do some changes and close by shortcut “ESC”
    await t.click(workbenchPage.MonacoEditor.monacoWidget);
    await t.typeText(workbenchPage.queryInput.nth(1), 'test', { replace: true });
    await t.pressKey('esc');
    // Verify that editor is closed and changes are not saved
    commandAfter = await workbenchPage.scriptsLines.textContent;
    await t.expect(commandAfter.replace(/\s/g, ' ')).eql(cypherCommand, 'The changes are still saved from the Editor');
});
test('Verify that when user use shortcut “CTRL+ENTER” or clicks on the “V” control popover Editor is closed and changes are saved', async t => {
    let script = 'query';
    // Type command and open the popover editor
    await t.typeText(workbenchPage.queryInput, `${command} "${script}`, { replace: true });
    await t.pressKey('left');
    await t.click(workbenchPage.MonacoEditor.monacoWidget);
    // Do some changes in the Editor and click on the “V” control
    script = 'test';
    await t.pressKey('ctrl+a');
    await t.typeText(workbenchPage.queryInput.nth(1), script, { replace: true });
    await t.click(workbenchPage.EditorButton.applyBtn);
    // Verify that editor is closed and changes are saved
    let commandAfter = await workbenchPage.scriptsLines.textContent;
    await t.expect(workbenchPage.queryInput.nth(1).exists).notOk('The popover Editor is not closed');
    await t.expect(commandAfter.replace(/\s/g, ' ')).eql(`${command} "${script}"`, 'The changes are not saved from the Editor');
    // Re-open the Editor and do some changes and use keyboard shortcut “CTRL+ENTER”
    await t.click(workbenchPage.MonacoEditor.monacoWidget);
    script = 'test2';
    await t.pressKey('ctrl+a');
    await t.typeText(workbenchPage.queryInput.nth(1), 'test2', { paste: true, replace: true });
    await t.pressKey('ctrl+enter');
    // Verify that editor is closed and changes are not saved
    commandAfter = await workbenchPage.scriptsLines.textContent;
    await t.expect(commandAfter.replace(/\s/g, ' ')).eql(`${command} "${script}"`, 'The changes are still saved from the Editor');
});
test('Verify that user can see the opacity of main Editor is 80%, Run button is disabled when the non-Redis editor is opened', async t => {
    // Type command and open Cypher editor
    await t.typeText(workbenchPage.queryInput, `${command} "query"`, { replace: true });
    await t.pressKey('left');
    await t.click(workbenchPage.MonacoEditor.monacoWidget);
    // Check the main Editor and Run button
    await t.expect(workbenchPage.mainEditorArea.getStyleProperty('opacity')).eql('0.8', 'The opacity of main Editor is incorrect');
    await t.click(workbenchPage.submitCommandButton);
    await t.expect(workbenchPage.noCommandHistorySection.visible).ok('The Run button in main Editor is not disabled');
    await t.hover(workbenchPage.submitCommandButton);
    await t.expect(workbenchPage.runButtonToolTip.visible).notOk('The Run button in main Editor still react on hover');
});
test('Verify that user can resize non-Redis editor only by the top and bottom borders', async t => {
    const offsetY = 50;
    await t.drag(workbenchPage.resizeButtonForScriptingAndResults, 0, offsetY * 10, { speed: 0.4 });
    // Type command and open Cypher editor
    await t.typeText(workbenchPage.queryInput, `${command} "query"`, { replace: true });
    await t.pressKey('left');
    await t.click(workbenchPage.MonacoEditor.monacoWidget);
    // Check that user can resize editor by top border
    let editorHeight = await workbenchPage.queryInput.nth(1).clientHeight;
    await t.drag(workbenchPage.MonacoEditor.nonRedisEditorResizeTop, 0, -offsetY, { speed: 0.4 });
    await t.expect(workbenchPage.queryInput.nth(1).clientHeight).eql(editorHeight + offsetY, 'The non-Redis editor is not resized by the top border');
    // Check that user can resize editor by bottom border
    editorHeight = await workbenchPage.queryInput.nth(1).clientHeight;
    await t.drag(workbenchPage.MonacoEditor.nonRedisEditorResizeBottom, 0, -offsetY, { speed: 0.4 });
    await t.expect(workbenchPage.queryInput.nth(1).clientHeight).eql(editorHeight - offsetY, 'The non-Redis editor is not resized by the bottom border');
});
