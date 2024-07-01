import { DatabaseHelper } from '../../../../helpers/database';
import { WorkbenchPage, BrowserPage } from '../../../../pageObjects';
import { ExploreTabs, KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { commonUrl, ossStandaloneConfig } from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';

const workbenchPage = new WorkbenchPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();
const browserPage = new BrowserPage();

fixture `Workbench Auto-Execute button`
    .meta({ type: 'regression', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async t => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    })
    .afterEach(async() => {
        // Clear and delete database
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    });
// Test is skipped until Enablement area will be updated with auto-execute buttons
test.skip('Verify that when user clicks on auto-execute button, command is run', async t => {
    const command = 'INFO';
    // Verify that clicking on auto-executed button, command is not inserted to Editor
    await t.typeText(workbenchPage.queryInput, command, { replace: true, paste: true });
    // Verify that admin can use redis-auto format in .md file for Guides for auto-executed button
    await workbenchPage.InsightsPanel.togglePanel(true);
    const tutorials = await workbenchPage.InsightsPanel.setActiveTab(ExploreTabs.Tutorials);
    await t.click(tutorials.dataStructureAccordionTutorialButton);
    await t.click(tutorials.internalLinkWorkingWithHashes);
    await tutorials.runBlockCode('Create');
    await t.expect(workbenchPage.queryInput.textContent).eql(command, 'Editor is changed');
    // Verify that admin can use redis-auto format in .md file for Tutorials for auto-executed button
    await t.click(tutorials.redisStackTutorialsButton);
    await t.click(tutorials.timeSeriesLink);
    // Verify that when user runs auto-executed commands, selected group mode setting is considered
    await t.click(workbenchPage.groupMode);
    // Verify that when user runs auto-executed commands, selected raw mode setting is considered
    await t.click(workbenchPage.rawModeBtn);
    await tutorials.runBlockCode('Load more data points');
    // Verify that user can see auto-executed command result in command history
    const regExp = new RegExp('66[1-9] Command(s) - \d+ success, \d+ error(s)');
    await t.expect(workbenchPage.queryCardCommand.textContent).match(regExp, 'Not valid summary for group mode');
    await t.expect(workbenchPage.commandExecutionDateAndTime.find('span').withExactText('-r')).ok('Not valid summary for raw mode');
});
