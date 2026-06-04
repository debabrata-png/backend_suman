const storerequisationds2 = require("../Models/storerequisationds2");
const storepoorderds2 = require("../Models/storepoorderds2");
const storepoitemsds2 = require("../Models/storepoitemsds2");
const prassigneds2 = require("../Models/prassigneds2");

const toNumber = (value) => Number(value || 0);

const asDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const endOfDay = (value) => {
  const date = asDate(value);
  if (!date) return null;
  date.setHours(23, 59, 59, 999);
  return date;
};

const monthBounds = (month) => {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return {};
  const [year, monthIndex] = month.split("-").map(Number);
  const start = new Date(year, monthIndex - 1, 1);
  const end = new Date(year, monthIndex, 0, 23, 59, 59, 999);
  return { start, end };
};

const labelDate = (date, groupBy) => {
  const safeDate = asDate(date);
  if (!safeDate) return "Not dated";
  if (groupBy === "monthly") {
    return `${safeDate.getFullYear()}-${String(safeDate.getMonth() + 1).padStart(2, "0")}`;
  }
  return safeDate.toISOString().slice(0, 10);
};

const addCount = (map, key, amount = 1) => {
  const safeKey = key || "Not specified";
  map.set(safeKey, (map.get(safeKey) || 0) + amount);
};

const toChart = (map, valueKey = "count") =>
  Array.from(map.entries()).map(([name, value]) => ({ name, [valueKey]: value }));

const buildFilter = (query, dateField) => {
  const { colid, fromDate, toDate, month, status, storeid, createdBy, vendor } = query;
  const filter = {};

  if (colid) filter.colid = Number(colid);

  const monthRange = monthBounds(month);
  const start = asDate(fromDate) || monthRange.start;
  const end = endOfDay(toDate) || monthRange.end;
  if (start || end) {
    filter[dateField] = {};
    if (start) filter[dateField].$gte = start;
    if (end) filter[dateField].$lte = end;
  }

  if (storeid) filter.storeid = storeid;
  if (createdBy) filter.user = createdBy;
  if (vendor) filter.vendor = vendor;
  if (status) {
    if (dateField === "reqdate") filter.reqstatus = status;
    else filter.postatus = status;
  }

  return filter;
};

exports.getPRReportds2 = async (req, res) => {
  try {
    const groupBy = req.query.groupBy === "monthly" ? "monthly" : "daily";
    const filter = buildFilter(req.query, "reqdate");

    let rows = await storerequisationds2.find(filter).sort({ reqdate: -1 }).lean();
    const assignmentRows = await prassigneds2
      .find({ storereqid: { $in: rows.map((row) => String(row._id)) } })
      .sort({ updatedAt: -1 })
      .lean();

    const assignmentByReq = new Map();
    assignmentRows.forEach((assignment) => {
      if (!assignmentByReq.has(String(assignment.storereqid))) {
        assignmentByReq.set(String(assignment.storereqid), assignment);
      }
    });

    rows = rows.map((row) => {
      const assignment = assignmentByReq.get(String(row._id));
      return {
        ...row,
        assignedTo: row.assignedTo || assignment?.prassigneemail || "",
        assignedToName: row.assignedToName || assignment?.prassignename || "",
        assignedDate: row.assignedDate || assignment?.assignedDate || assignment?.updatedAt || assignment?.createdAt || null,
      };
    });

    if (req.query.assignedTo) {
      const assignedToFilter = String(req.query.assignedTo).toLowerCase();
      rows = rows.filter((row) =>
        String(row.assignedTo || "").toLowerCase() === assignedToFilter ||
        String(row.assignedToName || "").toLowerCase().includes(assignedToFilter)
      );
    }

    const timeline = new Map();
    const status = new Map();
    const assignedTo = new Map();
    const createdBy = new Map();
    const store = new Map();
    const category = new Map();
    const department = new Map();
    let totalQuantity = 0;
    let assignedCount = 0;

    rows.forEach((row) => {
      addCount(timeline, labelDate(row.reqdate, groupBy));
      addCount(status, row.reqstatus);
      addCount(assignedTo, row.assignedToName || row.assignedTo);
      addCount(createdBy, row.name || row.user);
      addCount(store, row.store || row.storeid);
      addCount(category, row.category || row.itemtype);
      addCount(department, row.departmentname);
      totalQuantity += toNumber(row.quantity);
      if (row.assignedTo || row.assignedToName) assignedCount += 1;
    });

    res.status(200).json({
      success: true,
      summary: {
        totalPR: rows.length,
        totalQuantity,
        assignedCount,
        unassignedCount: rows.length - assignedCount,
      },
      charts: {
        timeline: toChart(timeline),
        status: toChart(status),
        assignedTo: toChart(assignedTo),
        createdBy: toChart(createdBy),
        store: toChart(store),
        category: toChart(category),
        department: toChart(department),
      },
      data: rows,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error generating PR report", error: error.message });
  }
};

exports.getPOReportds2 = async (req, res) => {
  try {
    const groupBy = req.query.groupBy === "monthly" ? "monthly" : "daily";
    const filter = buildFilter(req.query, "createdAt");
    const rows = await storepoorderds2.find(filter).sort({ createdAt: -1 }).lean();
    const poIds = rows.map((row) => row.poid).filter(Boolean);
    const itemFilter = { poid: { $in: poIds } };
    if (req.query.colid) itemFilter.colid = Number(req.query.colid);
    const itemRows = await storepoitemsds2.find(itemFilter).lean();

    const itemsByPo = new Map();
    itemRows.forEach((item) => {
      const existing = itemsByPo.get(item.poid) || { itemCount: 0, quantity: 0, amount: 0 };
      existing.itemCount += 1;
      existing.quantity += toNumber(item.quantity);
      existing.amount += toNumber(item.total) || toNumber(item.quantity) * toNumber(item.price);
      itemsByPo.set(item.poid, existing);
    });

    const enrichedRows = rows.map((row) => {
      const itemSummary = itemsByPo.get(row.poid) || { itemCount: 0, quantity: 0, amount: 0 };
      return {
        ...row,
        itemCount: itemSummary.itemCount,
        itemQuantity: itemSummary.quantity,
        itemAmount: itemSummary.amount,
        reportAmount: toNumber(row.netprice) || toNumber(row.actualAmount) || toNumber(row.price) || itemSummary.amount,
      };
    });

    const timeline = new Map();
    const status = new Map();
    const vendor = new Map();
    const createdBy = new Map();
    const store = new Map();
    const department = new Map();
    const poType = new Map();
    let totalAmount = 0;
    let totalItems = 0;
    let totalQuantity = 0;

    enrichedRows.forEach((row) => {
      addCount(timeline, labelDate(row.createdAt || row.updatedate, groupBy), row.reportAmount);
      addCount(status, row.postatus);
      addCount(vendor, row.vendor || row.vendorid);
      addCount(createdBy, row.creatorName || row.name || row.user);
      addCount(store, row.storename || row.storeid);
      addCount(department, row.departmentname);
      addCount(poType, row.poType);
      totalAmount += toNumber(row.reportAmount);
      totalItems += toNumber(row.itemCount);
      totalQuantity += toNumber(row.itemQuantity);
    });

    res.status(200).json({
      success: true,
      summary: {
        totalPO: enrichedRows.length,
        totalAmount,
        totalItems,
        totalQuantity,
      },
      charts: {
        timeline: toChart(timeline, "amount"),
        status: toChart(status),
        vendor: toChart(vendor),
        createdBy: toChart(createdBy),
        store: toChart(store),
        department: toChart(department),
        poType: toChart(poType),
      },
      data: enrichedRows,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error generating PO report", error: error.message });
  }
};
