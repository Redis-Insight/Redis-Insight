import { Chance } from 'chance';
import { MyRedisDatabasePage, MemoryEfficiencyPage, BrowserPage, WorkbenchPage } from '../../../../pageObjects';
import { rte } from '../../../../helpers/constants';
import { DatabaseHelper } from '../../../../helpers/database';
import { commonUrl, ossStandaloneConfig } from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';
import { verifySearchFilterValue } from '../../../../helpers/keys';
import { APIKeyRequests } from '../../../../helpers/api/api-keys';

const memoryEfficiencyPage = new MemoryEfficiencyPage();
const myRedisDatabasePage = new MyRedisDatabasePage();
const browserPage = new BrowserPage();
const workbenchPage = new WorkbenchPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();
const apiKeyRequests = new APIKeyRequests();
const chance = new Chance();

const hashKeyName = 'test:Hash1';
const hashValue = 'hashValue11111!';
const streamKeyName = 'test:Stream1';
const streamKeyNameDelimiter = 'test-Stream1';
const keySpaces = ['test:*', 'key1:*', 'key2:*', 'key5:*', 'key5:5', 'test-*', 'key4:*'];
const keysTTL = ['3500', '86300', '2147476121'];
const numberOfGeneratedKeys = 6;
const keyNamesReport = chance.unique(chance.word, numberOfGeneratedKeys);

fixture `Memory Efficiency`
    .meta({ type: 'critical_path', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        // Go to Analysis Tools page
        await t.click(myRedisDatabasePage.NavigationPanel.analysisPageButton);
    })
    .afterEach(async() => {
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    });
test
    .before(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        // Go to Analysis Tools page
        await t.click(myRedisDatabasePage.NavigationPanel.analysisPageButton);
        await browserPage.Cli.sendCommandInCli('flushdb');
    })('No reports/keys message and report tooltip', async t => {
        const noReportsMessage = 'No Reports foundRun "New Analysis" to generate first report.';
        const noKeysMessage = 'No keys to displayUse Workbench Guides and Tutorials to quickly load the data.';
        const tooltipText = 'Analyze up to 10 000 keys to get an overview of your data and tips';

        // Verify that user can see the “No reports found” message when report wasn't generated
        await t.expect(memoryEfficiencyPage.noReportsText.textContent).eql(noReportsMessage, 'No reports message not displayed or text is invalid');
        // Verify that user can see the “No keys to display” message when there are no keys in database
        await t.click(memoryEfficiencyPage.newReportBtn);
        await t.expect(memoryEfficiencyPage.noKeysText.textContent).eql(noKeysMessage, 'No keys message not displayed or text is invalid');
        // Verify that user can open workbench page from No keys to display message
        await t.click(memoryEfficiencyPage.workbenchLink);
        await t.expect(workbenchPage.queryInput.visible).ok('Workbench page is not opened');
        // Turn back to Memory Efficiency page
        await t.click(myRedisDatabasePage.NavigationPanel.analysisPageButton);
        // Verify that user can see a tooltip when hovering over the icon on the right of the “New analysis” button
        await t.hover(memoryEfficiencyPage.reportTooltipIcon);
        await t.expect(browserPage.tooltip.textContent).contains(tooltipText, 'Report tooltip is not displayed or text is invalid');
    });
test
    .before(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        await browserPage.addHashKey(hashKeyName, keysTTL[2], hashValue);
        await browserPage.addStreamKey(streamKeyName, 'field', 'value', keysTTL[2]);
        await browserPage.addStreamKey(streamKeyNameDelimiter, 'field', 'value', keysTTL[2]);
        if (await browserPage.Toast.toastSubmitBtn.exists) {
            await t.click(browserPage.Toast.toastSubmitBtn);
        }
        await browserPage.Cli.addKeysFromCliWithDelimiter('MSET', 15);
        await t.click(browserPage.treeViewButton);
        // Go to Analysis Tools page
        await t.click(myRedisDatabasePage.NavigationPanel.analysisPageButton);
    })
    .after(async t => {
        await browserPage.Cli.deleteKeysFromCliWithDelimiter(15);
        await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
        await t.click(browserPage.browserViewButton);
        await apiKeyRequests.deleteKeyByNameApi(hashKeyName, ossStandaloneConfig.databaseName);
        await apiKeyRequests.deleteKeyByNameApi(streamKeyName, ossStandaloneConfig.databaseName);
        await apiKeyRequests.deleteKeyByNameApi(streamKeyNameDelimiter, ossStandaloneConfig.databaseName);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    })('Keyspaces displaying in Summary per keyspaces table', async t => {
        const noNamespacesMessage = 'No namespaces to displayConfigure the delimiter in Tree View to customize the namespaces displayed.';

        // Create new report
        await t.click(memoryEfficiencyPage.newReportBtn);
        // Verify that up to 15 keyspaces based on the delimiter set in the Tree view are displayed on memory efficiency page
        await t.expect(memoryEfficiencyPage.nameSpaceTableRows.count).eql(15, 'Namespaces table has more/less than 15 keyspaces');

        // Verify that sorting by Total Memory from big to small applied by default
        await t.expect(memoryEfficiencyPage.nameSpaceTableRows.nth(0).textContent).contains(keySpaces[0], 'Biggest memory keyspace is not at top');
        await t.expect(memoryEfficiencyPage.nameSpaceTableRows.nth(14).textContent).contains(keySpaces[2], 'Smallest memory keyspace is not at down');

        await t.click(memoryEfficiencyPage.expandArrowBtn);
        // Verify that Key Pattern with >1 keys can be expanded
        await t.expect(memoryEfficiencyPage.expandedRow.count).eql(2, 'Expandable row has no items');
        // Verify that user can quickly set the filters per keyspaces in the Browser/Tree View from the list of keyspaces
        await t.click(memoryEfficiencyPage.expandedItem);
        // Verify filter by data type applied
        await t.expect(browserPage.filteringLabel.textContent).eql('Stream', 'Key type lable is not displayed in search input');
        // Verify keyname in search input prepopulated
        await verifySearchFilterValue(keySpaces[0]);
        // Verify key is displayed
        await t.click(browserPage.browserViewButton);
        await t.expect(await browserPage.isKeyIsDisplayedInTheList(streamKeyName)).ok('Key is not found');

        // Clear filter
        await t
            .click(browserPage.treeViewButton)
            .click(browserPage.clearFilterButton);
        // Change delimiter
        await browserPage.TreeView.changeDelimiterInTreeView('-');
        // Go to Analysis Tools page
        await t.click(myRedisDatabasePage.NavigationPanel.analysisPageButton);
        // Create new report
        await t.click(memoryEfficiencyPage.newReportBtn);
        // Verify that delimiter can be changed in Tree View and applied
        await t.expect(memoryEfficiencyPage.nameSpaceTableRows.count).eql(1, 'New delimiter not applied');
        await t.expect(memoryEfficiencyPage.nameSpaceTableRows.nth(0).textContent).contains(keySpaces[5], 'Keyspace not displayed');

        // No namespaces message with link
        await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
        // Change delimiter to delimiter with no keys
        await browserPage.TreeView.changeDelimiterInTreeView('+');
        // Go to Analysis Tools page and create report
        await t
            .click(myRedisDatabasePage.NavigationPanel.analysisPageButton)
            .click(memoryEfficiencyPage.newReportBtn);
        // Verify that user can see the message when he do not have any namespaces selected in delimiter
        await t.expect(memoryEfficiencyPage.topNamespacesEmptyContainer.exists).ok('No namespaces section not displayed');
        await t.expect(memoryEfficiencyPage.topNamespacesEmptyMessage.textContent).contains(noNamespacesMessage, 'No namespaces message not displayed/correct');
        // Verify that user can redirect to Tree view by clicking on button
        await t.click(memoryEfficiencyPage.treeViewLink);
        await t.expect(browserPage.TreeView.treeViewSettingsBtn.exists).ok('Tree view not opened');
    });
test
    .before(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        await browserPage.addHashKey(keySpaces[4], keysTTL[2], hashValue);
        await browserPage.Cli.addKeysFromCliWithDelimiter('MSET', 5);
        await t.click(browserPage.treeViewButton);
        // Go to Analysis Tools page
        await t.click(myRedisDatabasePage.NavigationPanel.analysisPageButton);
    })
    .after(async t => {
        await browserPage.Cli.deleteKeysFromCliWithDelimiter(5);
        await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
        await t.click(browserPage.browserViewButton);
        await apiKeyRequests.deleteKeyByNameApi(keySpaces[4], ossStandaloneConfig.databaseName);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    })('Namespaces sorting', async t => {
        // Create new report
        await t.click(memoryEfficiencyPage.newReportBtn);
        // Verify that user can sort by Key Pattern column ASC
        await t.click(memoryEfficiencyPage.tableKeyPatternHeader);
        await t.expect(memoryEfficiencyPage.nameSpaceTableRows.nth(0).textContent).contains(keySpaces[1], 'Sorting by Key Pattern ASC not working');
        await t.expect(memoryEfficiencyPage.nameSpaceTableRows.nth(4).textContent).contains(keySpaces[3], 'Sorting by Key Pattern ASC not working');
        // Verify that user can sort by Key Pattern column DESC
        await t.click(memoryEfficiencyPage.tableKeyPatternHeader);
        await t.expect(memoryEfficiencyPage.nameSpaceTableRows.nth(0).textContent).contains(keySpaces[3], 'Sorting by Key Pattern DESC not working');
        await t.expect(memoryEfficiencyPage.nameSpaceTableRows.nth(4).textContent).contains(keySpaces[1], 'Sorting by Key Pattern DESC not working');

        // Verify that user can sort by Total Memory column ASC
        await t.click(memoryEfficiencyPage.tableMemoryHeader);
        await t.expect(memoryEfficiencyPage.nameSpaceTableRows.nth(0).textContent).contains(keySpaces[1], 'Sorting by Total Memory ASC not working');
        await t.expect(memoryEfficiencyPage.nameSpaceTableRows.nth(4).textContent).contains(keySpaces[3], 'Sorting by Total Memory ASC not working');
        // Verify that user can sort by Total Memory column DESC
        await t.click(memoryEfficiencyPage.tableMemoryHeader);
        await t.expect(memoryEfficiencyPage.nameSpaceTableRows.nth(0).textContent).contains(keySpaces[3], 'Sorting by Total Memory DESC not working');
        await t.expect(memoryEfficiencyPage.nameSpaceTableRows.nth(4).textContent).contains(keySpaces[1], 'Sorting by Total Memory DESC not working');

        // Verify that user can sort by Total Keys column ASC
        await t.click(memoryEfficiencyPage.tableKeysHeader);
        await t.expect(memoryEfficiencyPage.nameSpaceTableRows.nth(0).textContent).contains(keySpaces[6], 'Sorting by Total Keys ASC not working');
        await t.expect(memoryEfficiencyPage.nameSpaceTableRows.nth(4).textContent).contains(keySpaces[3], 'Sorting by Total Keys ASC not working');
        // Verify that user can sort by Total Keys column DESC
        await t.click(memoryEfficiencyPage.tableKeysHeader);
        await t.expect(memoryEfficiencyPage.nameSpaceTableRows.nth(0).textContent).contains(keySpaces[3], 'Sorting by Total Keys DESC not working');
        await t.expect(memoryEfficiencyPage.nameSpaceTableRows.nth(4).textContent).contains(keySpaces[1], 'Sorting by Total Keys DESC not working');
    });
test
    .before(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        await browserPage.addHashKey(hashKeyName, keysTTL[2], hashValue);
        await t.click(browserPage.treeViewButton);
        // Go to Analysis Tools page
        await t.click(myRedisDatabasePage.NavigationPanel.analysisPageButton);
    })
    .after(async t => {
        await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
        await t.click(browserPage.browserViewButton);
        await apiKeyRequests.deleteKeyByNameApi(hashKeyName, ossStandaloneConfig.databaseName);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    })('Memory efficiency context saved', async t => {
        // Create new report
        await t.click(memoryEfficiencyPage.newReportBtn);
        // Reload page
        await memoryEfficiencyPage.reloadPage();
        // Verify that context saved after reloading page
        await t.expect(memoryEfficiencyPage.nameSpaceTableRows.nth(0).textContent).contains(keySpaces[0], 'Summary per keyspaces context not saved');
        //Go to PubSub page
        await t.click(myRedisDatabasePage.NavigationPanel.pubSubButton);
        // Go to Analysis Tools page
        await t.click(myRedisDatabasePage.NavigationPanel.analysisPageButton);
        // Verify that context saved after switching between pages
        await t.expect(memoryEfficiencyPage.nameSpaceTableRows.nth(0).textContent).contains(keySpaces[0], 'Summary per keyspaces context not saved');
    });
test
    .before(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        await browserPage.addHashKey(hashKeyName, keysTTL[0], hashValue);
        await browserPage.addStreamKey(streamKeyName, 'field', 'value', keysTTL[1]);
        await browserPage.addStreamKey(streamKeyNameDelimiter, 'field', 'value');
        // Go to Analysis Tools page
        await t.click(myRedisDatabasePage.NavigationPanel.analysisPageButton);
    })
    .after(async t => {
        await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
        await apiKeyRequests.deleteKeyByNameApi(hashKeyName, ossStandaloneConfig.databaseName);
        await apiKeyRequests.deleteKeyByNameApi(streamKeyName, ossStandaloneConfig.databaseName);
        await apiKeyRequests.deleteKeyByNameApi(streamKeyNameDelimiter, ossStandaloneConfig.databaseName);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    })('Summary per expiration time', async t => {
        const yAxis = 218;
        // Create new report
        await t.click(memoryEfficiencyPage.newReportBtn);
        // Points are displayed in graph according to their TTL
        const firstPointLocation = +((await memoryEfficiencyPage.firstPoint.getAttribute('y'))!.slice(0, 2));
        const thirdPointLocation = await memoryEfficiencyPage.thirdPoint.getAttribute('y');
        const fourthPointLocation = +((await memoryEfficiencyPage.fourthPoint.getAttribute('y'))!.slice(0, 2));
        const noExpiryDefaultPointLocation = memoryEfficiencyPage.noExpiryPoint;

        await t.expect(firstPointLocation).lt(yAxis, 'Point in <1 hr breakdown doesn\'t contain key');
        await t.expect(fourthPointLocation).lt(yAxis, 'Point in 12-25 Hrs breakdown doesn\'t contain key');
        await t.expect(thirdPointLocation).eql(`${yAxis}`, 'Point in 4-12 Hrs breakdown contains key');
        await t.expect(noExpiryDefaultPointLocation.visible).notOk('No expiry breakdown displayed when toggle is off', { timeout: 1000 });
        // No Expiry toggle shows No expiry breakdown
        await t.click(memoryEfficiencyPage.showNoExpiryToggle);
        const noExpiryPointLocation = +((await memoryEfficiencyPage.noExpiryPoint.getAttribute('y'))!.slice(0, 2));
        await t.expect(noExpiryPointLocation).lt(yAxis, 'Point in No expiry breakdown doesn\'t contain key');
    });
test
    .before(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        await t.click(myRedisDatabasePage.NavigationPanel.analysisPageButton);
    })
    .after(async() => {
        await browserPage.Cli.sendCommandInCli(`del ${keyNamesReport.join(' ')}`);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    })('Analysis history', async t => {
        const numberOfKeys: string[] = [];
        const dbSize = (await browserPage.Cli.getSuccessCommandResultFromCli('dbsize')).split(' ');
        const existedNumberOfKeys = parseInt(dbSize[dbSize.length - 1]);
        for (let i = 0; i < 6; i++) {
            await browserPage.Cli.sendCommandInCli(`set ${keyNamesReport[i]} ${chance.word()}`);
            await t.hover(memoryEfficiencyPage.newReportBtn);
            await t.click(memoryEfficiencyPage.newReportBtn);
            const compareValue = parseInt(await memoryEfficiencyPage.donutTotalKeys.sibling(1).textContent);
            await t.expect(compareValue).eql((existedNumberOfKeys + i + 1), 'New report is not displayed', { timeout: 2000 });
            numberOfKeys.push(await memoryEfficiencyPage.donutTotalKeys.sibling(1).textContent);
        }
        await t.click(memoryEfficiencyPage.selectedReport);
        // Verify that user can see up to the 5 most recent previous results per database in the history
        await t.expect(memoryEfficiencyPage.reportItem.count).eql(5, 'Number of saved reports is not correct');
        // Verify that user can switch between reports and see all data updated in each report
        for (let i = 0; i < 5; i++) {
            await t.hover(memoryEfficiencyPage.reportItem.nth(i));
            await t.click(memoryEfficiencyPage.reportItem.nth(i));
            await t.expect(memoryEfficiencyPage.reportItem.exists).notOk('Report is not switched');
            await t.expect(memoryEfficiencyPage.scannedKeysInReport.textContent).contains(`(${numberOfKeys[5 - i]}/${numberOfKeys[5 - i]} keys)`);
            const actualNumber = await memoryEfficiencyPage.donutTotalKeys.sibling(1).textContent;
            await t.expect(actualNumber).eql(numberOfKeys[5 - i], 'Report content (total keys) is not correct', { timeout: 2000 });
            await t.click(memoryEfficiencyPage.selectedReport);
        }
        // Verify that specific report is saved as context
        await t.click(memoryEfficiencyPage.reportItem.nth(3));
        await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
        await t.click(myRedisDatabasePage.NavigationPanel.analysisPageButton);
        await t.expect(memoryEfficiencyPage.donutTotalKeys.sibling(1).textContent).eql(numberOfKeys[2], 'Context is not saved');
        // Verify that user can see top keys table saved as context
        await t.expect(memoryEfficiencyPage.topKeysKeyName.count).eql(parseInt(numberOfKeys[2]), 'Top Keys table is not saved as context');
    });
