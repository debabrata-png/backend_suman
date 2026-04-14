const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Page = require('./Models/webpagesds');

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE2;
const COL_ID = 30;

const pages = [
    {
        colid: COL_ID,
        title: "Home",
        slug: "home",
        blocks: [
            {
                type: "hero",
                data: {
                    slides: [
                        {
                            title: "INSTITUTE OF ENGINEERING & TECHNOLOGY (IET)",
                            subtitle: "WELCOMING YOU ALL TO THE INSTITUTE OF ENGINEERING & TECHNOLOGY",
                            buttonText: "APPLY NOW",
                            imageUrl: "img/Banners/Image 1.png",
                            link: "/admissions"
                        },
                        {
                            title: "State Government University",
                            subtitle: "A center of excellence in technical education",
                            buttonText: "KNOW MORE",
                            imageUrl: "img/Banners/Image 2.png",
                            link: "/about"
                        }
                    ],
                    quickActions: [
                        { label: "Admissions", link: "admissions", color: "#f59e0b" },
                        { label: "Placements", link: "placements", color: "#002147" },
                        { label: "Notices", link: "notices", color: "#00cfd1" }
                    ]
                }
            },
            {
                type: "news_notices",
                data: {
                    tabs: [
                        {
                            title: "News",
                            items: [
                                { title: "IET-DAVV Admission 2024: Online registrations open for B.Tech through JEE scores.", date: "2024-04-14", time: "10:00 AM", location: "Online Portal" },
                                { title: "Placement Season 2023-24: Highest package of 57 LPA recorded.", date: "2024-04-10", time: "05:00 PM", location: "Placement Cell" }
                            ]
                        },
                        {
                            title: "Notices",
                            items: [
                                { title: "Mid-semester examination schedule for May 2024 declared.", date: "2024-04-12", time: "09:00 AM", location: "Notice Board" },
                                { title: "Holiday Notice: Institute closed on account of Dr. Ambedkar Jayanti.", date: "2024-04-13", time: "All Day", location: "Campus" }
                            ]
                        }
                    ]
                }
            },
            {
                type: "tabbed_grid",
                data: {
                    title: "Programs Offered",
                    tabs: [
                        {
                            title: "Graduate",
                            cards: [
                                { title: "Mechanical Engineering", imageUrl: "img/Program/1.png", slug: "admissions" },
                                { title: "Electronics & Telecommunication", imageUrl: "img/Program/2.png", slug: "admissions" },
                                { title: "Electronics & Instrumentation", imageUrl: "img/Program/3.png", slug: "admissions" }
                            ]
                        }
                    ]
                }
            },
            {
                type: "logo_wall",
                data: {
                    title: "Our Top Recruiters",
                    logos: [
                        { imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/43/LTI_Lets_solve.png", link: "placements" },
                        { imageUrl: "https://upload.wikimedia.org/wikipedia/commons/5/59/ZS_Associates.svg", link: "placements" },
                        { imageUrl: "https://1000logos.net/wp-content/uploads/2016/10/Barclays-Logo-1536x864.png", link: "placements" },
                        { imageUrl: "https://upload.wikimedia.org/wikipedia/commons/5/5a/Logo_Cognizant.png", link: "placements" }
                    ]
                }
            }
        ]
    },
    {
        colid: COL_ID,
        title: "Admissions",
        slug: "admissions",
        blocks: [
            {
                type: "rich_text",
                data: {
                    content: `
                        <h2 style="color:#002147; font-weight:700; margin-bottom:20px;">Admission Process</h2>
                        <p>Admission to the <b>Institute of Engineering & Technology (IET)</b> is highly competitive and primarily based on merit through national and state-level entrance examinations.</p>
                        
                        <div style="background:#f9fafb; padding:25px; border-left:4px solid #f59e0b; margin:20px 0;">
                            <h4 style="color:#002147;">Undergraduate (B.Tech)</h4>
                            <p>Admissions are conducted through the <b>MP DTTE (Directorate of Technical Education, MP)</b> counseling process. Selection is based on the merit of <b>JEE Main</b> scores. Candidates must participate in the online counseling to secure a seat.</p>
                        </div>

                        <div style="background:#f9fafb; padding:25px; border-left:4px solid #002147; margin:20px 0;">
                            <h4 style="color:#002147;">Postgraduate (M.Tech)</h4>
                            <p>Admission is based on <b>GATE</b> scores. Non-GATE candidates may be considered through a departmental entrance test depending on vacancy. We offer specializations in Software Engineering, Information Security, Digital Communication, and more.</p>
                        </div>

                        <div style="background:#f3f4f6; padding:20px; border-radius:8px;">
                            <h4 style="color:#002147;">Required Documents</h4>
                            <ul>
                                <li>Allotment Letter (from MP DTE)</li>
                                <li>JEE Main Score Card / GATE Score Card</li>
                                <li>10th & 12th Marksheets</li>
                                <li>Domicile & Category Certificate (if applicable)</li>
                                <li>Transfer & Migration Certificates</li>
                            </ul>
                        </div>
                    `
                }
            }
        ]
    },
    {
        colid: COL_ID,
        title: "Academics",
        slug: "departments",
        blocks: [
            {
                type: "tabbed_grid",
                data: {
                    title: "Our Departments",
                    tabs: [
                        {
                            title: "Engineering",
                            cards: [
                                { title: "Computer Engineering", imageUrl: "img/Program/1.png", slug: "departments" },
                                { title: "Information Technology", imageUrl: "img/Program/2.png", slug: "departments" },
                                { title: "Mechanical Engineering", imageUrl: "img/Program/3.png", slug: "departments" },
                                { title: "Electronics & Telecommunication", imageUrl: "img/Program/4.png", slug: "departments" }
                            ]
                        },
                        {
                            title: "Applied Sciences",
                            cards: [
                                { title: "Applied Mathematics", imageUrl: "img/Program/1.png", slug: "departments" },
                                { title: "Applied Physics", imageUrl: "img/Program/2.png", slug: "departments" },
                                { title: "Applied Chemistry", imageUrl: "img/Program/3.png", slug: "departments" }
                            ]
                        }
                    ]
                }
            }
        ]
    },
    {
        colid: COL_ID,
        title: "Faculty",
        slug: "faculty",
        blocks: [
            {
                type: "rich_text",
                data: {
                    content: `
                        <h2 style="color:#002147; font-weight:700; text-align:center; margin-bottom:40px;">Faculty Directory</h2>
                        <p style="text-align:center; max-width:800px; margin:0 auto 40px auto;">IET-DAVV prides itself on a team of over <b>100+ highly qualified faculty members</b>, many with PhDs from premier institutes like IITs and NITs. Our faculty are active in research, consultancy, and academic leadership.</p>
                        
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:20px;">
                            <div style="padding:20px; border:1px solid #eee; border-radius:10px; text-align:center;">
                                <h4 style="margin:0;">Dr. Sanjiv Tokekar</h4>
                                <p style="color:#777;">Professor & former Director, E&TC</p>
                            </div>
                            <div style="padding:20px; border:1px solid #eee; border-radius:10px; text-align:center;">
                                <h4 style="margin:0;">Dr. (Mrs.) Vrinda Tokekar</h4>
                                <p style="color:#777;">Professor & Head, IT Department</p>
                            </div>
                            <div style="padding:20px; border:1px solid #eee; border-radius:10px; text-align:center;">
                                <h4 style="margin:0;">Dr. G.L. Prajapati</h4>
                                <p style="margin:0;">Professor & Head, Computer Engg.</p>
                            </div>
                            <div style="padding:20px; border:1px solid #eee; border-radius:10px; text-align:center;">
                                <h4 style="margin:0;">Dr. Ajay Verma</h4>
                                <p style="color:#777;">Professor & Head, E&I Department</p>
                            </div>
                        </div>
                    `
                }
            }
        ]
    },
    {
        colid: COL_ID,
        title: "Placements",
        slug: "placements",
        blocks: [
            {
                type: "hero",
                data: {
                    slides: [{
                        title: "PLACEMENT EXCELLENCE",
                        subtitle: "Achieving record-breaking placements year after year with 50+ LPA highest packages.",
                        buttonText: "VIEW BROCHURE",
                        imageUrl: "img/Banners/Image 2.png",
                        link: "#"
                    }]
                }
            },
            {
                type: "rich_text",
                data: {
                    content: `
                        <div style="display:flex; justify-content:space-around; text-align:center; padding:40px 0; background:#002147; color:white; border-radius:12px; margin:30px 0;">
                            <div><h1 style="color:#f59e0b;">₹57 LPA</h1><p>Highest Package</p></div>
                            <div><h1 style="color:#f59e0b;">8.7 LPA</h1><p>Average Package</p></div>
                            <div><h1 style="color:#f59e0b;">100+</h1><p>Companies Visited</p></div>
                        </div>
                    `
                }
            },
            {
                type: "logo_wall",
                data: {
                    title: "Our Top Recruiters",
                    logos: [
                        { imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/43/LTI_Lets_solve.png", link: "#" },
                        { imageUrl: "https://upload.wikimedia.org/wikipedia/commons/5/59/ZS_Associates.svg", link: "#" },
                        { imageUrl: "https://1000logos.net/wp-content/uploads/2016/10/Barclays-Logo-1536x864.png", link: "#" },
                        { imageUrl: "https://www.kindpng.com/picc/m/715-7154142_capillary-technologies-logo-png-transparent-png.png", link: "#" },
                        { imageUrl: "https://upload.wikimedia.org/wikipedia/commons/8/8d/LG_logo_%282014%29.svg", link: "#" },
                        { imageUrl: "https://logowik.com/content/uploads/images/quantiphi3451.jpg", link: "#" },
                        { imageUrl: "https://upload.wikimedia.org/wikipedia/commons/5/5a/Logo_Cognizant.png?_=20221026073051", link: "#" }
                    ]
                }
            }
        ]
    },
    {
        colid: COL_ID,
        title: "Curriculum",
        slug: "curriculum",
        blocks: [
            {
                type: "rich_text",
                data: {
                    content: `
                        <h2 style="color:#002147; font-weight:700; margin-bottom:20px;">Choice Based Credit System (CBCS)</h2>
                        <p>IET-DAVV has modernized its academic structure by implementing the <b>Choice Based Credit System (CBCS)</b> across all departments. This system provides students with the flexibility to choose from a wide range of elective courses alongside their core subjects.</p>
                        
                        <div style="background:#fff9f0; padding:20px; border-radius:8px; border:1px solid #f59e0b; margin-top:30px;">
                            <h4 style="color:#002147; margin-top:0;">Academic Key Benefits:</h4>
                            <ul style="margin:0;">
                                <li>Interdisciplinary approach to engineering.</li>
                                <li>Credit-based evaluation (Lecture, Tutorial, Practical).</li>
                                <li>Choice of Generic and Discipline-Centric Electives.</li>
                                <li>Standardized grading system for global compatibility.</li>
                            </ul>
                        </div>
                    `
                }
            },
            {
                type: "tabbed_grid",
                data: {
                    title: "Academic Schemes & Syllabus",
                    tabs: [
                        {
                            title: "UG Schemes",
                            cards: [
                                { title: "I Year (All Branches)", imageUrl: "img/Program/1.png", slug: "curriculum" },
                                { title: "CS / IT Schemes", imageUrl: "img/Program/2.png", slug: "curriculum" },
                                { title: "Mechanical / Civil", imageUrl: "img/Program/3.png", slug: "curriculum" }
                            ]
                        },
                        {
                            title: "PG Schemes",
                            cards: [
                                { title: "M.E. Full-Time", imageUrl: "img/Program/4.png", slug: "curriculum" },
                                { title: "M.E. Part-Time", imageUrl: "img/Program/1.png", slug: "curriculum" },
                                { title: "M.Sc. Applied Maths", imageUrl: "img/Program/2.png", slug: "curriculum" }
                            ]
                        },
                        {
                            title: "Doctoral",
                            cards: [
                                { title: "PhD Coursework", imageUrl: "img/Program/3.png", slug: "curriculum" }
                            ]
                        }
                    ]
                }
            }
        ]
    }
];

async function seedCompleteWebsite() {
    try {
        await mongoose.connect(DB);
        console.log("Connected to database...");

        console.log(`Deleting all existing pages for colid: ${COL_ID}...`);
        await Page.deleteMany({ colid: COL_ID });

        console.log("Seeding all institutional pages...");
        await Page.insertMany(pages);

        console.log("Successfully seeded Full Institutional Website content for IET-DAVV.");
        process.exit();
    } catch (err) {
        console.error("Error seeding website:", err);
        process.exit(1);
    }
}

seedCompleteWebsite();
