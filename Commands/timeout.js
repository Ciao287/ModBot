const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, PermissionsBitField } = require("discord.js");
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription(`Set or remove a timeout from a member.`)
        .addSubcommand(subcommand =>
            subcommand.setName('set')
            .setDescription(`Temporarily apply a timeout to a member.`)
            .addStringOption(option => 
                option.setName('member')
                .setDescription('Enter a member ID, tag, or mention.')
                .setRequired(true))
            .addStringOption(option =>
                option.setName('duration')
                .setDescription('Enter the timeout duration.')
                .setRequired(true))
            .addStringOption(option =>
                option.setName('reason')
                .setDescription('Enter the reason for the timeout.')))
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
            .setDescription(`Remove a member’s timeout.`)
            .addStringOption(option => 
                option.setName('member')
                .setDescription('Enter a member ID, tag, or mention.')
                .setRequired(true))
            .addStringOption(option =>
                option.setName('reason')
                .setDescription('Enter the reason for removing the timeout.')))
        .setContexts(['Guild'])
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction, client) {
        const { options, guild } = interaction;
        const subcommand = options.getSubcommand();
        let member = options.getString('member');
        const reason = options.getString('reason') || ''

        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return interaction.reply({ content: `I'm not allowed to set or remove timeouts!`, flags: MessageFlags.Ephemeral });
        if (interaction.guild.members.me.communicationDisabledUntilTimestamp > Date.now()) return interaction.reply({ content: `I can't perform this action because I'm currently timed out.`, flags: MessageFlags.Ephemeral });

        if (member.startsWith('<@')) member = member.replace(/[<@>]/g, '');
        let user = false;
        user = await client.users.fetch(member).catch(async () => {
            await guild.members.fetch()
            const newUser = await client.users.cache.find(m => m.tag === member);
            if (!newUser) await interaction.reply({ content: `I can't find the user you specified!`, flags: MessageFlags.Ephemeral });
            return newUser;
        });

        if (!user) return;

        switch(subcommand) {
            case 'set':
                const duration = options.getString('duration');
                let convertedDuration = ms(duration);
                if (!convertedDuration) return interaction.reply({ content: `You must specify a valid duration.`, flags: MessageFlags.Ephemeral });
                if (convertedDuration > 2419200000) return interaction.reply({ content: `Timeouts cannot last longer than 28 days.`, flags: MessageFlags.Ephemeral });
                if (convertedDuration > 2419197000) convertedDuration = 2419197000;

                try {
                    user = await guild.members.fetch(user.id);

                    if (user.id === client.application.id) return interaction.reply({ content: `I can't timeout myself!`, flags: MessageFlags.Ephemeral });

                    if (user.id === interaction.member.id) return interaction.reply({ content: `You can't timeout yourself!`, flags: MessageFlags.Ephemeral });

                    if (user.id === guild.ownerId) return interaction.reply({ content: `You can't timeout the server owner!`, flags: MessageFlags.Ephemeral });

                    if (user.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: `You can't timeout a server admin!`, flags: MessageFlags.Ephemeral });

                    if (user.roles.highest.position >= interaction.member.roles.highest.position && guild.ownerId !== interaction.member.id) return interaction.reply({ content: `You can't timeout <@${user.id}>! He has a higher or equal role than you.`, flags: MessageFlags.Ephemeral });
                    
                    if (user.roles.highest.position >= interaction.guild.members.cache.get(client.user.id).roles.highest.position) return interaction.reply({ content: `I can't timeout <@${user.id}>! He has a higher or equal role than me.`, flags: MessageFlags.Ephemeral });
                } catch(error) {
                    if(error.code === 10007) {
                        return interaction.reply({ content: `The user you specified is not on the server!`, flags: MessageFlags.Ephemeral });
                    } else{ console.log(error); }; 
                };

                await user.timeout(convertedDuration, reason);

                await interaction.reply({ content: `**${interaction.user.tag}** timed out <@${user.id}> for: **${duration}**. Reason: ${reason || 'No reason provided'}` });
        };

        switch(subcommand) {
            case 'remove':
                try {
                    user = await guild.members.fetch(user.id);

                    if (user.id === client.application.id) return interaction.reply({ content: `I'm not in timeout!`, flags: MessageFlags.Ephemeral });

                    if (user.id === guild.ownerId) return interaction.reply({ content: `The server owner cannot be timed out!`, flags: MessageFlags.Ephemeral });

                    if (user.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: `A server admin cannot be timed out!`, flags: MessageFlags.Ephemeral });

                    if (user.roles.highest.position >= interaction.member.roles.highest.position && guild.ownerId !== interaction.member.id) return interaction.reply({ content: `You can't remove the timeout from <@${user.id}>! He has a higher or equal role than you.`, flags: MessageFlags.Ephemeral });
                    
                    if (user.roles.highest.position >= interaction.guild.members.cache.get(client.user.id).roles.highest.position) return interaction.reply({ content: `I can't remove the timeout from <@${user.id}>! He has a higher or equal role than me.`, flags: MessageFlags.Ephemeral });
                } catch(error) {
                    if(error.code === 10007) {
                        return interaction.reply({ content: `The user you specified is not on the server!`, flags: MessageFlags.Ephemeral });
                    } else{ console.log(error); }; 
                };

                await user.timeout(null, reason);

                await interaction.reply({ content: `**${interaction.user.tag}** removed the timeout from <@${user.id}> with reason: ${reason || 'No reason provided'}` });
        };
    }
};