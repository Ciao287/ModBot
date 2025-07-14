const { MessageFlags, PermissionsBitField } = require('discord.js');
const Schema = require('../Models/Prefix.js');

module.exports = {
    name: "messageCreate",
    
    async execute(message, client) {
        const { author, channel, content, guild } = message;

        if (!guild || author.bot) return;
        
        const prefixSchema = await Schema.findOne({ Guild: guild.id });
        
        const prefix = prefixSchema?.Prefix || '--';

        if (!content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === 'prefix') {
            const member = await guild.members.fetch(author.id)
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
            if (args.length === 0) {
                const msg = await message.reply({ content: 'You must enter the prefix.' });
                await message.delete().catch(e => {});
                setTimeout(() => {
                    msg.delete();
                }, 5000);
                return;
            };

            if(args[0].length > 5 && args[0] !== `<@${client.application.id}>`) {
                const msg = await message.reply({ content: 'The prefix length must be between 1 and 5 characters.', flags: MessageFlags.Ephemeral });
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

        if (command === 'ban') {
            const member = await guild.members.fetch(author.id)
            if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
            if (!guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.reply({ content: 'I\'m not allowed to ban or unban people!' });
            if (args.length === 0) {
                const msg = await message.reply({ content: 'You must enter the user to ban.' });
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
                let msgcont;

                if (user.id === client.application.id && !msgcont) msgcont = 'I can\'t ban myself!';

                if (user.id === member.id && !msgcont) msgcont = 'You can\'t ban yourself!';

                if (user.roles.highest.position >= member.roles.highest.position && !msgcont) msgcont = `You can't ban <@${user.id}>. He has a higher or equal role than you.`;

                if (user.roles.highest.position >= guild.members.cache.get(client.user.id).roles.highest.position && !msgcont) msgcont = `I can't ban <@${user.id}>. He has a higher or equal role than me.`;

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

            const reason = args.slice(1).join(' ') || '';

            await guild.members.ban(user.id, {
                reason: reason,
                deleteMessageSeconds: 7 * 24 * 60 * 60
            });

            await message.delete().catch(e => {});

            await channel.send({ content: `**${author.tag}** banned <@${user.id}> with reason: ${reason || 'No reason provided'}` });
        };

        if (command === 'unban') {
            const member = await guild.members.fetch(author.id)
            if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
            if (!guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.reply({ content: 'I\'m not allowed to ban or unban people!' });
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

            await guild.members.unban(user.id, reason);

            await message.delete().catch(e => {});

            await channel.send({ content: `**${author.tag}** unbanned <@${user.id}> with reason: ${reason || 'No reason provided'}` });
        };
    }
}