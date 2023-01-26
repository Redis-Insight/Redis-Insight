import { acceptLicenseTerms } from '../../../helpers/database';
import {
    MyRedisDatabasePage,
    BrowserPage,
    DatabaseOverviewPage
} from '../../../pageObjects';
import { rte } from '../../../helpers/constants';
import { commonUrl, ossStandaloneConfig } from '../../../helpers/conf';
import { addNewStandaloneDatabasesApi, deleteStandaloneDatabasesApi } from '../../../helpers/api/api-database';
import { Common } from '../../../helpers/common';

const myRedisDatabasePage = new MyRedisDatabasePage();
const browserPage = new BrowserPage();
const common = new Common();
const databaseOverviewPage = new DatabaseOverviewPage();

const keyName = common.generateWord(10);
const longFieldName = common.generateSentence(20);
const keys = [
    {   type: 'Hash',
        name: `${keyName}:1`,
        offsetX: 100,
        fieldWidthStart: 0,
        fieldWidthEnd: 0
    },
    {
        type: 'List',
        name: `${keyName}:2`,
        offsetX: 80,
        fieldWidthStart: 0,
        fieldWidthEnd: 0
    },
    {
        type: 'Zset',
        name: `${keyName}:3`,
        offsetX: 50,
        fieldWidthStart: 0,
        fieldWidthEnd: 0
    }
];
const keyNames: string[] = [];
keys.forEach(key => keyNames.push(key.name));

const databasesForAdding = [
    { host: ossStandaloneConfig.host, port: ossStandaloneConfig.port, databaseName: 'testDB1' },
    { host: ossStandaloneConfig.host, port: ossStandaloneConfig.port, databaseName: 'testDB2' }
];

fixture `Resize columns in Key details`
    .meta({type: 'regression', rte: rte.standalone})
    .page(commonUrl)
    .beforeEach(async() => {
        // Add new databases using API
        await acceptLicenseTerms();
        await addNewStandaloneDatabasesApi(databasesForAdding);
        // Reload Page
        await common.reloadPage();
        await myRedisDatabasePage.clickOnDBByName(databasesForAdding[0].databaseName);
        await browserPage.addHashKey(keys[0].name, '2147476121', longFieldName, longFieldName);
        await browserPage.addListKey(keys[1].name, '2147476121', 'element');
        await browserPage.addZSetKey(keys[2].name, '1', '2147476121', 'member');
    })
    .afterEach(async() => {
        // Clear and delete database
        await databaseOverviewPage.changeDbIndex(0);
        await browserPage.deleteKeysByNames(keyNames);
        await deleteStandaloneDatabasesApi(databasesForAdding);
    });
test('Resize of columns in Hash, List, Zset Key details', async t => {
    const field = browserPage.keyDetailsTable.find(browserPage.cssRowInVirtualizedTable);
    const tableHeaderResizeTrigger = browserPage.resizeTrigger;

    for(const key of keys) {
        await browserPage.openKeyDetails(key.name);
        // Remember initial column width
        key.fieldWidthStart = await field.clientWidth;
        await t.hover(tableHeaderResizeTrigger);
        await t.drag(tableHeaderResizeTrigger, -key.offsetX, 0, { speed: 0.5 });
        // Remember last column width
        key.fieldWidthEnd = await field.clientWidth;
        // Verify that user can resize columns for Hash, List, Zset Keys
        await t.expect(key.fieldWidthEnd).eql(key.fieldWidthStart - key.offsetX, `Field is not resized for ${key.type} key`);
    }

    // Verify that resize saved when switching between pages
    await t.click(myRedisDatabasePage.workbenchButton);
    await t.click(myRedisDatabasePage.browserButton);
    await browserPage.openKeyDetails(keys[0].name);
    await t.expect(field.clientWidth).eql(keys[0].fieldWidthEnd, 'Resize context not saved for key when switching between pages');

    // Verify that resize saved when switching between databases
    await t.click(myRedisDatabasePage.myRedisDBButton);
    await myRedisDatabasePage.clickOnDBByName(databasesForAdding[1].databaseName);
    // Verify that resize saved for specific data type
    for(const key of keys) {
        await browserPage.openKeyDetails(key.name);
        await t.expect(field.clientWidth).eql(key.fieldWidthEnd, `Resize context not saved for ${key.type} key when switching between databases`);
    }

    // Verify that logical db not changed after switching between databases
    await databaseOverviewPage.changeDbIndex(1);
    await t.click(myRedisDatabasePage.myRedisDBButton);
    await myRedisDatabasePage.clickOnDBByName(databasesForAdding[0].databaseName);
    await t.click(myRedisDatabasePage.myRedisDBButton);
    await myRedisDatabasePage.clickOnDBByName(databasesForAdding[1].databaseName);
    await databaseOverviewPage.verifyDbIndexSelected(1);
});
