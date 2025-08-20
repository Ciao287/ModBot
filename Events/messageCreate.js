const { MessageFlags, PermissionsBitField, Colors } = require('discord.js');
const Schema = require('../Models/Prefix.js');
const ms = require('ms');
const TempModSchema = require('../Models/TempMod.js');

module.exports = {
    name: "messageCreate",
    
    async execute(message, client) {
        const { author, channel, content, guild } = message;

        if (!guild || author.bot) return;

        if (guild.members.me.communicationDisabledUntilTimestamp > Date.now()) return;
        
        const prefixSchema = await Schema.findOne({ Guild: guild.id });
        
        const prefix = prefixSchema?.Prefix || '--';

        if (!content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === 'prefix') {
            const member = await guild.members.fetch(author.id)
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
            if (args.length === 0) {
                const msg = await message.reply({ content: `The prefix for chat commands is \`${prefix}\`` });
                await message.delete().catch(e => {});
                setTimeout(() => {
                    msg.delete();
                }, 5000);
                return;
            };

            if(args[0].length > 5 && args[0] !== `<@${client.application.id}>`) {
                const msg = await message.reply({ content: 'The prefix length must be between 1 and 5 characters.' });
                await message.delete().catch(e => {});
                setTimeout(() => {
                    msg.delete();
                }, 5000);
                return;
            };

            if (args[0] == '--') {
                if (prefixSchema) await Schema.deleteOne({ _id: prefixSchema._id });
                const msg = await message.reply({ content: 'You changed the prefix for chat commands to `--`' })
                await message.delete().catch(e => {});
                setTimeout(() => {
                    msg.delete();
                }, 5000);
                return;
            };

            if (prefixSchema) {
                prefixSchema.Prefix = args[0];
                await prefixSchema.save();
                const msg = await message.reply({ content: `You changed the prefix for chat commands to \`${args[0]}\`` })
                await message.delete().catch(e => {});
                setTimeout(() => {
                    msg.delete();
                }, 5000);
                return;
            } else {
                await Schema.create({
                    Guild: guild.id,
                    Prefix: args[0]
                });
                const msg = await message.reply({ content: `You changed the prefix for chat commands to \`${args[0]}\`` })
                await message.delete().catch(e => {});
                setTimeout(() => {
                    msg.delete();
                }, 5000);
                return;
            };
        };

        if (command === 'ping') {
            const member = await guild.members.fetch(author.id)
            if (!member.permissions.has(PermissionsBitField.Flags.UseApplicationCommands)) return;
            const msg = await message.reply({ content: `My ping is ${client.ws.ping}ms!` })
            await message.delete().catch(e => {});
            setTimeout(() => {
                msg.delete();
            }, 5000);
        };

        if (command === 'ban') {
            const member = await guild.members.fetch(author.id)
            if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
            if (!guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) return message.reply({ content: 'I\'m not allowed to ban or unban people!' });
            if (args.length === 0) {
                const msg = await message.reply({ content: 'You must enter the user to ban.' });
                await message.delete().catch(e => {});
                setTimeout(() => {
                    msg.delete();
                }, 5000);
                return;
            };

            let duration = args[1];
            const start = Date.now();
            let convertedDuration = false;
            if (duration) {
                convertedDuration = ms(duration);
                if (!convertedDuration) duration = false;
                if (convertedDuration > 31557600000000) duration = false;
            };

            if (args[0].startsWith('<@')) args[0] = args[0].replace(/[<@>]/g, '');
            let user = false;
            user = await client.users.fetch(args[0]).catch(async () => {
                await guild.members.fetch()
                const newUser = await client.users.cache.find(m => m.tag === args[0]);
                if (!newUser) {
                    const msg = await message.reply({ content: 'I can\'t find the user you specified!' });
                    await message.delete().catch(e => {});
                    setTimeout(() => {
                        msg.delete();
                    }, 5000);
                }
                return newUser;
            });

            if (!user) return;

            try {
                user = await guild.members.fetch(user.id);
                let msgcont;

                if (user.id === client.application.id && !msgcont) msgcont = `I can't ban myself!`;

                if (user.id === member.id && !msgcont) msgcont = `You can't ban yourself!`;
                
                if (user.id === guild.ownerId && !msgcont) msgcont = `You can't ban the server owner!`;

                if (user.roles.highest.position >= member.roles.highest.position && guild.ownerId !== member.id && !msgcont) msgcont = `You can't ban <@${user.id}>! He has a higher or equal role than you.`;

                if (user.roles.highest.position >= guild.members.cache.get(client.user.id).roles.highest.position && !msgcont) msgcont = `I can't ban <@${user.id}>! He has a higher or equal role than me.`;

                if (msgcont) {
                    const msg = await message.reply({ content: msgcont });
                    await message.delete().catch(e => {});
                    setTimeout(() => {
                        msg.delete();
                    }, 5000);
                    return;
                };
            } catch(error) {
                if (error.code !== 10007) console.log(error);
            };

            if (!duration) {
                const schema = await TempModSchema.findOne({Guild: guild.id});
                if (schema) {
                    const bannedUserSchema = schema.tempBans.find(obj => obj.id === user.id);
                    if (bannedUserSchema) schema.tempBans = schema.tempBans.filter(obj => obj !== bannedUserSchema);
                    await schema.save();
                };

                const bannedUser = client.tempMods.bans.find(obj => obj.guildId === guild.id && obj.userId === user.id);
                if (bannedUser) client.tempMods.bans = client.tempMods.bans.filter(obj => obj !== bannedUser);

                const reason = args.slice(1).join(' ') || '';
                
                await guild.members.ban(user.id, {
                    reason: reason,
                    deleteMessageSeconds: 7 * 24 * 60 * 60
                });

                await message.delete().catch(e => {});

                await channel.send({ content: `**${author.tag}** banned <@${user.id}> with reason: ${reason || 'No reason provided'}` });
            } else {
                if (convertedDuration > 60 * 60 * 1000) {
                    let schema = await TempModSchema.findOne({Guild: guild.id});
                    if (!schema) schema = new TempModSchema({
                        Guild: guild.id,
                        muteRole: false,
                        tempMutes: [],
                        tempBans: []
                    });

                    const bannedUser = client.tempMods.bans.find(obj => obj.guildId === guild.id && obj.userId === user.id);
                    if (bannedUser) client.tempMods.bans = client.tempMods.bans.filter(obj => obj !== bannedUser);

                    const bannedUserSchema = schema.tempBans.find(obj => obj.id === user.id);

                    if (!bannedUserSchema) {
                        schema.tempBans.push({
                            id: user.id,
                            duration: start + convertedDuration
                        });
                    } else {
                        bannedUserSchema.duration = start + convertedDuration;
                    };

                    await schema.save();

                    const reason = args.slice(2).join(' ') || '';

                    await guild.members.ban(user.id, {
                        reason: reason,
                    });
                    
                    await message.delete().catch(e => {});

                    await channel.send({ content: `**${author.tag}** banned <@${user.id}> for ${duration} with reason: ${reason || 'No reason provided'}` });
                } else {
                    const schema = await TempModSchema.findOne({Guild: guild.id});
                    if (schema) {
                        const bannedUserSchema = schema.tempBans.find(obj => obj.id === user.id);
                        if (bannedUserSchema) schema.tempBans = schema.tempBans.filter(obj => obj !== bannedUserSchema);
                        await schema.save();
                    };
                    const bannedUser = client.tempMods.bans.find(obj => obj.guildId === guild.id && obj.userId === user.id);

                    if (!bannedUser) {
                        client.tempMods.bans.push({
                            guildId: guild.id,
                            userId: user.id,
                            duration: start + convertedDuration
                        });
                    } else {
                        bannedUser.duration = start + convertedDuration;
                    };

                    const reason = args.slice(2).join(' ') || '';

                    await guild.members.ban(user.id, {
                        reason: reason,
                    });
                    
                    await message.delete().catch(e => {});

                    await channel.send({ content: `**${author.tag}** banned <@${user.id}> for ${duration} with reason: ${reason || 'No reason provided'}` });

                    setTimeout(async () => {
                        const bannedUser2 = client.tempMods.bans.find(obj => obj.guildId === guild.id && obj.userId === user.id && obj.duration === start + convertedDuration);
                        if (bannedUser2) {
                            await guild.members.unban(user.id, "Ban expired");
                            client.tempMods.bans = client.tempMods.bans.filter(obj => obj !== bannedUser2);
                        };
                    }, convertedDuration);
                };
            };
        };

        if (command === 'unban') {
            const member = await guild.members.fetch(author.id)
            if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
            if (!guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) return message.reply({ content: 'I\'m not allowed to ban or unban people!' });
            if (args.length === 0) {
                const msg = await message.reply({ content: 'You must enter the user to unban.' });
                await message.delete().catch(e => {});
                setTimeout(() => {
                    msg.delete();
                }, 5000);
                return;
            };

            if (args[0].startsWith('<@')) args[0] = args[0].replace(/[<@>]/g, '');
            let user = false;
            user = await client.users.fetch(args[0]).catch(async () => {
                await guild.members.fetch()
                const newUser = await client.users.cache.find(m => m.tag === args[0]);
                if (!newUser) {
                    const msg = await message.reply({ content: 'I can\'t find the user you specified!' });
                    await message.delete().catch(e => {});
                    setTimeout(() => {
                        msg.delete();
                    }, 5000);
                }
                return newUser;
            });

            if (!user) return;
            
            const reason = args.slice(1).join(' ') || '';

            const schema = await TempModSchema.findOne({Guild: guild.id});
            if (schema) {
                const bannedUserSchema = schema.tempBans.find(obj => obj.id === user.id);
                if (bannedUserSchema) {
                    schema.tempBans = schema.tempBans.filter(obj => obj !== bannedUserSchema);
                    await schema.save();
                };
            };
            
            const bannedUser = client.tempMods.bans.find(obj => obj.guildId === guild.id && obj.userId === user.id);
            if (bannedUser) client.tempMods.bans = client.tempMods.bans.filter(obj => obj !== bannedUser);

            await guild.members.unban(user.id, reason);

            await message.delete().catch(e => {});

            await channel.send({ content: `**${author.tag}** unbanned <@${user.id}> with reason: ${reason || 'No reason provided'}` });
        };

        if (command === 'unban-all') {
            const member = await guild.members.fetch(author.id)
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
            if (!guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) return message.reply({ content: 'I\'m not allowed to ban or unban people!' });
            const schema = await TempModSchema.findOne({Guild: guild.id});
            if (schema) {
                schema.tempBans.length = 0;
                if (!schema.muteRole && schema.tempBans.length === 0) await TempModSchema.deleteOne({ _id: schema._id });
                else await schema.save();
            };
            
            client.tempMods.bans = client.tempMods.bans.filter(obj => obj.guildId !== guild.id);
            
            const reason = args.join(' ') || '';

            let unbanError = 0;
            const bans = await guild.bans.fetch();
            for (const [userId] of bans) {
                try {
                    await guild.members.unban(userId, reason || "Unban All");
                } catch (error) {
                    if (error.code === 10007) continue;
                    console.log(error);
                    unbanError++;
                };
            };

            let ErrorMessage = "All users have been successfully unbanned.";
            if (unbanError) ErrorMessage = `${unbanError} users were not unbanned.`;

            await message.delete().catch(e => {});
            
            await channel.send({ content: `**${author.tag}** performed an Unban All with reason: ${reason || 'No reason provided'}. ${ErrorMessage}` });
        };

        if (command === 'muterole') {
            const member = await guild.members.fetch(author.id)
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
            if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return message.reply({ content: 'I\'m not allowed to manage roles!' });
            if (args.length === 0) return;
            const type = args[0].toLowerCase();

            if (type === 'setup') {
                let msgcont;
                if (!args[1] && !msgcont) msgcont = 'You must enter the role you want to become the new muteRole.'
                if (args[1]?.startsWith('<@&')) args[1] = args[1].replace(/[<@&>]/g, '');
                const role = guild.roles.cache.get(args[1]);
                if (!role && !msgcont) msgcont = 'The role you specified is invalid.'
                if (role.position >= guild.members.me.roles.highest.position && !msgcont) msgcont = `I'm not allowed to manage this role because it's equal to or higher than my highest role. Please move it below my highest role or adjust my roles.`;
                if (msgcont) {
                    const msg = await message.reply({ content: msgcont });
                    await message.delete().catch(e => {});
                    setTimeout(() => {
                        msg.delete();
                    }, 5000);
                    return;
                };

                let schema = await TempModSchema.findOne({Guild: guild.id});
                let oldMuteRole = false;
                if (!schema) {
                    schema = new TempModSchema({
                        Guild: guild.id,
                        muteRole: role.id,
                        tempMutes: [],
                        tempBans: []
                    });
                } else {
                    oldMuteRole = schema.muteRole;
                    schema.muteRole = role.id;
                };

                await schema.save();

                let muteError = 0;
                await guild.members.fetch();
                for (const member of guild.members.cache.values()) {
                    if (member.roles.cache.has(oldMuteRole)) {
                        try {
                            await member.roles.add(schema.muteRole, "Mute role changed");
                            await member.roles.remove(oldMuteRole, "Mute role changed");
                        } catch (error) {
                            if (error.code === 10007) continue;

                            console.log(error);
                            muteError++;
                        };
                    };
                };

                let ErrorMessage = "All muted users have been converted to the new role.";
                if (muteError)  ErrorMessage = `${muteError} muted users have not been converted to the new role.`;
                
                const msg = await message.reply({ content: `The mute role has been changed from <@&${oldMuteRole}> to <@&${schema.muteRole}>. ${ErrorMessage}` });
                await message.delete().catch(e => {});
                setTimeout(() => {
                    msg.delete();
                }, 5000);
            };

            if (type === 'remove') {
                const schema = await TempModSchema.findOne({Guild: guild.id});
                if (!schema?.muteRole) {
                    const msg = await message.reply({ content: "You have not set a mute role" });
                    await message.delete().catch(e => {});
                    setTimeout(() => {
                        msg.delete();
                    }, 5000);
                    return;
                };

                let oldMuteRole = schema.muteRole;
                schema.muteRole = false;

                let muteError = 0;
                await guild.members.fetch();
                for (const member of guild.members.cache.values()) {
                    if (member.roles.cache.has(oldMuteRole)) {
                        try {
                            await member.roles.remove(oldMuteRole, "Mute role removed");
                        } catch (error) {
                            if (error.code === 10007) continue;

                            console.log(error);
                            muteError++;
                        };
                    };
                };

                schema.tempMutes.length = 0;

                if (!schema.muteRole && schema.tempBans.length === 0) await TempModSchema.deleteOne({ _id: schema._id });
                else await schema.save();
                
                let ErrorMessage = "All muted users have had their mute role removed.";
                if (muteError)  ErrorMessage = `${muteError} muted users did not have their mute role removed.`;

                const msg = await message.reply({ content: `The mute role has been successfully removed. ${ErrorMessage}` });
                await message.delete().catch(e => {});
                setTimeout(() => {
                    msg.delete();
                }, 5000);
            };
        };

        if (command === 'mute') {
            const member = await guild.members.fetch(author.id)
            if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;
            if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return message.reply({ content: 'I\'m not allowed to manage roles!' });
            if (args.length === 0) {
                const msg = await message.reply({ content: 'You must enter the user to mute.' });
                await message.delete().catch(e => {});
                setTimeout(() => {
                    msg.delete();
                }, 5000);
                return;
            };

            let duration = args[1];
            const start = Date.now();
            let convertedDuration = false;
            if (duration) {
                convertedDuration = ms(duration);
                if (!convertedDuration) duration = false;
                if (convertedDuration > 31557600000000) duration = false;
            };

            if (args[0].startsWith('<@')) args[0] = args[0].replace(/[<@>]/g, '');
            let user = false;
            user = await client.users.fetch(args[0]).catch(async () => {
                await guild.members.fetch()
                const newUser = await client.users.cache.find(m => m.tag === args[0]);
                if (!newUser) {
                    const msg = await message.reply({ content: 'I can\'t find the user you specified!' });
                    await message.delete().catch(e => {});
                    setTimeout(() => {
                        msg.delete();
                    }, 5000);
                }
                return newUser;
            });

            if (!user) return;
            try {
                user = await guild.members.fetch(user.id);
                let msgcont;

                if (user.id === client.application.id && !msgcont) msgcont = `I can't mute myself!`;

                if (user.id === member.id && !msgcont) msgcont = `You can't mute yourself!`;

                if (user.roles.highest.position >= member.roles.highest.position && guild.ownerId !== member.id && !msgcont) msgcont = `You can't mute <@${user.id}>! He has a higher or equal role than you.`;
                
                if (msgcont) {
                    const msg = await message.reply({ content: msgcont });
                    await message.delete().catch(e => {});
                    setTimeout(() => {
                        msg.delete();
                    }, 5000);
                    return;
                };
            } catch(error) {
                if(error.code === 10007) {
                    const msg = await message.reply({ content: `The user you specified is not on the server!` });
                    await message.delete().catch(e => {});
                    setTimeout(() => {
                        msg.delete();
                    }, 5000);
                    return;
                } else{ console.log(error); }; 
            };

            let schema = await TempModSchema.findOne({Guild: guild.id});

            if (!schema) {
                schema = new TempModSchema({
                    Guild: guild.id,
                    muteRole: false,
                    tempMutes: [],
                    tempBans: []
                });
            };

            if (!schema.muteRole) {
                let muteRole = guild.roles.cache.find(role => role.name.toLowerCase() === "muted" );

                if (!muteRole) {
                    muteRole = await guild.roles.create({
                        name: 'Muted',
                        color: Colors.Red,
                        permissions: [],
                        reason: `Muterole created.`,
                    });
                    for (const channel of guild.channels.cache.values()) {
                        try {
                            await channel.permissionOverwrites.edit(muteRole.id, {
                                SendMessages: false,
                                Speak: false,
                            });
                        } catch (error) { continue; };
                    };
                };

                schema.muteRole = muteRole.id;
                await schema.save();
            };

            if (!duration) {
                const mutedUserSchema = schema.tempMutes.find(obj => obj.id === user.id);
                if (mutedUserSchema) schema.tempMutes = schema.tempMutes.filter(obj => obj !== mutedUserSchema);
                await schema.save();

                const mutedUser = client.tempMods.mutes.find(obj => obj.guildId === guild.id && obj.userId === user.id);
                if (mutedUser) client.tempMods.mutes = client.tempMods.mutes.filter(obj => obj !== mutedUser);
                
                const reason = args.slice(1).join(' ') || '';
                
                await user.roles.add(schema.muteRole, reason);

                await message.delete().catch(e => {});

                await channel.send({ content: `**${author.tag}** muted <@${user.id}> with reason: ${reason || 'No reason provided'}` });
            } else {
                if (convertedDuration > 60 * 60 * 1000) {
                    const mutedUser = client.tempMods.mutes.find(obj => obj.guildId === guild.id && obj.userId === user.id);
                    if (mutedUser) client.tempMods.mutes = client.tempMods.mutes.filter(obj => obj !== mutedUser);

                    const mutedUserSchema = schema.tempMutes.find(obj => obj.id === user.id);

                    if (!mutedUserSchema) {
                        schema.tempMutes.push({
                            id: user.id,
                            duration: start + convertedDuration
                        });
                    } else {
                        mutedUserSchema.duration = start + convertedDuration;
                    };

                    await schema.save();
                    
                    const reason = args.slice(2).join(' ') || '';

                    await user.roles.add(schema.muteRole, reason);
                    
                    await message.delete().catch(e => {});

                    await channel.send({ content: `**${author.tag}** muted <@${user.id}> for ${duration} with reason: ${reason || 'No reason provided'}` });
                } else {
                    const mutedUserSchema = schema.tempMutes.find(obj => obj.id === user.id);
                    if (mutedUserSchema) {
                        schema.tempMutes = schema.tempMutes.filter(obj => obj !== mutedUserSchema);
                        await schema.save();
                    };
                    const mutedUser = client.tempMods.mutes.find(obj => obj.guildId === guild.id && obj.userId === user.id);

                    if (!mutedUser) {
                        client.tempMods.mutes.push({
                            guildId: guild.id,
                            userId: user.id,
                            duration: start + convertedDuration
                        });
                    } else {
                        mutedUser.duration = start + convertedDuration;
                    };
                    
                    const reason = args.slice(2).join(' ') || '';

                    await user.roles.add(schema.muteRole, reason);

                    await message.delete().catch(e => {});

                    await channel.send({ content: `**${author.tag}** muted <@${user.id}> for ${duration} with reason: ${reason || 'No reason provided'}` });

                    setTimeout(async () => {
                        const mutedUser2 = client.tempMods.mutes.find(obj => obj.guildId === guild.id && obj.userId === user.id && obj.duration === start + convertedDuration);
                        if (mutedUser2) {
                            await user.roles.remove(schema.muteRole, "Mute expired").catch(error => {
                                if (!((error instanceof DiscordAPIError && error.code === 10011) || (error instanceof DiscordAPIError && error.code === 10007) || (error instanceof DiscordAPIError && error.code === 50013))) {
                                    console.error(error)
                                };
                            });
                            client.tempMods.mutes = client.tempMods.mutes.filter(obj => obj !== mutedUser2);
                        };
                    }, convertedDuration);
                };
            };
        };

        if (command === 'unmute') {
            const member = await guild.members.fetch(author.id)
            if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;
            if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return message.reply({ content: 'I\'m not allowed to manage roles!' });
            if (args.length === 0) {
                const msg = await message.reply({ content: 'You must enter the user to unmute.' });
                await message.delete().catch(e => {});
                setTimeout(() => {
                    msg.delete();
                }, 5000);
                return;
            };

            if (args[0].startsWith('<@')) args[0] = args[0].replace(/[<@>]/g, '');
            let user = false;
            user = await client.users.fetch(args[0]).catch(async () => {
                await guild.members.fetch()
                const newUser = await client.users.cache.find(m => m.tag === args[0]);
                if (!newUser) {
                    const msg = await message.reply({ content: 'I can\'t find the user you specified!' });
                    await message.delete().catch(e => {});
                    setTimeout(() => {
                        msg.delete();
                    }, 5000);
                }
                return newUser;
            });

            if (!user) return;
            try {
                user = await guild.members.fetch(user.id);
                
                if (user.roles.highest.position >= member.roles.highest.position && guild.ownerId !== member.id) {
                    const msg = await message.reply({ content: `You can't unmute <@${user.id}>! He has a higher or equal role than you.` });
                    await message.delete().catch(e => {});
                    setTimeout(() => {
                        msg.delete();
                    }, 5000);
                    return;
                };
            } catch(error) {
                if(error.code === 10007) {
                    const msg = await message.reply({ content: `The user you specified is not on the server!` });
                    await message.delete().catch(e => {});
                    setTimeout(() => {
                        msg.delete();
                    }, 5000);
                    return;
                } else{ console.log(error); }; 
            };
            
            const reason = args.slice(1).join(' ') || '';

            let schema = await TempModSchema.findOne({Guild: guild.id});
            if (!schema) {
                schema = new TempModSchema({
                    Guild: guild.id,
                    muteRole: false,
                    tempMutes: [],
                    tempBans: []
                });
            };

            if (!schema.muteRole) {
                let muteRole = guild.roles.cache.find(role => role.name.toLowerCase() === "muted" );

                if (!muteRole) {
                    muteRole = await guild.roles.create({
                        name: 'Muted',
                        color: Colors.Red,
                        permissions: [],
                        reason: `Muterole created.`,
                    });
                    for (const channel of guild.channels.cache.values()) {
                        try {
                            await channel.permissionOverwrites.edit(muteRole.id, {
                                SendMessages: false,
                                Speak: false,
                            });
                        } catch (error) { continue; };
                    };
                };

                schema.muteRole = muteRole.id;
                await schema.save();
            };

            const mutedUserSchema = schema.tempMutes.find(obj => obj.id === user.id);
            if (mutedUserSchema) {
                schema.tempMutes = schema.tempMutes.filter(obj => obj !== mutedUserSchema);
                await schema.save();
            };
            
            const mutedUser = client.tempMods.mutes.find(obj => obj.guildId === guild.id && obj.userId === user.id);
            if (mutedUser) client.tempMods.mutes = client.tempMods.mutes.filter(obj => obj !== mutedUser);

            await user.roles.remove(schema.muteRole, reason);

            await message.delete().catch(e => {});

            await channel.send({ content: `**${author.tag}** unmuted <@${user.id}> with reason: ${reason || 'No reason provided'}` });
        };

        if (command === 'unmute-all') {
            const member = await guild.members.fetch(author.id)
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
            if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return message.reply({ content: 'I\'m not allowed to manage roles!' });
            
            const schema = await TempModSchema.findOne({Guild: guild.id});
            if (!schema?.muteRole) {
                const msg = await message.reply({ content: "No one is muted" });
                await message.delete().catch(e => {});
                setTimeout(() => {
                    msg.delete();
                }, 5000);
                return;
            };

            if (schema) {
                schema.tempMutes.length = 0;
                await schema.save();
            };
            
            client.tempMods.mutes = client.tempMods.mutes.filter(obj => obj.guildId !== guild.id);
            
            const reason = args.join(' ') || '';

            let unmuteError = 0;
            await guild.members.fetch();
            for (const member of guild.members.cache.values()) {
                if (member.roles.cache.has(schema.muteRole)) {
                    try {
                        await member.roles.remove(schema.muteRole, reason || "Unmute All");
                    } catch (error) {
                        if (error.code === 10007) continue;

                        console.log(error);
                        unmuteError++;
                    };
                };
            };

            let ErrorMessage = "All users have been successfully unmuted.";
            if (unmuteError) ErrorMessage = `${unmuteError} users were not unmuted.`;
            
            await message.delete().catch(e => {});

            await channel.send({ content: `**${author.tag}** performed an Unmute All with reason: ${reason || 'No reason provided'}. ${ErrorMessage}` });
        };

        if (command === 'timeout') {
            if (args.length === 0) return;

            const member = await guild.members.fetch(author.id)
            if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;
            if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return message.reply({ content: `I'm not allowed to set or remove timeouts!`});
            
            const type = args[0].toLowerCase();

            if (type === 'set') {
                let msgCont;
                if (!args[1] && !msgCont) msgCont = 'You must enter the user to timeout.';
                if (!args[2] && !msgCont) msgCont = 'You must enter the timeout duration.';
                if (msgCont) {
                    const msg = await message.reply({ content: msgCont });
                    await message.delete().catch(e => {});
                    setTimeout(() => {
                        msg.delete();
                    }, 5000);
                    return;
                };

                const duration = args[2];
                let convertedDuration = ms(duration);
                if (!convertedDuration && !msgCont) msgCont = `You must specify a valid duration.`;
                if (convertedDuration > 2419200000 && !msgCont) msgCont = `Timeouts cannot last longer than 28 days.`;
                if (msgCont) {
                    const msg = await message.reply({ content: msgCont });
                    await message.delete().catch(e => {});
                    setTimeout(() => {
                        msg.delete();
                    }, 5000);
                    return;
                };
                if (convertedDuration > 2419197000) convertedDuration = 2419197000;

                if (args[1].startsWith('<@')) args[1] = args[1].replace(/[<@>]/g, '');
                let user = false;
                user = await client.users.fetch(args[1]).catch(async () => {
                    await guild.members.fetch()
                    const newUser = await client.users.cache.find(m => m.tag === args[1]);
                    if (!newUser) {
                        const msg = await message.reply({ content: `I can't find the user you specified!` });
                        await message.delete().catch(e => {});
                        setTimeout(() => {
                            msg.delete();
                        }, 5000);
                    }
                    return newUser;
                });

                if (!user) return;

                try {
                    user = await guild.members.fetch(user.id);

                    if (user.id === client.application.id && !msgCont) msgCont = `I can't timeout myself!`;

                    if (user.id === member.id && !msgCont) msgCont = `You can't timeout yourself!`;

                    if (user.id === guild.ownerId && !msgCont) msgCont = `You can't timeout the server owner!`;

                    if (user.permissions.has(PermissionsBitField.Flags.Administrator) && !msgCont) msgCont = `You can't timeout a server admin!`;

                    if (user.roles.highest.position >= member.roles.highest.position && guild.ownerId !== member.id && !msgCont) msgCont = `You can't timeout <@${user.id}>! He has a higher or equal role than you.`;
                    
                    if (user.roles.highest.position >= guild.members.cache.get(client.user.id).roles.highest.position && !msgCont) msgCont = `I can't timeout <@${user.id}>! He has a higher or equal role than me.`;
                    
                    if (msgCont) {
                        const msg = await message.reply({ content: msgCont });
                        await message.delete().catch(e => {});
                        setTimeout(() => {
                            msg.delete();
                        }, 5000);
                        return;
                    };
                } catch(error) {
                    if(error.code === 10007) {
                        const msg = await message.reply({ content: `The user you specified is not on the server!` });
                        await message.delete().catch(e => {});
                        setTimeout(() => {
                            msg.delete();
                        }, 5000);
                        return;
                    } else{ console.log(error); }; 
                };
                
                const reason = args.slice(3).join(' ') || '';

                await user.timeout(convertedDuration, reason);

                await message.delete().catch(e => {});

                await channel.send({ content: `**${author.tag}** timed out <@${user.id}> for: **${duration}**. Reason: ${reason || 'No reason provided'}` });
            };

            if (type === 'remove') {
                if (!args[1]) {
                    const msg = await message.reply({ content: 'You must enter the user you want to remove the timeout from.' });
                    await message.delete().catch(e => {});
                    setTimeout(() => {
                        msg.delete();
                    }, 5000);
                    return;
                };

                if (args[1].startsWith('<@')) args[1] = args[1].replace(/[<@>]/g, '');
                let user = false;
                user = await client.users.fetch(args[1]).catch(async () => {
                    await guild.members.fetch()
                    const newUser = await client.users.cache.find(m => m.tag === args[1]);
                    if (!newUser) {
                        const msg = await message.reply({ content: `I can't find the user you specified!` });
                        await message.delete().catch(e => {});
                        setTimeout(() => {
                            msg.delete();
                        }, 5000);
                    }
                    return newUser;
                });

                if (!user) return;

                try {
                    user = await guild.members.fetch(user.id);
                    let msgCont;

                    if (user.id === client.application.id && !msgCont) msgCont = `I'm not in timeout!`;

                    if (user.id === guild.ownerId && !msgCont) msgCont = `The server owner cannot be timed out!`;

                    if (user.permissions.has(PermissionsBitField.Flags.Administrator) && !msgCont) msgCont = `A server admin cannot be timed out!`;

                    if (user.roles.highest.position >= member.roles.highest.position && guild.ownerId !== member.id && !msgCont) msgCont = `You can't remove the timeout from <@${user.id}>! He has a higher or equal role than you.`;
                    
                    if (user.roles.highest.position >= guild.members.cache.get(client.user.id).roles.highest.position && !msgCont) msgCont = `I can't remove the timeout from <@${user.id}>! He has a higher or equal role than me.`;
                    
                    if(msgCont) {
                        const msg = await message.reply({ content: msgCont });
                        await message.delete().catch(e => {});
                        setTimeout(() => {
                            msg.delete();
                        }, 5000);
                        return;
                    };
                } catch(error) {
                    if(error.code === 10007) {
                        const msg = await message.reply({ content: `The user you specified is not on the server!` });
                        await message.delete().catch(e => {});
                        setTimeout(() => {
                            msg.delete();
                        }, 5000);
                        return;
                    } else{ console.log(error); }; 
                };

                const reason = args.slice(2).join(' ') || '';

                await user.timeout(null, reason);
                
                await message.delete().catch(e => {});

                await channel.send({ content: `**${author.tag}** removed the timeout from <@${user.id}> with reason: ${reason || 'No reason provided'}` });
            };
        };
    }
}