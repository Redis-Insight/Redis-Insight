import { ClientFunction, RequestMock, t } from 'testcafe';
import { Chance } from 'chance';
import {apiUrl, commonUrl} from './conf';

const settingsApiUrl = `${commonUrl}/api/settings`;
const chance = new Chance();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const mockedSettingsResponse = {
    agreements: {
        version: '0',
        eula: false,
        analytics: false
    }};

export class Common {
    mock = RequestMock()
        .onRequestTo(settingsApiUrl)
        .respond(mockedSettingsResponse, 200);

    async waitForElementNotVisible(elm: Selector): Promise<void> {
        await t.expect(elm.exists).notOk({ timeout: 10000 });
    }

    /**
     * Create array of keys
     * @param length The amount of array elements
     */
    createArrayWithKeys(length: number): string[] {
        return Array.from({length}, (_, i) => `key${i}`);
    }

    /**
    * Create array of keys and values
    * @param length The amount of array elements
    */
    async createArrayWithKeyValue(length: number): Promise<string[]> {
        const arr: string[] = [];
        for(let i = 1; i <= length * 2; i++) {
            arr[i] = `${chance.word({ length: 10 })}-key${i}`;
            arr[i + 1] = `${chance.word({ length: 10 })}-value${i}`;
            i++;
        }
        return arr;
    }

    /**
    * Create array of keys and values
    * @param length The amount of array elements
    */
    async createArrayWithKeyValueAndDelimiter(length: number): Promise<string[]> {
        const keyNameArray: string[] = [];
        for(let i = 1; i <= length; i++) {
            const key = `"key${i}:test${i}"`;
            const value = `"value${this.generateSentence(i * 2)}"`;
            keyNameArray.push(key, value);
        }
        return keyNameArray;
    }

    /**
    * Create array of keys and values
    * @param length The amount of array elements
    */
    async createArrayWithKeyAndDelimiter(length: number): Promise<string[]> {
        const keyNameArray: string[] = [];
        for(let i = 1; i <= length; i++) {
            const key = `"key${i}:test${i}"`;
            keyNameArray.push(key);
        }
        return keyNameArray;
    }

    /**
    * Create array of keys and values for using in OSS Cluster
    * @param length The amount of array elements
    */
    async createArrayWithKeyValueForOSSCluster(length: number): Promise<string[]> {
        const arr: string[] = [];
        for(let i = 1; i <= length * 2; i++) {
            arr[i] = `{user1}:${chance.word({ length: 10 })}-key${i}`;
            arr[i + 1] = `${chance.word({ length: 10 })}-value${i}`;
            i++;
        }
        return arr;
    }

    /**
    * Create array of keys and values with edittable counter value
    * @param length The amount of array elements
    * @param keyName The name of the key
    */
    async createArrayWithKeyValueAndKeyname(length: number, keyName: string): Promise<string[]> {
        const keyNameArray: string[] = [];
        for(let i = 1; i <= length; i++) {
            const key = `${keyName}${i}`;
            const value = `value${i}`;
            keyNameArray.push(key, value);
        }
        return keyNameArray;
    }

    /**
     * Create array of pairs [key, value]
     * @param length The amount of array elements
     */
    createArrayPairsWithKeyValue(length: number): [string, number][] {
        return Array.from({ length }, (_, i) => [`key${i}`, i]);
    }

    /**
    * Create array of numbers
    * @param length The amount of array elements
    */
    async createArray(length: number): Promise<string[]> {
        const arr: string[] = [];
        for(let i = 1; i <= length; i++) {
            arr[i] = `${i}`;
        }
        return arr;
    }

    /**
    * Get background colour of element
    * @param element The selector of the element
    */
    async getBackgroundColour(element: Selector): Promise<string> {
        return element.getStyleProperty('background-color');
    }

    /**
    * Generate word by number of symbols
    * @param number The number of symbols
    */
    generateWord(number: number): string {
        return chance.word({ length: number });
    }

    /**
    * Generate sentence by number of words
    * @param number The number of words
    */
    generateSentence(number: number): string {
        return chance.sentence({ words: number });
    }

    /**
    * Return api endpoint with disabled certificate validation
    */
    getEndpoint(): string {
        return apiUrl;
    }

    /**
    * Reload page
    */
    async reloadPage(): Promise<void> {
        await t.eval(() => location.reload());
    }

    /**
     * Check opened URL
     * @param expectedUrl Expected link that is compared with actual
     */
    async checkURL(expectedUrl: string): Promise<void> {
        const getPageUrl = ClientFunction(() => window.location.href);
        await t.expect(getPageUrl()).eql(expectedUrl, 'Opened URL is not correct');
    }
}
