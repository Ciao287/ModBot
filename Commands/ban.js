const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, PermissionsBitField } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription(`Ban a member from the server.`)
        .addStringOption(option => 
            option.setName('member')
            .setDescription('Enter a member ID, mention or tag')
            .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
            .setDescription('Enter the reason for the ban'))
        .setContexts(['Guild'])
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction, client) {
        const { options, guild } = interaction;
        let member = options.getString('member');
        const reason = options.getString('reason') || ''

        if(!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.reply({ content: 'I\'m not allowed to ban people!', flags: MessageFlags.Ephemeral });

        if (member.startsWith('<@')) member = member.replace(/[<@>]/g, '');
        let user = false;
        user = await client.users.fetch(member).catch(async () => {
            await guild.members.fetch()
            const newUser = await client.users.cache.find(m => m.tag === member);
            if (!newUser) await interaction.reply({ content: 'The user you specified does not exist!', flags: MessageFlags.Ephemeral });
            return newUser;
        });

        if(!user) return;
        user = await guild.members.fetch(user.id);

        if (user.id === client.application.id) return interaction.reply({ content: 'I can\'t ban myself!', flags: MessageFlags.Ephemeral });

        if (user.id === interaction.member.id) return interaction.reply({ content: 'You can\'t ban yourself!', flags: MessageFlags.Ephemeral });

        if (user.roles.highest.position >= interaction.member.roles.highest.position) return interaction.reply({ content: `You can't ban <@${user.id}>. He has a higher or equal role than you.`, flags: MessageFlags.Ephemeral });

        if (user.roles.highest.position >= interaction.guild.members.cache.get(client.user.id).roles.highest.position) return interaction.reply({ content: `I can't ban <@${user.id}>. He has a higher or equal role than me.`, flags: MessageFlags.Ephemeral });
        
        await guild.members.ban(user.id, {
            reason: reason,
            deleteMessageSeconds: 7 * 24 * 60 * 60
        });

        await interaction.reply({ content: `**${interaction.user.tag}** banned <@${user.id}> with reason: ${reason || 'No reason provided'}` })
    }
};