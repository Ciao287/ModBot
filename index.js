const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { token } = require('./config.json');
const { loadCommands } = require('./Handlers/commandHandler');
const { loadEvents } = require('./Handlers/eventHandler');

const { Guilds, GuildMembers, GuildMessages } = GatewayIntentBits;
const { User, Message, GuildMember } = Partials;

const client = new Client({
    intents: [Guilds, GuildMembers, GuildMessages],
    partials: [User, Message, GuildMember]
});

client.commands = new Collection();

client.login(token).then(() => {
    loadEvents(client);
    loadCommands(client);
});