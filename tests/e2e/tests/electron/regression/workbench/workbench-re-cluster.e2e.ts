import { t } from 'testcafe';
import { KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { DatabaseHelper } from '../../../../helpers/database';
import { BrowserPage, MyRedisDatabasePage, WorkbenchPage } from '../../../../pageObjects';
import { commonUrl, redisEnterpriseClusterConfig } from '../../../../helpers/conf';

const myRedisDatabasePage = new MyRedisDatabasePage();
const workbenchPage = new WorkbenchPage();
const databaseHelper = new DatabaseHelper();
const browserPage = new BrowserPage();

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

fixture `Work with Workbench in RE Cluster`
    .meta({ type: 'regression' })
    .page(commonUrl);
test
    .meta({ rte: rte.reCluster })
    .before(async() => {
        await databaseHelper.acceptLicenseTermsAndAddREClusterDatabase(redisEnterpriseClusterConfig);
    })
    .after(async() => {
        // Delete database
        await databaseHelper.deleteDatabase(redisEnterpriseClusterConfig.databaseName);
    })('Verify that user can run commands in Workbench in RE Cluster DB', async() => {
        await verifyCommandsInWorkbench();
    });
