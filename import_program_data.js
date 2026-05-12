const mongoose = require('mongoose');
const readXlsxFile = require('read-excel-file/node');
const programmasterds = require('./Models/programmasterds'); // Adjust path as needed
const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('DB connection successful!');
    importData();
}).catch(err => {
    console.error('DB connection error:', err);
});

async function importData() {
    try {
        const schema = {
            'colid': { prop: 'colid', type: Number, required: true },
            'category': { prop: 'category', type: String, required: true },
            'course_code': { prop: 'course_code', type: String, required: true },
            'course_name': { prop: 'course_name', type: String, required: true },
            'institution': { prop: 'institution', type: String },
            'program_type': { prop: 'program_type', type: String },
            'duration': { prop: 'duration', type: String },
            'eligibility': { prop: 'eligibility', type: String },
            'total_fee': { prop: 'total_fee', type: Number },
            'application_fee': { prop: 'application_fee', type: Number },
            'first_installment': { prop: 'first_installment', type: Number },
            'installments': { prop: 'installments', type: Number },
            'brochure_url': { prop: 'brochure_url', type: String },
            'syllabus_url': { prop: 'syllabus_url', type: String },
            'placement_highlights': { prop: 'placement_highlights', type: String },
            'faculty_info': { prop: 'faculty_info', type: String },
            'accreditation': { prop: 'accreditation', type: String },
            'is_active': { prop: 'is_active', type: String },
            'created_by': { prop: 'created_by', type: String }
        };

        const filePath = process.argv[2] || 'Program_Master_Template.xlsx';
        const rows = await readXlsxFile(filePath, { schema });

        const programs = rows.rows;
        if (programs.length === 0) {
            console.log('No data found in Excel file.');
            process.exit();
        }

        console.log(`Found ${programs.length} records. Importing...`);

        for (const program of programs) {
            // Construct fee_structure object
            program.fee_structure = {
                total_fee: program.total_fee,
                application_fee: program.application_fee,
                first_installment: program.first_installment,
                installments: program.installments
            };

            // // Remove flat fee fields to avoid schema error (if schema is strict)
            // delete program.total_fee;
            // delete program.application_fee;
            // delete program.first_installment;
            // delete program.installments;

            // Update if exists (by course_code), else insert
            await programmasterds.findOneAndUpdate(
                { course_code: program.course_code },
                program,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            console.log(`Processed: ${program.course_code} - ${program.course_name}`);
        }

        console.log('Data import completed successfully.');
        process.exit();
    } catch (error) {
        console.error('Error importing data:', error);
        process.exit(1);
    }
}
