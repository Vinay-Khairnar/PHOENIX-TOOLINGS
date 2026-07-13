const xlsx = require('xlsx');

const files = [
  'KTD-164_Purchase_Material_Order.xlsx',
  'PO_PO-AUTO-01-8384.xlsx', 
  'PO_PO-AUTO-01-9313.xlsx'
];

for (const file of files) {
  console.log('\n' + '='.repeat(80));
  console.log(`FILE: ${file}`);
  console.log('='.repeat(80));
  
  const workbook = xlsx.readFile(`e:/projects/tendor/${file}`);
  console.log(`Sheet names: ${JSON.stringify(workbook.SheetNames)}`);
  
  for (const sheetName of workbook.SheetNames) {
    console.log(`\n--- Sheet: "${sheetName}" ---`);
    const ws = workbook.Sheets[sheetName];
    const range = ws['!ref'];
    console.log(`Range: ${range}`);
    
    const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
    
    const maxRows = Math.min(data.length, 25);
    console.log(`Total rows: ${data.length}`);
    for (let i = 0; i < maxRows; i++) {
      console.log(`Row ${i}: ${JSON.stringify(data[i])}`);
    }
    
    const keyedData = xlsx.utils.sheet_to_json(ws);
    if (keyedData.length > 0) {
      console.log(`\nColumn headers (keys): ${JSON.stringify(Object.keys(keyedData[0]))}`);
      for (let i = 0; i < Math.min(keyedData.length, 5); i++) {
        console.log(`Sample keyed row ${i}: ${JSON.stringify(keyedData[i])}`);
      }
    }
    
    if (ws['!merges']) {
      console.log(`\nMerged cells: ${JSON.stringify(ws['!merges'])}`);
    }
  }
}
