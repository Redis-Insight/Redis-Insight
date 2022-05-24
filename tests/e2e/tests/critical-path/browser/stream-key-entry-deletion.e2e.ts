import { Chance } from 'chance';
import { acceptLicenseTermsAndAddDatabase, deleteDatabase } from '../../../helpers/database';
import { rte } from '../../../helpers/constants';
import { BrowserPage, CliPage } from '../../../pageObjects';
import { commonUrl, ossStandaloneConfig } from '../../../helpers/conf';

const browserPage = new BrowserPage();
const cliPage = new CliPage();
const chance = new Chance();

let keyName = chance.word({length: 20});
const fields = [
    'Pressure',
    'Humidity',
    'Temperature'
];
const values = [
    '234',
    '78',
    '27'
];

fixture `Stream key entry deletion`
    .meta({
        type: 'critical_path',
        rte: rte.standalone
    })
    .page(commonUrl)
    .beforeEach(async() => {
        await acceptLicenseTermsAndAddDatabase(ossStandaloneConfig, ossStandaloneConfig.databaseName);
    })
    .afterEach(async() => {
        await browserPage.deleteKeyByName(keyName);
        await deleteDatabase(ossStandaloneConfig.databaseName);
    });
test('Verify that the Stream information is refreshed and the deleted entry is removed when user confirm the deletion of an entry', async t => {
    keyName = chance.word({length: 20});
    const fieldForDeletion = fields[2];
    //Add new Stream key with 3 fields
    for(let i = 0; i < fields.length; i++){
        await cliPage.sendCommandInCli(`XADD ${keyName} * ${fields[i]} ${values[i]}`);
    }
    //Open key details and remember the Stream information
    await browserPage.openKeyDetails(keyName);
    await t.click(browserPage.fullScreenModeButton);
    await t.expect(browserPage.streamFields.nth(0).textContent).eql(fieldForDeletion, 'The first field entry name');
    const entriesCountBefore = (await browserPage.keyLengthDetails.textContent).split(': ')[1];
    //Delete entry from the Stream
    await browserPage.deleteStreamEntry();
    //Check results
    const entriesCountAfter = (await browserPage.keyLengthDetails.textContent).split(': ')[1];
    await t.expect(Number(entriesCountBefore) - 1).eql(Number(entriesCountAfter), 'The Entries length is refreshed');
    const fieldsLengthAfter = await browserPage.streamFields.count;
    for(let i = fieldsLengthAfter - 1; i <= 0; i--){
        const fieldName = await browserPage.streamFields.nth(i).textContent;
        await t.expect(fieldName).notEql(fieldForDeletion, 'The deleted entry is removed from the Stream');
    }
    await t.click(browserPage.fullScreenModeButton.nth(1));
});
test('Verify that when user delete the last Entry from the Stream the Stream key is not deleted', async t => {
    keyName = chance.word({length: 20});
    const emptyStreamMessage = 'There are no Entries in the Stream.';
    //Add new Stream key with 1 field
    await cliPage.sendCommandInCli(`XADD ${keyName} * ${fields[0]} ${values[0]}`);
    //Open key details and delete entry from the Stream
    await browserPage.openKeyDetails(keyName);
    await browserPage.deleteStreamEntry();
    //Check results
    await t.expect(browserPage.streamEntriesContainer.textContent).contains(emptyStreamMessage, 'The message after deletion of the last Entry from the Stream');
    await browserPage.searchByKeyName(keyName);
    await t.expect(await browserPage.isKeyIsDisplayedInTheList(keyName)).ok('The Stream key is not deleted');
});
