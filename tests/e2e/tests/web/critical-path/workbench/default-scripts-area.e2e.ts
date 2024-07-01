import { Chance } from 'chance';
import { DatabaseHelper } from '../../../../helpers/database';
import { BrowserPage, MyRedisDatabasePage, WorkbenchPage } from '../../../../pageObjects';
import { ExploreTabs, KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { commonUrl, ossStandaloneRedisearch } from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';
import { Telemetry } from '../../../../helpers/telemetry';

const myRedisDatabasePage = new MyRedisDatabasePage();
const workbenchPage = new WorkbenchPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();
const browserPage = new BrowserPage();

const chance = new Chance();
const telemetry = new Telemetry();

let indexName = chance.word({ length: 5 });
let keyName = chance.word({ length: 5 });
const logger = telemetry.createLogger();
const telemetryEvent = 'EXPLORE_PANEL_TUTORIAL_OPENED';
const telemetryPath = 'static/tutorials/ds/hashes.md';
const expectedProperties = [
    'databaseId',
    'path'
];

fixture `Default scripts area at Workbench`
    .meta({ type: 'critical_path', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneRedisearch);
        // Go to Workbench page
        await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    })
    .afterEach(async t => {
        // Drop index, documents and database
        await t.switchToMainWindow();
        await workbenchPage.sendCommandInWorkbench(`FT.DROPINDEX ${indexName} DD`);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneRedisearch);
    });
test
    .requestHooks(logger)('Verify that user can run automatically  "FT._LIST" and "FT.INFO {index}" scripts in Workbench and see the results', async t => {
        indexName = 'idx:schools';
        keyName = chance.word({ length: 5 });
        const commandsForSend = [
            `FT.CREATE ${indexName} ON HASH PREFIX 1 product: SCHEMA name TEXT`,
            `HMSET product:1 name "${keyName}"`,
            `HMSET product:2 name "${keyName}"`
        ];
        const addedScript = 'FT._LIST \n' +

            `FT.INFO "${indexName}"`;
        // Send commands
        await workbenchPage.sendCommandInWorkbench(commandsForSend.join('\n'));
        // Run automatically added "FT._LIST" and "FT.INFO {index}" scripts
        await workbenchPage.InsightsPanel.togglePanel(true);
        const tutorials = await workbenchPage.InsightsPanel.setActiveTab(ExploreTabs.Tutorials);
        await t.click(tutorials.dataStructureAccordionTutorialButton);
        await t.click(tutorials.internalLinkWorkingWithHashes);

        // Verify that telemetry event 'WORKBENCH_ENABLEMENT_AREA_GUIDE_OPENED' sent and has all expected properties
        await telemetry.verifyEventHasProperties(telemetryEvent, expectedProperties, logger);
        await telemetry.verifyEventPropertyValue(telemetryEvent, 'path', telemetryPath, logger);

        await workbenchPage.sendCommandInWorkbench(addedScript);

        // Check the FT._LIST result
        await t.expect(workbenchPage.queryTextResult.textContent).contains(indexName, 'The result of the FT._LIST command not found');
        // Check the FT.INFO result
        await t.switchToIframe(workbenchPage.iframe);
        await t.expect(workbenchPage.queryColumns.textContent).contains('name', 'The result of the FT.INFO command not found');
    });
test('Verify that user can edit and run automatically added "Search" script in Workbench and see the results', async t => {
    indexName = chance.word({ length: 5 });
    keyName = chance.word({ length: 5 });
    const commandsForSend = [
        `FT.CREATE ${indexName} ON HASH PREFIX 1 product: SCHEMA name TEXT`,
        `HMSET product:1 name "${keyName}"`,
        `HMSET product:2 name "${keyName}"`
    ];
    const searchCommand = `FT.SEARCH ${indexName} "${keyName}"`;
    // Send commands
    await workbenchPage.sendCommandInWorkbench(commandsForSend.join('\n'));
    // Run automatically added FT.SEARCH script with edits

    await workbenchPage.sendCommandInWorkbench(searchCommand);
    // Check the FT.SEARCH result
    await t.switchToIframe(workbenchPage.iframe);
    const key = workbenchPage.queryTableResult.withText('product:1');
    const name = workbenchPage.queryTableResult.withText(keyName);
    await t.expect(key.exists).ok('The added key is not in the Search result');
    await t.expect(name.exists).ok('The added key name field is not in the Search result');
});
test('Verify that user can edit and run automatically added "Aggregate" script in Workbench and see the results', async t => {
    indexName = chance.word({ length: 5 });
    const aggregationResultField = 'max_price';
    const commandsForSend = [
        `FT.CREATE ${indexName} ON HASH PREFIX 1 product: SCHEMA price NUMERIC SORTABLE`,
        'HMSET product:1 price 20',
        'HMSET product:2 price 100'
    ];
    const searchCommand = `FT.Aggregate ${indexName} * GROUPBY 0 REDUCE MAX 1 @price AS ${aggregationResultField}`;
    // Send commands
    await workbenchPage.sendCommandInWorkbench(commandsForSend.join('\n'), 0.5);
    // Run automatically added FT.Aggregate script with edits
    await workbenchPage.sendCommandInWorkbench(searchCommand);
    // Check the FT.Aggregate result
    await t.switchToIframe(workbenchPage.iframe);
    await t.expect(workbenchPage.queryTableResult.textContent).contains(aggregationResultField, 'The aggregation field name is not in the Search result');
    await t.expect(workbenchPage.queryTableResult.textContent).contains('100', 'The aggregation max value is in not the Search result');
});
// Outdated after https://redislabs.atlassian.net/browse/RI-4279
test.skip('Verify that when the “Manual” option clicked, user can see the Editor is automatically prepopulated with the information', async t => {
    const information = [
        '// Workbench is the advanced Redis command-line interface that allows to send commands to Redis, read and visualize the replies sent by the server.',
        '// Enter multiple commands at different rows to run them at once.',
        '// Start a new line with an indent (Tab) to specify arguments for any Redis command in multiple line mode.'
    ];
        // Click on the Manual option
    await t.click(workbenchPage.preselectManual);
    // Resize the scripting area
    const offsetY = 200;
    await t.drag(workbenchPage.resizeButtonForScriptingAndResults, 0, offsetY, { speed: 0.4 });
    // Check the result
    const script = await workbenchPage.scriptsLines.textContent;
    for(const info of information) {
        await t.expect(script.replace(/\s/g, ' ')).contains(info, 'Result of Manual command is not displayed');
    }
});
