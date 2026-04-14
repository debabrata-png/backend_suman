const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Webpage = require('./Models/webpagesds');

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE2;
const COL_ID = 30; // Updated colid

const homePageData = {
    colid: COL_ID,
    title: "Home",
    slug: "home",
    status: "published",
    blocks: [
        {
            type: "hero",
            order: 0,
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
                    { label: "Admissions", link: "?colid=30&slug=admissions", color: "#f59e0b" },
                    { label: "Placements", link: "?colid=30&slug=placements", color: "#002147" },
                    { label: "Notices", link: "?colid=30&slug=notices", color: "#00cfd1" }
                ]
            }
        },
        {
            type: "news_list",
            order: 1,
            data: {
                title: "Recent News & Notices"
            }
        },
        {
            type: "tabbed_grid",
            order: 2,
            data: {
                title: "Programs Offered",
                tabs: [
                    {
                        title: "Graduate",
                        cards: [
                            { title: "Mechanical Engineering", imageUrl: "img/Program/1.png", slug: "me-grad" },
                            { title: "Electronics & Telecommunication", imageUrl: "img/Program/2.png", slug: "etc-grad" },
                            { title: "Electronics & Instrumentation", imageUrl: "img/Program/3.png", slug: "ei-grad" }
                        ]
                    },
                    {
                        title: "PostGraduate (MTech)",
                        cards: [
                            { title: "Software Engineering", imageUrl: "img/Program/1.png", slug: "se-pg" },
                            { title: "Information Security", imageUrl: "img/Program/2.png", slug: "is-pg" },
                            { title: "Digital Communication", imageUrl: "img/Program/3.png", slug: "dc-pg" }
                        ]
                    },
                    {
                        title: "PhD",
                        cards: [
                            { title: "Ph.D. in Computer Engineering", imageUrl: "img/Program/1.png", slug: "phd-ce" },
                            { title: "Ph.D. in Mechanical Engineering", imageUrl: "img/Program/2.png", slug: "phd-me" },
                            { title: "Ph.D. in Electronics", imageUrl: "img/Program/3.png", slug: "phd-el" }
                        ]
                    }
                ]
            }
        },
        {
            type: "logo_wall",
            order: 3,
            data: {
                title: "Our Top Recruiters",
                logos: [
                    { imageUrl: "img/elements/1.png", link: "#" },
                    { imageUrl: "img/elements/2.png", link: "#" },
                    { imageUrl: "img/elements/3.png", link: "#" },
                    { imageUrl: "img/elements/4.png", link: "#" },
                    { imageUrl: "img/elements/5.png", link: "#" },
                    { imageUrl: "img/elements/6.png", link: "#" }
                ]
            }
        }
    ],
    seo: {
        meta_title: "IET-DAVV | Institute of Engineering & Technology",
        meta_description: "The official website of Institute of Engineering & Technology (IET), DAVV Indore."
    }
};

async function seedHome() {
    try {
        await mongoose.connect(DB);
        console.log("Connected to database...");

        // Delete all existing pages for this colid
        console.log(`Deleting all existing pages for colid: ${COL_ID}...`);
        await Webpage.deleteMany({ colid: COL_ID });

        // Insert the new home page
        await Webpage.create(homePageData);

        console.log("Successfully cleared previous pages and seeded Home Page with Figma content.");
        process.exit();
    } catch (err) {
        console.error("Error seeding data:", err);
        process.exit(1);
    }
}

seedHome();
