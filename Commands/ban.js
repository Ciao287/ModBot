const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, PermissionsBitField } = require("discord.js");
const TempModSchema = require('../Models/TempMod.js');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription(`Ban a member from the server.`)
        .addStringOption(option => 
            option.setName('member')
            .setDescription('Enter a member ID, tag, or mention.')
            .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
            .setDescription('Enter the ban duration.'))
        .addStringOption(option =>
            option.setName('reason')
            .setDescription('Enter the reason for the ban.'))
        .setContexts(['Guild'])
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction, client) {
        const { options, guild } = interaction;
        let member = options.getString('member');
        let duration = options.getString('duration');
        const start = Date.now();
        let convertedDuration;
        if (duration) {
            convertedDuration = ms(duration);
            if (!convertedDuration) return interaction.reply({ content: `You must specify a valid duration.`, flags: MessageFlags.Ephemeral });
            if (convertedDuration > 31557600000000) duration = false;
        };
        const reason = options.getString('reason') || '';

        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.reply({ content: 'I\'m not allowed to ban or unban people!', flags: MessageFlags.Ephemeral });
        if (interaction.guild.members.me.communicationDisabledUntilTimestamp > Date.now()) return interaction.reply({ content: `I can't perform this action because I'm currently timed out.`, flags: MessageFlags.Ephemeral });

        if (member.startsWith('<@')) member = member.replace(/[<@>]/g, '');
        let user = false;
        user = await client.users.fetch(member).catch(async () => {
            await guild.members.fetch()
            const newUser = await client.users.cache.find(m => m.tag === member);
            if (!newUser) await interaction.reply({ content: 'I can\'t find the user you specified!', flags: MessageFlags.Ephemeral });
            return newUser;
        });

        if (!user) return;
        try {
            user = await guild.members.fetch(user.id);

            if (user.id === client.application.id) return interaction.reply({ content: `I can't ban myself!`, flags: MessageFlags.Ephemeral });

            if (user.id === interaction.member.id) return interaction.reply({ content: `You can't ban yourself!`, flags: MessageFlags.Ephemeral });
            
            if (user.id === guild.ownerId) return interaction.reply({ content: `You can't ban the server owner!`, flags: MessageFlags.Ephemeral });

            if (user.roles.highest.position >= interaction.member.roles.highest.position && guild.ownerId !== interaction.member.id) return interaction.reply({ content: `You can't ban <@${user.id}>! He has a higher or equal role than you.`, flags: MessageFlags.Ephemeral });
            
            if (user.roles.highest.position >= interaction.guild.members.cache.get(client.user.id).roles.highest.position) return interaction.reply({ content: `I can't ban <@${user.id}>! He has a higher or equal role than me.`, flags: MessageFlags.Ephemeral });
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
            
            await guild.members.ban(user.id, {
                reason: reason,
                deleteMessageSeconds: 7 * 24 * 60 * 60
            });

            await interaction.reply({ content: `**${interaction.user.tag}** banned <@${user.id}> with reason: ${reason || 'No reason provided'}` });
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

                await guild.members.ban(user.id, {
                    reason: reason,
                });

                await interaction.reply({ content: `**${interaction.user.tag}** banned <@${user.id}> for ${duration} with reason: ${reason || 'No reason provided'}` });
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

                await guild.members.ban(user.id, {
                    reason: reason,
                });

                await interaction.reply({ content: `**${interaction.user.tag}** banned <@${user.id}> for ${duration} with reason: ${reason || 'No reason provided'}` });
                
                setTimeout(async () => {
                    const bannedUser2 = client.tempMods.bans.find(obj => obj.guildId === guild.id && obj.userId === user.id && obj.duration === start + convertedDuration);
                    if (bannedUser2) {
                        await guild.members.unban(user.id, "Ban expired");
                        client.tempMods.bans = client.tempMods.bans.filter(obj => obj !== bannedUser2);
                    };
                }, convertedDuration);
            };
        };
    }
};