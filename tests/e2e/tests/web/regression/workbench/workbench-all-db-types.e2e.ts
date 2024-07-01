import { t } from 'testcafe';
import { KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { DatabaseHelper } from '../../../../helpers/database';
import { BrowserPage, MyRedisDatabasePage, WorkbenchPage } from '../../../../pageObjects';
import { cloudDatabaseConfig, commonUrl, ossClusterConfig, ossSentinelConfig } from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';

const myRedisDatabasePage = new MyRedisDatabasePage();
const workbenchPage = new WorkbenchPage();
const browserPage = new BrowserPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();

const commandForSend1 = 'info';
const commandForSend2 = 'FT._LIST';
const verifyCommandsInWorkbench = async(): Promise<void> => {
    const multipleCommands = [
        'info',
        'command',
        'FT.SEARCH idx *'
    ];

    await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
    await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    // Send commands
    await workbenchPage.sendCommandInWorkbench(commandForSend1);
    await workbenchPage.sendCommandInWorkbench(commandForSend2);
    // Check that all the previous run commands are saved and displayed
    await workbenchPage.reloadPage();
    await t.expect(workbenchPage.queryCardCommand.withExactText(commandForSend1).exists).ok('The previous run commands are saved');
    await t.expect(workbenchPage.queryCardCommand.withExactText(commandForSend2).exists).ok('The previous run commands are saved');
    // Send multiple commands in one query
    await workbenchPage.sendCommandInWorkbench(multipleCommands.join('\n'), 0.75);
    // Check that the results for all commands are displayed
    for (const command of multipleCommands) {
        await t.expect(workbenchPage.queryCardCommand.withExactText(command).exists).ok(`The command ${command} from multiple query is displayed`);
    }
};

fixture `Work with Workbench in all types of databases`
    .meta({ type: 'regression' })
    .page(commonUrl);
test
    .meta({ rte: rte.reCloud })
    .before(async() => {
        await databaseHelper.acceptLicenseTermsAndAddRECloudDatabase(cloudDatabaseConfig);
    })
    .after(async() => {
        // Delete database
        await databaseHelper.deleteDatabase(cloudDatabaseConfig.databaseName);
    })('Verify that user can run commands in Workbench in RE Cloud DB', async() => {
        await verifyCommandsInWorkbench();
    });
test
    .meta({ rte: rte.ossCluster })
    .before(async() => {
        await databaseHelper.acceptLicenseTermsAndAddOSSClusterDatabase(ossClusterConfig);
    })
    .after(async() => {
        // Delete database
        await databaseAPIRequests.deleteOSSClusterDatabaseApi(ossClusterConfig);
    })('Verify that user can run commands in Workbench in OSS Cluster DB', async() => {
        await verifyCommandsInWorkbench();
    });
test
    .meta({ rte: rte.sentinel })
    .before(async() => {
        await databaseHelper.acceptLicenseTermsAndAddSentinelDatabaseApi(ossSentinelConfig);
    })
    .after(async() => {
        // Delete database
        await databaseAPIRequests.deleteAllDatabasesByConnectionTypeApi('SENTINEL');
    })('Verify that user can run commands in Workbench in Sentinel Primary Group', async() => {
        await verifyCommandsInWorkbench();
    });
