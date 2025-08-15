const {model, Schema, Types} = require('mongoose');

let TempModSchema = new Schema({
    Guild: String,
    muteRole: Schema.Types.Mixed,
    tempMutes: [{
        id: String,
        duration: Number
    }],
    tempBans: [{
        id: String,
        duration: Number
    }]
});

module.exports = model("TempMod", TempModSchema);