const { model, Schema } = require('mongoose');

let PrefixSchema = new Schema({
    Guild: { type: String, required: true },
    Prefix: { type: String, required: true, default: '--' }
})

module.exports = model('Prefix', PrefixSchema)