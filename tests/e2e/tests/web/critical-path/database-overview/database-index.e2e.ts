import { DatabaseHelper } from '../../../../helpers/database';
import { KeysInteractionTabs, KeyTypesTexts, rte } from '../../../../helpers/constants';
import { Common } from '../../../../helpers/common';
import {
    MyRedisDatabasePage,
    BrowserPage,
    WorkbenchPage,
    MemoryEfficiencyPage
} from '../../../../pageObjects';
import { commonUrl, ossStandaloneConfig } from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';
import { verifyKeysDisplayingInTheList, verifySearchFilterValue } from '../../../../helpers/keys';

const myRedisDatabasePage = new MyRedisDatabasePage();
const browserPage = new BrowserPage();
const workbenchPage = new WorkbenchPage();
const memoryEfficiencyPage = new MemoryEfficiencyPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();

const keyName = Common.generateWord(10);
const indexName = `idx:${keyName}`;
const keyNames = [`${keyName}:1`, `${keyName}:2`];
const commands = [
    `HSET ${keyNames[0]} "name" "Hall School" "description" " Spanning 10 states" "class" "independent" "type" "traditional" "address_city" "London" "address_street" "Manor Street" "students" 342 "location" "51.445417, -0.258352"`,
    `HSET ${keyNames[1]} "name" "Garden School" "description" "Garden School is a new outdoor" "class" "state" "type" "forest; montessori;" "address_city" "London" "address_street" "Gordon Street" "students" 1452 "location" "51.402926, -0.321523"`,
    `FT.CREATE ${indexName} ON HASH PREFIX 1 "${keyName}:" SCHEMA name TEXT NOSTEM description TEXT class TAG type TAG SEPARATOR ";" address_city AS city TAG address_street AS address TEXT NOSTEM students NUMERIC SORTABLE location GEO`
];
const keyNameForSearchInLogicalDb = 'keyForSearch';
const logicalDbKey = `${keyName}:3`;

fixture `Allow to change database index`
    .meta({ type: 'critical_path', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async() => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        // Create 3 keys and index
        await browserPage.Cli.sendCommandsInCli(commands);
    })
    .afterEach(async() => {
        // Delete keys in logical database
        await browserPage.OverviewPanel.changeDbIndex(1);
        await browserPage.Cli.sendCommandsInCli([`DEL ${keyNameForSearchInLogicalDb}`, `DEL ${logicalDbKey}`]);
        // Delete and clear database
        await browserPage.OverviewPanel.changeDbIndex(0);
        await browserPage.Cli.sendCommandsInCli([`DEL ${keyNames.join(' ')}`, `DEL ${keyName}`, `FT.DROPINDEX ${indexName}`]);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    });
test('Switching between indexed databases', async t => {
    const command = `HSET ${logicalDbKey} "name" "Gillford School" "description" "Gillford School is a centre" "class" "private" "type" "democratic; waldorf" "address_city" "Goudhurst" "address_street" "Goudhurst" "students" 721 "location" "51.112685, 0.451076"`;

    // Change index to logical db
    // Verify that database index switcher displayed for Standalone db
    await browserPage.OverviewPanel.changeDbIndex(1);
    // Verify that the same client connections are used after changing index
    // issue https://redislabs.atlassian.net/browse/RI-5079
    // const logicalDbConnectedClients = await browserPage.overviewConnectedClients.textContent;
    // await t.expect(rememberedConnectedClients).eql(logicalDbConnectedClients);

    // Verify that data changed for indexed db on Browser view
    await browserPage.verifyNoKeysInDatabase();

    // Verify that logical db not changed after reloading page
    await browserPage.reloadPage();
    await browserPage.OverviewPanel.verifyDbIndexSelected(1);
    await browserPage.verifyNoKeysInDatabase();

    // Add key to logical (index=1) database
    await browserPage.addHashKey(keyNameForSearchInLogicalDb);
    // Verify that data changed for indexed db on Tree view
    await t.click(browserPage.treeViewButton);
    await verifyKeysDisplayingInTheList([keyNameForSearchInLogicalDb], true);
    await verifyKeysDisplayingInTheList(keyNames, false);

    // Filter by Hash keys and search by key name
    await browserPage.selectFilterGroupType(KeyTypesTexts.Hash);
    await browserPage.searchByKeyName(keyNameForSearchInLogicalDb);
    // Return to default database
    await browserPage.OverviewPanel.changeDbIndex(0);

    // Verify that search/filter saved after switching index in Browser
    await verifySearchFilterValue(keyNameForSearchInLogicalDb);
    await verifyKeysDisplayingInTheList([keyNameForSearchInLogicalDb], false);
    await t.click(browserPage.browserViewButton);
    // Change index to logical db
    await browserPage.OverviewPanel.changeDbIndex(1);
    await verifySearchFilterValue(keyNameForSearchInLogicalDb);
    await verifyKeysDisplayingInTheList([keyNameForSearchInLogicalDb], true);

    // Return to default database and open search capability
    await browserPage.OverviewPanel.changeDbIndex(0);
    await t.click(browserPage.redisearchModeBtn);
    await browserPage.selectIndexByName(indexName);
    await verifyKeysDisplayingInTheList(keyNames, true);
    // Change index to logical db
    await browserPage.OverviewPanel.changeDbIndex(1);
    // Search by value and return to default database
    await browserPage.searchByKeyName('Hall School');
    await browserPage.OverviewPanel.changeDbIndex(0);
    // Verify that data changed for indexed db on Search capability page
    await verifyKeysDisplayingInTheList([keyNames[0]], true);
    // Change index to logical db
    await browserPage.OverviewPanel.changeDbIndex(1);
    // Verify that search/filter saved after switching index in Search capability
    await verifySearchFilterValue('Hall School');

    // Open Workbench page
    await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    await workbenchPage.sendCommandInWorkbench(command);
    // Verify that user can see the database index before the command name executed in Workbench
    await workbenchPage.checkWorkbenchCommandResult(`[db1] ${command}`, '8');

    // Open Browser page
    await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
    // Clear filter
    await t.click(browserPage.clearFilterButton);
    // Verify that data changed for indexed db on Workbench page (on Search capability page)
    await verifyKeysDisplayingInTheList([logicalDbKey], true);
    await t.click(browserPage.patternModeBtn);
    // Clear filter
    await t.click(browserPage.clearFilterButton);
    // Verify that data changed for indexed db on Workbench page
    await verifyKeysDisplayingInTheList([keyNameForSearchInLogicalDb, logicalDbKey], true);
    await browserPage.OverviewPanel.changeDbIndex(0);
    await verifyKeysDisplayingInTheList([logicalDbKey], false);

    // Go to Analysis Tools page and create new report
    await t.click(myRedisDatabasePage.NavigationPanel.analysisPageButton);
    await t.click(memoryEfficiencyPage.newReportBtn);

    // Verify that data changed for indexed db on Database analysis page
    await t.expect(memoryEfficiencyPage.topKeysKeyName.withExactText(keyNames[0]).exists).ok('Keys from current db index not displayed in report');
    await t.expect(memoryEfficiencyPage.topKeysKeyName.withExactText(logicalDbKey).exists).notOk('Keys from other db index displayed in report');
    await t.expect(memoryEfficiencyPage.selectedReport.textContent).notContains('[db', 'Index displayed for 0 index in report name');
    // Change index to logical db
    await browserPage.OverviewPanel.changeDbIndex(1);
    await t.click(memoryEfficiencyPage.newReportBtn);
    await t.expect(memoryEfficiencyPage.selectedReport.textContent).contains('[db1]', 'Index not displayed in report name');
    await t.expect(memoryEfficiencyPage.topKeysKeyName.withExactText(logicalDbKey).exists).ok('Keys from current db index not displayed in report');
    await t.expect(memoryEfficiencyPage.topKeysKeyName.withExactText(keyNames[0]).exists).notOk('Keys from other db index displayed in report');

    // Verify that user can see the database index before the report date in Database Analysis
    await t.click(memoryEfficiencyPage.selectedReport);
    await t.expect(memoryEfficiencyPage.reportItem.withText('[db1]').count).eql(1, 'Index not displayed in report name');
});
