const MeritList = require('../Models/meritlistds');
const StandardAdmission = require('../Models/standardadmissionds');
const ProgramCounselords = require('../Models/ProgramCounselords');

// ── Generate Merit List ────────────────────────────────────────────────
exports.generateMeritList = async (req, res) => {
    try {
        const { programId, colid, academicYear, tiebreaker, meritListNumber, generatedBy } = req.body;

        if (!programId || !colid || !academicYear) {
            return res.status(400).json({ success: false, message: 'programId, colid, and academicYear are required' });
        }

        const listNumber = meritListNumber || 1;

        // 1. Get program details (for total_seats and program info)
        const program = await ProgramCounselords.findById(programId);
        if (!program) {
            return res.status(404).json({ success: false, message: 'Program not found' });
        }

        const totalSeats = program.total_seats || 0;

        // 2. Find students who already got seats in previous merit lists for this program
        const previousLists = await MeritList.find({
            colid: Number(colid),
            programId: programId,
            academicYear: academicYear,
            meritListNumber: { $lt: listNumber }
        });

        // Collect application IDs of students who already got seats
        const allottedApplicationIds = [];
        for (const list of previousLists) {
            for (const student of list.students) {
                if (student.seatStatus === 'Allotted') {
                    allottedApplicationIds.push(student.applicationId.toString());
                }
            }
        }

        // Count total seats already allotted across previous lists
        const totalAlreadyAllotted = allottedApplicationIds.length;

        // 3. Fetch all submitted/pending applications for this program
        const query = {
            colid: Number(colid),
            programId: programId,
            academicYear: academicYear,
            status: { $in: ['Submitted', 'Pending', 'Draft'] }
        };

        let applications = await StandardAdmission.find(query);

        // 4. Exclude students who already have seats allotted
        if (allottedApplicationIds.length > 0) {
            applications = applications.filter(app => 
                !allottedApplicationIds.includes(app._id.toString())
            );
        }

        if (applications.length === 0) {
            return res.status(200).json({ 
                success: true, 
                message: 'No eligible applicants found for this merit list',
                data: null 
            });
        }

        // 5. Sort by HSC marks (descending), then by tiebreaker
        const sortedApps = applications.sort((a, b) => {
            const scoreA = parseFloat(a.hscDetails?.scoreValue) || 0;
            const scoreB = parseFloat(b.hscDetails?.scoreValue) || 0;

            if (scoreB !== scoreA) {
                return scoreB - scoreA; // Higher marks first
            }

            // Tiebreaker
            if (tiebreaker === 'name') {
                return (a.fullName || '').localeCompare(b.fullName || '');
            } else {
                // Default: applicationDate (earlier submission = higher rank)
                const dateA = new Date(a.applicationDate || a.createdAt);
                const dateB = new Date(b.applicationDate || b.createdAt);
                return dateA - dateB; // Earlier date gets priority
            }
        });

        // 6. Build ranked student list
        const rankedStudents = sortedApps.map((app, index) => ({
            rank: index + 1,
            applicationId: app._id,
            fullName: app.fullName,
            email: app.email,
            mobileNo: app.mobileNo,
            program: app.program,
            scoreValue: parseFloat(app.hscDetails?.scoreValue) || 0,
            scoreType: app.hscDetails?.scoreType || 'Percentage',
            applicationDate: app.applicationDate || app.createdAt,
            seatStatus: 'Pending'
        }));

        // 7. Calculate seats remaining for this round
        const seatsRemaining = Math.max(0, totalSeats - totalAlreadyAllotted);

        // 8. Check if merit list already exists (update) or create new
        let meritList = await MeritList.findOne({
            colid: Number(colid),
            programId: programId,
            academicYear: academicYear,
            meritListNumber: listNumber
        });

        if (meritList) {
            // Update existing
            meritList.students = rankedStudents;
            meritList.totalApplicants = rankedStudents.length;
            meritList.totalSeats = totalSeats;
            meritList.seatsRemaining = seatsRemaining;
            meritList.seatsAllotted = 0;
            meritList.tiebreaker = tiebreaker || 'applicationDate';
            meritList.generatedBy = generatedBy || '';
            meritList.generatedAt = new Date();
            meritList.status = 'Draft';
            await meritList.save();
        } else {
            // Create new
            meritList = await MeritList.create({
                colid: Number(colid),
                programId: programId,
                programName: program.course_name,
                programCode: program.course_code,
                academicYear: academicYear,
                meritListNumber: listNumber,
                totalSeats: totalSeats,
                seatsAllotted: 0,
                seatsRemaining: seatsRemaining,
                totalApplicants: rankedStudents.length,
                tiebreaker: tiebreaker || 'applicationDate',
                rankedBy: 'hscDetails.scoreValue',
                students: rankedStudents,
                generatedBy: generatedBy || '',
                generatedAt: new Date(),
                status: 'Draft'
            });
        }

        res.status(200).json({
            success: true,
            message: `Merit list #${listNumber} generated successfully with ${rankedStudents.length} students`,
            data: meritList
        });

    } catch (err) {
        console.error('Generate Merit List Error:', err);
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: 'A merit list with this configuration already exists. Regenerating...' });
        }
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Get All Merit Lists (summary) ──────────────────────────────────────
exports.getMeritLists = async (req, res) => {
    try {
        const { colid, programId, academicYear } = req.query;

        let query = { colid: Number(colid) };
        if (programId) query.programId = programId;
        if (academicYear) query.academicYear = academicYear;

        const lists = await MeritList.find(query)
            .select('-students') // Don't send full student arrays in summary
            .sort({ meritListNumber: -1, createdAt: -1 });

        res.status(200).json({ success: true, data: lists });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Get Single Merit List (with students) ──────────────────────────────
exports.getMeritListById = async (req, res) => {
    try {
        const { id } = req.params;
        const meritList = await MeritList.findById(id);
        if (!meritList) {
            return res.status(404).json({ success: false, message: 'Merit list not found' });
        }
        res.status(200).json({ success: true, data: meritList });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Allot Seat ─────────────────────────────────────────────────────────
exports.allotSeat = async (req, res) => {
    try {
        const { meritListId, applicationId } = req.body;

        const meritList = await MeritList.findById(meritListId);
        if (!meritList) {
            return res.status(404).json({ success: false, message: 'Merit list not found' });
        }

        const student = meritList.students.find(s => s.applicationId.toString() === applicationId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found in this merit list' });
        }

        if (student.seatStatus === 'Allotted') {
            return res.status(400).json({ success: false, message: 'Seat already allotted to this student' });
        }

        // Check if seats are available
        if (meritList.seatsRemaining <= 0) {
            return res.status(400).json({ success: false, message: 'No seats remaining' });
        }

        student.seatStatus = 'Allotted';
        student.seatStatusUpdatedAt = new Date();
        meritList.seatsAllotted += 1;
        meritList.seatsRemaining = Math.max(0, meritList.totalSeats - (meritList.seatsAllotted + 
            // Count allotted from previous lists
            0 // This is already accounted for in generation
        ));

        await meritList.save();

        // Also update the application status
        await StandardAdmission.findByIdAndUpdate(applicationId, {
            $set: { status: 'Approved', meritListNumber: meritList.meritListNumber }
        });

        res.status(200).json({ success: true, message: 'Seat allotted successfully', data: meritList });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Decline Seat ───────────────────────────────────────────────────────
exports.declineSeat = async (req, res) => {
    try {
        const { meritListId, applicationId } = req.body;

        const meritList = await MeritList.findById(meritListId);
        if (!meritList) {
            return res.status(404).json({ success: false, message: 'Merit list not found' });
        }

        const student = meritList.students.find(s => s.applicationId.toString() === applicationId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found in this merit list' });
        }

        const wasAllotted = student.seatStatus === 'Allotted';

        student.seatStatus = 'Declined';
        student.seatStatusUpdatedAt = new Date();

        if (wasAllotted) {
            meritList.seatsAllotted = Math.max(0, meritList.seatsAllotted - 1);
            meritList.seatsRemaining += 1;
        }

        await meritList.save();

        res.status(200).json({ success: true, message: 'Seat declined', data: meritList });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Publish Merit List ─────────────────────────────────────────────────
exports.publishMeritList = async (req, res) => {
    try {
        const { meritListId } = req.body;

        const meritList = await MeritList.findByIdAndUpdate(meritListId, {
            $set: { status: 'Published' }
        }, { new: true });

        if (!meritList) {
            return res.status(404).json({ success: false, message: 'Merit list not found' });
        }

        res.status(200).json({ success: true, message: 'Merit list published', data: meritList });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Delete Merit List ──────────────────────────────────────────────────
exports.deleteMeritList = async (req, res) => {
    try {
        const { id } = req.params;
        const meritList = await MeritList.findByIdAndDelete(id);
        if (!meritList) {
            return res.status(404).json({ success: false, message: 'Merit list not found' });
        }
        res.status(200).json({ success: true, message: 'Merit list deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
