import {t, Selector} from 'testcafe';
import {Common} from '../helpers/common';

const common = new Common();

export class BrowserPage {
    //CSS Selectors
    cssSelectorGrid = '[aria-label="grid"]';
    cssSelectorRows = '[aria-label="row"]';
    cssSelectorKey = '[data-testid^=key-]';
    cssFilteringLabel = '[data-testid=multi-search]';
    //-------------------------------------------------------------------------------------------
    //DECLARATION OF SELECTORS
    //*Declare all elements/components of the relevant page.
    //*Target any element/component via data-id, if possible!
    //*The following categories are ordered alphabetically (Alerts, Buttons, Checkboxes, etc.).
    //-------------------------------------------------------------------------------------------
    //BUTTONS
    deleteKeyButton = Selector('[data-testid=delete-key-btn]');
    confirmDeleteKeyButton = Selector('[data-testid=delete-key-confirm-btn]');
    editKeyTTLButton = Selector('[data-testid=edit-ttl-btn]');
    closeEditTTL = Selector('[data-testid=cancel-btn]');
    saveTTLValue = Selector('[data-testid=apply-btn]');
    refreshKeysButton = Selector('[data-testid=refresh-keys-btn]');
    refreshKeyButton = Selector('[data-testid=refresh-key-btn]');
    applyButton = Selector('[data-testid=apply-btn]');
    editKeyNameButton = Selector('[data-testid=edit-key-btn]');
    closeKeyButton = Selector('[data-testid=close-key-btn]');
    plusAddKeyButton = Selector('[data-testid=btn-add-key]');
    addKeyValueItemsButton = Selector('[data-testid=add-key-value-items-btn]');
    saveHashFieldButton = Selector('[data-testid=save-fields-btn]');
    saveMemberButton = Selector('[data-testid=save-members-btn]');
    searchButtonInKeyDetails = Selector('[data-testid=search-button]');
    addKeyButton = Selector('span').withExactText('Add Key');
    keyTypeDropDown = Selector('fieldset button.euiSuperSelectControl');
    confirmRemoveHashFieldButton = Selector('[data-testid^=remove-hash-button-] span');
    removeSetMemberButton = Selector('[data-testid^=set-remove-btn]');
    removeHashFieldButton = Selector('[data-testid^=remove-hash-button]');
    removeZserMemberButton = Selector('[data-testid^=zset-remove-button]');
    confirmRemoveSetMemberButton = Selector('[data-testid^=set-remove-btn-] span');
    confirmRemovZSetMemberButton = Selector('[data-testid^=zset-remove-button-] span');
    saveElementButton = Selector('[data-testid=save-elements-btn]');
    removeElementFromListIconButton = Selector('[data-testid=remove-key-value-items-btn]');
    removeElementFromListButton = Selector('[data-testid=remove-elements-btn]');
    confirmRemoveListElementButton = Selector('[data-testid=remove-submit]');
    removeElementFromListSelect = Selector('[data-testid=destination-select]');
    addJsonObjectButton = Selector('[data-testid=add-object-btn]');
    addJsonFieldButton = Selector('[data-testid=add-field-btn]');
    expandJsonObject = Selector('[data-testid=expand-object]');
    toastCloseButton = Selector('[data-test-subj=toastCloseButton]');
    scoreButton = Selector('[data-testid=score-button]');
    sortingButton = Selector('[data-testid=header-sorting-button]');
    editJsonObjectButton = Selector('[data-testid=edit-object-btn]');
    applyEditButton = Selector('[data-testid=apply-edit-btn]');
    scanMoreButton = Selector('[data-testid=scan-more]');
    resizeBtnKeyList = Selector('[data-test-subj=resize-btn-keyList-keyDetails]');
    modulesButton = Selector('[data-testid$=_module]');
    databaseInfoIcon = Selector('[data-testid=db-info-icon]');
    treeViewButton = Selector('[data-testid=view-type-list-btn]');
    browserViewButton = Selector('[data-testid=view-type-browser-btn]');
    treeViewSeparator = Selector('[data-testid=tree-view-delimiter-btn]');
    deleteFilterButton = Selector('[data-testid*=delete-btn]');
    searchButton = Selector('[data-testid=search-btn]');
    clearFilterButton = Selector('[data-testid=reset-filter-btn]');
    clearSelectionButton = Selector('[data-testid=clear-selection-btn]');
    treeViewDelimiterButton = Selector('[data-testid=tree-view-delimiter-btn]');
    treeViewDelimiterValueSave = Selector('[data-testid=apply-btn]');
    treeViewDelimiterValueCancel = Selector('[data-testid=cancel-btn]');
    fullScreenModeButton = Selector('[data-testid=toggle-full-screen]');
    closeRightPanel = Selector('[data-testid=close-right-panel-btn]');
    addNewStreamEntry = Selector('[data-testid=add-key-value-items-btn]');
    removeEntryButton = Selector('[data-testid^=remove-entry-button-]');
    confirmRemoveEntryButton = Selector('[data-testid^=remove-entry-button-]').withExactText('Remove');
    clearStreamEntryInputs = Selector('[data-testid=remove-item]');
    saveGroupsButton = Selector('[data-testid=save-groups-btn]');
    acknowledgeButton = Selector('[data-testid=acknowledge-btn]');
    confirmAcknowledgeButton = Selector('[data-testid=acknowledge-submit]');
    claimPendingMessageButton = Selector('[data-testid=claim-pending-message]');
    submitButton = Selector('[data-testid=btn-submit]');
    consumerDestinationSelect = Selector('[data-testid=destination-select]');
    removeConsumerButton = Selector('[data-testid^=remove-consumer-button]');
    removeConsumerGroupButton = Selector('[data-testid^=remove-groups-button]');
    optionalParametersSwitcher = Selector('[data-testid=optional-parameters-switcher]');
    forceClaimCheckbox = Selector('[data-testid=force-claim-checkbox]').sibling();
    editStreamLastIdButton = Selector('[data-testid^=edit-stream-last-id]');
    saveButton = Selector('[data-testid=save-btn]');
    //CONTAINERS
    streamGroupsContainer = Selector('[data-testid=stream-groups-container]');
    streamConsumersContainer = Selector('[data-testid=stream-consumers-container]');
    breadcrumbsContainer = Selector('[data-testid=breadcrumbs-container]');
    virtualTableContainer = Selector('[data-testid=virtual-table-container]');
    streamEntriesContainer = Selector('[data-testid=stream-entries-container]');
    streamMessagesContainer = Selector('[data-testid=stream-messages-container]');
    //LINKS
    internalLinkToWorkbench = Selector('[data-testid=internal-workbench-link]');
    //OPTION ELEMENTS
    stringOption = Selector('#string');
    jsonOption = Selector('#ReJSON-RL');
    setOption = Selector('#set');
    zsetOption = Selector('#zset');
    listOption = Selector('#list');
    hashOption = Selector('#hash');
    streamOption = Selector('#stream');
    removeFromHeadSelection = Selector('#HEAD');
    selectedFilterTypeString = Selector('[data-testid=filter-option-type-selected-string]');
    filterOptionType = Selector('[data-test-subj^=filter-option-type-]');
    filterByKeyTypeDropDown = Selector('[data-testid=filter-option-type-default]');
    filterOptionTypeSelected = Selector('[data-testid^=filter-option-type-selected]');
    consumerOption = Selector('[data-testid=consumer-option]');
    claimTimeOptionSelect = Selector('[data-testid=time-option-select]');
    relativeTimeOption = Selector('#idle');
    timestampOption = Selector('#time');
    //TABS
    streamTabGroups = Selector('[data-testid=stream-tab-Groups]');
    streamTabConsumers = Selector('[data-testid=stream-tab-Consumers]');
    streamTabs = Selector('[data-test-subj=stream-tabs]');
    //TEXT INPUTS (also referred to as 'Text fields')
    addKeyNameInput = Selector('[data-testid=key]');
    keyNameInput = Selector('[data-testid=edit-key-input]');
    keyTTLInput = Selector('[data-testid=ttl]');
    editKeyTTLInput = Selector('[data-testid=edit-ttl-input]');
    ttlText = Selector('[data-testid=key-ttl-text] span');
    hashFieldValueInput = Selector('[data-testid=field-value]');
    hashFieldNameInput = Selector('[data-testid=field-name]');
    listKeyElementInput = Selector('[data-testid=element]');
    stringKeyValueInput = Selector('[data-testid=string-value]');
    jsonKeyValueInput = Selector('[data-testid=json-value]');
    setMemberInput = Selector('[data-testid=member-name]');
    zsetMemberScoreInput = Selector('[data-testid=member-score]');
    filterByPatterSearchInput = Selector('[data-testid=search-key]');
    hashFieldInput = Selector('[data-testid=hash-field]');
    hashValueInput = Selector('[data-testid=hash-value]');
    searchInput = Selector('[data-testid=search]');
    addListKeyElementInput = Selector('[data-testid=elements-input]');
    jsonKeyInput = Selector('[data-testid=json-key]');
    jsonValueInput = Selector('[data-testid=json-value]');
    countInput = Selector('[data-testid=count-input]');
    treeViewDelimiterInput = Selector('[data-testid=tree-view-delimiter-input]');
    streamEntryId = Selector('[data-testid=entryId]');
    streamField = Selector('[data-testid=field-name]');
    streamValue = Selector('[data-testid=field-value]');
    addStreamRow = Selector('[data-testid=add-new-item]');
    streamFieldsValues = Selector('[data-testid^=stream-entry-field-]');
    streamEntryIDDateValue = Selector('[data-testid^=stream-entry-][data-testid$=date]');
    streamRangeEndInput = Selector('[data-testid=range-end-input]');
    groupNameInput = Selector('[data-testid=group-name-field]');
    consumerIdInput = Selector('[data-testid=id-field]');
    streamMinIdleTimeInput = Selector('[data-testid=min-idle-time]');
    claimIdleTimeInput = Selector('[data-testid=time-count]');
    claimRetryCountInput = Selector('[data-testid=retry-count]');
    lastIdInput = Selector('[data-testid=last-id-field]');
    //TEXT ELEMENTS
    keySizeDetails = Selector('[data-testid=key-size-text]');
    keyLengthDetails = Selector('[data-testid=key-length-text]');
    notificationMessage = Selector('[data-test-subj=euiToastHeader]');
    keyNameInTheList = Selector(this.cssSelectorKey);
    databaseNames = Selector('[data-testid^=db_name_]');
    hashFieldsList = Selector('[data-testid^=hash-field-] span');
    hashValuesList = Selector('[data-testid^=hash-field-value-] span');
    hashFieldValue = Selector('[data-testid^=hash-field-value-]');
    setMembersList = Selector('[data-testid^=set-member-value-]');
    zsetMembersList = Selector('[data-testid^=zset-member-value-]');
    zsetScoresList = Selector('[data-testid^=zset-score-value-]');
    listElementsList = Selector('[data-testid^=list-element-value-]');
    jsonKeyValue = Selector('[data-testid=json-data]');
    jsonError = Selector('[data-testid=edit-json-error]');
    tooltip = Selector('[role=tooltip]');
    noResultsFound = Selector('[data-test-subj=no-result-found]');
    searchAdvices = Selector('[data-test-subj=search-advices]');
    keysNumberOfResults = Selector('[data-testid=keys-number-of-results]');
    keysNumberOfScanned = Selector('[data-testid=keys-number-of-scanned]');
    keysTotalNumber = Selector('[data-testid=keys-total]');
    overviewTotalKeys = Selector('[data-test-subj=overview-total-keys]');
    overviewTotalMemory = Selector('[data-test-subj=overview-total-memory]');
    overviewConnectedClients = Selector('[data-test-subj=overview-connected-clients]');
    overviewCommandsSec = Selector('[data-test-subj=overview-commands-sec]');
    overviewCpu = Selector('[data-test-subj=overview-cpu]');
    treeViewArea = Selector('[data-test-subj=tree-view-panel]');
    scannedValue = Selector('[data-testid=keys-number-of-scanned]');
    treeViewKeysNumber = Selector('[data-testid^=count_]');
    treeViewPercentage = Selector('[data-testid^=percentage_]');
    treeViewFolders = Selector('[data-test-subj^=node-arrow-icon_]');
    totalKeysNumber = Selector('[data-testid=keys-total]');
    databaseInfoToolTip = Selector('[data-testid=db-info-tooltip]');
    treeViewDeviceFolder = Selector('[data-testid^=node-item_device] div');
    treeViewDeviceKyesCount = Selector('[data-testid^=count_device] span');
    ttlValueInKeysTable = Selector('[data-testid^=ttl-]');
    stringKeyValue = Selector('.key-details-body pre');
    keyDetailsBadge = Selector('.key-details-header .euiBadge__text');
    treeViewKeysItem = Selector('[data-testid*="keys:keys:"]');
    treeViewNotPatternedKeys = Selector('[data-testid*="node-item_keys"]');
    treeViewNodeArrowIcon = Selector('[data-test-subj^=node-arrow-icon_]');
    modulesTypeDetails = Selector('[data-testid=modules-type-details]');
    filteringLabel = Selector('[data-testid^=badge-]');
    keysSummary = Selector('[data-testid=keys-summary]');
    multiSearchArea = Selector(this.cssFilteringLabel);
    keyDetailsHeader = Selector('[data-testid=key-details-header]');
    keyListTable = Selector('[data-testid=keyList-table]');
    keyDetailsTable = Selector('[data-testid=key-details]');
    keyNameFormDetails = Selector('[data-testid=key-name-text]');
    keyDetailsTTL = Selector('[data-testid=key-ttl-text]');
    progressLine = Selector('div.euiProgress');
    progressKeyList = Selector('[data-testid=progress-key-list]');
    jsonScalarValue = Selector('[data-testid=json-scalar-value]');
    noKeysToDisplayText = Selector('[data-testid=no-keys-selected-text]');
    streamEntryColumns = Selector(this.streamEntriesContainer.find('[aria-colcount]'));
    streamEntryRows = Selector(this.streamEntriesContainer.find('[aria-rowcount]'));
    streamEntryDate = Selector('[data-testid*=-date][data-testid*=stream-entry]');
    streamEntryIdValue = Selector('.streamItemId[data-testid*=stream-entry]');
    streamFields = Selector('[data-testid=stream-entries-container] .truncateText');
    streamVirtualContainer = Selector('[data-testid=virtual-grid-container] div div').nth(0);
    streamEntryFields = Selector('[data-testid^=stream-entry-field]');
    confirmationMessagePopover = Selector('div.euiPopover__panel .euiText ');
    streamRangeLeftTimestamp = Selector('[data-testid=range-left-timestamp]');
    streamRangeRightTimestamp = Selector('[data-testid=range-right-timestamp]');
    streamGroupId = Selector('.streamItemId[data-testid^=stream-group-id]');
    streamGroupName = Selector('[data-testid^=stream-group-name]');
    streamMessage = Selector('[data-testid*=-date][data-testid^=stream-message]');
    streamConsumerName = Selector('[data-testid^=stream-consumer-]');
    consumerGroup = Selector('[data-testid^=stream-group-]');
    entryIdInfoIcon = Selector('[data-testid=entry-id-info-icon]');
    errorMessage = Selector('[data-test-subj=toast-error]');
    entryIdError = Selector('[data-testid=id-error]');
    pendingCount = Selector('[data-testid=pending-count]');
    lastRefreshMessage = Selector('[data-testid=refresh-message]');
    streamRangeBar = Selector('[data-testid=mock-fill-range]');
    rangeLeftTimestamp = Selector('[data-testid=range-left-timestamp]');
    rangeRightTimestamp = Selector('[data-testid=range-right-timestamp]');

    /**
     * Common part for Add any new key
     * @param keyName The name of the key
     * @param TTL The Time to live value of the key
     */
    async commonAddNewKey(keyName: string, TTL?: string): Promise<void> {
        await common.waitForElementNotVisible(this.progressLine);
        await t.click(this.plusAddKeyButton);
        await t.click(this.addKeyNameInput);
        await t.typeText(this.addKeyNameInput, keyName);
        if (TTL !== undefined) {
            await t.click(this.keyTTLInput);
            await t.typeText(this.keyTTLInput, TTL);
        }
        await t.click(this.keyTypeDropDown);
    }

    /**
     * Adding a new String key
     * @param keyName The name of the key
     * @param TTL The Time to live value of the key
     * @param value The key value
     */
    async addStringKey(keyName: string, value = ' ', TTL?: string): Promise<void> {
        await t.click(this.plusAddKeyButton);
        await t.click(this.keyTypeDropDown);
        await t.click(this.stringOption);
        await t.click(this.addKeyNameInput);
        await t.typeText(this.addKeyNameInput, keyName);
        if (TTL !== undefined) {
            await t.click(this.keyTTLInput);
            await t.typeText(this.keyTTLInput, TTL);
        }
        await t.click(this.stringKeyValueInput);
        await t.typeText(this.stringKeyValueInput, value);
        await t.click(this.addKeyButton);
    }

    /**
     *Adding a new Json key
     * @param keyName The name of the key
     * @param value The key value
     * @param TTL The Time to live value of the key (optional parameter)
     */
    async addJsonKey(keyName: string, value: string, TTL?: string): Promise<void> {
        await t.click(this.plusAddKeyButton);
        await t.click(this.keyTypeDropDown);
        await t.click(this.jsonOption);
        await t.click(this.addKeyNameInput);
        await t.typeText(this.addKeyNameInput, keyName);
        await t.click(this.jsonKeyValueInput);
        await t.typeText(this.jsonKeyValueInput, value, { paste: true });
        if (TTL !== undefined) {
            await t.click(this.keyTTLInput);
            await t.typeText(this.keyTTLInput, TTL);
        }
        await t.click(this.addKeyButton);
    }

    /**
     * Adding a new Set key
     * @param keyName The name of the key
     * @param TTL The Time to live value of the key
     * @param members The key members
     */
    async addSetKey(keyName: string, TTL = ' ', members = ' '): Promise<void> {
        await common.waitForElementNotVisible(this.progressLine);
        await t.click(this.plusAddKeyButton);
        await t.click(this.keyTypeDropDown);
        await t.click(this.setOption);
        await t.click(this.addKeyNameInput);
        await t.typeText(this.addKeyNameInput, keyName);
        await t.click(this.keyTTLInput);
        await t.typeText(this.keyTTLInput, TTL);
        await t.typeText(this.setMemberInput, members);
        await t.click(this.addKeyButton);
    }

    /**
     * Adding a new ZSet key
     * @param keyName The name of the key
     * @param TTL The Time to live value of the key
     * @param members The key members
     * @param scores The score of the key member
     */
    async addZSetKey(keyName: string, scores = ' ', TTL = ' ', members = ' '): Promise<void> {
        await common.waitForElementNotVisible(this.progressLine);
        await t.click(this.plusAddKeyButton);
        await t.click(this.keyTypeDropDown);
        await t.click(this.zsetOption);
        await t.click(this.addKeyNameInput);
        await t.typeText(this.addKeyNameInput, keyName);
        await t.click(this.keyTTLInput);
        await t.typeText(this.keyTTLInput, TTL);
        await t.typeText(this.setMemberInput, members);
        await t.typeText(this.zsetMemberScoreInput, scores);
        await t.click(this.addKeyButton);
    }

    /**
     * Adding a new List key
     * @param keyName The name of the key
     * @param TTL The Time to live value of the key
     * @param element The key element
     */
    async addListKey(keyName: string, TTL = ' ', element = ' '): Promise<void> {
        await common.waitForElementNotVisible(this.progressLine);
        await t.click(this.plusAddKeyButton);
        await t.click(this.keyTypeDropDown);
        await t.click(this.listOption);
        await t.click(this.addKeyNameInput);
        await t.typeText(this.addKeyNameInput, keyName);
        await t.click(this.keyTTLInput);
        await t.typeText(this.keyTTLInput, TTL);
        await t.click(this.listKeyElementInput);
        await t.typeText(this.listKeyElementInput, element);
        await t.click(this.addKeyButton);
    }

    /**
     * Adding a new Hash key
     * @param keyName The name of the key
     * @param TTL The Time to live value of the key
     * @param field The field name of the key
     * @param value The value of the key
     */
    async addHashKey(keyName: string, TTL = ' ', field = ' ', value = ' '): Promise<void> {
        await common.waitForElementNotVisible(this.progressLine);
        await t.click(this.plusAddKeyButton);
        await t.click(this.keyTypeDropDown);
        await t.click(this.hashOption);
        await t.click(this.addKeyNameInput);
        await t.typeText(this.addKeyNameInput, keyName);
        await t.click(this.keyTTLInput);
        await t.typeText(this.keyTTLInput, TTL);
        await t.typeText(this.hashFieldNameInput, field);
        await t.typeText(this.hashFieldValueInput, value);
        await t.click(this.addKeyButton);
    }

    /**
     * Adding a new Stream key
     * @param keyName The name of the key
     * @param field The field name of the key
     * @param value The value of the key
     * @param TTL The Time to live value of the key
     */
    async addStreamKey(keyName: string, field: string, value: string, TTL?: string): Promise<void> {
        await this.commonAddNewKey(keyName, TTL);
        await t.click(this.streamOption);
        // Verify that user can see Entity ID filled by * by default on add Stream key form
        await t.expect(this.streamEntryId.withAttribute('value', '*').visible).ok('Preselected Stream Entity ID field');
        await t.typeText(this.streamField, field, { replace: true });
        await t.typeText(this.streamValue, value, { replace: true });
        await t.expect(this.addKeyButton.withAttribute('disabled').exists).notOk('Clickable Add Key button');
        await t.click(this.addKeyButton);
        await t.click(this.toastCloseButton);
    }

    /**
     * Adding a new Entry to a Stream key
     * @param field The field name of the key
     * @param value The value of the key
     * @param entryId The identification of specific entry of the Stream Key
     */
    async addEntryToStream(field: string, value: string, entryId?: string): Promise<void> {
        await t.click(this.addNewStreamEntry);
        // Specify field, value and add new entry
        await t.typeText(this.streamField, field);
        await t.typeText(this.streamValue, value);
        if (entryId !== undefined) {
            await t.typeText(this.streamEntryId, entryId);
        }
        await t.click(this.saveElementButton);
        // Validate that new entry is added
        await t.expect(this.streamEntriesContainer.textContent).contains(field, 'Field parameter');
        await t.expect(this.streamEntriesContainer.textContent).contains(value, 'Value parameter');
    }

    /**
     * Adding a new Entry to a Stream key
     * @param fields The field name of the key
     * @param values The value of the key
     * @param entryId The identification of specific entry of the Stream Key
     */
    async fulfillSeveralStreamFields(fields: string[], values: string[], entryId?: string): Promise<void> {
        for (let i = 0; i < fields.length; i++) {
            await t.typeText(this.streamField.nth(-1), fields[i]);
            await t.typeText(this.streamValue.nth(-1), values[i]);
            if (i < fields.length - 1) {
                await t.click(this.addStreamRow);
            }
        }
        if (entryId !== undefined) {
            await t.typeText(this.streamEntryId, entryId);
        }
    }

    /**
     * Select keys filter group type
     * @param groupName The group name
     */
    async selectFilterGroupType(groupName: string): Promise<void> {
        if (await this.deleteFilterButton.visible) {
            await t.click(this.deleteFilterButton);
        }
        await t.click(this.filterByKeyTypeDropDown);
        await t.click(this.filterOptionType.withExactText(groupName));
    }

    /**
     * Searching by Key name in the list
     * @param keyName The name of the key
     */
    async searchByKeyName(keyName: string): Promise<void> {
        await t.click(this.filterByPatterSearchInput);
        await t.pressKey('ctrl+a delete');
        await t.typeText(this.filterByPatterSearchInput, keyName);
        await t.pressKey('enter');
    }

    /**
     * Verifying if the Key is in the List of keys
     * @param keyName The name of the key
     */
    async isKeyIsDisplayedInTheList(keyName: string): Promise<boolean> {
        const keyNameInTheList = Selector(`[data-testid="key-${keyName}"]`);
        return keyNameInTheList.exists;
    }

    //Getting the text of the Notification message
    async getMessageText(): Promise<string> {
        return this.notificationMessage.textContent;
    }

    //Delete key from details
    async deleteKey(): Promise<void> {
        if (await this.toastCloseButton.exists) {
            await t.click(this.toastCloseButton);
        }
        await t.click(this.keyNameInTheList);
        await t.click(this.deleteKeyButton);
        await t.click(this.confirmDeleteKeyButton);
    }

    /**
     * Delete key by Name from details
     * @param keyName The name of the key
     */
    async deleteKeyByName(keyName: string): Promise<void> {
        if (await this.toastCloseButton.visible) {
            await t.click(this.toastCloseButton);
        }
        await this.searchByKeyName(keyName);
        await t.click(this.keyNameInTheList);
        await t.click(this.deleteKeyButton);
        await t.click(this.confirmDeleteKeyButton);
    }

    /**
     * Edit key name from details
     * @param keyName The name of the key
     */
    async editKeyName(keyName: string): Promise<void> {
        await t
            .click(this.editKeyNameButton)
            .pressKey('ctrl+a delete')
            .typeText(this.keyNameInput, keyName)
            .click(this.applyButton);
    }

    /**
     * Edit String key value from details
     * @param value The value of the key
     */
    async editStringKeyValue(value: string): Promise<void> {
        await t
            .click(this.stringKeyValue)
            .pressKey('ctrl+a delete')
            .typeText(this.stringKeyValueInput, value)
            .click(this.applyButton);
    }

    //Get string key value from details
    async getStringKeyValue(): Promise<string> {
        return this.stringKeyValue.textContent;
    }

    /**
     * Add field to hash key
     * @param keyFieldValue The value of the hash field
     * @param keyValue The hash value
     */
    async addFieldToHash(keyFieldValue: string, keyValue: string): Promise<void> {
        if (await this.toastCloseButton.exists) {
            await t.click(this.toastCloseButton);
        }
        await t.click(this.addKeyValueItemsButton);
        await t.typeText(this.hashFieldInput, keyFieldValue);
        await t.typeText(this.hashValueInput, keyValue);
        await t.click(this.saveHashFieldButton);
    }

    /**
     * Search by the value in the key details
     * @param value The value of the search parameter
     */
    async searchByTheValueInKeyDetails(value: string): Promise<void> {
        await t.click(this.searchButtonInKeyDetails);
        await t.pressKey('ctrl+a delete');
        await t.typeText(this.searchInput, value);
        await t.pressKey('enter');
    }

    /**
     * Search by the value in the set key details
     * @param value The value of the search parameter
     */
    async searchByTheValueInSetKey(value: string): Promise<void> {
        await t.click(this.searchInput);
        await t.pressKey('ctrl+a delete');
        await t.typeText(this.searchInput, value);
        await t.pressKey('enter');
    }

    /**
     * Add member to the Set key
     * @param keyMember The value of the set member
     */
    async addMemberToSet(keyMember: string): Promise<void> {
        if (await this.toastCloseButton.exists) {
            await t.click(this.toastCloseButton);
        }
        await t.click(this.addKeyValueItemsButton);
        await t.typeText(this.setMemberInput, keyMember);
        await t.click(this.saveMemberButton);
    }

    /**
     * Add member to the ZSet key
     * @param keyMember The value of the Zset member
     * @param score The value of the score
     */
    async addMemberToZSet(keyMember: string, score: string): Promise<void> {
        if (await this.toastCloseButton.exists) {
            await t.click(this.toastCloseButton);
        }
        await t.click(this.addKeyValueItemsButton);
        await t.typeText(this.setMemberInput, keyMember);
        await t.typeText(this.zsetMemberScoreInput, score);
        await t.click(this.saveMemberButton);
    }

    //Get databases name
    async getDatabasesName(): Promise<string> {
        return this.databaseNames.textContent;
    }

    //Open key details
    async openKeyDetails(keyName: string): Promise<void> {
        await this.searchByKeyName(keyName);
        await t.click(this.keyNameInTheList);
    }

    /**
     * Add element to the List key
     * @param element The value of the list element
     */
    async addElementToList(element: string): Promise<void> {
        if (await this.toastCloseButton.exists) {
            await t.click(this.toastCloseButton);
        }
        await t.click(this.addKeyValueItemsButton);
        await t.typeText(this.addListKeyElementInput, element);
        await t.click(this.saveElementButton);
    }

    //Remove List element from tail for Redis databases less then v. 6.2.
    async removeListElementFromTailOld(): Promise<void> {
        await t.click(this.removeElementFromListIconButton);
        await t.expect(this.countInput.withAttribute('disabled').exists).ok('Disabled input field');
        await t.click(this.removeElementFromListButton);
        await t.click(this.confirmRemoveListElementButton);
    }

    //Remove List element from head for Redis databases less then v. 6.2.
    async removeListElementFromHeadOld(): Promise<void> {
        await t.click(this.removeElementFromListIconButton);
        await t.expect(this.countInput.withAttribute('disabled').exists).ok('Disabled input field');
        //Select Remove from head selection
        await t.click(this.removeElementFromListSelect);
        await t.click(this.removeFromHeadSelection);
        //Confirm removing
        await t.click(this.removeElementFromListButton);
        await t.click(this.confirmRemoveListElementButton);
    }

    /**
     * Remove List element from tail
     * @param count The count if elements for removing
     */
    async removeListElementFromTail(count: string): Promise<void> {
        await t.click(this.removeElementFromListIconButton);
        await t.typeText(this.countInput, count);
        await t.click(this.removeElementFromListButton);
        await t.click(this.confirmRemoveListElementButton);
    }

    /**
     * Remove List element from head
     * @param count The count if elements for removing
     */
    async removeListElementFromHead(count: string): Promise<void> {
        await t.click(this.removeElementFromListIconButton);
        //Enter count of the removing elements
        await t.typeText(this.countInput, count);
        //Select Remove from head selection
        await t.click(this.removeElementFromListSelect);
        await t.click(this.removeFromHeadSelection);
        //Confirm removing
        await t.click(this.removeElementFromListButton);
        await t.click(this.confirmRemoveListElementButton);
    }

    /**
     * Add json key with value on the same level of the structure
     * @param jsonKey The json key name
     * @param jsonKeyValue The value of the json key
     */
    async addJsonKeyOnTheSameLevel(jsonKey: string, jsonKeyValue: any): Promise<void> {
        await t.click(this.addJsonObjectButton);
        await t.typeText(this.jsonKeyInput, jsonKey);
        await t.typeText(this.jsonValueInput, jsonKeyValue);
        await t.click(this.applyButton);
    }

    /**
     * Add json key with value inside the Json structure
     * @param jsonKey The json key name
     * @param jsonKeyValue The value of the json key
     */
    async addJsonKeyInsideStructure(jsonKey: string, jsonKeyValue: any): Promise<void> {
        await t.click(this.expandJsonObject);
        await t.click(this.addJsonFieldButton);
        await t.typeText(this.jsonKeyInput, jsonKey);
        await t.typeText(this.jsonValueInput, jsonKeyValue);
        await t.click(this.applyButton);
    }

    /**
     * Add json structure
     * @param jsonStructure The structure of the json key
     */
    async addJsonStructure(jsonStructure: string): Promise<void> {
        await t.click(this.expandJsonObject);
        await t.click(this.editJsonObjectButton);
        await t.pressKey('ctrl+a delete');
        await t.typeText(this.jsonValueInput, jsonStructure);
        await t.click(this.applyEditButton);
    }

    /**
     * Get Values list of the key
     * @param element Selector of the element with list
     */
    async getValuesListByElement(element: any): Promise<string[]> {
        const keyValues: string[] = [];
        const count = await element.count;
        for (let i = 0; i < count; i++) {
            keyValues[i] = await element.nth(i).textContent;
            i++;
        }
        return keyValues;
    }

    /**
     * Check tree view structure
     * @folders name of folders for tree view build
     * @delimiter string with delimiter value
     * @commonKeyFolder flag if not patterned keys will be displayed
     */
    async checkTreeViewFoldersStructure(folders: string[][], delimiter: string, commonKeyFolder: boolean): Promise<void> {
        // Verify that all keys that are not inside of tree view doesn't contain delimiter
        if (commonKeyFolder) {
            await t.expect(this.treeViewNotPatternedKeys.exists).ok('Folder with not patterned keys');
            await t.click(this.treeViewNotPatternedKeys);
            const notPatternedKeys = await Selector('[data-test-subj=key-list-panel]').find(this.cssSelectorKey);
            const notPatternedKeysNumber = await notPatternedKeys.count;
            for (let i = 0; i < notPatternedKeysNumber; i++) {
                await t.expect(notPatternedKeys.nth(i).withText(delimiter).exists).notOk('Not contained delimiter keys');
            }
        }
        // Verify that every level of tree view is clickable
        const foldersNumber = folders.length;
        for (let i = 0; i < foldersNumber; i++) {
            const innerFoldersNumber = folders[i].length;
            const array: string[] = [];
            for (let j = 0; j < innerFoldersNumber; j++) {
                if (j === 0) {
                    const folderSelector = `[data-testid="node-item_${folders[i][j]}${delimiter}"]`;
                    array.push(folderSelector);
                    await t.click(await Selector(folderSelector));
                }
                else {
                    const lastSelector = array[array.length - 1].substring(0, array[array.length - 1].length - 2);
                    const folderSelector = `${lastSelector}${folders[i][j]}${delimiter}"]`;
                    array.push(folderSelector);
                    await t.click(await Selector(folderSelector));
                }
            }
            // Verify that the last folder level contains required keys
            const lastSelector = array[array.length - 1].substring(0, array[array.length - 1].length - 2);
            const folderSelector = `${lastSelector}keys${delimiter}keys${delimiter}"]`;
            await t.click(await Selector(folderSelector));
            const foundKeyName = `${folders[i].join(delimiter)}`;
            await t.expect(Selector(`[data-testid*="key-${foundKeyName}"]`).visible).ok('Specific key');
            await t.click(array[0]);
        }
    }

    /**
     * Change delimiter value
     * @delimiter string with delimiter value
     */
    async changeDelimiterInTreeView(delimiter: string): Promise<void> {
        // Open delimiter popup
        await t.click(this.treeViewDelimiterButton);
        // Check the previous value
        await t.expect(this.treeViewDelimiterButton.withExactText(':').exists).ok('Default delimiter value');
        // Apply new value to the field
        await t.typeText(this.treeViewDelimiterInput, delimiter, { replace: true });
        // Click on save button
        await t.click(this.treeViewDelimiterValueSave);
        await t.expect(this.treeViewDelimiterButton.withExactText(delimiter).exists).ok('Delimiter is not changed');
    }

    //Delete entry from Stream key
    async deleteStreamEntry(): Promise<void> {
        await t.click(this.removeEntryButton);
        await t.click(this.confirmRemoveEntryButton);
    }

    /**
     * Get key length from opened key details
     */
    async getKeyLength(): Promise<string> {
        const rawValue = await this.keyLengthDetails.textContent;
        return rawValue.split(' ')[rawValue.split(' ').length - 1];
    }

    /**
     * Create new consumer group in Stream key
     * @groupName The name of the Consumer Group
     * @id The ID of the Consumer Group
     */
    async createConsumerGroup(groupName: string, id?: string): Promise<void> {
        await t.click(this.addKeyValueItemsButton);
        await t.typeText(this.groupNameInput, groupName, { replace: true, paste: true });
        if (id !== undefined) {
            await t.typeText(this.consumerIdInput, id, { replace: true, paste: true });
        }
        await t.click(this.saveGroupsButton);
    }

    /**
     * Open pendings view in Stream key
     * @keyName The name of the Stream Key
     */
    async openStreamPendingsView(keyName: string): Promise<void> {
        await this.openKeyDetails(keyName);
        await t.click(this.streamTabGroups);
        await t.click(this.consumerGroup);
        await t.click(this.streamConsumerName);
    }
}

/**
 * Add new keys parameters
 * @param keyName The name of the key
 * @param TTL The ttl of the key
 * @param value The value of the key
 * @param members The members of the key
 * @param scores The scores of the key member
 * @param field The field of the key
 */
export type AddNewKeyParameters = {
    keyName: string,
    value?: string,
    TTL?: string,
    members?: string,
    scores?: string,
    field?: string,
    fields?: [{
        field?: string,
        valuse?: string
    }]
};

/**
 * Hash key parameters
 * @param keyName The name of the key
 * @param fields The Array with fields
 * @param field The field of the field
 * @param value The value of the field

 */
 export type HashKeyParameters = {
    keyName: string,
    fields: {
        field: string,
        value: string
    }[]
};

/**
 * Stream key parameters
 * @param keyName The name of the key
 * @param entries The Array with entries
 * @param id The id of entry
 * @param fields The Array with fields
 */
export type StreamKeyParameters = {
    keyName: string,
    entries: {
        id: string,
        fields: string[][]
    }[]
};

/**
 * Set key parameters
 * @param keyName The name of the key
 * @param members The Array with members
 */
 export type SetKeyParameters = {
    keyName: string,
    members: string[]
};

/**
 * Sorted Set key parameters
 * @param keyName The name of the key
 * @param members The Array with members
 * @param name The name of the member
 * @param id The id of the member
 */
 export type SortedSetKeyParameters = {
    keyName: string,
    members: {
        name: string,
        score: string
    }[]
};

/**
 * List key parameters
 * @param keyName The name of the key
 * @param element The element in list
 */
 export type ListKeyParameters = {
    keyName: string,
    element: string
};
