import mongoose from "mongoose";

const { Schema } = mongoose;

const RecordSchema = new Schema({
    record_id: Number,
    record_ref: String,
    patient_id:String,
    patientId: {
        type: Schema.Types.ObjectId,
        ref: "Patient",
    },
    record_date: String,
    history: String,
    other: String,
    lids_re: String,
    lids_le: String,
    conj_re: String,
    conj_le: String,
    corn_re: String,
    corn_le: String,
    ac_re: String,
    ac_le: String,
    pup_re: String,
    pup_le: String,
    lens_re: String,
    lens_le: String,
    vitr_re: String,
    vitr_le: String,
    fund_re: String,
    fund_le: String,
    mac_re: String,
    mac_le: String,
    cd_re: String,
    cd_le: String,
    extra: String,
    re_va: String,
    le_va: String,
    ref_re: String,
    ref_le: String,
    re_exitva: String,
    le_exitva: String,
    near_add: String,
    near_va: String,
    pd: String,
    new: String,
    specs: String,
    imp: String,
    mgt: String,
    rx: String,
}, { timestamps: true });



const Record = mongoose.models.Record || mongoose.model("Record", RecordSchema);

export default Record;
