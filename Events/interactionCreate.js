const { MessageFlags } = require('discord.js');

module.exports = {
    name: "interactionCreate",
    
    async execute(interaction, client) {
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if(!command) {
            return console.error(`No ${interaction.commandName} was found.`);
        };

        try {
            await command.execute(interaction, client);
        } catch (e) {
            console.error(e);
            try {
                await interaction.reply({ content: "An error occurred while executing the command.", flags: MessageFlags.Ephemeral });
            } catch (e) {
                await interaction.editReply({ content: "An error occurred while executing the command.", flags: MessageFlags.Ephemeral });
            };
        };
    }
}