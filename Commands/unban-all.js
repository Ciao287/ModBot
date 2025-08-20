const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, PermissionsBitField } = require("discord.js");
const TempModSchema = require('../Models/TempMod.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban-all')
        .setDescription(`Unban all member from the server.`)
        .addStringOption(option =>
            option.setName('reason')
            .setDescription('Enter the reason for the Unban All.'))
        .setContexts(['Guild'])
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {
        const { options, guild } = interaction;
        const reason = options.getString('reason');

        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.reply({ content: 'I\'m not allowed to ban or unban people!', flags: MessageFlags.Ephemeral });
        if (interaction.guild.members.me.communicationDisabledUntilTimestamp > Date.now()) return interaction.reply({ content: `I can't perform this action because I'm currently timed out.`, flags: MessageFlags.Ephemeral });

        await interaction.deferReply();

        const schema = await TempModSchema.findOne({Guild: guild.id});
        if (schema) {
            schema.tempBans.length = 0;
            if (!schema.muteRole && schema.tempBans.length === 0) await TempModSchema.deleteOne({ _id: schema._id });
            else await schema.save();
        };
        
        client.tempMods.bans = client.tempMods.bans.filter(obj => obj.guildId !== guild.id);

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

        await interaction.editReply({ content: `**${interaction.user.tag}** performed an Unban All with reason: ${reason || 'No reason provided'}. ${ErrorMessage}` });
    }
};