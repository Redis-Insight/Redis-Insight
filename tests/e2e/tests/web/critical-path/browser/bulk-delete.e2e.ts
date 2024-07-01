import { KeysInteractionTabs, KeyTypesTexts, rte } from '../../../../helpers/constants';
import { DatabaseHelper } from '../../../../helpers/database';
import { BrowserPage, MyRedisDatabasePage } from '../../../../pageObjects';
import { commonUrl, ossStandaloneRedisearch } from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';
import { Common } from '../../../../helpers/common';
import { deleteAllKeysFromDB, populateDBWithHashes } from '../../../../helpers/keys';

const browserPage = new BrowserPage();
const myRedisDatabasePage = new MyRedisDatabasePage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();

const keyNames = [Common.generateWord(20), Common.generateWord(20)];
const dbParameters = { host: ossStandaloneRedisearch.host, port: ossStandaloneRedisearch.port };
const keyToAddParameters = { keysCount: 10000, keyNameStartWith: 'hashKey' };
const keyToAddParameters2 = { keysCount: 500000, keyNameStartWith: 'hashKey' };

fixture `Bulk Delete`
    .meta({ type: 'critical_path', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneRedisearch);
        await browserPage.addHashKey(keyNames[0], '100000', Common.generateWord(20), Common.generateWord(20));
        await browserPage.addSetKey(keyNames[1], '100000', Common.generateWord(20));
        if (await browserPage.Toast.toastCloseButton.exists) {
            await t.click(browserPage.Toast.toastCloseButton);
        }
    })
    .afterEach(async() => {
        // Clear and delete database
        await deleteAllKeysFromDB(dbParameters.host, dbParameters.port);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneRedisearch);
    });
test('Verify that user can access the bulk actions screen in the Browser', async t => {
    // Filter by Hash keys
    await browserPage.selectFilterGroupType(KeyTypesTexts.Hash);
    // Open bulk actions
    await t.click(browserPage.bulkActionsButton);
    await t.expect(browserPage.BulkActions.bulkActionsContainer.exists).ok('Bulk actions screen not opened');
    // Verify that user can see pattern summary of the keys selected: key type, pattern
    await t.expect(browserPage.BulkActions.infoFilter.innerText).contains('Key type:\nHASH', 'Key type is not correct');
    await t.expect(browserPage.BulkActions.infoSearch.innerText).contains('Pattern: *', 'Key pattern is not correct');
    // Verify that user can hover over info icon in Bulk Delete preview and see info about accuracy of the calculation
    const tooltipText = 'Expected amount is estimated based on the number of keys scanned and the scan percentage. The final number may be different.';
    await t.hover(browserPage.BulkActions.bulkDeleteTooltipIcon);
    await t.expect(browserPage.tooltip.innerText).eql(tooltipText, 'Tooltip is not displayed or text is invalid');
    // Verify that user can see warning message clicking on Delete button for Bulk Deletion
    const warningTooltipTitle = 'Are you sure you want to perform this action?';
    const warningTooltipMessage = 'All keys with HASH key type and selected pattern will be deleted.';
    await t.click(browserPage.BulkActions.actionButton);
    await t.expect(browserPage.BulkActions.bulkActionWarningTooltip.textContent).contains(warningTooltipTitle, 'Warning Tooltip title is not displayed or text is invalid');
    await t.expect(browserPage.BulkActions.bulkActionWarningTooltip.textContent).contains(warningTooltipMessage, 'Warning Tooltip message is not displayed or text is invalid');
    await t.expect(browserPage.BulkActions.bulkApplyButton.exists).ok('Confirm deletion button not displayed');

});
test('Verify that user can see summary of scanned level', async t => {
    const expectedAmount = new RegExp('Expected amount: ~(9|10) \\d{3} keys');
    const scannedKeys = new RegExp('Scanned (5|10)% \\((500|1 000)/10 \\d{3}\\) and found \\d{3,5} keys');
    const messageTitle = 'No pattern or key type set';
    const messageText = 'To perform a bulk action, set the pattern or select the key type';

    // Add 10000 Hash keys
    await populateDBWithHashes(dbParameters.host, dbParameters.port, keyToAddParameters);
    // Open bulk actions
    await t.click(browserPage.bulkActionsButton);
    // Verify that user can see no pattern selected message when no key type and pattern applied for Bulk Delete
    await t.expect(browserPage.BulkActions.bulkActionsPlaceholder.textContent).contains(messageTitle, 'No pattern title not displayed');
    await t.expect(browserPage.BulkActions.bulkActionsPlaceholder.textContent).contains(messageText, 'No pattern message not displayed');
    // Filter by Hash keys
    await browserPage.selectFilterGroupType(KeyTypesTexts.Hash);
    // Verify that prediction of # of keys matching the filter in the entire database displayed
    await t.expect(browserPage.BulkActions.bulkActionsSummary.textContent).match(expectedAmount, 'Bulk actions summary is not correct');
    // Verify that % of total keys scanned, # of keys scanned / total # of keys in the database, # of keys matching the filter displayed
    await t.expect(browserPage.BulkActions.bulkDeleteSummary.innerText).match(scannedKeys, 'Bulk delete summary is not correct');

});
test('Verify that user can see blue progress line during the process of bulk deletion', async t => {
    // Add 500000 Hash keys
    await populateDBWithHashes(dbParameters.host, dbParameters.port, keyToAddParameters2);
    // Filter and search by Hash keys added
    await browserPage.selectFilterGroupType(KeyTypesTexts.Hash);
    await browserPage.searchByKeyName('hashKey*');
    await t.click(browserPage.bulkActionsButton);
    await browserPage.BulkActions.startBulkDelete();
    await t.expect(browserPage.BulkActions.progressLine.exists).ok('Blue progress line not displayed', { timeout: 5000 });
    await t.expect(browserPage.BulkActions.bulkStatusInProgress.exists).ok('Progress value not displayed', { timeout: 5000 });
});
test
    .before(async() => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneRedisearch);
        // Add 1000000 Hash keys
        await populateDBWithHashes(dbParameters.host, dbParameters.port, keyToAddParameters2);
        await populateDBWithHashes(dbParameters.host, dbParameters.port, keyToAddParameters2);
        // Filter and search by Hash keys added
        await browserPage.selectFilterGroupType(KeyTypesTexts.Hash);
        await browserPage.searchByKeyName('hashKey*');
    })('Verify that bulk deletion is still run when user goes to any ather page in the application inside of this DB', async t => {
        await t.click(browserPage.bulkActionsButton);
        await browserPage.BulkActions.startBulkDelete();
        // Go to Workbench page
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
        // Go to Browser Page
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.BrowserAndFilter);
        await t.expect(browserPage.BulkActions.bulkStatusInProgress.exists).ok('Progress value not displayed', { timeout: 5000 });
    });
test
    .before(async() => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneRedisearch);
        // Add 500000 keys
        await populateDBWithHashes(dbParameters.host, dbParameters.port, keyToAddParameters2);
        // Filter and search by Hash keys added
        await browserPage.selectFilterGroupType(KeyTypesTexts.Hash);
        await browserPage.searchByKeyName('hashKey*');
    })('Verify that when user stops bulk deletion, operation is stopped', async t => {
        await t.click(browserPage.bulkActionsButton);
        await browserPage.BulkActions.startBulkDelete();
        await t.click(browserPage.BulkActions.bulkStopButton);
        const stoppedProgress = parseInt((await browserPage.BulkActions.bulkStatusStopped.innerText).replace(/[^\d]/g, ''));
        await t.expect(browserPage.BulkActions.bulkStatusStopped.exists).ok('Progress value not displayed');
        // Verify that when user stop bulk deletion, he can see the percentage at which the operation was stopped
        await t.expect(stoppedProgress).gt(1, 'Progress value not displayed');
        await t.expect(stoppedProgress).lt(100, 'Progress value not correct');
    });
test('Verify that when bulk deletion is completed, status Action completed is displayed', async t => {
    // Filter by Hash keys
    await browserPage.selectFilterGroupType(KeyTypesTexts.Hash);
    await t.click(browserPage.bulkActionsButton);
    await browserPage.BulkActions.startBulkDelete();
    await t.expect(browserPage.BulkActions.bulkStatusCompleted.exists).ok('Bulk deletion not completed', { timeout: 15000 });
    await t.expect(browserPage.BulkActions.bulkStatusCompleted.textContent).eql('Action completed', 'Action completed text is not visible');
    // Verify that when bulk deletion is completed, button Delete changes to Start New
    await t.expect(browserPage.BulkActions.bulkStartAgainButton.exists).ok('"Start New" button not displayed');
    // Verify that user can click on Start New and existed filter will be applied
    await t.click(browserPage.BulkActions.bulkStartAgainButton);
    await t.expect(browserPage.BulkActions.bulkDeleteSummary.innerText).contains('Scanned 100% (2/2) and found 1 keys', 'Bulk delete summary is not correct');
});
test
    .before(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneRedisearch);
        await browserPage.addSetKey(keyNames[1], '100000', Common.generateWord(20));
        if (await browserPage.Toast.toastCloseButton.exists) {
            await t.click(browserPage.Toast.toastCloseButton);
        }
        // Add 10000 Hash keys
        await populateDBWithHashes(dbParameters.host, dbParameters.port, keyToAddParameters);
        // Filter by Hash keys
        await browserPage.selectFilterGroupType(KeyTypesTexts.Hash);
    })('Verify that after finishing bulk deletion user can see # of processed keys, # of deleted keys, # of errors, execution time', async t => {
        await t.click(browserPage.bulkActionsButton);
        await browserPage.BulkActions.startBulkDelete();
        await t.expect(browserPage.BulkActions.bulkDeleteCompletedSummary.textContent).contains('10 000Keys Processed', 'Bulk delete completed summary not correct');
        await t.expect(browserPage.BulkActions.bulkDeleteCompletedSummary.textContent).contains('10 000Success', 'Bulk delete completed summary not correct');
        await t.expect(browserPage.BulkActions.bulkDeleteCompletedSummary.textContent).contains('0Errors', 'Bulk delete completed summary not correct');
        await t.expect(browserPage.BulkActions.bulkDeleteCompletedSummary.textContent).notContains('0:00:00.00', 'Bulk delete completed summary not correct');
    });
test('Verify that after bulk deletion is completed, user can start new bulk delete', async t => {
    // Filter by Hash keys
    await browserPage.selectFilterGroupType(KeyTypesTexts.Hash);
    await t.click(browserPage.bulkActionsButton);
    await browserPage.BulkActions.startBulkDelete();
    await t.click(browserPage.BulkActions.bulkStartAgainButton);
    await browserPage.selectFilterGroupType(KeyTypesTexts.Stream);
    await t.expect(browserPage.BulkActions.infoFilter.innerText).contains('Key type:\nSTREAM', 'Key type is not correct');
    await t.click(browserPage.bulkActionsButton);
    await browserPage.BulkActions.startBulkDelete();
    await t.expect(browserPage.BulkActions.bulkStatusCompleted.textContent).eql('Action completed', 'Action completed text is not visible');
});
test('Verify that when user clicks on Close button when bulk delete is completed, panel is closed, no context is saved', async t => {
    // Filter by Hash keys
    await browserPage.selectFilterGroupType(KeyTypesTexts.Hash);
    await t.click(browserPage.bulkActionsButton);
    await browserPage.BulkActions.startBulkDelete();
    await t.click(browserPage.BulkActions.bulkCancelButton);
    await t.click(browserPage.bulkActionsButton);
    // Verify context not saved
    await t.expect(browserPage.BulkActions.bulkDeleteCompletedSummary.exists).notOk('Bulk delete completed summary still displayed');
    await t.expect(browserPage.BulkActions.bulkDeleteSummary.textContent).contains('Scanned 100% (2/2) and found 1 keys', 'Bulk delete summary is not correct');
    // Verify that when user clicks on cross icon when bulk delete is completed, panel is closed, no context is saved
    await t.click(browserPage.bulkActionsButton);
    await browserPage.BulkActions.startBulkDelete();
    await t.click(browserPage.BulkActions.bulkClosePanelButton);
    await t.click(browserPage.bulkActionsButton);
    // Verify context not saved
    await t.expect(browserPage.BulkActions.bulkDeleteCompletedSummary.exists).notOk('Bulk delete completed summary still displayed');
    await t.expect(browserPage.BulkActions.bulkDeleteSummary.textContent).contains('Scanned 100% (2/2) and found 1 keys', 'Bulk delete summary is not correct');
});
test
    .before(async() => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneRedisearch);
        await browserPage.addHashKey(keyNames[0], '100000', Common.generateWord(20), Common.generateWord(20));
    })('Verify that user can see the list of keys when click on “Back” button from the bulk actions', async t => {
        await t.click(browserPage.bulkActionsButton);
        await t.expect(browserPage.backToBrowserBtn.exists).notOk('"< Browser" button displayed for normal screen resolution');
        // Minimize the window to check icon
        await t.resizeWindow(1200, 900);
        await t.expect(browserPage.keyDetailsTable.visible).ok('Bulk actions not opened', { timeout: 1000 });
        // Verify that user can see the “Back” button when work with the bulk actions on small resolutions
        await t.expect(browserPage.backToBrowserBtn.exists).ok('"< Browser" button not displayed for small screen resolution');
        await t.click(browserPage.backToBrowserBtn);
        // Verify that key details closed
        await t.expect(browserPage.keyDetailsTable.visible).notOk('Bulk actions not closed by clicking on "< Browser" button', { timeout: 1000 });
    });
