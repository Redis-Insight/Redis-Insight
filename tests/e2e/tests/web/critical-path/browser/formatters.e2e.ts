import { Selector } from 'testcafe';
import { keyLength, KeyTypesTexts, rte } from '../../../../helpers/constants';
import { addKeysViaCli, deleteKeysViaCli, formattersKeyTypes } from '../../../../helpers/keys';
import { Common, DatabaseHelper } from '../../../../helpers';
import { BrowserPage } from '../../../../pageObjects';
import { commonUrl, ossStandaloneConfig } from '../../../../helpers/conf';
import { DatabaseAPIRequests } from '../../../../helpers/api/api-database';
import {
    binaryFormattersSet,
    formattersForEditSet,
    formattersHighlightedSet,
    formattersWithTooltipSet,
    fromBinaryFormattersSet,
    notEditableFormattersSet
} from '../../../../test-data/formatters-data';
import { phpData } from '../../../../test-data/formatters';

const browserPage = new BrowserPage();
const databaseHelper = new DatabaseHelper();
const databaseAPIRequests = new DatabaseAPIRequests();

const keysData = formattersKeyTypes.map(item =>
    ({ ...item, keyName: `${item.keyName}` + '-' + `${Common.generateWord(keyLength)}` }));
const defaultFormatter = 'Unicode';

fixture `Formatters`
    .meta({
        type: 'critical_path',
        rte: rte.standalone
    })
    .page(commonUrl)
    .beforeEach(async() => {
        await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
        // Create new keys
        await addKeysViaCli(keysData);
    })
    .afterEach(async() => {
        // Clear keys and database
        await deleteKeysViaCli(keysData);
        await databaseAPIRequests.deleteStandaloneDatabaseApi(ossStandaloneConfig);
    });
formattersHighlightedSet.forEach(formatter => {
    test
        .before(async() => {
            await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
            // Create new keys
            await addKeysViaCli(keysData, formatter.fromText, formatter.fromText);
        })(`Verify that user can see highlighted key details in ${formatter.format} format`, async t => {
            // Verify for JSON and PHP serialized
            // Verify for Hash, List, Set, ZSet, String, Stream keys
            for (const key of keysData) {
                const valueSelector = Selector(`[data-testid^=${key.keyName.split('-')[0]}][data-testid*=${key.data}]`);
                await browserPage.openKeyDetailsByKeyName(key.keyName);
                // Verify that value not formatted with default formatter
                await browserPage.selectFormatter(defaultFormatter);
                await t.expect(valueSelector.find(browserPage.cssJsonValue).exists).notOk(`${key.textType} Value is formatted to ${formatter.format}`);
                await browserPage.selectFormatter(formatter.format);
                // Verify that value is formatted and highlighted
                await t.expect(valueSelector.find(browserPage.cssJsonValue).exists).ok(`${key.textType} Value is not formatted to ${formatter.format}`);
                // Verify that Hash field is formatted and highlighted for JSON and PHP serialized
                if (key.textType === 'Hash') {
                    await t.expect(browserPage.hashField.find(browserPage.cssJsonValue).exists).ok(`Hash field is not formatted to ${formatter.format}`);
                }
                // Verify that Stream field is formatted and highlighted for JSON and PHP serialized
                if (key.textType === 'Stream') {
                    await t.expect(Selector(browserPage.cssJsonValue).count).eql(2, `Hash field is not formatted to ${formatter.format}`);
                }
            }
        });
});
fromBinaryFormattersSet.forEach(formatter => {
    test(`Verify that user can see highlighted key details in ${formatter.format} format`, async t => {
        // Verify for Msgpack, Protobuf, Java serialized, Pickle, Vector 32-bit, Vector 64-bit formats
        // Open Hash key details
        await browserPage.openKeyDetailsByKeyName(keysData[0].keyName);
        // Add valid value in HEX format for convertion
        await browserPage.selectFormatter('HEX');
        await browserPage.editHashKeyValue(formatter.fromHexText ?? '');
        await browserPage.selectFormatter(formatter.format);
        // Verify that value is formatted and highlighted
        await t.expect(browserPage.hashFieldValue.innerText).contains(formatter.formattedText ?? '', `Value is not saved as ${formatter.format}`);
        await t.expect(browserPage.hashFieldValue.find(browserPage.cssJsonValue).exists).ok(`Value is not formatted to ${formatter.format}`);

    });
});
formattersForEditSet.forEach(formatter => {
    test(`Verify that user can edit the values in the key regardless if they are valid in ${formatter.format} format or not`, async t => {
        // Verify for JSON, Msgpack, PHP serialized formatters
        const invalidText = 'invalid text';
        // Open key details and select formatter
        await browserPage.openKeyDetails(keysData[0].keyName);
        await browserPage.selectFormatter(formatter.format);
        await browserPage.editHashKeyValue(invalidText);
        await t.click(browserPage.saveButton);
        // Verify that invalid value can be saved
        await t.expect(browserPage.hashFieldValue.textContent).contains(invalidText, `Invalid ${formatter.format} value is not saved`);
        // Add valid value which can be converted
        await browserPage.editHashKeyValue(formatter.fromText ?? '');
        // Verify that valid value can be saved on edit
        formatter.format === 'PHP serialized'
            ? await t.expect(browserPage.hashFieldValue.innerText).contains(formatter.formattedText ?? '', `Valid ${formatter.format} value is not saved`)
            : await t.expect(browserPage.hashFieldValue.innerText).contains(formatter.fromText ?? '', `Valid ${formatter.format} value is not saved`);
        await t.expect(browserPage.hashFieldValue.find(browserPage.cssJsonValue).exists).ok(`Value is not formatted to ${formatter.format}`);
        await browserPage.editHashKeyValue(formatter.fromTextEdit ?? '');
        // Verify that valid value can be edited to another valid value
        await t.expect(browserPage.hashFieldValue.innerText).contains(formatter.fromTextEdit ?? '', `Valid ${formatter.format} value is not saved`);
        await t.expect(browserPage.hashFieldValue.find(browserPage.cssJsonValue).exists).ok(`Value is not formatted to ${formatter.format}`);
        if(formatter.format === 'JSON'){
            // bigInt can be displayed for JSON format
            await browserPage.editHashKeyValue(formatter.fromBigInt ?? '');
            await t.expect(browserPage.hashFieldValue.innerText).contains(formatter.fromBigInt ?? '', `Valid ${formatter.format} value is not saved`);
        }
    });
});
formattersWithTooltipSet.forEach(formatter => {
    test(`  ${formatter.format}`, async t => {
        // Verify for JSON, Msgpack, Protobuf, PHP serialized, Java serialized object, Pickle, Vector 32-bit, Vector 64-bit formatters
        const failedMessage = `Failed to convert to ${formatter.format}`;
        for (let i = 0; i < keysData.length; i++) {
            const valueSelector = Selector(`[data-testid^=${keysData[i].keyName.split('-')[0]}][data-testid*=${keysData[i].data}]`);
            let innerValueSelector = Selector('');
            if(keysData[i].keyName.split('-')[0] !== 'string'){
                innerValueSelector  = valueSelector.find('span');
            }
            else{
                innerValueSelector = valueSelector;
            }
            // Open key details and select formatter
            await browserPage.openKeyDetailsByKeyName(keysData[i].keyName);
            await browserPage.selectFormatter(formatter.format);
            // Verify that not valid value is not formatted
            await t.expect(valueSelector.find(browserPage.cssJsonValue).exists).notOk(`${keysData[i].textType} Value is formatted to ${formatter.format}`);
            await t.hover(innerValueSelector);
            // Verify that tooltip with convertion failed message displayed
            await t.expect(browserPage.tooltip.textContent).contains(failedMessage, `"${failedMessage}" is not displayed in tooltip`);
        }
    });
});
binaryFormattersSet.forEach(formatter => {
    test
        .before(async() => {
            await databaseHelper.acceptLicenseTermsAndAddDatabaseApi(ossStandaloneConfig);
            // Create new keys
            await addKeysViaCli(keysData, formatter.fromText);
        })(`Verify that user can see key details converted to ${formatter.format} format`, async t => {
            // Verify for ASCII, HEX, Binary formatters
            // Verify for Hash, List, Set, ZSet, String, Stream keys
            for (let i = 0; i < keysData.length; i++) {
                const valueSelector = Selector(`[data-testid^=${keysData[i].keyName.split('-')[0]}][data-testid*=${keysData[i].data}]`);
                await browserPage.openKeyDetailsByKeyName(keysData[i].keyName);
                // Verify that value not formatted with default formatter
                await browserPage.selectFormatter(defaultFormatter);
                await t.expect(valueSelector.innerText).contains(formatter.fromText ?? '', `Value is formatted as ${formatter.format} in Unicode`);
                await browserPage.selectFormatter(formatter.format);
                // Verify that value is formatted
                await t.expect(valueSelector.innerText).contains(formatter.formattedText ?? '', `Value is not formatted to ${formatter.format}`);
                // Verify that Hash field is formatted to ASCII/HEX/Binary
                if (keysData[i].keyName === 'hash') {
                    await t.expect(browserPage.hashField.innerText).contains(formatter.formattedText ?? '', `Hash field is not formatted to ${formatter.format}`);
                }
            }
        });
    test(`Verify that user can edit value for Hash field in ${formatter.format} and convert then to another format`, async t => {
        // Verify for ASCII, HEX, Binary formatters
        // Open key details and select formatter
        await browserPage.openKeyDetails(keysData[0].keyName);
        await browserPage.selectFormatter(formatter.format);
        // Add value in selected format
        await browserPage.editHashKeyValue(formatter.formattedText ?? '');
        // Verify that value saved in selected format
        await t.expect(browserPage.hashFieldValue.innerText).contains(formatter.formattedText ?? '', `${formatter.format} value is not saved`);
        await browserPage.selectFormatter('Unicode');
        // Verify that value converted to Unicode
        await t.expect(browserPage.hashFieldValue.innerText).contains(formatter.fromText ?? '', `${formatter.format} value is not converted to Unicode`);
        await browserPage.selectFormatter(formatter.format);
        await browserPage.editHashKeyValue(formatter.formattedTextEdit ?? '');
        // Verify that valid converted value can be edited to another
        await t.expect(browserPage.hashFieldValue.innerText).contains(formatter.formattedTextEdit ?? '', `${formatter.format} value is not saved`);
        await browserPage.selectFormatter('Unicode');
        // Verify that value converted to Unicode
        await t.expect(browserPage.hashFieldValue.innerText).contains(formatter.fromTextEdit ?? '', `${formatter.format} value is not converted to Unicode`);
    });
});
test('Verify that user can format different data types of PHP serialized', async t => {
    // Open Hash key details
    await browserPage.openKeyDetailsByKeyName(keysData[0].keyName);
    for (const type of phpData) {
        //Add fields to the hash key
        await browserPage.selectFormatter('Unicode');
        await browserPage.addFieldToHash(type.dataType, type.from);
        //Search the added field
        await browserPage.searchByTheValueInKeyDetails(type.dataType);
        await browserPage.selectFormatter('PHP serialized');
        // Verify that PHP serialized value is formatted and highlighted
        await t.expect(browserPage.hashFieldValue.innerText).contains(type.converted, `Value is not saved as PHP ${type.dataType}`);
        await t.expect(browserPage.hashFieldValue.find(browserPage.cssJsonValue).exists).ok(`Value is not formatted to PHP ${type.dataType}`);
    }
});
notEditableFormattersSet.forEach(formatter => {
    test(`Verify that user see edit icon disabled for all keys when ${formatter.format} selected`, async t => {
        // Verify for Protobuf, Java serialized, Pickle, Vector 32-bit, Vector 64-bit
        // Verify for Hash, List, ZSet, String keys
        const editableValueKeyTypes = [
            KeyTypesTexts.Hash,
            KeyTypesTexts.List,
            KeyTypesTexts.String
        ];
        for (const key of keysData) {
            if (editableValueKeyTypes.includes(key.textType)) {
                const editBtn = (key.textType === 'String')
                    ? browserPage.editKeyValueButton
                    : Selector(`[data-testid*=${key.keyName.split('-')[0]}][data-testid*=edit-]`, { timeout: 500 });
                const valueSelector = Selector(`[data-testid^=${key.keyName.split('-')[0]}][data-testid*=${key.data}]`);
                await browserPage.openKeyDetailsByKeyName(key.keyName);
                await browserPage.selectFormatter(formatter.format);
                // Verify that edit button disabled
                await t.hover(valueSelector);
                await t.expect(editBtn.hasAttribute('disabled')).ok(`Key ${key.textType} is enabled for ${formatter.format} formatter`);
                // Hover on disabled button
                await t.hover(editBtn);
                // Verify tooltip content
                await t.expect(browserPage.tooltip.textContent).contains('Cannot edit the value in this format', 'Tooltip has wrong text');
            }
            if (key.textType === 'Sorted Set') {
                const editBtn = Selector(`[data-testid*=${key.keyName.split('-')[0]}][data-testid*=edit-]`, { timeout: 500 });
                const valueSelector = Selector('[data-testid*=zset_content-value]');
                await browserPage.openKeyDetailsByKeyName(key.keyName);
                await browserPage.selectFormatter(formatter.format);
                // Verify that edit button enabled for ZSet
                await t.hover(valueSelector);
                await t.expect(editBtn.hasAttribute('disabled')).notOk(`Key ${key.textType} is disabled for ${formatter.format} formatter`);
            }
        }
    });
});
