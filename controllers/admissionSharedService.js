const User = require('../Models/user');
const Fees = require('../Models/fees');
const Feesprovds = require('../Models/feesprovds');
const Ledgerstud = require('../Models/ledgerstud');
const StudentDocument = require('../Models/studentdocumentds');

const DOCUMENT_LABELS = {
    studentPhoto: 'Student Photo',
    marksheet10: '10th Marksheet',
    marksheet12: '12th Marksheet',
    leavingCertificate: 'Leaving Certificate',
    migrationCertificate: 'Migration Certificate',
    casteCertificate: 'Caste Certificate',
    aadharFront: 'Aadhaar Front',
    aadharBack: 'Aadhaar Back',
    gradSem1: 'Graduation Semester 1',
    gradSem2: 'Graduation Semester 2',
    gradSem3: 'Graduation Semester 3',
    gradSem4: 'Graduation Semester 4',
    gradSem5: 'Graduation Semester 5',
    entranceExamResult: 'Entrance Exam Result',
    ddcetCertificate: 'DDCET Certificate'
};

const normalizeAcademicYear = (year) => {
    if (!year) return new Date().getFullYear().toString();
    return String(year).split('-')[0];
};

const generateRegno = async ({ colid, programcode, admissionyear }) => {
    const year = normalizeAcademicYear(admissionyear).slice(-2);
    const cleanProgram = String(programcode || 'STU').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) || 'STU';
    const prefix = `${cleanProgram}${year}`;
    const lastUser = await User.findOne({
        colid: Number(colid),
        regno: new RegExp(`^${prefix}`)
    }).sort({ regno: -1 });

    let nextNumber = 1;
    if (lastUser?.regno) {
        const suffix = parseInt(lastUser.regno.replace(prefix, ''), 10);
        if (!Number.isNaN(suffix)) nextNumber = suffix + 1;
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

const getFeeModel = (feeType) => (feeType === 'fees' ? Fees : Feesprovds);

const fetchAdmissionFees = async ({ colid, academicyear, programcode, semester, feecategory, feeType }) => {
    const query = { colid: Number(colid) };
    if (academicyear) query.academicyear = academicyear;
    if (programcode) query.programcode = programcode;
    if (semester) query.semester = semester;
    if (feecategory) query.feecategory = feecategory;
    return getFeeModel(feeType).find(query);
};

const createLedgerEntries = async ({ fees, student, colid, concession = 0, feeType }) => {
    let remainingConcession = Number(concession) || 0;
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 1);

    const entries = [];
    for (const fee of fees) {
        const amount = Number(fee.amount) || 0;
        const itemConcession = remainingConcession > 0 ? Math.min(remainingConcession, amount) : 0;
        remainingConcession -= itemConcession;
        const paid = 0;
        const balance = Math.max(0, amount - paid - itemConcession);

        entries.push(await Ledgerstud.create({
            name: student.name,
            user: student.email,
            feegroup: fee.feegroup,
            regno: student.regno,
            student: student.name,
            feeitem: fee.feeeitem,
            amount,
            paid,
            concession: itemConcession,
            balance,
            cash: 0,
            upi: 0,
            cheque: 0,
            card: 0,
            pg: 0,
            neft: 0,
            academicyear: fee.academicyear || student.admissionyear,
            colid: Number(colid),
            classdate: fee.classdate || dueDate,
            duedate: fee.classdate || dueDate,
            status: 'Active',
            programcode: fee.programcode || student.programcode,
            admissionyear: student.admissionyear,
            feecategory: fee.feecategory || '',
            semester: fee.semester || student.semester,
            type: feeType === 'fees' ? 'Fees' : 'Provisional'
        }));
    }
    return entries;
};

const normalizeDocuments = (documents, remarksByName = {}) => {
    if (!documents) return [];

    if (Array.isArray(documents)) {
        return documents
            .filter((doc) => doc?.doclink)
            .map((doc) => ({
                documentname: doc.documentname || doc.name || 'Document',
                doclink: doc.doclink,
                remarks: doc.remarks || remarksByName[doc.documentname] || ''
            }));
    }

    return Object.entries(documents)
        .filter(([, doclink]) => doclink)
        .map(([key, doclink]) => ({
            documentname: DOCUMENT_LABELS[key] || key.replace(/([A-Z])/g, ' $1').trim(),
            doclink,
            remarks: remarksByName[key] || ''
        }));
};

const saveStudentDocuments = async ({ student, colid, documents, remarksByName }) => {
    const docs = normalizeDocuments(documents, remarksByName);
    if (docs.length === 0) return [];

    await StudentDocument.deleteMany({ colid: Number(colid), regno: student.regno });
    return StudentDocument.insertMany(docs.map((doc) => ({
        name: student.name,
        user: student._id,
        colid: Number(colid),
        username: student.email,
        regno: student.regno,
        documentname: doc.documentname,
        doclink: doc.doclink,
        remarks: doc.remarks || ''
    })));
};

const buildStudentPayload = async ({ data, colid }) => {
    const programcode = Array.isArray(data.programcode) ? data.programcode[0] : data.programcode;
    const admissionyear = normalizeAcademicYear(data.admissionyear || data.academicYear);
    const regno = data.regno || await generateRegno({ colid, programcode, admissionyear });
    const permanentAddress = data.permanentAddress || {};
    const correspondenceAddress = data.correspondenceAddress || {};
    const address = data.address || permanentAddress.addressLine1 || correspondenceAddress.addressLine1 || '';
    const city = data.city || permanentAddress.city || correspondenceAddress.city || '';
    const district = data.district || permanentAddress.district || correspondenceAddress.district || '';
    const state = data.state || permanentAddress.state || correspondenceAddress.state || '';
    const pincode = data.pincode || permanentAddress.pincode || correspondenceAddress.pincode || '';
    const country = data.country || data.counteryname || permanentAddress.country || correspondenceAddress.country || '';
    const aadhaar = data.adhaarno || data.aadharNumber || data.aadhaarNumber || data.aadharNo || data.aadhaarNo || '';
    const whatsapp = data.wpno || data.whatsAppNumber || data.whatsappNumber || data.whatsapp || '';

    return {
        name: data.name || data.fullName,
        email: data.email,
        phone: data.phone || data.mobileNo || '0000000000',
        password: data.password || 'Password@123',
        role: 'Student',
        regno,
        program: Array.isArray(data.program) ? data.program.join(', ') : data.program,
        programcode: programcode || (Array.isArray(data.program) ? data.program[0] : data.program) || 'NA',
        admissionyear,
        semester: data.semester || '1',
        section: data.section || 'A',
        gender: data.gender || '',
        department: data.department || (Array.isArray(data.school) ? data.school.join(', ') : data.school) || programcode || 'NA',
        colid: Number(colid),
        status: 1,
        fathername: data.fatherName || '',
        mothername: data.motherName || '',
        dob: data.dob || '',
        category: data.category || '',
        address,
        quota: data.quota || '',
        adhaarno: aadhaar,
        aadharno: aadhaar,
        aadhaarno: aadhaar,
        wpno: whatsapp,
        fathermobile: data.fatherMobile || '',
        fatheremail: data.fatherEmail || '',
        mothermobile: data.motherMobile || '',
        motheremail: data.motherEmail || '',
        guardianname: data.guardianName || '',
        guardianmobile: data.guardianMobile || '',
        guardianemail: data.guardianEmail || '',
        state,
        district,
        city,
        pincode,
        counteryname: country,
        board: data.hscDetails?.board || data.sscDetails?.board || '',
        income: data.familyIncome || '',
        bloodgroup: data.bloodgroup || data.bloodGroup || '',
        abcid: data.abcid || data.abcId || '',
        designation: 'Student',
        academicyear: data.academicYear || admissionyear
    };
};

const createOrGetStudent = async ({ data, colid }) => {
    const existing = await User.findOne({ email: data.email, colid: Number(colid) });
    const studentPayload = await buildStudentPayload({ data, colid });
    if (existing) {
        Object.assign(existing, studentPayload, {
            password: existing.password || studentPayload.password,
            regno: existing.regno || studentPayload.regno
        });
        await existing.save();
        return { user: existing, created: false };
    }

    const user = await User.create(studentPayload);
    return { user, created: true };
};

exports.fetchAdmissionFees = fetchAdmissionFees;
exports.createLedgerEntries = createLedgerEntries;
exports.saveStudentDocuments = saveStudentDocuments;
exports.createOrGetStudent = createOrGetStudent;
exports.generateRegno = generateRegno;
