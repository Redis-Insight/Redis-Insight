import { Selector } from 'testcafe';

export class AutoDiscoverREDatabases {
    //-------------------------------------------------------------------------------------------
    //DECLARATION OF SELECTORS
    //*Declare all elements/components of the relevant page.
    //*Target any element/component via data-id, if possible!
    //*The following categories are ordered alphabetically (Alerts, Buttons, Checkboxes, etc.).
    //-------------------------------------------------------------------------------------------
    //BUTTONS
    addSelectedDatabases = Selector('[data-testid=btn-add-databases]');
    databaseCheckbox = Selector('[data-test-subj^=checkboxSelectRow]');
    search = Selector('[data-testid=search]');
    viewDatabasesButton = Selector('[data-testid=btn-view-databases]');
    //TEXT INPUTS (also referred to as 'Text fields')
    title = Selector('[data-testid=title]');
    databaseNames = Selector('[data-testid^=db_name_]');
}
