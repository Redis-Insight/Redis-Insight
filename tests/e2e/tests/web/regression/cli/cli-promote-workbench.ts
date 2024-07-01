import { DatabaseHelper } from '../../../../helpers/database';
import { WorkbenchPage, MyRedisDatabasePage, BrowserPage } from '../../../../pageObjects';
import { commonUrl, ossStandaloneConfig } from '../../../../helpers/conf';
import { KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';

const browserPage = new BrowserPage();
const workbenchPage = new WorkbenchPage();
const myRedisDatabasePage = new MyRedisDatabasePage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();

fixture `Promote workbench in CLI`
    .meta({ type: 'regression', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async() => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
    })
    .afterEach(async() => {
        // Delete database
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    });
test('Verify that user can see saved workbench context after redirection from CLI to workbench', async t => {
    // Open Workbench
    await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
    await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    const command = 'INFO';
    await t.typeText(workbenchPage.queryInput, command, { replace: true, speed: 1, paste: true });
    await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
    // Verify that users can see workbench promotion message when they open CLI
    await t.click(browserPage.Cli.cliExpandButton);
    await t.expect(browserPage.Cli.workbenchLink.parent().textContent).eql('Try Workbench, our advanced CLI. Check out our Quick Guides to learn more about Redis capabilities.', 'Wrong promotion message');
    // Verify that user is redirected to Workbench page clicking on workbench link in CLI
    await t.click(browserPage.Cli.workbenchLink);
    await t.expect(workbenchPage.queryInput.exists).ok('Workbench page is not opened');
    // Verify that CLI panel is minimized after redirection to workbench from CLI
    await t.expect(workbenchPage.Cli.cliPanel.visible).notOk('Closed CLI');

    // Check editor
    await t.expect(workbenchPage.mainEditorArea.find('span').withExactText(command).visible).ok('Command is not saved in editor');
});
