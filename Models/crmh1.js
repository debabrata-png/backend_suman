const mongoose=require('mongoose');

const crmh1schema = new mongoose.Schema({
    name: {
        type: String,
        required: [true,'Please enter name']
    },
    user: {
        type: String,
        required: [true,'Please enter user'],
        unique: false
    },
    colid: {
        type: Number,
        required: [true,'Please enter colid']
    },
    lead: {
type: String
},
company: {
type: String
},
designation: {
type: String
},
phone: {
type: String
},
email: {
type: String
},
address: {
type: String
},
city: {
type: String
},
state: {
type: String
},
country: {
type: String
},
pin: {
type: String
},
source: {
type: String
},
sourceemp: {
type: String
},
assignedto: {
type: String
},
assigneddate: {
type: Date
},
followupdate: {
type: Date
},
fcomments: {
type: String
},
leadstatus: {
type: String
},
year: {
type: String
},
product: {
type: String
},
amount: {
type: Number
},
leadtype: {
type: String
},
status1: {
        type: String
    },
    comments: {
        type: String
    }
})
//
const crmh1=mongoose.model('crmh1',crmh1schema);

module.exports=crmh1;

