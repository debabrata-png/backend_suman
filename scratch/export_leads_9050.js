const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from the parent directory
dotenv.config({ path: path.join(__dirname, '../config.env') });

const crmh1Schema = new mongoose.Schema({}, { strict: false });
const crmh1 = require("../Models/crmh1") // Use 'crmh1s' as the explicit collection name

async function exportLeads() {
    try {
        const dbUri = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
        console.log("Connecting to database...");
        await mongoose.connect("mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
        console.log("Connected to database successfully.");

        const filterColid = 9050;
        console.log(`Fetching leads for colid ${filterColid}...`);
        const leads = await crmh1.find({ colid: filterColid }).lean();
        console.log(`Found ${leads.length} leads.`);

        if (leads.length === 0) {
            console.log("No leads found for this colid. Exiting.");
            process.exit(0);
        }

        console.log("Processing data for Excel...");
        const data = leads.map(lead => {
            const row = { ...lead };

            // Cleanup Mongoose fields
            delete row._id;
            delete row.__v;

            // Flatten custom fields if they exist
            if (lead.custom_fields && Array.isArray(lead.custom_fields)) {
                lead.custom_fields.forEach(f => {
                    if (f.field_name) {
                        row[f.field_name] = f.field_value;
                    }
                });
                delete row.custom_fields;
            }

            // Cleanup other complex fields if necessary
            if (lead.documents_uploaded) delete row.documents_uploaded;

            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Leads_${filterColid}`);

        const fileName = `Leads_Export_${filterColid}_${new Date().toISOString().split('T')[0]}.xlsx`;
        const filePath = path.join(__dirname, fileName);
        XLSX.writeFile(workbook, filePath);

        console.log(`\nSuccess! Exported ${leads.length} leads to:`);
        console.log(filePath);

        process.exit(0);
    } catch (err) {
        console.error("\nAn error occurred during export:");
        console.error(err);
        process.exit(1);
    }
}

exportLeads();
