const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, PermissionsBitField } = require("discord.js");
const TempModSchema = require('../Models/TempMod.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription(`Unban a member from the server.`)
        .addStringOption(option => 
            option.setName('member')
            .setDescription('Enter a member ID, tag, or mention.')
            .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
            .setDescription('Enter the reason for the unban.'))
        .setContexts(['Guild'])
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction, client) {
        const { options, guild } = interaction;
        let member = options.getString('member');
        const reason = options.getString('reason') || ''

        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.reply({ content: 'I\'m not allowed to ban or unban people!', flags: MessageFlags.Ephemeral });
        if (interaction.guild.members.me.communicationDisabledUntilTimestamp > Date.now()) return interaction.reply({ content: `I can't perform this action because I'm currently timed out.`, flags: MessageFlags.Ephemeral });

        if (member.startsWith('<@')) member = member.replace(/[<@>]/g, '');
        let user = false;
        user = await client.users.fetch(member).catch(async () => {
            const newUser = await client.users.cache.find(m => m.tag === member);
            if (!newUser) await interaction.reply({ content: 'I can\'t find the user you specified!', flags: MessageFlags.Ephemeral });
            return newUser;
        });

        if (!user) return;

        const schema = await TempModSchema.findOne({Guild: guild.id});
        if (schema) {
            const bannedUserSchema = schema.tempBans.find(obj => obj.id === user.id);
            if (bannedUserSchema) schema.tempBans = schema.tempBans.filter(obj => obj !== bannedUserSchema);
            await schema.save();
        };
        
        const bannedUser = client.tempMods.bans.find(obj => obj.guildId === guild.id && obj.userId === user.id);
        if (bannedUser) client.tempMods.bans = client.tempMods.bans.filter(obj => obj !== bannedUser);

        await guild.members.unban(user.id, reason);

        await interaction.reply({ content: `**${interaction.user.tag}** unbanned <@${user.id}> with reason: ${reason || 'No reason provided'}` })
    }
};