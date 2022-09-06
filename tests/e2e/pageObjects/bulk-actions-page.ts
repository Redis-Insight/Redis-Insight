import { Selector, t } from 'testcafe';
import { BrowserPage } from './browser-page';

const browserPage = new BrowserPage();

export class BulkActionsPage {
    //-------------------------------------------------------------------------------------------
    //DECLARATION OF SELECTORS
    //*Declare all elements/components of the relevant page.
    //*Target any element/component via data-id, if possible!
    //*The following categories are ordered alphabetically (Alerts, Buttons, Checkboxes, etc.).
    //-------------------------------------------------------------------------------------------
    //BUTTONS
    bulkDeleteTooltipIcon = Selector('[data-testid=bulk-delete-tooltip]');
    deleteButton = Selector('[data-testid=bulk-action-warning-btn]');
    bulkApplyButton = Selector('[data-testid=bulk-action-apply-btn]');
    bulkStopButton = Selector('[data-testid=bulk-action-stop-btn]');
    bulkStartAgainButton = Selector('[data-testid=bulk-action-start-again-btn]', { timeout: 5000 });
    bulkCancelButton = Selector('[data-testid=bulk-action-cancel-btn]', { timeout: 5000 });
    bulkClosePanelButton = Selector('[data-testid=bulk-close-panel]');
    //TEXT
    infoFilter = Selector('[data-testid=bulk-actions-info-filter]');
    infoSearch = Selector('[data-testid=bulk-actions-info-search]');
    bulkActionsPlaceholder = Selector('[data-testid=bulk-actions-placeholder]');
    bulkDeleteSummary = Selector('[data-testid=bulk-delete-summary]', { timeout: 5000 });
    bulkActionWarningTooltip = Selector('[data-testid=bulk-action-tooltip]');
    bulkStatusInProgress = Selector('[data-testid=bulk-status-progress]');
    bulkStatusStopped = Selector('[data-testid=bulk-status-stopped]');
    bulkStatusCompleted = Selector('[data-testid=bulk-status-completed]', { timeout: 5000 });
    bulkDeleteCompletedSummary = Selector('[data-testid=bulk-delete-completed-summary]', { timeout: 5000 });
    //CONTAINERS
    bulkActionsContainer = Selector('[data-testid=bulk-actions-content]');
    bulkActionsSummary = Selector('[data-testid=bulk-actions-info]', { timeout: 5000 });
    progressLine = Selector('[data-testid=progress-line]');

    /**
   * Open Bulk Actions and confirm deletion
   */
    async startBulkDelete(): Promise<void> {
        await t.click(browserPage.bulkActionsButton);
        await t.click(this.deleteButton);
        await t.click(this.bulkApplyButton);
    }
}
