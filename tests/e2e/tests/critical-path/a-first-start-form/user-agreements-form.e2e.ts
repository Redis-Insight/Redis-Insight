import { commonUrl } from '../../../helpers/conf';
import { UserAgreementPage, AddRedisDatabasePage, SettingsPage } from '../../../pageObjects';
import { Common } from '../../../helpers/common';
import { env, rte } from '../../../helpers/constants';

const userAgreementPage = new UserAgreementPage();
const addRedisDatabasePage = new AddRedisDatabasePage();
const settingsPage = new SettingsPage();
const common = new Common();

fixture `Agreements Verification`
    .meta({ type: 'critical_path', env: env.web, rte: rte.none })
    .page(commonUrl)
    .requestHooks(common.mock)
    .beforeEach(async t => {
        await t.maximizeWindow();
    });
test('Verify that user should accept User Agreements to continue working with the application', async t => {
    await t.expect(userAgreementPage.userAgreementsPopup.exists).ok('User Agreements Popup is shown');
    await t.click(addRedisDatabasePage.addDatabaseButton);
    //Verify that I still has agreements popup & cannot add a database
    await t.expect(userAgreementPage.userAgreementsPopup.exists).ok('User Agreements Popup is shown');
    await t.expect(addRedisDatabasePage.addDatabaseManually.exists).notOk('User can\'t add a database');
});
test('Verify that the encryption enabled by default and specific message', async t => {
    const expectedPluginText = 'To avoid automatic execution of malicious code, when adding new Workbench plugins, use files from trusted authors only.';
    //Verify that section with plugin warning is displayed
    await t.expect(userAgreementPage.pluginSectionWithText.visible).ok('Plugin text is displayed');
    //Verify that text that is displayed in window is 'While adding new visualization plugins, use files only from trusted authors to avoid automatic execution of malicious code.'
    const pluginText = userAgreementPage.pluginSectionWithText.innerText;
    await t.expect(pluginText).eql(expectedPluginText, 'Plugin text is incorrect');
    // Verify that encryption enabled by default
    await t.expect(userAgreementPage.switchOptionEncryption.withAttribute('aria-checked', 'true').exists).ok('Encryption enabled by default');
});
test('Verify that the Welcome page is opened after user agrees', async t => {
    //Accept agreements
    await t.click(settingsPage.switchEulaOption);
    await t.click(settingsPage.submitConsentsPopupButton);
    //Verify that I dont have an popup
    await t.expect(userAgreementPage.userAgreementsPopup.exists).notOk('User Agreements Popup isn\'t shown after accept agreements');
    //Verify that Welcome page is displayed after user agrees
    await t.expect(addRedisDatabasePage.welcomePageTitle.exists).ok('Welcome page is displayed');
    //Verify I can work with the application
    await t.click(addRedisDatabasePage.addDatabaseButton);
    await t.expect(addRedisDatabasePage.addDatabaseManually.exists).ok('User can add a database');
});
test('Verify that when user checks "Use recommended settings" option on EULA screen, all options (except Licence Terms) are checked', async t => {
    // Verify options unchecked before enabling Use recommended settings
    await t.expect(await settingsPage.getAnalyticsSwitcherValue()).eql('false', 'Enable Analytics switcher is checked');
    await t.expect(await settingsPage.getNotificationsSwitcherValue()).eql('false', 'Enable Notifications switcher is checked');
    // Check Use recommended settings switcher
    await t.click(userAgreementPage.recommendedSwitcher);
    // Verify options checked after enabling Use recommended settings
    await t.expect(await settingsPage.getAnalyticsSwitcherValue()).eql('true', 'Enable Analytics switcher is unchecked');
    await t.expect(await settingsPage.getNotificationsSwitcherValue()).eql('true', 'Enable Notifications switcher is unchecked');
    await t.expect(await settingsPage.getEulaSwitcherValue()).eql('false', 'EULA switcher is checked');
    // Uncheck Use recommended settings switcher
    await t.click(userAgreementPage.recommendedSwitcher);
    // Verify that when user unchecks "Use recommended settings" option on EULA screen, previous state of checkboxes for the options is applied
    await t.expect(await settingsPage.getAnalyticsSwitcherValue()).eql('false', 'Enable Analytics switcher is checked');
    await t.expect(await settingsPage.getNotificationsSwitcherValue()).eql('false', 'Enable Notifications switcher is checked');
    await t.expect(await settingsPage.getEulaSwitcherValue()).eql('false', 'EULA switcher is checked');
});
test('Verify that if "Use recommended settings" is selected, and user unchecks any of the option, "Use recommended settings" is unchecked', async t => {
    // Check Use recommended settings switcher
    await t.click(userAgreementPage.recommendedSwitcher);
    // Verify Use recommended settings switcher unchecked after unchecking analytics switcher
    await t.click(settingsPage.switchAnalyticsOption);
    await t.expect(await userAgreementPage.getRecommendedSwitcherValue()).eql('false', 'Use recommended settings switcher is still checked');
    // Check Use recommended settings switcher
    await t.click(userAgreementPage.recommendedSwitcher);
    // Verify Use recommended settings switcher unchecked after unchecking notifications switcher
    await t.click(settingsPage.switchNovitifationsOption);
    await t.expect(await userAgreementPage.getRecommendedSwitcherValue()).eql('false', 'Use recommended settings switcher is still checked');
});
