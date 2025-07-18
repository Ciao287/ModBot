# ModBot

Demo: [https://discord.com/oauth2/authorize?client_id=1394088761989533780](https://discord.com/oauth2/authorize?client_id=1394088761989533780)

This bot helps you moderate your server!

Here is a list of the commands it has:
- slash commands:
  - /ping => Show the bot's ping.
  - /prefix show => Show the bot's server prefix.
  - /prefix change `prefix` => Change the bot's server prefix.
  - /ban `member` `reason` => Ban a user with a reason (you can use the member ID, mention, or tag).
  - /unban `member` `reason` => Unban a user with a reason (you can use the member ID, mention, or tag).
  - /timeout set `member` `duration` `reason` => Timeout a user with a duration (required) and reason (you can use the member ID, mention, or tag).
  - /timeout remove `member` `reason` => Remove a user's timeout with a reason (you can use the member ID, mention, or tag).
- chat commands:
  I put [PREFIX] to indicate where the prefix goes in the command. The default prefix is `--`.
  - [PREFIX]prefix => Show the bot's server prefix.
  - [PREFIX]prefix `prefix` => Change the bot's server prefix.
  - [PREFIX]ban `member` `reason` => Ban a user with a reason (you can use the member ID, mention, or tag).
  - [PREFIX]unban `member` `reason` => Unban a user with a reason (you can use the member ID, mention, or tag).
  - [PREFIX]timeout set `member` `duration` `reason` => Timeout a user with a duration (required) and reason (you can use the member ID, mention, or tag).
  - [PREFIX]timeout remove `member` `reason` => Remove a user's timeout with a reason (you can use the member ID, mention, or tag).

## How to Install

1) Install [Node.js](https://nodejs.org/en/download/package-manager/current) and [Git](https://git-scm.com/downloads);
2) Open terminal in the folder where you want to install ModBot and run `git clone https://github.com/Ciao287/ModBot`
3) Open the [config.json](https://github.com/Ciao287/ModBot/blob/main/config.json) file, change the `token` value to your bot's token, which you can find in the [Discord Developer Portal](https://discord.com/developers/applications) and change the `mongodb` value to your MongoDB token.
4) Type `npm install` in the terminal;
5) Type `node .` in the terminal to start your bot.