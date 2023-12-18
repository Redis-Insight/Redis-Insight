import { commonUrl, ossStandaloneRedisGears } from '../../../../helpers/conf';
import { rte } from '../../../../helpers/constants';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';
import { Common } from '../../../../helpers/common';
import { MyRedisDatabasePage } from '../../../../pageObjects';
import { DatabaseHelper } from '../../../../helpers/database';
import { BrowserActions } from '../../../../common-actions/browser-actions';

const myRedisDatabasePage = new MyRedisDatabasePage();
const browserActions = new BrowserActions();

const databaseAPIRequests = new DatabaseAPIRequests();
const databaseHelper = new DatabaseHelper();

let { host, port, databaseName, databaseUsername = '', databasePassword = '' } = ossStandaloneRedisGears;

function generateLink(params: Record<string, any>): string {
    const params1 = Common.generateUrlTParams(params);
    const from = encodeURIComponent(`${redisConnect}?${params1}`);
    return (new URL(`?from=${from}`, commonUrl)).toString();
}

const redisConnect = 'redisinsight://databases/connect';

fixture `Add DB from SM`
    .meta({ type: 'critical_path', rte: rte.none })
    .afterEach(async() => {
        // Delete all existing connections
        await databaseAPIRequests.deleteAllDatabasesApi();
    })
    .beforeEach(async() => {
        await databaseHelper.acceptLicenseTerms();
    });
test.only
    .page(commonUrl)('Tls dropdown', async t => {
        const connectUrlParams = {
            redisUrl: `redis://${databaseUsername}:${databasePassword}@${host}:${port}`,
            databaseAlias: databaseName,
            redirect: 'workbench',
            requiredCaCert: 'true',
            requiredClientCert: 'true'
        };

        const tooltipText = [
            'CA Certificate Name',
            'CA certificate',
            'Client Certificate Name',
            'Client Certificate',
            'Private Key'
        ];

        await t.navigateTo(generateLink(connectUrlParams));
        await t.expect(myRedisDatabasePage.AddRedisDatabase.caCertField.textContent).contains('Add new CA certificate', 'add CA certificate is not shown');
        await t.expect(myRedisDatabasePage.AddRedisDatabase.clientCertField.textContent).contains('Add new certificate', 'add client certificate is not shown');
        await t.hover(myRedisDatabasePage.AddRedisDatabase.addRedisDatabaseButton);

        for (const text of tooltipText) {
            await browserActions.verifyTooltipContainsText(text, true);
        }

        // Verify that user can see the Test Connection button enabled/disabled with the same rules as the button to add/apply the changes
        await t.hover(myRedisDatabasePage.AddRedisDatabase.testConnectionBtn);
        for (const text of tooltipText) {
            await browserActions.verifyTooltipContainsText(text, true);
        }
    });
