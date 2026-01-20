const mongoose = require('mongoose');
const xlsx = require('xlsx');
const ItemMaster = require('./Models/itemmasterds');

const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE2 || process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

mongoose.connect("mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('DB connection successful!'));

const importData = async () => {
    try {
        const workbook = xlsx.readFile('ItemList_pu_data.xlsx'); // Verify filename case
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        console.log(`Found ${data.length} items to import.`);

        // Batch size and delay
        const BATCH_SIZE = 50;
        const DELAY_MS = 1000; // 1 second sleep

        for (let i = 0; i < data.length; i += BATCH_SIZE) {
            const batch = data.slice(i, i + BATCH_SIZE);
            const operations = batch.map(row => {
                return {
                    insertOne: {
                        document: {
                            name: row['name'],
                            user: row['user'],
                            colid: row['colid'],
                            itemname: row['item'],
                            itemcode: row['itemcode'],
                            itemtype: row['itemtype'],
                            description: row['decription'] || row['description'], // Handle typo in excel
                            status: 'Active'
                        }
                    }
                };
            });

            if (operations.length > 0) {
                await ItemMaster.bulkWrite(operations);
                console.log(`Imported batch ${i} to ${i + operations.length}`);
            }

            // Sleep
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }

        console.log('Data successfully loaded!');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

importData();
