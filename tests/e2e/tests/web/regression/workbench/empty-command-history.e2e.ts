import { Selector } from 'testcafe';
import { KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { DatabaseHelper } from '../../../../helpers/database';
import { BrowserPage, WorkbenchPage } from '../../../../pageObjects';
import { commonUrl, ossStandaloneConfig } from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';

const browserPage = new BrowserPage();
const workbenchPage = new WorkbenchPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();

fixture `Empty command history in Workbench`
    .meta({ type: 'regression' })
    .page(commonUrl)
    .beforeEach(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        // Go to Workbench page
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    })
    .afterEach(async() => {
        // Delete database
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    });
test
    .meta({ rte: rte.standalone })('Verify that user can see placeholder text in Workbench history if no commands have not been run yet', async t => {
        const commandToSend = 'info server';

        // Verify that all the elements from empty command history placeholder are displayed
        await t.expect(workbenchPage.noCommandHistorySection.visible).ok('No command history section is not visible');
        await t.expect(workbenchPage.noCommandHistoryIcon.visible).ok('No command history icon is not visible');
        await t.expect(workbenchPage.noCommandHistoryTitle.visible).ok('No command history title is not visible');
        await t.expect(workbenchPage.noCommandHistoryText.visible).ok('No command history text is not visible');
        // Run a command
        await workbenchPage.sendCommandInWorkbench(commandToSend);
        // Verify that empty command history placeholder is not displayed
        await t.expect(workbenchPage.noCommandHistorySection.visible).notOk('No command history section is still visible');
        // Delete the command result
        await t.click(Selector(workbenchPage.cssDeleteCommandButton));
        // Verify that empty command history placeholder is displayed
        await t.expect(workbenchPage.noCommandHistorySection.visible).ok('No command history section is not visible');
    });
