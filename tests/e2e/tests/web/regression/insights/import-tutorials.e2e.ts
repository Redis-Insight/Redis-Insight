import * as path from 'path';
import * as fs from 'fs';
import { join as joinPath } from 'path';
import { t } from 'testcafe';
import { ExploreTabs, KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { DatabaseHelper } from '../../../../helpers/database';
import { BrowserPage, MemoryEfficiencyPage, MyRedisDatabasePage, WorkbenchPage } from '../../../../pageObjects';
import { commonUrl, ossStandaloneConfig, ossStandaloneRedisearch, fileDownloadPath } from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';
import { Common } from '../../../../helpers/common';
import { deleteAllKeysFromDB, verifyKeysDisplayingInTheList } from '../../../../helpers/keys';
import { DatabasesActions } from '../../../../common-actions/databases-actions';

const myRedisDatabasePage = new MyRedisDatabasePage();
const workbenchPage = new WorkbenchPage();
const browserPage = new BrowserPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();
const databasesActions = new DatabasesActions();
const memoryEfficiencyPage = new MemoryEfficiencyPage();

const zipFolderName = 'customTutorials';
const folderPath = path.join('..', 'test-data', 'upload-tutorials', zipFolderName);
const folder1 = 'folder-1';
const folder2 = 'folder-2';
const internalLinkName2 = 'vector-2';
let tutorialName = `${zipFolderName}${Common.generateWord(5)}`;
let zipFilePath = path.join('..', 'test-data', 'upload-tutorials', `${tutorialName}.zip`);
let internalLinkName1 = 'probably-1';
let foundExportedFiles: string[];
const verifyCompletedResultText = async(resultsText: string[]): Promise<void> => {
    for (const result of resultsText) {
        await t.expect(workbenchPage.Toast.toastBody.textContent).contains(result, 'Bulk upload completed summary not correct');
    }
    await t.expect(workbenchPage.Toast.toastBody.textContent).notContains('0:00:00.000', 'Bulk upload Time taken not correct');
    await t.click(workbenchPage.Toast.toastSubmitBtn);
};

fixture `Upload custom tutorials`
    .meta({ type: 'regression', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    })
    .afterEach(async() => {
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    });
/* https://redislabs.atlassian.net/browse/RI-4186, https://redislabs.atlassian.net/browse/RI-4198,
https://redislabs.atlassian.net/browse/RI-4302, https://redislabs.atlassian.net/browse/RI-4318
*/
// Unskip after resolving https://redislabs.atlassian.net/browse/RI-5859
test.skip
    .before(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);

        tutorialName = `${zipFolderName}${Common.generateWord(5)}`;
        zipFilePath = path.join('..', 'test-data', 'upload-tutorials', `${tutorialName}.zip`);
        // Create zip file for uploading
        await Common.createZipFromFolder(folderPath, zipFilePath);
    })
    .after(async() => {
        // Delete zip file
        await Common.deleteFileFromFolder(zipFilePath);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    })('Verify that user can upload tutorial with local zip file without manifest.json', async t => {
        // Verify that user can upload custom tutorials on docker version
        internalLinkName1 = 'probably-1';
        const imageExternalPath = 'Redis Insight screen external';

        // Verify that user can see the “MY TUTORIALS” section in the Enablement area.
        await workbenchPage.InsightsPanel.togglePanel(true);
        const tutorials = await workbenchPage.InsightsPanel.setActiveTab(ExploreTabs.Tutorials);

        await t.expect(tutorials.customTutorials.visible).ok('custom tutorials sections is not visible');
        await t.click(tutorials.tutorialOpenUploadButton);
        await t.expect(tutorials.tutorialSubmitButton.hasAttribute('disabled')).ok('submit button is not disabled');

        // Verify that User can request to add a new custom Tutorial by uploading a .zip archive from a local folder
        await t.setFilesToUpload(tutorials.tutorialImport, [zipFilePath]);
        await t.click(tutorials.tutorialSubmitButton);
        await t.expect(tutorials.tutorialAccordionButton.withText(tutorialName).visible).ok(`${tutorialName} tutorial is not uploaded`);

        // Verify that when user upload a .zip archive without a .json manifest, all markdown files are inserted at the same hierarchy level
        await t.click(tutorials.tutorialAccordionButton.withText(tutorialName));
        await t.expect(tutorials.getAccordionButtonWithName(folder1).visible).ok(`${folder1} is not visible`);
        await t.expect(tutorials.getAccordionButtonWithName(folder2).visible).ok(`${folder2} is not visible`);
        await t.click(tutorials.getAccordionButtonWithName(folder1));
        await t.expect(tutorials.getInternalLinkWithManifest(internalLinkName1).visible)
            .ok(`${internalLinkName1} is not visible`);
        await t.click(tutorials.getAccordionButtonWithName(folder2));
        await t.expect(tutorials.getInternalLinkWithManifest(internalLinkName2).visible)
            .ok(`${internalLinkName2} is not visible`);
        await t.expect(tutorials.scrolledEnablementArea.exists).notOk('enablement area is visible before clicked');
        await t.click(tutorials.getInternalLinkWithManifest(internalLinkName1));
        await t.expect(tutorials.scrolledEnablementArea.visible).ok('enablement area is not visible after clicked');

        // Verify that user can see image in custom tutorials by providing absolute external path in md file
        const imageExternal = tutorials.getTutorialImageByAlt(imageExternalPath);
        await tutorials.waitUntilImageRendered(imageExternal);
        const imageExternalHeight = await imageExternal.getStyleProperty('height');
        await t.expect(parseInt(imageExternalHeight.replace(/[^\d]/g, ''))).gte(150);

        /* Uncomment after fix https://redislabs.atlassian.net/browse/RI-4486
        also need to add in probably-1.md file:
        Relative:
        ![RedisInsight screen relative](../_images/image.png) */
        // Verify that user can see image in custom tutorials by providing relative path in md file
        // const imageRelative = await workbenchPage.getTutorialImageByAlt(imageRelativePath);
        // await workbenchPage.waitUntilImageRendered(imageRelative);
        // const imageRelativeHeight = await imageRelative.getStyleProperty('height');
        // await t.expect(parseInt(imageRelativeHeight.replace(/[^\d]/g, ''))).gte(150);

        // Verify that when User delete the tutorial, then User can see this tutorial and relevant markdown files are deleted from: the Enablement area in Workbench
        await t.click(tutorials.closeEnablementPage);
        await t.click(tutorials.tutorialLatestDeleteIcon);
        await t.expect(tutorials.tutorialDeleteButton.visible).ok('Delete popup is not visible');
        await t.click(tutorials.tutorialDeleteButton);
        await t.expect(tutorials.tutorialDeleteButton.exists).notOk('Delete popup is still visible');
        await t.expect(tutorials.tutorialAccordionButton.withText(tutorialName).exists)
            .notOk(`${tutorialName} tutorial is not uploaded`);
    });
// https://redislabs.atlassian.net/browse/RI-4186, https://redislabs.atlassian.net/browse/RI-4213, https://redislabs.atlassian.net/browse/RI-4302
test
    .after(async() => {
        tutorialName = 'Tutorials with manifest';
        const tutorials = await workbenchPage.InsightsPanel.setActiveTab(ExploreTabs.Tutorials);
        if(await tutorials.tutorialAccordionButton.withText(tutorialName).exists) {
            await tutorials.deleteTutorialByName(tutorialName);
        }
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    })('Verify that user can upload tutorial with URL with manifest.json', async t => {
        const labelFromManifest = 'Working with JSON label';
        const link = 'https://github.com/RedisInsight/RedisInsight/raw/9155d0241f6937c213893a29fe24c2f560cd48f3/tests/e2e/test-data/upload-tutorials/TutorialsWithManifest.zip';
        internalLinkName1 = 'manifest-id';
        tutorialName = 'Tutorials with manifest';
        const summary = 'Summary for JSON';

        await workbenchPage.InsightsPanel.togglePanel(true);
        const tutorials = await workbenchPage.InsightsPanel.setActiveTab(ExploreTabs.Tutorials);
        await t.click(tutorials.tutorialOpenUploadButton);
        // Verify that user can upload tutorials using a URL
        await t.typeText(tutorials.tutorialLinkField, link);
        await t.click(tutorials.tutorialSubmitButton);
        await t.expect(tutorials.tutorialAccordionButton.withText(tutorialName).with({ timeout: 20000 }).visible)
            .ok(`${tutorialName} tutorial is not uploaded`);
        await t.click(tutorials.tutorialAccordionButton.withText(tutorialName));
        // Verify that User can see the same structure in the tutorial uploaded as described in the .json manifest
        await t.expect(tutorials.getInternalLinkWithoutManifest(internalLinkName1).visible)
            .ok(`${internalLinkName1} folder specified in manifest is not visible`);
        await t.expect(tutorials.getInternalLinkWithoutManifest(internalLinkName1).textContent)
            .contains(labelFromManifest, `${labelFromManifest} tutorial specified in manifest is not visible`);
        await t.expect(tutorials.getInternalLinkWithoutManifest(internalLinkName1).textContent)
            .contains(summary, `${summary} tutorial specified in manifest is not visible`);
        await t.click(tutorials.getInternalLinkWithoutManifest(internalLinkName1));
        await t.expect(tutorials.scrolledEnablementArea.visible).ok('enablement area is not visible after clicked');
        await t.click(tutorials.closeEnablementPage);
        await t.click(tutorials.tutorialLatestDeleteIcon);
        await t.expect(tutorials.tutorialDeleteButton.visible).ok('Delete popup is not visible');
        await t.click(tutorials.tutorialDeleteButton);
        await t.expect(tutorials.tutorialDeleteButton.exists).notOk('Delete popup is still visible');
        // Verify that when User delete the tutorial, then User can see this tutorial and relevant markdown files are deleted from: the Enablement area in Workbench
        await t.expect(tutorials.tutorialAccordionButton.withText(tutorialName).exists)
            .notOk(`${tutorialName} tutorial is not uploaded`);
    });
// https://redislabs.atlassian.net/browse/RI-4352
// Unskip after resolving https://redislabs.atlassian.net/browse/RI-5859
test.skip
    .before(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneRedisearch);
        await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);

        tutorialName = `${zipFolderName}${Common.generateWord(5)}`;
        zipFilePath = path.join('..', 'test-data', 'upload-tutorials', `${tutorialName}.zip`);
        // Create zip file for uploading
        await Common.createZipFromFolder(folderPath, zipFilePath);
    })
    .after(async() => {
        // Delete exported file
        fs.unlinkSync(joinPath(fileDownloadPath, foundExportedFiles[0]));
        await Common.deleteFileFromFolder(zipFilePath);
        await deleteAllKeysFromDB(ossStandaloneRedisearch.host, ossStandaloneRedisearch.port);
        // Clear and delete database
        await t.click(browserPage.NavigationPanel.browserButton);
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);

        await workbenchPage.InsightsPanel.togglePanel(true);
        const tutorials = await workbenchPage.InsightsPanel.setActiveTab(ExploreTabs.Tutorials);
        await tutorials.deleteTutorialByName(tutorialName);
        await t.expect(tutorials.tutorialAccordionButton.withText(tutorialName).exists)
            .notOk(`${tutorialName} tutorial is not deleted`);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneRedisearch);
    })('Verify that user can bulk upload data from custom tutorial', async t => {
        const allKeysResults = ['9Commands Processed', '9Success', '0Errors'];
        const absolutePathResults = ['1Commands Processed', '1Success', '0Errors'];
        const invalidPathes = ['Invalid relative', 'Invalid absolute'];
        const keyNames = ['hashkey1', 'listkey1', 'setkey1', 'zsetkey1', 'stringkey1', 'jsonkey1', 'streamkey1', 'graphkey1', 'tskey1', 'stringkey1test'];
        internalLinkName1 = 'probably-1';
        const fileStarts = 'Upload';

        // Upload custom tutorial
        await workbenchPage.InsightsPanel.togglePanel(true);
        const tutorials = await workbenchPage.InsightsPanel.setActiveTab(ExploreTabs.Tutorials);
        await t
            .click(tutorials.tutorialOpenUploadButton)
            .setFilesToUpload(tutorials.tutorialImport, [zipFilePath])
            .click(tutorials.tutorialSubmitButton);
        await t.expect(tutorials.tutorialAccordionButton.withText(tutorialName).visible).ok(`${tutorialName} tutorial is not uploaded`);
        // Open tutorial
        await t
            .click(tutorials.tutorialAccordionButton.withText(tutorialName))
            .click(tutorials.getAccordionButtonWithName(folder1))
            .click(tutorials.getInternalLinkWithManifest(internalLinkName1));
        await t.expect(tutorials.scrolledEnablementArea.visible).ok('Enablement area is not visible after clicked');

        // Verify that user can bulk upload data by relative path

        // Remember the number of files in Temp
        const numberOfDownloadFiles = await databasesActions.getFileCount(fileDownloadPath, fileStarts);
        await t.click(tutorials.uploadDataBulkBtn.withText('Upload relative'));
        await t.click(tutorials.downloadFileBtn);
        foundExportedFiles = await databasesActions.findFilesByFileStarts(fileDownloadPath, fileStarts);
        await t.expect(await databasesActions.getFileCount(fileDownloadPath, fileStarts)).gt(numberOfDownloadFiles, 'The Profiler logs not saved', { timeout: 5000 });

        await t.click(tutorials.uploadDataBulkApplyBtn);
        // Verify that user can see the summary when the command execution is completed
        await verifyCompletedResultText(allKeysResults);

        // Verify that user can bulk upload data by absolute path
        await t.click(tutorials.uploadDataBulkBtn.withText('Upload absolute'));
        await t.click(tutorials.uploadDataBulkApplyBtn);
        await verifyCompletedResultText(absolutePathResults);

        // Verify that user can't upload file by invalid relative path
        // Verify that user can't upload file by invalid absolute path
        for (const path of invalidPathes) {
            await t.click(tutorials.uploadDataBulkBtn.withText(path));
            await t.click(tutorials.uploadDataBulkApplyBtn);
            // Verify that user can see standard error messages when any error occurs while finding the file or parsing it
            await t.expect(workbenchPage.Toast.toastError.textContent).contains('Data file was not found', 'Bulk upload not failed');
            await t.click(workbenchPage.Toast.toastCancelBtn);
        }

        // Open Browser page
        await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
        // Verify that keys of all types can be uploaded
        await browserPage.searchByKeyName('*key1*');
        await verifyKeysDisplayingInTheList(keyNames, true);
    });
// Unskip after resolving https://redislabs.atlassian.net/browse/RI-5859
test.skip
    .before(async() => {
        await databaseHelper.acceptLicenseTerms();
        await databaseAPIRequests.addNewStandaloneDatabaseApi(
            ossStandaloneRedisearch
        );
        await myRedisDatabasePage.reloadPage();
        tutorialName = `${zipFolderName}${Common.generateWord(5)}`;
        zipFilePath = path.join('..', 'test-data', 'upload-tutorials', `${tutorialName}.zip`);
        // Create zip file for uploading
        await Common.createZipFromFolder(folderPath, zipFilePath);
    })
    .after(async() => {
        await Common.deleteFileFromFolder(zipFilePath);
        // Clear and delete database
        const tutorials = await workbenchPage.InsightsPanel.setActiveTab(ExploreTabs.Tutorials);
        await tutorials.deleteTutorialByName(tutorialName);
        await t.expect(tutorials.tutorialAccordionButton.withText(tutorialName).exists)
            .notOk(`${tutorialName} tutorial is not deleted`);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneRedisearch);
    })('Verify that user can open tutorial from links in other tutorials', async t => {
        // Upload custom tutorial
        await workbenchPage.InsightsPanel.togglePanel(true);
        const tutorials = await workbenchPage.InsightsPanel.setActiveTab(ExploreTabs.Tutorials);
        await t
            .click(tutorials.tutorialOpenUploadButton)
            .setFilesToUpload(tutorials.tutorialImport, [zipFilePath])
            .click(tutorials.tutorialSubmitButton);
        await t.expect(tutorials.tutorialAccordionButton.withText(tutorialName).visible).ok(`${tutorialName} tutorial is not uploaded`);
        // Open tutorial
        await t
            .click(tutorials.tutorialAccordionButton.withText(tutorialName))
            .click(tutorials.getAccordionButtonWithName(folder2))
            .click(tutorials.getInternalLinkWithManifest(internalLinkName2));
        await t.expect(tutorials.scrolledEnablementArea.visible).ok('Enablement area is not visible after clicked');

        // Verify that user do not see the standard popover when open a tutorial page via the link
        await t.click(tutorials.tutorialLink.withText('linkTheSamePage'));
        await t.expect(tutorials.getTutorialByName('CREATE DOCUMENTS').exists).ok('Tutorial not opened by link');

        // Verify that user can see a standard popover to open a database when clicking a link where page is inside of the database which is not opened
        await t.click(tutorials.closeEnablementPage);
        await t.click(tutorials.getInternalLinkWithManifest(internalLinkName2));
        await t.click(tutorials.tutorialLink.withText('link2AnalyticsPageWithTutorial'));
        await t.expect(tutorials.openDatabasePopover.exists).ok('Open a database popover is not displayed');

        // Verify that user not redirected anywhere and do not see an error when clicking on the broken link
        await t.click(tutorials.tutorialLink.withText('link3InvalidPage'));
        await t.expect(tutorials.getTutorialByName('VECTOR 2').exists).ok('Tutorial page is changed');
        // await t.expect(tutorials.openDatabasePopover.exists).notOk('Open a database popover is still displayed');
        await t.click(tutorials.tutorialLink.withText('link4InvalidTutorial'));
        await t.expect(tutorials.getTutorialByName('VECTOR 2').exists).ok('Tutorial page is changed');
        // await t.expect(tutorials.openDatabasePopover.exists).notOk('Open a database popover is still displayed');

        // Open existing database
        await myRedisDatabasePage.clickOnDBByName(ossStandaloneRedisearch.databaseName);

        // Verify that user can use '[link](redisinsight:_?tutorialId={tutorialId})' syntax to cross-reference tutorials
        await t.click(tutorials.tutorialLink.withText('link2AnalyticsPageWithTutorial'));
        await t.expect(tutorials.getTutorialByName('INTRODUCTION').exists).ok('Tutorial not opened by link');
        await t.expect(memoryEfficiencyPage.analysisPage.visible).ok('Analysis page is not opened by link');
    });
