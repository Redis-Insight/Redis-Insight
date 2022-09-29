import { acceptLicenseTermsAndAddDatabaseApi } from '../../../helpers/database';
import { BrowserPage, WorkbenchPage } from '../../../pageObjects';
import {
    commonUrl,
    ossStandaloneBigConfig,
    ossStandaloneConfig
} from '../../../helpers/conf';
import { KeyTypesTexts, rte } from '../../../helpers/constants';
import { deleteStandaloneDatabaseApi } from '../../../helpers/api/api-database';

const browserPage = new BrowserPage();
const workbenchPage = new WorkbenchPage();

fixture `Tree view verifications`
    .meta({type: 'regression', rte: rte.standalone})
    .page(commonUrl)
    .beforeEach(async() => {
        await acceptLicenseTermsAndAddDatabaseApi(ossStandaloneBigConfig, ossStandaloneBigConfig.databaseName);
    })
    .afterEach(async() => {
        //Delete database
        await deleteStandaloneDatabaseApi(ossStandaloneBigConfig);
    });
test
    .before(async() => {
        await acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig, ossStandaloneConfig.databaseName);
    })
    .after(async() => {
        //Delete database
        await deleteStandaloneDatabaseApi(ossStandaloneConfig);
    })('Verify that user can see message "No keys to display." when there are no keys in the database', async t => {
        const message = 'No keys to display.Use Workbench Guides and Tutorials to quickly load the data.'
        //Verify the message
        await t.click(browserPage.treeViewButton);
        await t.expect(browserPage.keyListMessage.textContent).contains(message, 'The message is displayed');
        // Verify that workbench opened by clicking on "Use Workbench Guides and Tutorials" link
        await t.click(browserPage.workbenchLinkButton);
        await t.expect(workbenchPage.expandArea.visible).ok('Workbench page is not opened');
    });
test('Verify that user can see the total number of keys, the number of keys scanned, the “Scan more” control displayed at the top of Tree view and Browser view', async t => {
        await browserPage.selectFilterGroupType(KeyTypesTexts.Hash);
        //Verify the controls on the Browser view
        await t.expect(browserPage.totalKeysNumber.visible).ok('The total number of keys is displayed on the Browser view');
        await t.expect(browserPage.scannedValue.visible).ok('The number of keys scanned is displayed on the Browser view');
        await t.expect(browserPage.scanMoreButton.visible).ok('The scan more button is displayed on the Browser view');
        //Verify the controls on the Tree view
        await t.click(browserPage.treeViewButton);
        await t.expect(browserPage.totalKeysNumber.visible).ok('The total number of keys is displayed on the Tree view');
        await t.expect(browserPage.scannedValue.visible).ok('The number of keys scanned is displayed on the Tree view');
        await t.expect(browserPage.scanMoreButton.visible).ok('The scan more button is displayed on the Tree view');
    });
test('Verify that when user deletes the key he can see the key is removed from the folder, the number of keys is reduced, the percentage is recalculated', async t => {
        //Open the first key in the tree view and remove
        await t.click(browserPage.treeViewButton);
        await t.expect(browserPage.treeViewDeviceFolder.visible).ok('The key folder is displayed', { timeout: 30000 });
        await t.click(browserPage.treeViewDeviceFolder);
        const numberOfKeys = await browserPage.treeViewDeviceKyesCount.textContent;
        const keyFolder = await browserPage.treeViewDeviceFolder.nth(2).textContent;
        await t.click(browserPage.treeViewDeviceFolder.nth(2));
        await t.click(browserPage.treeViewDeviceFolder.nth(5));
        await browserPage.deleteKey();
        //Verify the results
        await t.expect(browserPage.treeViewDeviceFolder.nth(2).textContent).notEql(keyFolder, 'The key folder is removed from the tree view');
        await t.expect(browserPage.treeViewDeviceKyesCount.textContent).notEql(numberOfKeys, 'The number of keys is recalculated');
    });
test('Verify that user can see that “:” (colon) used as a default separator for namespaces and see the number of keys found per each namespace', async t => {
        await t.click(browserPage.treeViewButton);
        //Verify the default separator
        await t.expect(browserPage.treeViewSeparator.textContent).eql(':', 'The “:” (colon) used as a default separator for namespaces');
        //Verify the number of keys found
        await t.expect(browserPage.treeViewKeysNumber.visible).ok('The user can see the number of keys');
    });
