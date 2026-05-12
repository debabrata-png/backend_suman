const ttFaculty = require('../Models/ttFaculty');
const ttSubjectLoad = require('../Models/ttSubjectLoad');
const ttTimeSlot = require('../Models/ttTimeSlot');
const ttTimetable = require('../Models/ttTimetable');

// Add Faculty
exports.ttAddFaculty = async (req, res) => {
  const data = await ttFaculty.create(req.body);
  res.json(data);
};

// Get Faculties
exports.ttGetFaculties = async (req, res) => {
  const { colid } = req.query;
  const data = await ttFaculty.find({ colid });
  res.json(data);
};

// Update Faculty (POST)
exports.ttUpdateFaculty = async (req, res) => {
  const { _id, ...updateData } = req.body;
  const data = await ttFaculty.findByIdAndUpdate(_id, updateData, { new: true });
  res.json(data);
};

// Delete Faculty (GET)
exports.ttDeleteFaculty = async (req, res) => {
  const { id } = req.query;
  await ttFaculty.findByIdAndDelete(id);
  res.json({ message: "Faculty deleted" });
};

// Add Subject Load
exports.ttAddSubjectLoad = async (req, res) => {
  const data = await ttSubjectLoad.create(req.body);
  res.json(data);
};

// Get Subject Loads
exports.ttGetSubjectLoads = async (req, res) => {
  const { colid } = req.query;
  const data = await ttSubjectLoad.find({ colid });
  res.json(data);
};

// Update Subject Load (POST)
exports.ttUpdateSubjectLoad = async (req, res) => {
  const { _id, ...updateData } = req.body;
  const data = await ttSubjectLoad.findByIdAndUpdate(_id, updateData, { new: true });
  res.json(data);
};

// Delete Subject Load (GET)
exports.ttDeleteSubjectLoad = async (req, res) => {
  const { id } = req.query;
  await ttSubjectLoad.findByIdAndDelete(id);
  res.json({ message: "Subject load deleted" });
};

// Add Time Slots (Admin)
exports.ttAddTimeSlot = async (req, res) => {
  const data = await ttTimeSlot.create(req.body);
  res.json(data);
};

// Get Time Slots
exports.ttGetTimeSlots = async (req, res) => {
  const { colid } = req.query;
  const data = await ttTimeSlot.find({ colid });
  res.json(data);
};

// Update Time Slot (POST)
exports.ttUpdateTimeSlot = async (req, res) => {
  const { _id, ...updateData } = req.body;
  const data = await ttTimeSlot.findByIdAndUpdate(_id, updateData, { new: true });
  res.json(data);
};

// Delete Time Slot (GET)
exports.ttDeleteTimeSlot = async (req, res) => {
  const { id } = req.query;
  await ttTimeSlot.findByIdAndDelete(id);
  res.json({ message: "Time slot deleted" });
};

// Generate Timetable
exports.ttGenerateTimetable = async (req, res) => {
  try {

    const { colid } = req.query;

    await ttTimetable.deleteMany({ colid });

    const faculties = await ttFaculty.find({ colid });
    const loads = await ttSubjectLoad.find({ colid });
    const slots = await ttTimeSlot.find({ colid });

    // await ttTimetable.deleteMany({}); 

    // const faculties = await ttFaculty.find();
    // const loads = await ttSubjectLoad.find();
    // const slots = await ttTimeSlot.find();

    let timetable = [];

    for (let load of loads) {
      let faculty = faculties.find(f => f._id == load.facultyId);

      if (!faculty) continue;

      let availableSlots = slots.filter(s =>
        faculty.availableDays.includes(s.day)
      );

      // shuffle slots
      availableSlots = availableSlots.sort(() => Math.random() - 0.5);

      let count = 0;

      for (let slot of availableSlots) {
        if (count >= load.classesPerWeek) break;

        let exists = timetable.find(
          t => t.day === slot.day && t.slotId === slot._id.toString()
        );

        if (!exists) {
          timetable.push({
            colid,
            day: slot.day,
            slotId: slot._id,
            facultyId: faculty._id,
            faculty: faculty.name,
            starttime: slot.startTime,
            endtime: slot.endTime,
            subject: load.subject,
            program: load.program,
            semester: load.semester
          });

          count++;
        }
      }
    }

    await ttTimetable.insertMany(timetable);

    res.json({ message: "Timetable Generated", timetable });

  } catch (err) {
    res.status(500).json(err);
  }
};

// Get Timetable
exports.ttGetTimetable = async (req, res) => {
  const { colid } = req.query;
  // const data = await ttTimetable.find();
  const data = await ttTimetable.find({ colid });
  res.json(data);
};