import { DatabaseHelper } from '../../../../helpers/database';
import {
    commonUrl, ossStandaloneConfigEmpty
} from '../../../../helpers/conf';
import { KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { Common } from '../../../../helpers/common';
import {
    MemoryEfficiencyPage,
    SlowLogPage,
    WorkbenchPage,
    PubSubPage,
    MyRedisDatabasePage,
    BrowserPage
} from '../../../../pageObjects';
import { Telemetry } from '../../../../helpers/telemetry';
import { OnboardingCardsDialog } from '../../../../pageObjects/dialogs';

const myRedisDatabasePage = new MyRedisDatabasePage();
const browserPage = new BrowserPage();
const onboardingCardsDialog = new OnboardingCardsDialog();
const memoryEfficiencyPage = new MemoryEfficiencyPage();
const workBenchPage = new WorkbenchPage();
const slowLogPage = new SlowLogPage();
const pubSubPage = new PubSubPage();
const telemetry = new Telemetry();
const databaseHelper = new DatabaseHelper();

const logger = telemetry.createLogger();
const indexName = Common.generateWord(10);
const telemetryEvent = 'ONBOARDING_TOUR_FINISHED';
const expectedProperties = [
    'databaseId'
];

fixture `Onboarding new user tests`
    .meta({ type: 'regression', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async() => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfigEmpty);
    })
    .afterEach(async() => {
        await browserPage.Cli.sendCommandInCli(`DEL ${indexName}`);
        await databaseHelper.deleteDatabase(ossStandaloneConfigEmpty.databaseName);
    });
// https://redislabs.atlassian.net/browse/RI-4070, https://redislabs.atlassian.net/browse/RI-4067
// https://redislabs.atlassian.net/browse/RI-4278
test('Verify onboarding new user steps', async t => {
    await t.click(myRedisDatabasePage.NavigationPanel.helpCenterButton);
    await t.expect(myRedisDatabasePage.NavigationPanel.HelpCenter.helpCenterPanel.visible).ok('help center panel is not opened');
    // Verify that user can reset onboarding
    await t.click(onboardingCardsDialog.resetOnboardingBtn);
    await t.expect(onboardingCardsDialog.showMeAroundButton.visible).ok('onboarding starting is not visible');
    await onboardingCardsDialog.startOnboarding();
    // verify browser step is visible
    await onboardingCardsDialog.verifyStepVisible('Browser');
    // move to next step
    await onboardingCardsDialog.clickNextStep();
    // verify tree view step is visible
    await onboardingCardsDialog.verifyStepVisible('Tree view');
    await onboardingCardsDialog.clickNextStep();
    await onboardingCardsDialog.verifyStepVisible('Filter and search');
    await onboardingCardsDialog.clickNextStep();
    // verify cli is opened
    await t.expect(browserPage.Cli.cliPanel.visible).ok('cli is not expanded');
    await onboardingCardsDialog.verifyStepVisible('CLI');
    await onboardingCardsDialog.clickNextStep();
    // verify command helper area is opened
    await t.expect(browserPage.CommandHelper.commandHelperArea.visible).ok('command helper is not expanded');
    await onboardingCardsDialog.verifyStepVisible('Command Helper');
    await onboardingCardsDialog.clickNextStep();
    // verify profiler is opened
    await t.expect(browserPage.Profiler.monitorArea.visible).ok('profiler is not expanded');
    await onboardingCardsDialog.verifyStepVisible('Profiler');
    await onboardingCardsDialog.clickNextStep();
    // Verify that client list command visible when there is not any index created
    await t.expect(onboardingCardsDialog.wbOnbardingCommand.withText('CLIENT LIST').visible).ok('CLIENT LIST command is not visible');
    await t.expect(onboardingCardsDialog.copyCodeButton.visible).ok('copy code button is not visible');
    // verify workbench page is opened
    await t.expect(workBenchPage.mainEditorArea.visible).ok('workbench is not opened');
    await onboardingCardsDialog.verifyStepVisible('Try Workbench!');
    // create index in order to see in FT.INFO {index} in onboarding step
    await browserPage.Cli.sendCommandInCli(`FT.CREATE ${indexName} ON HASH PREFIX 1 test SCHEMA "name" TEXT`);
    // click back step button
    await onboardingCardsDialog.clickBackStep();
    // create index in order to see in FT.INFO {index} in onboarding step
    await workBenchPage.Cli.sendCommandInCli(`FT.CREATE ${indexName} ON HASH PREFIX 1 test SCHEMA "name" TEXT`);
    // verify one step before is opened
    await t.expect(browserPage.Profiler.monitorArea.visible).ok('profiler is not expanded');
    await onboardingCardsDialog.verifyStepVisible('Profiler');
    await onboardingCardsDialog.clickNextStep();
    // verify workbench page is opened
    await t.expect(onboardingCardsDialog.wbOnbardingCommand.withText(`FT.INFO ${indexName}`).visible).ok(`FT.INFO ${indexName} command is not visible`);
    await t.expect(onboardingCardsDialog.copyCodeButton.visible).ok('copy code button is not visible');
    await t.expect(workBenchPage.mainEditorArea.visible).ok('workbench is not opened');
    await onboardingCardsDialog.verifyStepVisible('Try Workbench!');
    await onboardingCardsDialog.clickNextStep();
    await onboardingCardsDialog.verifyStepVisible('Explore and learn more');
    await onboardingCardsDialog.clickNextStep();
    await onboardingCardsDialog.verifyStepVisible('Upload your tutorials');
    await onboardingCardsDialog.clickNextStep();
    // verify analysis tools page is opened
    await t.expect(memoryEfficiencyPage.noReportsText.visible).ok('analysis tools is not opened');
    await onboardingCardsDialog.verifyStepVisible('Database Analysis');
    await onboardingCardsDialog.clickNextStep();
    // verify slow log is opened
    await t.expect(slowLogPage.slowLogConfigureButton.visible).ok('slow log is not opened');
    await onboardingCardsDialog.verifyStepVisible('Slow Log');
    await onboardingCardsDialog.clickNextStep();
    // verify pub/sub page is opened
    await t.expect(pubSubPage.subscribeButton.visible).ok('pub/sub page is not opened');
    await onboardingCardsDialog.verifyStepVisible('Pub/Sub');
    await onboardingCardsDialog.clickNextStep();
    // verify last step of onboarding process is visible
    await onboardingCardsDialog.verifyStepVisible('Great job!');
    await onboardingCardsDialog.clickNextStep();
    // verify onboarding step completed successfully
    await onboardingCardsDialog.completeOnboarding();
    await t.expect(browserPage.patternModeBtn.visible).ok('Browser page is not opened');
});
// https://redislabs.atlassian.net/browse/RI-4067, https://redislabs.atlassian.net/browse/RI-4278
test('Verify onboard new user skip tour', async(t) => {
    await t.click(myRedisDatabasePage.NavigationPanel.helpCenterButton);
    await t.expect(myRedisDatabasePage.NavigationPanel.HelpCenter.helpCenterPanel.visible).ok('help center panel is not opened');
    // Verify that user can reset onboarding
    await t.click(onboardingCardsDialog.resetOnboardingBtn);
    await t.expect(onboardingCardsDialog.showMeAroundButton.visible).ok('onboarding starting is not visible');
    // start onboarding process
    await onboardingCardsDialog.startOnboarding();
    // verify browser step is visible
    await onboardingCardsDialog.verifyStepVisible('Browser');
    // move to next step
    await onboardingCardsDialog.clickNextStep();
    // verify tree view step is visible
    await onboardingCardsDialog.verifyStepVisible('Tree view');
    await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    await t.click(myRedisDatabasePage.NavigationPanel.helpCenterButton);
    await t.expect(myRedisDatabasePage.NavigationPanel.HelpCenter.helpCenterPanel.visible).ok('help center panel is not opened');
    await t.click(onboardingCardsDialog.resetOnboardingBtn);
    await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
    // Verify that when user reset onboarding, user can see the onboarding triggered when user open the Browser page.
    await t.expect(onboardingCardsDialog.showMeAroundButton.visible).ok('onboarding starting is not visible');
    // click skip tour
    await onboardingCardsDialog.clickSkipTour();
    // verify onboarding step completed successfully
    await onboardingCardsDialog.completeOnboarding();
    await t.expect(browserPage.patternModeBtn.visible).ok('Browser page is not opened');
    await myRedisDatabasePage.reloadPage();
    // verify onboarding step still not visible after refresh page
    await onboardingCardsDialog.completeOnboarding();
    await t.expect(browserPage.patternModeBtn.visible).ok('Browser page is not opened');
});
// https://redislabs.atlassian.net/browse/RI-4305
test.requestHooks(logger)('Verify that the final onboarding step is closed when user opens another page', async(t) => {
    await t.click(myRedisDatabasePage.NavigationPanel.helpCenterButton);
    await t.click(onboardingCardsDialog.resetOnboardingBtn);
    await onboardingCardsDialog.startOnboarding();
    await onboardingCardsDialog.clickNextUntilLastStep();
    // Verify last step of onboarding process is visible
    await onboardingCardsDialog.verifyStepVisible('Great job!');
    // Go to Workbench page
    await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
    await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);

    // Verify that “ONBOARDING_TOUR_FINISHED” event is sent when user opens another page (or close the app)
    await telemetry.verifyEventHasProperties(telemetryEvent, expectedProperties, logger);

    // Go to PubSub page
    await t.click(myRedisDatabasePage.NavigationPanel.pubSubButton);
    // Verify onboarding completed successfully
    await t.expect(onboardingCardsDialog.showMeAroundButton.exists).notOk('Show me around button still visible');
    await t.expect(onboardingCardsDialog.stepTitle.exists).notOk('Onboarding tooltip still visible');
    // Go to Browser Page
    await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
    // Verify onboarding completed successfully
    await onboardingCardsDialog.completeOnboarding();
    await t.expect(browserPage.patternModeBtn.visible).ok('Browser page is not opened');
});
