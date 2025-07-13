const mongoose = require('mongoose');
const config = require('../config.json');

module.exports = {
    name: "ready",

    async execute(client) {
        try {
            await mongoose.connect(config.mongodb || '', {
                dbName: 'test',
                serverSelectionTimeoutMS: 5000,
            });

            console.log('MongoDB connected!');
        } catch (e) {
            console.error('MongoDB connection error:', error);
        };

        console.log(`${client.user.tag} is now online!`)
    }
};