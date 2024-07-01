import { ExploreTabs, KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { DatabaseHelper } from '../../../../helpers/database';
import { BrowserPage, MyRedisDatabasePage, WorkbenchPage } from '../../../../pageObjects';
import { commonUrl, ossStandaloneConfig } from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';

const myRedisDatabasePage = new MyRedisDatabasePage();
const workbenchPage = new WorkbenchPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();
const browserPage = new BrowserPage();

fixture `Default scripts area at Workbench`
    .meta({ type: 'regression', rte: rte.standalone })
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
test('Verify that user can see the [Manual] option in the Enablement area', async t => {
    const optionsForCheck = [
        'Manual',
        'List the Indices',
        'Index info',
        'Search',
        'Aggregate'
    ];

    // Remember the options displayed in the area
    const countOfOptions = await workbenchPage.preselectButtons.count;
    const displayedOptions: string[] = [];
    for(let i = 0; i < countOfOptions; i++) {
        displayedOptions.push(await workbenchPage.preselectButtons.nth(i).textContent);
    }
    // Verify the options in the area
    for(let i = 0; i < countOfOptions; i++) {
        await t.expect(displayedOptions[i]).eql(optionsForCheck[i], `Option ${optionsForCheck} is not in the Enablement area`);
    }
});
test('Verify that user can see saved article in Enablement area when he leaves Workbench page and goes back again', async t => {
    const tooltipText = 'Open Workbench in the left menu to see the command results.';
    await workbenchPage.InsightsPanel.togglePanel(true);
    const tutorials = await workbenchPage.InsightsPanel.setActiveTab(ExploreTabs.Tutorials);
    await t.click(tutorials.dataStructureAccordionTutorialButton);
    await t.expect(tutorials.internalLinkWorkingWithHashes.visible).ok('The working with hashes link is not visible', { timeout: 5000 });
    // Open Working with Hashes section
    await t.click(tutorials.internalLinkWorkingWithHashes);
    let selector = tutorials.getRunSelector('Create a hash');

    // https://redislabs.atlassian.net/browse/RI-5340
    // Verify that user can see “Open Workbench in the left menu to see the command results.” tooltip when hovering over Run button
    await t.hover(selector);
    await t.expect(browserPage.tooltip.withText(tooltipText).exists).ok('Tooltip is not displayed or text is invalid');

    // Check the button from Hash page is visible
    await tutorials.runBlockCode('Create a hash');
    selector = tutorials.getRunSelector('Create a hash');
    await t.expect(selector.visible).ok('The end of the page is not visible');

    // Verify that user can see the “success” icon during 5 s after a command has been run and button can't be clicked at that time
    await t.expect(selector.withAttribute('disabled').exists).ok('Run button is not disabled', { timeout: 5000 });
    await t.wait(5000);
    await t.expect(selector.withAttribute('disabled').exists).notOk('Run button is still disabled');

    // Go to Browser page
    await t.click(myRedisDatabasePage.NavigationPanel.browserButton);
    // Go back to Workbench page
    await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    // Verify that the same article is opened in Enablement area
    selector = tutorials.getRunSelector('Create a hash');
    await t.expect(selector.visible).ok('The end of the page is not visible');
    // Go to list of DBs page
    await t.click(myRedisDatabasePage.NavigationPanel.myRedisDBButton);
    // Go back to active DB again
    await myRedisDatabasePage.clickOnDBByName(ossStandaloneConfig.databaseName);
    // Check that user is on Workbench page and "Working with Hashes" page is displayed
    selector = tutorials.getRunSelector('Create a hash');
    await t.expect(selector.visible).ok('The end of the page is not visible');
});
test('Verify that user can see saved scroll position in Enablement area when he leaves Workbench page and goes back again', async t => {
    // Open Working with Hashes section
    await workbenchPage.InsightsPanel.togglePanel(true);
    const tutorials = await workbenchPage.InsightsPanel.setActiveTab(ExploreTabs.Tutorials);
    await t.click(tutorials.dataStructureAccordionTutorialButton);
    await t.click(tutorials.internalLinkWorkingWithHashes);
    // Evaluate the last button in Enablement Area
    const buttonsQuantity = await workbenchPage.copyBtn.count;
    const lastButton = workbenchPage.copyBtn.nth(buttonsQuantity - 1);
    // Scroll to the very bottom of the page
    await t.scrollIntoView(lastButton);
    await workbenchPage.InsightsPanel.togglePanel(false);
    await workbenchPage.InsightsPanel.togglePanel(true);
    // Check the scroll position
    const scrollPosition = await workbenchPage.scrolledEnablementArea.scrollTop;
    // Check that scroll position is saved
    await t.expect(await workbenchPage.scrolledEnablementArea.scrollTop).eql(scrollPosition, 'The scroll position status is incorrect');
    // Go to list of DBs page
    await t.click(myRedisDatabasePage.NavigationPanel.myRedisDBButton);
    await t.wait(1000)
    // Go back to active DB again
    await myRedisDatabasePage.clickOnDBByName(ossStandaloneConfig.databaseName);
    // Check that scroll position is saved
    await t.expect(await workbenchPage.scrolledEnablementArea.scrollTop).eql(scrollPosition, 'Scroll position is not correct');
});
test('Verify that user can see the siblings menu by clicking on page counter element between Back and Next buttons', async t => {
    const popoverButtons = [
        'Strings',
        'Hashes',
        'Lists',
        'Sets',
        'Sorted sets'
    ];

    // Open Working with Hashes section and click on the on page counter
    await workbenchPage.InsightsPanel.togglePanel(true);
    const tutorials = await workbenchPage.InsightsPanel.setActiveTab(ExploreTabs.Tutorials);
    await t.click(tutorials.dataStructureAccordionTutorialButton);
    await t.expect(tutorials.internalLinkWorkingWithHashes.visible).ok('The working with hachs link is not visible', { timeout: 5000 });
    await t.click(tutorials.internalLinkWorkingWithHashes);
    // Verify that user can see the quick navigation section to navigate between siblings under the scrolling content
    await t.expect(tutorials.enablementAreaPagination.visible).ok('The quick navigation section is not displayed');

    await t.click(tutorials.enablementAreaPagination);
    // Verify the siblings menu
    await t.expect(tutorials.enablementAreaPaginationPopover.visible).ok('The siblings menu is not displayed');
    const countOfButtons = await tutorials.paginationPopoverButtons.count;
    for (let i = 0; i < countOfButtons; i++) {
        const popoverButton = tutorials.paginationPopoverButtons.nth(i);
        await t.expect(popoverButton.textContent).eql(popoverButtons[i], `The siblings menu button ${popoverButtons[i]} is not displayed`);
    }
});
