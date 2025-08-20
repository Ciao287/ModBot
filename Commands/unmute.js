const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, PermissionsBitField, Colors } = require("discord.js");
const TempModSchema = require('../Models/TempMod.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription(`Unmute a member from the server.`)
        .addStringOption(option => 
            option.setName('member')
            .setDescription('Enter a member ID, tag, or mention.')
            .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
            .setDescription('Enter the reason for the unmute.'))
        .setContexts(['Guild'])
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction, client) {
        const { options, guild } = interaction;
        let member = options.getString('member');
        const reason = options.getString('reason') || ''

        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return interaction.reply({ content: 'I\'m not allowed to manage roles!', flags: MessageFlags.Ephemeral });
        if (interaction.guild.members.me.communicationDisabledUntilTimestamp > Date.now()) return interaction.reply({ content: `I can't perform this action because I'm currently timed out.`, flags: MessageFlags.Ephemeral });

        if (member.startsWith('<@')) member = member.replace(/[<@>]/g, '');
        let user = false;
        user = await client.users.fetch(member).catch(async () => {
            const newUser = await client.users.cache.find(m => m.tag === member);
            if (!newUser) await interaction.reply({ content: 'I can\'t find the user you specified!', flags: MessageFlags.Ephemeral });
            return newUser;
        });

        if (!user) return;
        try {
            user = await guild.members.fetch(user.id);

            if (user.roles.highest.position >= interaction.member.roles.highest.position && guild.ownerId !== interaction.member.id) return interaction.reply({ content: `You can't unmute <@${user.id}>! He has a higher or equal role than you.`, flags: MessageFlags.Ephemeral });
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

        const mutedUserSchema = schema.tempMutes.find(obj => obj.id === user.id);
        if (mutedUserSchema) {
            schema.tempMutes = schema.tempMutes.filter(obj => obj !== mutedUserSchema);
            await schema.save();
        };
        
        const mutedUser = client.tempMods.mutes.find(obj => obj.guildId === guild.id && obj.userId === user.id);
        if (mutedUser) client.tempMods.mutes = client.tempMods.mutes.filter(obj => obj !== mutedUser);

        await user.roles.remove(schema.muteRole, reason);

        await interaction.reply({ content: `**${interaction.user.tag}** unmuted <@${user.id}> with reason: ${reason || 'No reason provided'}` })
    }
};