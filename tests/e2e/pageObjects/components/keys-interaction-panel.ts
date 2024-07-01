import { Selector, t } from 'testcafe';
import { KeysInteractionTabs } from '../../helpers/constants';
import { WorkbenchPage } from '../workbench-page';
import { BrowserPage } from '../browser-page';
import { SearchAndQueryPage } from '../search-and-query-page';

export class KeysInteractionPanel {
    // CONTAINERS
    horizontalPanel = Selector('[data-testid=browser-tabs]');
    activeTab = this.horizontalPanel.find('[class*="euiTab-isSelected"]');

    searchTab = Selector('[data-testid=browser-tab-search]');
    browserTab = Selector('[data-testid=browser-tab-browser]');
    workbenchTab = Selector('[data-testid=browser-tab-workbench]');

    /**
         * get active tab
         */
    async getActiveTabName(): Promise<string> {
        return this.activeTab.textContent;
    }

    /**
     * Click on Panel tab
     * @param type of the tab
     */
    async setActiveTab(type: KeysInteractionTabs): Promise<BrowserPage | WorkbenchPage | SearchAndQueryPage> {
        const activeTabName = await this.getActiveTabName();

        let tabSelector;
        let pageClass;

        switch (type) {
            case KeysInteractionTabs.BrowserAndFilter:
                tabSelector = this.browserTab;
                pageClass = BrowserPage;
                break;
            case KeysInteractionTabs.Workbench:
                tabSelector = this.workbenchTab;
                pageClass = WorkbenchPage;
                break;
            case KeysInteractionTabs.SearchAndQuery:
                tabSelector = this.searchTab;
                pageClass = SearchAndQueryPage;
                break;
            default:
                throw new Error(`Unknown tab type: ${type}`);
        }

        if (type !== activeTabName) {
            await t.click(tabSelector);
        }

        return new pageClass();
    }
}
