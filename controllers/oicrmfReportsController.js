const Crm = require('./../Models/crmh1')
const ExcelJS = require('exceljs')


exports.oicrmfGetReports = async (req,res)=>{

try{

const {colid,source,counsellor} = req.query

let filter = { colid:Number(colid) }

if(source) filter.source = source
if(counsellor) filter.assignedto = counsellor


const pipelineSummary = await Crm.aggregate([

{ $match: filter },

{
$group:{
_id:"$pipeline_stage",
total:{ $sum:1 }
}
},

{ $sort:{ total:-1 } }

])


const temperatureSummary = await Crm.aggregate([

{ $match: filter },

{
$group:{
_id:"$lead_temperature",
total:{ $sum:1 }
}
}

])


const details = await Crm.find(filter)


res.json({
pipelineSummary,
temperatureSummary,
details
})

}
catch(err){

res.status(500).json({error:err.message})

}

}




exports.oicrmfExportExcel = async (req,res)=>{

const {colid,source,counsellor} = req.query

let filter = { colid:Number(colid) }

if(source) filter.source = source
if(counsellor) filter.assignedto = counsellor

const leads = await Crm.find(filter)

const workbook = new ExcelJS.Workbook()
const sheet = workbook.addWorksheet("OICRMF Report")

sheet.addRow(["OICRMF Report"])
sheet.addRow(["Generated On", new Date().toLocaleString("en-IN")])
sheet.addRow(["College ID", colid || "All"])
sheet.addRow(["Source", source || "All"])
sheet.addRow(["Counsellor", counsellor || "All"])
sheet.addRow([])

sheet.columns = [

{key:'name',width:20},
{key:'phone',width:15},
{key:'source',width:15},
{key:'assignedto',width:20},
{key:'pipeline_stage',width:20},
{key:'lead_temperature',width:15}

]

sheet.addRow({
name: "Name",
phone: "Phone",
source: "Source",
assignedto: "Counsellor",
pipeline_stage: "Pipeline Stage",
lead_temperature: "Temperature"
})

leads.forEach(l=>{
sheet.addRow(l)
})

sheet.addRow({
name: `Total Leads: ${leads.length}`,
phone: "",
source: "",
assignedto: "",
pipeline_stage: "",
lead_temperature: ""
})

res.setHeader(
'Content-Type',
'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
)

res.setHeader(
'Content-Disposition',
'attachment; filename=oicrmf_report.xlsx'
)

await workbook.xlsx.write(res)

res.end()

}
