function loadCommands(client) {
    const fs = require('fs');
    let commands = [];
    
    const files = fs.readdirSync('./Commands').filter((file) => file.endsWith('.js'));
    
    for (const file of files) {
        const command = require(`../Commands/${file}`);
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
        continue;
    }

    client.application.commands.set(commands);

    return console.log('Loaded Commands.')
}

module.exports = { loadCommands };