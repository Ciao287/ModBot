const { model, Schema } = require('mongoose');

let TempModSchema = new Schema({
    Guild: { type: String, required: true },
    muteRole: { type: Schema.Types.Mixed, required: true },
    tempMutes: [{
        id: { type: String, required: true },
        duration: { type: Number, required: true }
    }],
    tempBans: [{
        id: { type: String, required: true },
        duration: { type: Number, required: true }
    }]
});

module.exports = model("TempMod", TempModSchema);