const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, PermissionsBitField } = require("discord.js");
const TempModSchema = require('../Models/TempMod.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute-all')
        .setDescription(`Unmute all member from the server.`)
        .addStringOption(option =>
            option.setName('reason')
            .setDescription('Enter the reason for the Unmute All.'))
        .setContexts(['Guild'])
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {
        const { options, guild } = interaction;
        const reason = options.getString('reason');

        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return interaction.reply({ content: 'I\'m not allowed to manage roles!', flags: MessageFlags.Ephemeral });
        if (interaction.guild.members.me.communicationDisabledUntilTimestamp > Date.now()) return interaction.reply({ content: `I can't perform this action because I'm currently timed out.`, flags: MessageFlags.Ephemeral });

        await interaction.deferReply();

        const schema = await TempModSchema.findOne({Guild: guild.id});
        if (!schema?.muteRole) return interaction.editReply({ content: "No one is muted", flags: MessageFlags.Ephemeral });

        if (schema) {
            schema.tempMutes.length = 0;
            await schema.save();
        };
        
        client.tempMods.mutes = client.tempMods.mutes.filter(obj => obj.guildId !== guild.id);

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

        await interaction.editReply({ content: `**${interaction.user.tag}** performed an Unmute All with reason: ${reason || 'No reason provided'}. ${ErrorMessage}` });
    }
};