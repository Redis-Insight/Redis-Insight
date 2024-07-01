import { Selector, t } from 'testcafe';
import { DatabaseHelper } from '../../../../helpers/database';
import { BrowserPage, MyRedisDatabasePage } from '../../../../pageObjects';
import {
    commonUrl,
    ossStandaloneBigConfig,
    ossStandaloneConfig,
    ossStandaloneV5Config
} from '../../../../helpers/conf';
import { KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';
import { Common } from '../../../../helpers/common';
import { verifyKeysDisplayingInTheList } from '../../../../helpers/keys';
import { APIKeyRequests } from '../../../../helpers/api/api-keys';
import { goBackHistory } from '../../../../helpers/utils';

const browserPage = new BrowserPage();
const myRedisDatabasePage = new MyRedisDatabasePage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();
const apiKeyRequests = new APIKeyRequests();

const patternModeTooltipText = 'Filter by Key Name or Pattern';
const redisearchModeTooltipText = 'Search by Values of Keys';
const notSelectedIndexText = 'Select an index and enter a query to search per values of keys.';
const searchPerValue = '(@name:"Hall School") | (@students:[500, 1000])';
let keyName = Common.generateWord(10);
let keyNames: string[];
let indexName = Common.generateWord(5);

const keyNameSimpleDb = Common.generateWord(10);
const keyNameBigDb = Common.generateWord(10);

const indexNameSimpleDb = `idx:${keyNameSimpleDb}`; // index in the standalone database
const indexNameBigDb = `idx:${keyNameBigDb}`; // index in the big standalone database

const simpleDbName = ossStandaloneConfig.databaseName;
const bigDbName = ossStandaloneBigConfig.databaseName;
async function verifyContext(): Promise<void> {
    await t
        .expect(browserPage.selectIndexDdn.withText(indexName).exists).ok('Index selection not saved')
        .expect(browserPage.filterByPatterSearchInput.value).eql(searchPerValue, 'Search per Value not saved in input')
        .expect(browserPage.keyNameFormDetails.withExactText(keyName).exists).ok('Key details not opened');
}

fixture `Search capabilities in Browser`
    .meta({ type: 'critical_path', rte: rte.standalone })
    .page(commonUrl);
test
    .before(async() => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        keyName = Common.generateWord(10);
        await browserPage.addHashKey(keyName);
    })
    .after(async() => {
        // Clear and delete database
        await apiKeyRequests.deleteKeyByNameApi(keyName, ossStandaloneConfig.databaseName);
        await browserPage.Cli.sendCommandsInCli([`DEL ${keyNames.join(' ')}`, `FT.DROPINDEX ${indexName}`]);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    })('RediSearch capabilities in Browser view to search per Hashes or JSONs', async t => {
        indexName = `idx:${keyName}`;
        keyNames = [`${keyName}:1`, `${keyName}:2`, `${keyName}:3`];
        const commands = [
            `HSET ${keyNames[0]} "name" "Hall School" "description" " Spanning 10 states" "class" "independent" "type" "traditional" "address_city" "London" "address_street" "Manor Street" "students" 342 "location" "51.445417, -0.258352"`,
            `HSET ${keyNames[1]} "name" "Garden School" "description" "Garden School is a new outdoor" "class" "state" "type" "forest; montessori;" "address_city" "London" "address_street" "Gordon Street" "students" 1452 "location" "51.402926, -0.321523"`,
            `HSET ${keyNames[2]} "name" "Gillford School" "description" "Gillford School is a centre" "class" "private" "type" "democratic; waldorf" "address_city" "Goudhurst" "address_street" "Goudhurst" "students" 721 "location" "51.112685, 0.451076"`,
            `FT.CREATE ${indexName} ON HASH PREFIX 1 "${keyName}:" SCHEMA name TEXT NOSTEM description TEXT class TAG type TAG SEPARATOR ";" address_city AS city TAG address_street AS address TEXT NOSTEM students NUMERIC SORTABLE location GEO`
        ];

        // Create 3 keys and index
        await browserPage.Cli.sendCommandsInCli(commands);
        // Verify that user see the tooltips for the controls to switch the modes
        await t.click(browserPage.patternModeBtn);
        await t.hover(browserPage.patternModeBtn);
        await t.expect(browserPage.tooltip.textContent).contains(patternModeTooltipText, 'Invalid text in pattern mode tooltip');
        await t.hover(browserPage.redisearchModeBtn);
        await t.expect(browserPage.tooltip.textContent).contains(redisearchModeTooltipText, 'Invalid text in redisearch mode tooltip');

        // Verify that user see the "Select an index" message when he switches to Search
        await t.click(browserPage.redisearchModeBtn);
        await t.expect(browserPage.keyListTable.textContent).contains(notSelectedIndexText, 'Select an index message not displayed');

        // Verify that user can search by index in Browser view
        await browserPage.selectIndexByName(indexName);
        await verifyKeysDisplayingInTheList(keyNames, true);
        await t.expect(browserPage.getKeySelectorByName(keyName).exists).notOk('Key without index displayed after search');
        // Verify that user can search by index plus key value
        await browserPage.searchByKeyName('Hall School');
        await t.expect(browserPage.getKeySelectorByName(keyNames[0]).exists).ok(`The key ${keyNames[0]} not found`);
        await t.expect(browserPage.getKeySelectorByName(keyNames[1]).exists).notOk(`Invalid key ${keyNames[1]} is displayed after search`);
        // Verify that user can search by index plus multiple key values
        await browserPage.searchByKeyName(searchPerValue);
        await t.expect(browserPage.getKeySelectorByName(keyNames[0]).exists).ok(`The first valid key ${keyNames[0]} not found`);
        await t.expect(browserPage.getKeySelectorByName(keyNames[2]).exists).ok(`The second valid key ${keyNames[2]} not found`);
        await t.expect(browserPage.getKeySelectorByName(keyNames[1]).exists).notOk(`Invalid key ${keyNames[1]} is displayed after search`);

        // Verify that user can use filter history for RediSearch query
        await t.click(browserPage.showFilterHistoryBtn);
        await t.click(browserPage.filterHistoryOption.withText('Hall School'));
        await t.expect(browserPage.getKeySelectorByName(keyNames[0]).exists).ok(`The key ${keyNames[0]} not found`);
        await t.expect(browserPage.getKeySelectorByName(keyNames[1]).exists).notOk(`Invalid key ${keyNames[1]} is displayed after search`);

        // Verify that user can clear the search
        await t.click(browserPage.clearFilterButton);
        await t.expect(browserPage.getKeySelectorByName(keyNames[1]).exists).ok(`The key ${keyNames[1]} not found`);
        await t.expect(browserPage.getKeySelectorByName(keyName).exists).notOk('Search not cleared');

        // Verify that user can search by index in Tree view
        await t.click(browserPage.treeViewButton);
        // Change delimiter
        await browserPage.TreeView.changeDelimiterInTreeView('-');
        await browserPage.selectIndexByName(indexName);
        await verifyKeysDisplayingInTheList(keyNames, true);
        await t.expect(browserPage.getKeySelectorByName(keyName).exists).notOk('Key without index displayed after search');

        // Verify that user see the database scanned when he switches to Pattern search mode
        await t.click(browserPage.patternModeBtn);
        await t.click(browserPage.browserViewButton);
        await verifyKeysDisplayingInTheList(keyNames, true);
        await t.expect(browserPage.getKeySelectorByName(keyName).exists).ok('Database not scanned after returning to Pattern search mode');
    });
test
    .before(async() => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneBigConfig);
    })
    .after(async() => {
        // Clear and delete database
        await browserPage.Cli.sendCommandInCli(`FT.DROPINDEX ${indexName}`);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneBigConfig);
    })('Search by index keys scanned for JSON', async t => {
        keyName = Common.generateWord(10);
        indexName = `idx:${keyName}`;
        await t.click(browserPage.redisearchModeBtn);
        const command = `FT.CREATE ${indexName} ON JSON PREFIX 1 "device:" SCHEMA id numeric`;

        // Create index for JSON keys
        await browserPage.Cli.sendCommandInCli(command);
        await t.click(browserPage.refreshIndexButton);
        // Verify that user can can get 500 keys (limit 0 500) in Browser view
        await browserPage.selectIndexByName(indexName);
        // Verify that all keys are displayed according to selected index
        for (let i = 0; i < 15; i++) {
            await t.expect(browserPage.keyListItem.textContent).contains('device:', 'Keys out of index displayed');
        }
        // Verify that user can can get 10 000 keys in Tree view
        await t.click(browserPage.treeViewButton);
        const keysNumberOfResults = browserPage.keysNumberOfResults.textContent;
        await t.expect(keysNumberOfResults).contains('10 000', 'Number of results is not 10 000');
    });
test
    .before(async() => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneV5Config);
    })
    .after(async() => {
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneV5Config);
    })('No RediSearch module message', async t => {
        const noRedisearchMessage = 'RediSearch is not available for this database';
        // const externalPageLinkFirst = 'https://redis.io/try-free';
        // const externalPageLinkSecond = '?utm_source=redisinsight&utm_medium=app&utm_campaign=redisinsight_browser_search'

        await t.click(browserPage.redisearchModeBtn);
        // Verify that user can see message in the dialog when he doesn't have RediSearch module
        await t.expect(browserPage.noReadySearchDialogTitle.textContent).contains(noRedisearchMessage, 'Invalid text in no redisearch popover');
        // Unskip after updating testcafe with opening links support https://redislabs.atlassian.net/browse/RI-5565
        // // Verify that user can navigate by link to create a Redis db
        // await t.click(browserPage.redisearchFreeLink);
        // await Common.checkURLContainsText(externalPageLinkFirst);
        // await Common.checkURLContainsText(externalPageLinkSecond);
    });
test
    .before(async() => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneBigConfig);
    })
    .after(async() => {
        await browserPage.Cli.sendCommandInCli(`FT.DROPINDEX ${indexName}`);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneBigConfig);
    })('Index creation', async t => {
        const createIndexLink = 'https://redis.io/docs/latest/commands/ft.create/?utm_source=redisinsight&utm_medium=app&utm_campaign=browser_search';

        // Verify that user can cancel index creation
        await t.click(browserPage.redisearchModeBtn);
        await t.click(browserPage.selectIndexDdn);
        await t.click(browserPage.createIndexBtn);
        await t.expect(browserPage.newIndexPanel.exists).ok('New Index panel is not displayed');
        await t.click(browserPage.cancelIndexCreationBtn);
        await t.expect(browserPage.newIndexPanel.exists).notOk('New Index panel is displayed');

        // Verify that user can create an index with all mandatory parameters
        await t.click(browserPage.redisearchModeBtn);
        await t.click(browserPage.selectIndexDdn);
        await t.click(browserPage.createIndexBtn);
        await t.expect(browserPage.newIndexPanel.exists).ok('New Index panel is not displayed');
        // Unskip after updating testcafe with opening links support https://redislabs.atlassian.net/browse/RI-5565
        // // Verify that user can see a link to create a profound index and navigate
        // await t.click(browserPage.newIndexPanel.find('a'));
        // await Common.checkURL(createIndexLink);
        // await goBackHistory();

        // Verify that user can create an index with multiple prefixes
        // await t.click(browserPage.selectIndexDdn);
        // await t.click(browserPage.createIndexBtn);
        await t.click(browserPage.indexNameInput);
        await t.typeText(browserPage.indexNameInput, indexName);
        await t.click(browserPage.prefixFieldInput);
        await t.typeText(browserPage.prefixFieldInput, 'device:');
        await t.pressKey('enter');
        await t.typeText(browserPage.prefixFieldInput, 'mobile_');
        await t.pressKey('enter');
        await t.typeText(browserPage.prefixFieldInput, 'user_');
        await t.pressKey('enter');
        await t.expect(browserPage.prefixFieldInput.find('button').count).eql(3, '3 prefixes are not displayed');

        // Verify that user can create an index with multiple fields (up to 20)
        await t.click(browserPage.indexIdentifierInput);
        await t.typeText(browserPage.indexIdentifierInput, 'k0');
        await t.click(browserPage.confirmIndexCreationBtn);
        await t.expect(browserPage.newIndexPanel.exists).notOk('New Index panel is displayed');
        await t.click(browserPage.selectIndexDdn);
        await browserPage.selectIndexByName(indexName);
    });
test
    .before(async() => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
    })
    .after(async() => {
        // Clear and delete database
        await browserPage.Cli.sendCommandInCli(`FT.DROPINDEX ${indexName}`);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    })('Context for RediSearch capability', async t => {
        keyName = Common.generateWord(10);
        indexName = `idx:${keyName}`;
        const commands = [
            `HSET ${keyName} "name" "Hall School" "description" " Spanning 10 states" "class" "independent" "type" "traditional" "address_city" "London" "address_street" "Manor Street" "students" 342 "location" "51.445417, -0.258352"`,
            `FT.CREATE ${indexName} ON HASH PREFIX 1 "${keyName}" SCHEMA name TEXT NOSTEM description TEXT class TAG type TAG SEPARATOR ";" address_city AS city TAG address_street AS address TEXT NOSTEM students NUMERIC SORTABLE location GEO`
        ];

        await browserPage.Cli.sendCommandsInCli(commands);
        await t.click(browserPage.redisearchModeBtn);
        await browserPage.selectIndexByName(indexName);
        await browserPage.searchByKeyName(searchPerValue);
        // Select key
        await t.click(browserPage.getKeySelectorByName(keyName));

        // Verify that Redisearch context (inputs, key selected, scroll, key details) saved after switching between pages
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.BrowserAndFilter);
        await verifyContext();

        // Verify that Redisearch context saved when switching between browser/tree view
        await t.click(browserPage.treeViewButton);
        await verifyContext();
        await t.click(browserPage.browserViewButton);
        await verifyContext();

        // Verify that Search control opened after reloading page
        await browserPage.reloadPage();
        await t.expect(browserPage.keyListTable.textContent).contains(notSelectedIndexText, 'Search by Values of Keys section not opened');
    });

test
    .before(async() => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneBigConfig);
        await databaseAPIRequests.addNewStandaloneDatabaseApi(ossStandaloneConfig);
    })
    .after(async() => {
        //clear database
        await browserPage.Cli.sendCommandInCli(`FT.DROPINDEX ${indexNameBigDb}`);
        await t.click(browserPage.OverviewPanel.myRedisDBLink); // go back to database selection page
        await myRedisDatabasePage.clickOnDBByName(simpleDbName); // click standalone database
        await browserPage.Cli.sendCommandInCli(`FT.DROPINDEX ${indexNameSimpleDb}`);
        await t.click(browserPage.patternModeBtn);
        await t.click(browserPage.browserViewButton);
        await browserPage.deleteKeysByNames(keyNames);

        //delete database
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneBigConfig);
    })('Verify that indexed keys from previous DB are NOT displayed when user connects to another DB', async t => {
        // Link to ticket: https://redislabs.atlassian.net/browse/RI-3863

        // key names to validate in the standalone database
        keyNames = [`${keyNameSimpleDb}:1`, `${keyNameSimpleDb}:2`, `${keyNameSimpleDb}:3`, `${keyNameSimpleDb}:4`, `${keyNameSimpleDb}:5`];

        /*
            create index as name ${indexNameBigDb}
            in the big standalone database
            with the help of CLI
        */
        const commandsForBigStandalone = [
            `FT.CREATE ${indexNameBigDb} ON hash PREFIX 1 mobile SCHEMA k0 text`
        ];

        await browserPage.Cli.sendCommandsInCli(commandsForBigStandalone);

        await t.click(browserPage.OverviewPanel.myRedisDBLink); // go back to database selection page
        await myRedisDatabasePage.clickOnDBByName(simpleDbName); // click standalone database

        const commandsForStandalone = [
            `HSET ${keyNames[0]} "name" "Hall School" "description" " Spanning 10 states" "class" "independent" "type" "traditional" "address_city" "London" "address_street" "Manor Street" "students" 342 "location" "51.445417, -0.258352"`,
            `HSET ${keyNames[1]} "name" "Garden School" "description" "Garden School is a new outdoor" "class" "state" "type" "forest; montessori;" "address_city" "London" "address_street" "Gordon Street" "students" 1452 "location" "51.402926, -0.321523"`,
            `HSET ${keyNames[2]} "name" "Gillford School" "description" "Gillford School is a centre" "class" "private" "type" "democratic; waldorf" "address_city" "Goudhurst" "address_street" "Goudhurst" "students" 721 "location" "51.112685, 0.451076"`,
            `HSET ${keyNames[3]} "name" "Box School" "description" "Top School is a new outdoor" "class" "state" "type" "forest; montessori;" "address_city" "London" "address_street" "Gordon Street" "students" 1452 "location" "51.402926, -0.321523"`,
            `HSET ${keyNames[4]} "name" "Bill School" "description" "Billing School is a centre" "class" "private" "type" "democratic; waldorf" "address_city" "Goudhurst" "address_street" "Goudhurst" "students" 721 "location" "51.112685, 0.451076"`,
            `FT.CREATE ${indexNameSimpleDb} ON HASH PREFIX 1 "${keyNameSimpleDb}:" SCHEMA name TEXT NOSTEM description TEXT class TAG type TAG SEPARATOR ";" address_city AS city TAG address_street AS address TEXT NOSTEM students NUMERIC SORTABLE location GEO`
        ];
        // Create 5 keys and index
        await browserPage.Cli.sendCommandsInCli(commandsForStandalone);

        await t.click(browserPage.treeViewButton); // switch to tree view
        await t.click(browserPage.redisearchModeBtn); // click redisearch button
        await browserPage.selectIndexByName(indexNameSimpleDb); // select pre-created index in the standalone database
        await browserPage.TreeView.changeDelimiterInTreeView('-'); // change delimiter in tree view to be able to verify keys easily

        await verifyKeysDisplayingInTheList(keyNames, true); // verify created keys are visible

        await t.click(browserPage.OverviewPanel.myRedisDBLink); // go back to database selection page
        await myRedisDatabasePage.clickOnDBByName(bigDbName); // click database name from ossStandaloneBigConfig.databaseName

        await verifyKeysDisplayingInTheList(keyNames, false); // Verify that standandalone database keys are NOT visible

        await t.expect(Selector('span').withText('Select Index').exists).ok('Index is still selected');
    });
