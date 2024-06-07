export const PHPFormatter = {
    format: 'PHP serialized',
    fromText: 'a:2:{i:0;s:12:"Sample array";i:1;a:2:{i:0;s:5:"Apple";i:1;s:6:"Orange";}}',
    fromTextEdit: '[ "Sample array", [ "Apple", "Orange15" ] ]',
    formattedText: '[ "Sample array", [ "Apple", "Orange" ] ]'
};

/**
 * PHP data for convertion including different php serialized data types
 */
export const phpData = [{
    dataType: 'Object',
    //commented due to bug: RI-4906 it's not a priority. can be removed if users won't submitted bugs for a short period of time
    //from: 'a:6:{i:1;s:30:"PHP code tester Sandbox Online";s:5:"emoji";s:24:"😀 😃 😄 😁 😆";i:2;i:5;i:5;i:89009;s:13:"Random number";i:341;s:11:"PHP Version";s:5:"8.1.9";}',
    //converted: '{ "1": "PHP code tester Sandbox Online", "2": 5, "5": 89009, "emoji": "😀 😃 😄 😁 😆", "Random number": 341, "PHP Version": "8.1.9" }'
    from: 'a:5:{s:1:"1";s:30:"PHP code tester Sandbox Online";s:1:"2";i:5;s:1:"5";i:89009;s:13:"Random number";i:341;s:11:"PHP Version";s:5:"8.1.9";}',
    converted: '{ "1": "PHP code tester Sandbox Online", "2": 5, "5": 89009, "Random number": 341, "PHP Version": "8.1.9" }'
},
{
    dataType: 'Number',
    from: 'i:34567234;',
    converted: '34567234'
},
{
    dataType: 'String',
    from: 's:72:"Dumbledore took Harry in his arms and turned toward the Dursleys\' house.";',
    converted: '"Dumbledore took Harry in his arms and turned toward the Dursleys\' house."'
}];
