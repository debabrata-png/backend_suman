const ExcelJS = require('exceljs');
const fs = require('fs');

async function generateTemplate() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Program Master Template');

    worksheet.columns = [
        { header: 'colid', key: 'colid', width: 10 },
        { header: 'category', key: 'category', width: 20 }, // Must match categoryds.category_name
        { header: 'course_code', key: 'course_code', width: 15 },
        { header: 'course_name', key: 'course_name', width: 30 },
        { header: 'institution', key: 'institution', width: 25 },
        { header: 'program_type', key: 'program_type', width: 20 }, // e.g., Undergraduate
        { header: 'duration', key: 'duration', width: 15 }, // e.g., 3 Years
        { header: 'eligibility', key: 'eligibility', width: 20 },
        { header: 'total_fee', key: 'total_fee', width: 15 },
        { header: 'application_fee', key: 'application_fee', width: 15 },
        { header: 'first_installment', key: 'first_installment', width: 15 },
        { header: 'installments', key: 'installments', width: 15 }, // Number of installments
        { header: 'brochure_url', key: 'brochure_url', width: 30 },
        { header: 'syllabus_url', key: 'syllabus_url', width: 30 },
        { header: 'placement_highlights', key: 'placement_highlights', width: 30 },
        { header: 'faculty_info', key: 'faculty_info', width: 30 },
        { header: 'accreditation', key: 'accreditation', width: 20 },
        { header: 'is_active', key: 'is_active', width: 10 }, // Yes/No
        { header: 'created_by', key: 'created_by', width: 25 } // Admin email
    ];

    // Add a sample row (optional, can be removed)
    worksheet.addRow({
        colid: 1,
        category: 'Engineering',
        course_code: 'CSE101',
        course_name: 'B.Tech Computer Science',
        institution: 'Main Campus',
        program_type: 'Undergraduate',
        duration: '4 Years',
        eligibility: '12th Science',
        total_fee: 400000,
        application_fee: 1000,
        first_installment: 50000,
        installments: 8,
        brochure_url: 'http://example.com/brochure.pdf',
        syllabus_url: 'http://example.com/syllabus.pdf',
        placement_highlights: '90% placement',
        faculty_info: 'PhD holders',
        accreditation: 'NAAC A+',
        is_active: 'Yes',
        created_by: 'admin@example.com'
    });

    const fileName = 'Program_Master_Template.xlsx';
    await workbook.xlsx.writeFile(fileName);
    console.log(`Template generated: ${fileName}`);
}

generateTemplate().catch(console.error);
