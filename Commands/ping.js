const { SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription(`¯\\_(ツ)_/¯`),
    async execute(interaction, client) {
        await interaction.reply({ content: `My ping is ${client.ws.ping}ms!`, flags: MessageFlags.Ephemeral })
    }
};