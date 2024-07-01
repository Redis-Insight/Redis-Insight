import { DatabaseHelper } from '../../../../helpers/database';
import { KeysInteractionTabs, rte } from '../../../../helpers/constants';
import { BrowserPage, MyRedisDatabasePage } from '../../../../pageObjects';
import { commonUrl, ossStandaloneConfig } from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';
import { Common } from '../../../../helpers/common';
import { goBackHistory } from '../../../../helpers/utils';

const browserPage = new BrowserPage();
const myRedisDatabasePage = new MyRedisDatabasePage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();

const externalPageLink = 'https://www.surveymonkey.com/r/redisinsight';

fixture `User Survey`
    .meta({
        type: 'regression',
        rte: rte.standalone
    })
    .page(commonUrl)
    .beforeEach(async() => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
    });
test('Verify that user can use survey link', async t => {
    // Verify that user can see survey link on any page inside of DB
    // Browser page
    await t.expect(browserPage.userSurveyLink.visible).ok('Survey Link is not displayed');
    // Unskip after updating testcafe with opening links support https://redislabs.atlassian.net/browse/RI-5565
    // await t.click(browserPage.userSurveyLink);
    // // Verify that when users click on RI survey, they are redirected to https://www.surveymonkey.com/r/redisinsight
    // await Common.checkURL(externalPageLink);
    // await goBackHistory();
    // Workbench page
    await browserPage.KeysInteractionPanel.setActiveTab(KeysInteractionTabs.Workbench);
    await t.expect(browserPage.userSurveyLink.visible).ok('Survey Link is not displayed');
    // Slow Log page
    await t.click(myRedisDatabasePage.NavigationPanel.analysisPageButton);
    await t.expect(browserPage.userSurveyLink.visible).ok('Survey Link is not displayed');
    // PubSub page
    await t.click(myRedisDatabasePage.NavigationPanel.pubSubButton);
    await t.expect(browserPage.userSurveyLink.visible).ok('Survey Link is not displayed');
    // Verify that user cannot see survey link for list of databases page
    await t.click(myRedisDatabasePage.NavigationPanel.myRedisDBButton);
    await t.expect(browserPage.userSurveyLink.exists).notOk('Survey Link is visible');
    // Verify that user cannot see survey link for welcome page
    await databaseAPIRequests.deleteAllDatabasesApi();
    await browserPage.reloadPage();
    await t.expect(browserPage.userSurveyLink.exists).notOk('Survey Link is visible');
});
