async function saveTempMods(client, TempModSchema) {
	console.log(client.tempMods.mutes, client.tempMods.bans)
    for (const mute of client.tempMods.mutes) {
		const { guildId, userId, duration } = mute;
		const g = await TempModSchema.findOne({ Guild: guildId });
        if (g) {
            const s = client.guilds.cache.get(guildId);
            if (s) {
                if (g.tempMutes) {
                    if (g.muteRole) {
                        const sm = s.roles.cache.get(g.muteRole);
                        if (sm) {
                            const u = s.members.cache.get(userId);
                            const UserInData = g.tempMutes.find(user => user.id === userId);
                            if (UserInData) {
                                if (u) { UserInData.duration = duration; } else { g.tempMutes.splice(UserInData, 1) };
                                await g.save();
                            } else {
                                if (u) {
                                    g.tempMutes.push({
                                        id: userId,
                                        duration: duration
                                    });
                                    await g.save();
                                };
                            };
                        } else {
                            g.muteRole = false;
                            if (g.tempMutes.length !== 0) g.tempMutes.length = 0;
                            await g.save();
                        };
                    } else {
                        if (g.tempMutes.length !== 0) g.tempMutes.length = 0;
                        await g.save();
                    };
                };
                if (g.tempBans) {
                    const UserInData = g.tempBans.find(user => user.id === userId);
                    if (UserInData) {
                        UserInData.duration = duration;
                        await g.save();
                    } else {
                        g.tempBans.push({
                            id: userId,
                            duration: duration
                        });
                        await g.save();
                    };
                };
                if (!g.muteRole && g.tempBans.length === 0) await TempModSchema.deleteOne({ _id: g._id });
            } else { await TempModSchema.deleteOne({ _id: g._id }); };
        };
	};
	console.log("Data saved successfully!");
}

module.exports = { saveTempMods };