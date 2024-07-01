import { Chance } from 'chance';
import { DatabaseHelper } from '../../../../helpers/database';
import { ExploreTabs, KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { Common } from '../../../../helpers/common';
import {
    MyRedisDatabasePage,
    BrowserPage,
    WorkbenchPage
} from '../../../../pageObjects';
import {
    commonUrl,
    ossStandaloneConfig,
    ossStandaloneRedisearch,
    ossStandaloneBigConfig
} from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';
const myRedisDatabasePage = new MyRedisDatabasePage();
const browserPage = new BrowserPage();
const chance = new Chance();
const workbenchPage = new WorkbenchPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();

const fiveSecondsTimeout = 5000;
let keyName = chance.string({ length: 10 });
let keys: string[];
let keys1: string[];
let keys2: string[];

fixture `Database overview`
    .meta({ type: 'critical_path' })
    .page(commonUrl)
    .beforeEach(async() => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
    })
    .afterEach(async() => {
        //Delete database
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    });
test
    .meta({ rte: rte.standalone })
    .after(async() => {
        //Delete databases
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneRedisearch);
    })('Verify that user can see the list of Modules updated each time when he connects to the database', async t => {
        const firstDatabaseModules: string[] = [];
        const secondDatabaseModules: string[] = [];
        //Remember modules
        await t.hover(browserPage.OverviewPanel.databaseInfoIcon);
        await t.expect(browserPage.OverviewPanel.databaseInfoToolTip.visible).ok('Tooltip is not opened');
        const moduleIcons = await browserPage.OverviewPanel.databaseInfoToolTip.find('[data-testid^=module_]');
        let countOfModules = await moduleIcons.count;
        for(let i = 0; i < countOfModules; i++) {
            firstDatabaseModules.push(await moduleIcons.nth(i).textContent);
        }

        // Verify that user can be redirected to db list page by clicking on "Databases" link in the top left corner
        await t.click(browserPage.OverviewPanel.myRedisDBLink);
        //Add database with different modules
        await databaseAPIRequests.addNewStandaloneDatabaseApi(ossStandaloneRedisearch);
        await browserPage.reloadPage();
        await myRedisDatabasePage.clickOnDBByName(ossStandaloneRedisearch.databaseName);
        await t.hover(browserPage.OverviewPanel.databaseInfoIcon);
        await t.expect(browserPage.OverviewPanel.databaseInfoToolTip.visible).ok('Tooltip is not opened');
        countOfModules = await moduleIcons.count;
        for(let i = 0; i < countOfModules; i++) {
            secondDatabaseModules.push(await moduleIcons.nth(i).textContent);
        }
        //Verify the list of modules
        await t.expect(firstDatabaseModules).notEql(secondDatabaseModules, 'The list of Modules updated');
    });
test
    .meta({ rte: rte.standalone })('Verify that when user adds or deletes a new key, info in DB header is updated in 5 seconds', async t => {
        keyName = chance.string({ length: 10 });
        //Remember the total keys number
        const totalKeysBeforeAdd = await browserPage.OverviewPanel.overviewTotalKeys.innerText;
        //Add new key
        await browserPage.addHashKey(keyName);
        //Wait 5 seconds
        await t.wait(fiveSecondsTimeout);
        //Verify that the info on DB header is updated after adds
        const totalKeysAftreAdd = await browserPage.OverviewPanel.overviewTotalKeys.innerText;
        await t.expect(totalKeysAftreAdd).eql((Number(totalKeysBeforeAdd) + 1).toString(), 'Info in DB header after ADD');
        //Delete key
        await browserPage.deleteKeyByName(keyName);
        //Wait 5 seconds
        await t.wait(fiveSecondsTimeout);
        //Verify that the info on DB header is updated after deletion
        const totalKeysAftreDelete = await browserPage.OverviewPanel.overviewTotalKeys.innerText;
        await t.expect(totalKeysAftreDelete).eql((Number(totalKeysAftreAdd) - 1).toString(), 'Info in DB header after DELETE');
    });
test
    .meta({ rte: rte.standalone })
    .after(async t => {
        //Clear and delete database
        await t.click(myRedisDatabasePage.NavigationPanel.myRedisDBButton);
        await myRedisDatabasePage.clickOnDBByName(ossStandaloneConfig.databaseName);
        await browserPage.Cli.sendCommandInCli(`DEL ${keys1.join(' ')}`);
        await browserPage.Cli.sendCommandInCli(`DEL ${keys2.join(' ')}`);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneBigConfig);
    })('Verify that user can see total number of keys rounded in format 100, 1K, 1M, 1B in DB header in Browser page', async t => {
        //Add 100 keys
        keys1 = await Common.createArrayWithKeyValue(100);
        await browserPage.Cli.sendCliCommandAndWaitForTotalKeys(`MSET ${keys1.join(' ')}`);
        let totalKeys = await browserPage.OverviewPanel.overviewTotalKeys.innerText;
        //Verify that the info on DB header is updated after adds
        await t.expect(totalKeys).eql('100', 'Info in DB header after ADD 100 keys');
        //Add 1000 keys
        keys2 = await Common.createArrayWithKeyValue(1000);
        await browserPage.Cli.sendCliCommandAndWaitForTotalKeys(`MSET ${keys2.join(' ')}`);
        totalKeys = await browserPage.OverviewPanel.overviewTotalKeys.innerText;
        //Verify that the info on DB header is updated after adds
        await t.expect(totalKeys).eql('1 K', 'Info in DB header after ADD 1000 keys');
        //Add database with more than 1M keys
        await t.click(myRedisDatabasePage.NavigationPanel.myRedisDBButton);
        await databaseAPIRequests.addNewStandaloneDatabaseApi(ossStandaloneBigConfig);
        await browserPage.reloadPage();
        await myRedisDatabasePage.clickOnDBByName(ossStandaloneBigConfig.databaseName);
        //Wait 5 seconds
        await t.wait(fiveSecondsTimeout);
        //Verify that the info on DB header is rounded
        totalKeys = await browserPage.OverviewPanel.overviewTotalKeys.innerText;
        await t.expect(totalKeys).eql('18 M', 'Info in DB header is 18 M keys');
    });
test
    .meta({ rte: rte.standalone })
    .after(async() => {
        //Clear and delete database
        await browserPage.Cli.sendCommandInCli(`DEL ${keys.join(' ')}`);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    })('Verify that user can see total memory rounded in format B, KB, MB, GB, TB in DB header in Browser page', async t => {
        //Add new keys
        keys = await Common.createArrayWithKeyValue(100);
        await browserPage.Cli.sendCommandInCli(`MSET ${keys.join(' ')}`);
        //Verify total memory
        await t.wait(fiveSecondsTimeout);
        await t.expect(browserPage.OverviewPanel.overviewTotalMemory.textContent).contains('MB', 'Total memory value is MB');
    });
test
    .meta({ rte: rte.standalone })
    .before(async() => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneBigConfig);
    })
    .after(async t => {
        //Delete database and index
        await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
        await workbenchPage.sendCommandInWorkbench('FT.DROPINDEX idx:schools DD');
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneBigConfig);
    })('Verify that user can see additional information in Overview: Connected Clients, Commands/Sec, CPU (%) using Standalone DB connection type', async t => {
        const commandsSecBeforeEdit = await browserPage.OverviewPanel.overviewCommandsSec.textContent;
        await browserPage.OverviewPanel.waitForCpuIsCalculated();
        //Verify that additional information in Overview: Connected Clients, Commands/Sec, CPU (%) is displayed
        await t.expect(browserPage.OverviewPanel.overviewConnectedClients.exists).ok('Connected Clients is dispalyed in the Overview');
        await t.expect(browserPage.OverviewPanel.overviewCommandsSec.exists).ok('Commands/Sec is dispalyed in the Overview');
        await t.expect(browserPage.OverviewPanel.overviewCpu.exists).ok('CPU (%) is dispalyed in the Overview');
        //Run Create hash index command
        await browserPage.InsightsPanel.togglePanel(true);
        const tutorials = await browserPage.InsightsPanel.setActiveTab(ExploreTabs.Tutorials);
        await t.click(tutorials.dataStructureAccordionTutorialButton);
        await t.click(tutorials.internalLinkWorkingWithHashes);
        const cpuBeforeEdit = (await browserPage.OverviewPanel.overviewCpu.textContent).split(' ')[0];
        await tutorials.runBlockCode('Create a hash');
        //Verify that CPU and commands per second parameters are changed
        const commandsSecAfterEdit = await browserPage.OverviewPanel.overviewCommandsSec.textContent;
        await browserPage.OverviewPanel.waitForCpuIsCalculated();
        const cpuAfterEdit = (await browserPage.OverviewPanel.overviewCpu.textContent).split(' ')[0];
        await t.expect(Number(cpuAfterEdit)).gt(Number(cpuBeforeEdit), 'CPU parameter is changed');
        await t.expect(commandsSecAfterEdit).notEql(commandsSecBeforeEdit, 'Commands per second parameter is changed');
    });
