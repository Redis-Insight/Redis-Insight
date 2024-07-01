import { Chance } from 'chance';
import { DatabaseHelper } from '../../../../helpers/database';
import {
    MyRedisDatabasePage,
    SettingsPage,
    BrowserPage,
    WorkbenchPage
} from '../../../../pageObjects';
import {
    commonUrl,
    ossStandaloneBigConfig,
    ossStandaloneConfig,
    ossStandaloneNoPermissionsConfig
} from '../../../../helpers/conf';
import { KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';
import { WorkbenchActions } from '../../../../common-actions/workbench-actions';

const myRedisDatabasePage = new MyRedisDatabasePage();
const settingsPage = new SettingsPage();
const browserPage = new BrowserPage();
const chance = new Chance();
const workbenchPage = new WorkbenchPage();
const workbenchActions = new WorkbenchActions();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();

fixture `Monitor`
    .meta({ type: 'regression', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async() => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
    })
    .afterEach(async() => {
        // Delete database
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    });
test('Verify Monitor refresh/stop', async t => {
    // Run monitor
    await browserPage.Profiler.startMonitor();
    // Close Monitor
    await t.click(browserPage.Profiler.closeMonitor);
    // Verify that monitor is not displayed
    await t.expect(browserPage.Profiler.monitorArea.visible).notOk('Profiler area not found');
    // Verify that user open monitor again
    await t.click(browserPage.Profiler.expandMonitor);
    // Verify that when user closes the Monitor by clicking on "Close Monitor" button Monitor stopped
    await t.expect(browserPage.Profiler.startMonitorButton.visible).ok('Start profiler button not found');

    // Run monitor
    await t.click(browserPage.Profiler.startMonitorButton);
    await browserPage.Profiler.checkCommandInMonitorResults('info');
    // Click on Stop Monitor button
    await t.click(browserPage.Profiler.runMonitorToggle);
    // Check that Monitor is stopped
    await t.expect(browserPage.Profiler.resetProfilerButton.visible).ok('Reset profiler button not appeared');
    // Get the last log line
    const lastTimestamp = await browserPage.Profiler.monitorCommandLineTimestamp.nth(-1).textContent;
    // Click on refresh keys to get new logs
    await t.click(browserPage.refreshKeysButton);
    // Verify that Monitor is stopped when user clicks on "Stop" button
    await t.expect(browserPage.Profiler.monitorCommandLineTimestamp.nth(-1).textContent).eql(lastTimestamp, 'The last line of monitor logs not correct');

    // Run monitor
    await t.click(browserPage.Profiler.resetProfilerButton);
    await t.click(browserPage.Profiler.startMonitorButton);
    await browserPage.Profiler.checkCommandInMonitorResults('info');
    // Refresh the page
    await browserPage.reloadPage();
    // Check that monitor is closed
    await t.expect(browserPage.Profiler.monitorArea.exists).notOk('Monitor area not found');
    // Verify that when user refreshes the page the list of results in Monitor is not saved
    await t.click(browserPage.Profiler.expandMonitor);
    await t.expect(browserPage.Profiler.monitorWarningMessage.exists).ok('Warning message in monitor not found');

    // Run monitor
    await t.click(browserPage.Profiler.startMonitorButton);
    await browserPage.Profiler.checkCommandInMonitorResults('info');
    // Click on refresh keys to get new logs
    await t.click(browserPage.refreshKeysButton);
    // Get last timestamp
    const lastTimestampSelector = browserPage.Profiler.monitorCommandLineTimestamp.nth(-1);
    // Stop Monitor
    await browserPage.Profiler.stopMonitor();
    // Click on Clear button
    await t.click(browserPage.Profiler.clearMonitorButton);
    // Verify that when user clicks on "Clear" button in Monitor, all commands history is removed
    await t.expect(lastTimestampSelector.exists).notOk('Cleared last line not found');
});
test
    .before(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneBigConfig);
        await t.click(myRedisDatabasePage.NavigationPanel.settingsButton);
        await t.click(settingsPage.accordionAdvancedSettings);
        await settingsPage.changeKeysToScanValue('20000000');
        await t.click(myRedisDatabasePage.NavigationPanel.myRedisDBButton);
        await myRedisDatabasePage.clickOnDBByName(ossStandaloneBigConfig.databaseName);
    })
    .after(async t => {
        await t.click(myRedisDatabasePage.NavigationPanel.settingsButton);
        await t.click(settingsPage.accordionAdvancedSettings);
        await settingsPage.changeKeysToScanValue('10000');
        // Delete database
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneBigConfig);
    })('Verify that user can see monitor results in high DB load', async t => {
        // Run monitor
        await browserPage.Profiler.startMonitor();
        // Search by not existed key pattern
        await browserPage.searchByKeyName(`${chance.string({ length: 10 })}*`);
        // Check that the last child is updated
        for (let i = 0; i <= 10; i++) {
            const previousTimestamp = await browserPage.Profiler.monitorCommandLineTimestamp.nth(-1).textContent;
            await t.wait(5500);
            const nextTimestamp = await browserPage.Profiler.monitorCommandLineTimestamp.nth(-1).textContent;
            await t.expect(previousTimestamp).notEql(nextTimestamp, 'Monitor results not correct');
        }
    });
// Skipped due to redis issue https://redislabs.atlassian.net/browse/RI-4111
test.skip
    .before(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        await browserPage.Cli.sendCommandInCli('acl setuser noperm nopass on +@all ~* -monitor -client');
        // Check command result in CLI
        await t.click(browserPage.Cli.cliExpandButton);
        await t.expect(browserPage.Cli.cliOutputResponseSuccess.textContent).eql('"OK"', 'Command from autocomplete was not found & executed');
        await t.click(browserPage.Cli.cliCollapseButton);
        await t.click(myRedisDatabasePage.NavigationPanel.myRedisDBButton);
        await databaseAPIRequests.addNewStandaloneDatabaseApi(ossStandaloneNoPermissionsConfig);
        await browserPage.reloadPage();
        await myRedisDatabasePage.clickOnDBByName(ossStandaloneNoPermissionsConfig.databaseName);
    })
    .after(async t => {
        // Delete created user
        await t.click(myRedisDatabasePage.NavigationPanel.myRedisDBButton);
        await myRedisDatabasePage.clickOnDBByName(ossStandaloneConfig.databaseName);
        await browserPage.Cli.sendCommandInCli('acl DELUSER noperm');
        // Delete database
        await databaseAPIRequests.deleteStandaloneDatabasesApi([ossStandaloneConfig, ossStandaloneNoPermissionsConfig]);
    })('Verify that if user doesn\'t have permissions to run monitor, user can see error message', async t => {
        const command = 'CLIENT LIST';
        // Expand the Profiler
        await t.click(browserPage.Profiler.expandMonitor);
        // Click on run monitor button
        await t.click(browserPage.Profiler.startMonitorButton);
        // Check that error message is displayed
        await t.expect(browserPage.Profiler.monitorNoPermissionsMessage.visible).ok('Error message not found');
        // Check the error message text
        await t.expect(browserPage.Profiler.monitorNoPermissionsMessage.innerText).eql('The Profiler cannot be started. This user has no permissions to run the \'monitor\' command', 'No Permissions message not found');
        // Verify that if user doesn't have permissions to run monitor, run monitor button is not available
        await t.expect(browserPage.Profiler.runMonitorToggle.withAttribute('disabled').exists).ok('No permissions run icon not found');
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
        await workbenchPage.sendCommandInWorkbench(command);
        // Verify that user have the following error when there is no permission to run the CLIENT LIST: "NOPERM this user has no permissions to run the 'CLIENT LIST' command or its subcommand"
        await workbenchActions.verifyClientListErrorMessage();
    });
