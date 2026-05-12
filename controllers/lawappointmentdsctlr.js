const lawappointmentds = require("../Models/lawappointmentds");

exports.createlawappointmentds = async (req, res) => {
    try {
        const { colid, name, caseno, date, thingstodo, deliverydate, lawclerkid, lawclerkname, lawclerkemail, lawclerkphone, createdby } = req.body;

        const newAppointment = new lawappointmentds({
            colid,
            userid: req.body.userid,
            useremail: req.body.useremail,
            name,
            caseno,
            date,
            thingstodo,
            deliverydate,
            lawclerkid,
            lawclerkname,
            lawclerkemail,
            lawclerkphone
        });

        await newAppointment.save();
        res.status(201).json({ success: true, message: "Appointment created successfully", data: newAppointment });
    } catch (error) {
        console.error("Error creating appointment:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

exports.getalllawappointmentds = async (req, res) => {
    try {
        const { colid, useremail, userrole } = req.query;

        let query = { colid, isactive: true };

        // Role-based filtering
        if (userrole !== 'Sr. Lawyer') {
            query.useremail = useremail;
        }

        const appointments = await lawappointmentds.find(query).sort({ date: -1 });
        res.status(200).json({ success: true, data: appointments });
    } catch (error) {
        console.error("Error fetching appointments:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

exports.getlawappointmentdsbyid = async (req, res) => {
    try {
        const { id } = req.query;
        const appointment = await lawappointmentds.findById(id);

        if (!appointment) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }

        res.status(200).json({ success: true, data: appointment });
    } catch (error) {
        console.error("Error fetching appointment:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

exports.updatelawappointmentds = async (req, res) => {
    try {
        const { id, name, caseno, date, thingstodo, deliverydate, lawclerkid, lawclerkname, lawclerkemail, lawclerkphone } = req.body;

        const updatedAppointment = await lawappointmentds.findByIdAndUpdate(
            id,
            { name, caseno, date, thingstodo, deliverydate, lawclerkid, lawclerkname, lawclerkemail, lawclerkphone },
            { new: true }
        );

        if (!updatedAppointment) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }

        res.status(200).json({ success: true, message: "Appointment updated successfully", data: updatedAppointment });
    } catch (error) {
        console.error("Error updating appointment:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

exports.deletelawappointmentds = async (req, res) => {
    try {
        const { id } = req.query;

        const deletedAppointment = await lawappointmentds.findByIdAndUpdate(
            id,
            { isactive: false },
            { new: true }
        );

        if (!deletedAppointment) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }

        res.status(200).json({ success: true, message: "Appointment deleted successfully" });
    } catch (error) {
        console.error("Error deleting appointment:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
