const HostelStudRemarks = require('../Models/hostelstudremarksds');

// Create a new remark
exports.createRemark = async (req, res) => {
    try {
        const { name, user, colid, student, regno, remarks, isredflag } = req.body;
        
        if (!name || !user || !colid) {
            return res.status(400).json({ message: "Required fields missing (name, user, colid)" });
        }

        const newRemark = await HostelStudRemarks.create({
            name,
            user,
            colid,
            student,
            regno,
            remarks,
            isredflag: isredflag || false
        });

        res.status(201).json({
            message: "Remark added successfully",
            data: newRemark
        });
    } catch (error) {
        res.status(500).json({
            message: "Error creating remark",
            error: error.message
        });
    }
};

// Get remarks for a specific student (by regno)
exports.getStudentRemarks = async (req, res) => {
    try {
        const { regno, colid } = req.query;
        if (!regno || !colid) {
            return res.status(400).json({ message: "Registration number and College ID are required" });
        }

        const remarks = await HostelStudRemarks.find({ regno, colid }).sort({ _id: -1 });

        res.status(200).json({
            data: remarks
        });
    } catch (error) {
        res.status(500).json({
            message: "Error fetching remarks",
            error: error.message
        });
    }
};

// Update a remark
exports.updateRemark = async (req, res) => {
    try {
        const { id } = req.params;
        const { colid, ...updateData } = req.body;

        if (!colid) {
            return res.status(400).json({ message: "College ID is required for security" });
        }

        const updatedRemark = await HostelStudRemarks.findOneAndUpdate(
            { _id: id, colid: colid },
            updateData,
            { new: true }
        );

        if (!updatedRemark) {
            return res.status(404).json({ message: "Remark not found or unauthorized" });
        }

        res.status(200).json({
            message: "Remark updated successfully",
            data: updatedRemark
        });
    } catch (error) {
        res.status(500).json({
            message: "Error updating remark",
            error: error.message
        });
    }
};

// Delete a remark
exports.deleteRemark = async (req, res) => {
    try {
        const { id, colid } = req.body;
        if (!id || !colid) {
            return res.status(400).json({ message: "Remark ID and College ID are required" });
        }

        const deletedRemark = await HostelStudRemarks.findOneAndDelete({ _id: id, colid: colid });

        if (!deletedRemark) {
            return res.status(404).json({ message: "Remark not found or unauthorized" });
        }

        res.status(200).json({
            message: "Remark deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            message: "Error deleting remark",
            error: error.message
        });
    }
};
