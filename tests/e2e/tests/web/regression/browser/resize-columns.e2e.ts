import { DatabaseHelper } from '../../../../helpers/database';
import {
    MyRedisDatabasePage,
    BrowserPage
} from '../../../../pageObjects';
import { KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { commonUrl, ossStandaloneConfig } from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';
import { Common } from '../../../../helpers/common';

const myRedisDatabasePage = new MyRedisDatabasePage();
const browserPage = new BrowserPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();

const keyName = Common.generateWord(10);
const longFieldName = Common.generateSentence(20);
const keys = [
    {   type: 'Hash',
        name: `${keyName}:1`,
        offsetX: 30,
        fieldWidthStart: 0,
        fieldWidthEnd: 0
    },
    {
        type: 'List',
        name: `${keyName}:2`,
        offsetX: 20,
        fieldWidthStart: 0,
        fieldWidthEnd: 0
    },
    {
        type: 'Zset',
        name: `${keyName}:3`,
        offsetX: 10,
        fieldWidthStart: 0,
        fieldWidthEnd: 0
    }
];
const keyNames: string[] = [];
keys.forEach(key => keyNames.push(key.name));
const databaseName1 = `testDB1_${Common.generateWord(10)}`;
const databaseName2 = `testDB2_${Common.generateWord(10)}`;
const databasesForAdding = [
    { host: ossStandaloneConfig.host, port: ossStandaloneConfig.port, databaseName: databaseName1 },
    { host: ossStandaloneConfig.host, port: ossStandaloneConfig.port, databaseName: databaseName2 }
];

fixture `Resize columns in Key details`
    .meta({ type: 'regression', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async() => {
        // Add new databases using API
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(databasesForAdding[0]);
        await databaseAPIRequests.addNewStandaloneDatabaseApi(databasesForAdding[1]);
        await browserPage.addHashKey(keys[0].name, '2147476121', longFieldName, longFieldName);
        await browserPage.addListKey(keys[1].name, '2147476121', 'element');
        await browserPage.addZSetKey(keys[2].name, '1', '2147476121', 'member');
    })
    .afterEach(async() => {
        // Clear and delete database
        await browserPage.OverviewPanel.changeDbIndex(0);
        await browserPage.deleteKeysByNames(keyNames);
        await databaseAPIRequests.deleteAllDatabasesApi();
    });
test('Resize of columns in Hash, List, Zset Key details', async t => {
    const field = browserPage.keyDetailsTable.find(browserPage.cssRowInVirtualizedTable);
    const tableHeaderResizeTrigger = browserPage.resizeTrigger;

    for(const key of keys) {
        await browserPage.openKeyDetails(key.name);
        // Remember initial column width
        key.fieldWidthStart = await field.clientWidth;
        await t.hover(tableHeaderResizeTrigger);
        await t.drag(tableHeaderResizeTrigger, -key.offsetX, 0, { speed: 0.1 });
        // Remember last column width
        key.fieldWidthEnd = await field.clientWidth;
        // Verify that user can resize columns for Hash, List, Zset Keys
        await t.expect(key.fieldWidthEnd).within(key.fieldWidthStart - key.offsetX - 5, key.fieldWidthStart - key.offsetX + 5, `Field is not resized for ${key.type} key`);
    }

    // Verify that resize saved when switching between pages
    await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.BrowserAndFilter);
    await browserPage.openKeyDetails(keys[0].name);
    await t.expect(field.clientWidth).within(keys[0].fieldWidthEnd - 5, keys[0].fieldWidthEnd + 5, 'Resize context not saved for key when switching between pages');

    // Apply filter to save it in filter history
    await browserPage.searchByKeyName(`${keys[0].name}*`);

    // Verify that resize saved when switching between databases
    await t.click(myRedisDatabasePage.NavigationPanel.myRedisDBButton);
    // Go to 2nd database
    await myRedisDatabasePage.clickOnDBByName(databasesForAdding[1].databaseName);
    // Verify that resize saved for specific data type
    for (const key of keys) {
        await browserPage.openKeyDetails(key.name);
        await t.expect(field.clientWidth).within(key.fieldWidthEnd - 5, key.fieldWidthEnd + 5, `Resize context not saved for ${key.type} key when switching between databases`);
    }

    // Change db index for 2nd database
    await browserPage.OverviewPanel.changeDbIndex(1);
    await t.click(myRedisDatabasePage.NavigationPanel.myRedisDBButton);
    // Go back to 1st database
    await myRedisDatabasePage.clickOnDBByName(databasesForAdding[0].databaseName);
    // Verify that user can see the list of filters even when switching between databases
    await t.click(browserPage.showFilterHistoryBtn);
    await t.expect(browserPage.filterHistoryOption.withText(keys[0].name).exists).ok('Filter history requests not saved after switching between db');

    // Verify that logical db not changed after switching between databases
    await t.click(myRedisDatabasePage.NavigationPanel.myRedisDBButton);
    await myRedisDatabasePage.clickOnDBByName(databasesForAdding[1].databaseName);
    await browserPage.OverviewPanel.verifyDbIndexSelected(1);
});
