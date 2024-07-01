import { KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { DatabaseHelper } from '../../../../helpers/database';
import { BrowserPage, WorkbenchPage } from '../../../../pageObjects';
import { commonUrl, ossStandaloneRedisearch } from '../../../../helpers/conf';
import { Common } from '../../../../helpers/common';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';

const browserPage = new BrowserPage();
const workbenchPage = new WorkbenchPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();

let indexName = Common.generateWord(10);

fixture `JSON verifications at Workbench`
    .meta({ type: 'smoke', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneRedisearch);
        // Go to Workbench page
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    })
    .afterEach(async t => {
        // Clear and delete database
        await t.switchToMainWindow();
        await workbenchPage.sendCommandInWorkbench(`FT.DROPINDEX ${indexName} DD`);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneRedisearch);
    });
test('Verify that user can execute redisearch command for JSON data type in Workbench', async t => {
    indexName = Common.generateWord(10);
    const commandsForSend = [
        `FT.CREATE ${indexName} ON JSON SCHEMA $.title AS title TEXT`,
        'JSON.SET myDoc $ \'{"title": "foo", "content": "bar"}\''
    ];
    const searchCommand = `FT.SEARCH ${indexName} "@title:foo"`;

    // Send commands for add JSON document and create index
    await workbenchPage.sendCommandInWorkbench(commandsForSend.join('\n'));
    // Verify that the commandsForSend are executed
    for(const command of commandsForSend) {
        await t.expect((await workbenchPage.getCardContainerByCommand(command)).textContent).contains('OK', `The ${command} command is not executed`);
    }
    // Send search command to find JSON document
    await workbenchPage.sendCommandInWorkbench(searchCommand);
    // Verify that the search command is executed
    await t.switchToIframe(workbenchPage.iframe);
    await t.expect(workbenchPage.queryColumns.nth(1).textContent).contains('{\\"title\\":\\"foo\\",\\"content\\":\\"bar\\"}', `The ${searchCommand} command is not executed`);
});
