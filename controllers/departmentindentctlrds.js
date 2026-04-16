const DepartmentIndentds = require('../Models/departmentindentds');
const User = require('../Models/user');
const mongoose = require('mongoose');
const { purchaseRecordLog } = require('./purchaseauditutils');


// Get all indents for a colid
exports.getDepartmentIndentds = async (req, res) => {
    const { colid } = req.body;
    try {
        // Fetch distinct departments from User table
        const distinctDepts = await User.aggregate([
            { $match: { colid: Number(colid) } },
            { $group: { _id: "$department", institution: { $first: "$institution" } } }
        ]);

        // Fetch existing configuration from DepartmentIndentds
        const indents = await DepartmentIndentds.find({ colid: Number(colid) });

        // Merge logic
        const mergedData = distinctDepts.map(dept => {
            const config = indents.find(i => i.departmentname === dept._id);
            return {
                _id: config ? config._id : dept._id, // Use existing ID or department name as temporary ID
                departmentname: dept._id,
                institution: dept.institution,
                isfrozen: config ? config.isfrozen : false,
                colid: Number(colid),
                isNew: !config,
                // Include other fields from config if available (for DepartmentIndent Management page)
                ...(config ? config._doc : {})
            };
        });

        // Add records from DepartmentIndentds that might not be in User table (if any)
        indents.forEach(config => {
            if (!mergedData.find(m => m.departmentname === config.departmentname)) {
                mergedData.push({
                    ...config._doc,
                    isfrozen: config.isfrozen
                });
            }
        });

        res.status(200).json({ success: true, data: mergedData });
    } catch (err) {
        console.error("Error fetching indents:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};


// Create a new indent
exports.createDepartmentIndentds = async (req, res) => {
    try {
        if (req.body.colid) req.body.colid = Number(req.body.colid);
        const newIndent = await DepartmentIndentds.create({
            ...req.body,
            status: req.body.status || 'Pending'
        });
        res.status(201).json({ success: true, data: newIndent });
    } catch (err) {
        console.error("Error creating indent:", err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        if (req.body.colid) {
            purchaseRecordLog({
                username: req.body.username || req.body.name,
                useremail: req.body.useremail || req.body.user,
                action: 'CREATE',
                module: 'MRN_CONFIG',
                colid: req.body.colid,
                details: { department: req.body.departmentname }
            });
        }
    }
};

// Update indent
exports.updateDepartmentIndentds = async (req, res) => {
    const { id, colid, departmentname } = req.body;
    try {
        let updated;
        if (mongoose.Types.ObjectId.isValid(id)) {
            updated = await DepartmentIndentds.findByIdAndUpdate(
                id,
                req.body,
                { new: true }
            );
        } else {
            const deptToUse = departmentname || id;
            updated = await DepartmentIndentds.findOneAndUpdate(
                { departmentname: deptToUse, colid: Number(colid) },
                req.body,
                { new: true, upsert: true }
            );
        }
        if (!updated) return res.status(404).json({ success: false, message: "Record not found" });
        res.status(200).json({ success: true, data: updated });
    } catch (err) {
        console.error("Error updating indent:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    } finally {
        if (colid) {
            purchaseRecordLog({
                username: req.body.username || req.body.name,
                useremail: req.body.useremail || req.body.user,
                action: 'UPDATE',
                module: 'MRN_CONFIG',
                recordid: id,
                colid: colid,
                details: { department: departmentname, body: req.body }
            });
        }
    }
};


// Delete indent
exports.deleteDepartmentIndentds = async (req, res) => {
    const { id } = req.body;
    try {
        let deleted;
        if (mongoose.Types.ObjectId.isValid(id)) {
            deleted = await DepartmentIndentds.findByIdAndDelete(id);
        } else {
            // If it's not a valid ID, it's a virtual record, nothing to delete
            return res.status(200).json({ success: true, message: "Virtual record, no deletion needed" });
        }
        if (!deleted) return res.status(404).json({ success: false, message: "Record not found" });
        res.status(200).json({ success: true, message: "Deleted successfully" });
    } catch (err) {
        console.error("Error deleting indent:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    } finally {
        if (id && req.body.colid) {
            purchaseRecordLog({
                username: req.body.username || req.body.name,
                useremail: req.body.useremail || req.body.user,
                action: 'DELETE',
                module: 'MRN_CONFIG',
                recordid: id,
                colid: req.body.colid,
                details: { id }
            });
        }
    }
};


// Bulk upload
exports.bulkUpload = async (req, res) => {
    const { data, colid, user, name } = req.body;
    if (!data || !Array.isArray(data)) {
        return res.status(400).json({ success: false, message: "Invalid data format" });
    }
    try {
        const formattedData = data.map(item => {
            return {
                ...item,
                colid: Number(colid),
                user: user, // Mandatory: Person uploading the record
                name: name, // Mandatory: Person uploading the record
                status: item.status || 'Active'
            };
        });
        await DepartmentIndentds.insertMany(formattedData);
        res.status(200).json({ success: true, message: "Bulk upload successful" });
    } catch (err) {
        console.error("Error in bulk upload:", err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        if (colid) {
            purchaseRecordLog({
                username: req.body.username || name,
                useremail: req.body.useremail || user,
                action: 'BULK_UPLOAD',
                module: 'MRN_CONFIG',
                colid: colid,
                details: { count: data?.length }
            });
        }
    }
};

// Toggle freeze status for a department
exports.toggleDepartmentFrozen = async (req, res) => {
    const { id, isfrozen, colid, departmentname } = req.body;
    try {
        let updated;
        if (mongoose.Types.ObjectId.isValid(id)) {
            updated = await DepartmentIndentds.findByIdAndUpdate(
                id,
                { isfrozen: isfrozen },
                { new: true }
            );
        } else {
            // If id is not a valid ObjectId, assume it's the department name and use upsert
            const deptToUse = departmentname || id;
            updated = await DepartmentIndentds.findOneAndUpdate(
                { departmentname: deptToUse, colid: Number(colid) },
                { isfrozen: isfrozen },
                { new: true, upsert: true }
            );
        }
        
        if (!updated) return res.status(404).json({ success: false, message: "Record not found" });
        res.status(200).json({ success: true, message: `Department ${isfrozen ? 'frozen' : 'unfrozen'} successfully`, data: updated });
    } catch (err) {
        console.error("Error toggling freeze status:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    } finally {
        if (colid) {
            purchaseRecordLog({
                username: req.body.username || req.body.name,
                useremail: req.body.useremail || req.body.user,
                action: isfrozen ? 'FREEZE' : 'UNFREEZE',
                module: 'MRN_CONFIG',
                recordid: id,
                colid: colid,
                details: { department: departmentname, isfrozen }
            });
        }
    }
};


