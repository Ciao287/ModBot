const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require("discord.js");
const Schema = require('../Models/Prefix.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Use prefix commands.')
        .addSubcommand(subcommand =>
            subcommand.setName('show')
            .setDescription('Show the bot\'s server prefix.'))
        .addSubcommand(subcommand =>
            subcommand.setName('change')
            .setDescription('Change the bot\'s server prefix.')
            .addStringOption(option =>
                option.setName('prefix')
                .setDescription('Enter prefix')
                .setMinLength(1)
                .setRequired(true)))
        .setContexts(['Guild'])
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {
        const { options, guild } = interaction;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const subcommand = options.getSubcommand();

        switch (subcommand) {
            case 'show':
                const guildSchema = await Schema.findOne({ Guild: guild.id });
                
                if (!guildSchema) {
                    await interaction.editReply({ content: 'The prefix for chat commands is `--`', flags: MessageFlags.Ephemeral });
                } else {
                    await interaction.editReply({ content: `The prefix for chat commands is \`${guildSchema.Prefix}\``, flags: MessageFlags.Ephemeral });
                };
                return;
        };

        switch (subcommand) {
            case 'change':
                const prefix = options.getString('prefix');

                if(prefix.length > 5 && prefix !== `<@${client.application.id}>`) {
                    await interaction.editReply({ content: 'The prefix length must be between 1 and 5 characters.', flags: MessageFlags.Ephemeral });
                    return;
                };

                let guildSchema = await Schema.findOne({ Guild: guild.id });
                if (prefix === '--') {
                    await interaction.editReply({ content: 'You changed the prefix for chat commands to `--`', flags: MessageFlags.Ephemeral });
                    if(guildSchema) await Schema.deleteOne({ _id: guildSchema._id });
                    return;
                };
                
                if (!guildSchema) {
                    guildSchema = new Schema({
                        Guild: guild.id
                    });
                };

                guildSchema.Prefix = prefix;
                await guildSchema.save();

                await interaction.editReply({ content: `You changed the prefix for chat commands to \`${prefix}\``, flags: MessageFlags.Ephemeral });
                return;
        }
    }
};