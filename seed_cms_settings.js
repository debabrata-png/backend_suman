const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Settings = require('./Models/websettingsds');

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE2;
const COL_ID = 30;

const settingsData = {
    colid: COL_ID,
    branding: {
        site_name: "IET-DAVV",
        primary_color: "#002147",
        secondary_color: "#f59e0b",
        logo_url: "img/Logo/1.jpg",
        favicon_url: "img/favicon.png"
    },
    navbar: {
        links: [
            { label: "Home", slug: "home", is_external: false },
            { label: "Admissions", slug: "admissions", is_external: false },
            { 
                label: "Academics", 
                slug: "#", 
                is_external: false,
                sub_links: [
                    { label: "Departments", slug: "departments", is_external: false },
                    { label: "Curriculum", slug: "curriculum", is_external: false }
                ]
            },
            { label: "Faculty", slug: "faculty", is_external: false },
            { label: "Placements", slug: "placements", is_external: false }
        ],
        cta_button: {
            label: "APPLY NOW",
            slug: "admissions"
        }
    },
    footer: {
        columns: [
            {
                title: "Important Links",
                links: [
                    { label: "Devi Ahilya Vishwavidyalaya", slug: "https://www.dauniv.ac.in/", is_external: true },
                    { label: "AICTE", slug: "https://www.aicte-india.org/", is_external: true },
                    { label: "Directorate of Technical Education", slug: "https://www.dtempoc.org/", is_external: true },
                    { label: "University Grants Commission", slug: "https://www.ugc.gov.in/", is_external: true },
                    { label: "Samarth", slug: "https://samarth.edu.in/", is_external: true },
                    { label: "Mandatory Disclosure", slug: "disclosure", is_external: false }
                ]
            },
            {
                title: "Quick Findings",
                links: [
                    { label: "Anti Ragging Committee", slug: "anti-ragging", is_external: false },
                    { label: "TEQIP", slug: "teqip", is_external: false },
                    { label: "Grievance", slug: "grievance", is_external: false },
                    { label: "AICTE Feedback", slug: "aicte-feedback", is_external: true },
                    { label: "IPR Cell", slug: "ipr-cell", is_external: false },
                    { label: "Student Feedback", slug: "feedback", is_external: false }
                ]
            }
        ],
        social_links: {
            facebook: "https://facebook.com/ietdavv",
            twitter: "https://twitter.com/ietdavv",
            instagram: "https://instagram.com/ietdavv",
            linkedin: "https://linkedin.com/school/ietdavv"
        },
        contact_info: {
            address: "Institute of Engineering & Technology, Vikramshila Parisar, Devi Ahilya Vishwavidyalaya, Khandwa Road Indore-452017 (M.P.)",
            phone: "+91 731 2361116",
            email: "ao@ietdavv.edu.in"
        },
        copyright_text: "2026-27 IET-DAVV. All rights reserved."
    }
};

async function seedSettings() {
    try {
        await mongoose.connect(DB);
        console.log("Connected to database...");

        await Settings.findOneAndDelete({ colid: COL_ID });
        await Settings.create(settingsData);

        console.log("Successfully seeded Global Settings (Navbar/Footer) for IET-DAVV.");
        process.exit();
    } catch (err) {
        console.error("Error seeding settings:", err);
        process.exit(1);
    }
}

seedSettings();
