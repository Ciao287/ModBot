const mongoose = require('mongoose');
const config = require('../config.json');
const { PermissionFlagsBits, DiscordAPIError } = require('discord.js');
const TempModSchema = require('../Models/TempMod.js');

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

        const guilds = await TempModSchema.find({});
        setInterval(async () => {
            for (const guild of guilds) {
                const gid = client.guilds.cache.get(guild.Guild);
                if (gid) {
                    if (gid.members.cache.get(client.user.id).permissions.has(PermissionFlagsBits.ManageRoles)) {
                        if (guild.muteRole) {
                            const rid = gid.roles.cache.get(guild.muteRole)
                            if (rid) {
                                if (!rid.managed || rid.id !== gid.roles.everyone.id) {
                                    for (const mutedUser of guild.tempMutes) {
                                        const uid = gid.members.cache.get(mutedUser.id);
                                        if (uid) {
                                            if (mutedUser.duration) {
                                                if (mutedUser.duration < Date.now()) {
                                                    uid.roles.remove(rid, "Mute expired").catch(error => {
                                                        if (!((error instanceof DiscordAPIError && error.code === 10011) || (error instanceof DiscordAPIError && error.code === 10007) || (error instanceof DiscordAPIError && error.code === 50013))) { console.error(error) };
                                                    }).then(async () => {
                                                        guild.tempMutes = guild.tempMutes.filter(obj => obj !== mutedUser);
                                                        await guild.save();
                                                    });
                                                };
                                            };
                                        } else {
                                            guild.tempMutes.splice(mutedUser, 1);
                                            await guild.save();
                                        };
                                    };
                                } else {
                                    guild.muteRole = false;
                                    if (guild.tempMutes.length !== 0) guild.tempMutes.length = 0;
                                    await guild.save();
                                };
                            } else {
                                guild.muteRole = false;
                                if (guild.tempMutes.length !== 0) guild.tempMutes.length = 0;
                                await guild.save();
                            };
                        } else {
                            if (guild.tempMutes.length !== 0) guild.tempMutes.length = 0;
                            await guild.save();
                        };
                    };
                    if (gid.members.cache.get(client.user.id).permissions.has(PermissionFlagsBits.BanMembers)) {
                        for (const bannedUser of guild.tempBans) {
                            if (bannedUser.duration < Date.now()) {
                                await gid.members.unban(bannedUser.id, "Ban expired");
                                guild.tempBans = guild.tempBans.filter(obj !== bannedUser);
                                await guild.save();
                            };
                        };
                    };
                } else { await TempModSchema.deleteOne({ _id: guild._id }); };
            };
        }, 5 * 60 * 1000);
    }
};