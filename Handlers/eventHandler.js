function loadEvents(client) {
    const fs = require('fs');

    const files = fs.readdirSync('./Events');
    for (const file of files) {
        const event = require(`../Events/${file}`);

        if (event.rest) {
            if (event.once) {
                client.rest.once(event.name, (...args) =>
                    event.execute(...args, client)
                );
            } else {
                client.rest.on(event.name, (...args) =>
                  event.execute(...args, client)  
                );
            }
        } else {
            if (event.once) {
                client.once(event.name, (...args) =>
                    event.execute(...args, client)
                );
            } else {
                client.on(event.name, (...args) =>
                    event.execute(...args, client)
                );
            }
        }
        continue;
    }
    return console.log('Loaded Events.')
}

module.exports = { loadEvents };