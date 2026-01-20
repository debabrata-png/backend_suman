const mongoose = require('mongoose');
const xlsx = require('xlsx');
const Vendor = require('./Models/vendords');

const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });


mongoose.connect("mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('DB connection successful!'));

const importData = async () => {
    try {
        const workbook = xlsx.readFile('vendor_data_pu.xlsx');
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        console.log(`Found ${data.length} vendors to import.`);

        const operations = data.map(row => {
            return {
                insertOne: {
                    document: {
                        name: row['name'],
                        user: row['user'],
                        colid: row['colid'],
                        vendorname: row['vendorname'],
                        payterm: row['payterm'],
                        type: 'Vendor',
                    }
                }
            };
        });

        if (operations.length > 0) {
            await Vendor.bulkWrite(operations);
        }

        console.log('Vendor data successfully loaded!');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

importData();
