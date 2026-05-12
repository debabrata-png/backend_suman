const Admission = require("./../Models/pucAdmissionModel");

exports.createAdmission = async(req,res)=>{

try{

const data = new Admission(req.body);

await data.save();

res.json({
success:true,
message:"Admission saved"
});

}catch(err){
res.status(500).json({error:err.message});
}

};

exports.getPucAdmissionById = async(req,res)=>{
    try{
        const { colid } = req.query;
        const data = await Admission.findOne({ _id: req.params.id, colid });
        if(!data) return res.status(404).json({success:false, message:"Admission record not found"});
        res.json({success:true, data});
    }catch(err){
        res.status(500).json({error:err.message});
    }
};

exports.updatePucAdmissionStatus = async(req,res)=>{
    const { id } = req.params;
    const { status, colid } = req.body;
    try{
        const data = await Admission.findOneAndUpdate({ _id: id, colid }, {status}, {new:true});
        if(!data) return res.status(404).json({success:false, message:"Admission record not found"});
        res.json({success:true, message:"Status updated", data});
    }catch(err){
        res.status(500).json({error:err.message});
    }
};

exports.getAdmissions = async(req,res)=>{

try{

const {colid} = req.query;

const data = await Admission.find({colid}).sort({createdAt:-1});

res.json({ success: true, data });

}catch(err){
res.status(500).json({error:err.message});
}

};