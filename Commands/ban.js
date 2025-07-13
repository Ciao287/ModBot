const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription(`Ban a member from the server.`)
        .addStringOption(option => 
            option.setName('member')
            .setDescription('Enter a member ID or mention')
            .setRequired(true))
        .setContexts(['Guild'])
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction, client) {

    }
};