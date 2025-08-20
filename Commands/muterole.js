const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits, PermissionsBitField, Colors } = require("discord.js");
const TempModSchema = require('../Models/TempMod.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('muterole')
        .setDescription(`Set or remove the mute role.`)
        .addSubcommand(subcommand =>
            subcommand.setName('setup')
            .setDescription(`Set the mute role.`)
            .addRoleOption(option => 
                option.setName('role')
                .setDescription('Select the mute role.')
                .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
            .setDescription(`Remove the mute role. | This will delete all existing mutes.`))
        .setContexts(['Guild'])
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {
        const { options, guild } = interaction;
        const subcommand = options.getSubcommand();
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return interaction.editReply({ content: 'I\'m not allowed to manage roles!', flags: MessageFlags.Ephemeral });
        if (interaction.guild.members.me.communicationDisabledUntilTimestamp > Date.now()) return interaction.editReply({ content: `I can't perform this action because I'm currently timed out.`, flags: MessageFlags.Ephemeral });
        
        switch(subcommand) {
            case 'setup':
                const role = options.getRole('role');

                if (role.position >= interaction.guild.members.me.roles.highest.position) return interaction.editReply({ content: `I'm not allowed to manage this role because it's equal to or higher than my highest role. Please move it below my highest role or adjust my roles.`, flags: MessageFlags.Ephemeral });

                let schema = await TempModSchema.findOne({Guild: guild.id});
                let oldMuteRole = false;
                if (!schema) {
                    schema = new TempModSchema({
                        Guild: guild.id,
                        muteRole: role.id,
                        tempMutes: [],
                        tempBans: []
                    });
                } else {
                    oldMuteRole = schema.muteRole;
                    schema.muteRole = role.id;
                };

                await schema.save();

                let muteError = 0;
                await guild.members.fetch();
                for (const member of guild.members.cache.values()) {
                    if (member.roles.cache.has(oldMuteRole)) {
                        try {
                            await member.roles.add(schema.muteRole, "Mute role changed");
                            await member.roles.remove(oldMuteRole, "Mute role changed");
                        } catch (error) {
                            if (error.code === 10007) continue;

                            console.log(error);
                            muteError++;
                        };
                    };
                };

                let ErrorMessage = "All muted users have been converted to the new role.";
                if (muteError)  ErrorMessage = `${muteError} muted users have not been converted to the new role.`;
                
                await interaction.editReply({ content: `The mute role has been changed from <@&${oldMuteRole}> to <@&${schema.muteRole}>. ${ErrorMessage}`, flags: MessageFlags.Ephemeral });
        };

        switch(subcommand) {
            case 'remove':
                const schema = await TempModSchema.findOne({Guild: guild.id});
                if (!schema?.muteRole) return interaction.editReply({ content: "You have not set a mute role", flags: MessageFlags.Ephemeral });

                let oldMuteRole = schema.muteRole;
                schema.muteRole = false;

                let muteError = 0;
                await guild.members.fetch();
                for (const member of guild.members.cache.values()) {
                    if (member.roles.cache.has(oldMuteRole)) {
                        try {
                            await member.roles.remove(oldMuteRole, "Mute role removed");
                        } catch (error) {
                            if (error.code === 10007) continue;

                            console.log(error);
                            muteError++;
                        };
                    };
                };

                schema.tempMutes.length = 0;

                if (!schema.muteRole && schema.tempBans.length === 0) await TempModSchema.deleteOne({ _id: schema._id });
                else await schema.save();
                
                let ErrorMessage = "All muted users have had their mute role removed.";
                if (muteError)  ErrorMessage = `${muteError} muted users did not have their mute role removed.`;

                await interaction.editReply({ content: `The mute role has been successfully removed. ${ErrorMessage}`, flags: MessageFlags.Ephemeral });
        };
    }
};