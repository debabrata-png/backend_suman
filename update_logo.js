const mongoose = require('mongoose');
const Institution = require('./Models/institutions');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE2;

mongoose.connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('DB connection successful!');
    updateLogo();
}).catch(err => {
    console.log('DB connection failed:', err);
});

async function updateLogo() {
    try {
        const colid = 9050;
        const newLogoUrl = 'https://eequeuestorage.blob.core.windows.net/staticfiles/jguni2/ee-form-widget/form-1/loginlogo.png';

        const updatedInstitution = await Institution.findOneAndUpdate(
            { admincolid: colid },
            { logo: newLogoUrl },
            { new: true, runValidators: true }
        );

        if (updatedInstitution) {
            console.log('Successfully updated logo for institution with colid 9050:');
            console.log('Institution Name:', updatedInstitution.institutionname);
            console.log('New Logo URL:', updatedInstitution.logo);
        } else {
            console.log('No institution found with admincolid 9050.');
        }

        mongoose.connection.close();
    } catch (err) {
        console.error('Error updating logo:', err);
        mongoose.connection.close();
    }
}
