const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { token } = require('./config.json');
const { loadCommands } = require('./Handlers/commandHandler');
const { loadEvents } = require('./Handlers/eventHandler');
const TempModSchema = require('../Models/TempMod.js');

const { Guilds, GuildMembers, GuildMessages, MessageContent } = GatewayIntentBits;
const { User, Message, GuildMember } = Partials;

const client = new Client({
    intents: [Guilds, GuildMembers, GuildMessages, MessageContent],
    partials: [User, Message, GuildMember]
});


client.functions = require('./functions.js');
client.commands = new Collection();
client.tempMods.mutes = [];
client.tempMods.bans = [];

process.on('SIGINT', async () => {
	await client.functions.saveTempMods(client, TempModSchema);
	process.exit();
});

process.on('SIGTERM', async () => {
	await client.functions.saveTempMods(client, TempModSchema);
	process.exit();
});

process.on('uncaughtException', async (error) => {
	console.error(error);
	await client.functions.saveTempMods(client, TempModSchema);
	process.exit();
});
  
process.on('unhandledRejection', async (error) => {
	console.error(error);
	await client.functions.saveTempMods(client, TempModSchema);
	process.exit();
});

client.login(token).then(() => {
    loadEvents(client);
    loadCommands(client);
});