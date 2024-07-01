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

const speed = 0.4;
let indexName = Common.generateWord(5);

fixture `Workbench Context`
    .meta({ type: 'critical_path', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        // Go to Workbench page
        await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    })
    .afterEach(async() => {
        // Drop index, documents and database
        await workbenchPage.sendCommandInWorkbench(`FT.DROPINDEX ${indexName} DD`);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    });
test('Verify that user can see saved input in Editor when navigates away to any other page', async t => {
    indexName = Common.generateWord(5);
    const command = `FT.CREATE ${indexName} ON HASH PREFIX 1 product: SCHEMA name TEXT`;
    // Enter the command in the Workbench editor and navigate to Browser
    await t.typeText(workbenchPage.queryInput, command, { replace: true, speed: speed });
    await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.BrowserAndFilter);
    // Return back to Workbench and check input in editor
    await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    await t.expect((await workbenchPage.queryInputScriptArea.textContent).replace(/\s/g, ' ')).eql(command, 'Input in Editor is saved');
});
