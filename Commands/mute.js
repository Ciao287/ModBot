const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, PermissionsBitField, Colors } = require("discord.js");
const TempModSchema = require('../Models/TempMod.js');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription(`mute a member.`)
        .addStringOption(option => 
            option.setName('member')
            .setDescription('Enter a member ID, tag, or mention.')
            .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
            .setDescription('Enter the mute duration.'))
        .addStringOption(option =>
            option.setName('reason')
            .setDescription('Enter the reason for the mute.'))
        .setContexts(['Guild'])
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
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

        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return interaction.reply({ content: 'I\'m not allowed to mute or unmute people!', flags: MessageFlags.Ephemeral });
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

            if (user.id === client.application.id) return interaction.reply({ content: `I can't mute myself!`, flags: MessageFlags.Ephemeral });

            if (user.id === interaction.member.id) return interaction.reply({ content: `You can't mute yourself!`, flags: MessageFlags.Ephemeral });

            if (user.roles.highest.position >= interaction.member.roles.highest.position && guild.ownerId !== interaction.member.id) return interaction.reply({ content: `You can't mute <@${user.id}>! He has a higher or equal role than you.`, flags: MessageFlags.Ephemeral });
        } catch(error) {
            if(error.code === 10007) {
                return interaction.reply({ content: `The user you specified is not on the server!`, flags: MessageFlags.Ephemeral });
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
            
            await user.roles.add(schema.muteRole, reason);

            await interaction.reply({ content: `**${interaction.user.tag}** muted <@${user.id}> with reason: ${reason || 'No reason provided'}` });
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

                await user.roles.add(schema.muteRole, reason);

                await interaction.reply({ content: `**${interaction.user.tag}** muted <@${user.id}> for ${duration} with reason: ${reason || 'No reason provided'}` });
            } else {
                // const schema = await TempModSchema.findOne({Guild: guild.id});
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

                await user.roles.add(schema.muteRole, reason);

                await interaction.reply({ content: `**${interaction.user.tag}** muted <@${user.id}> for ${duration} with reason: ${reason || 'No reason provided'}` });
                
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
    }
};