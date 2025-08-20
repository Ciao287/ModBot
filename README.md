# ModBot

Demo: [https://discord.com/oauth2/authorize?client_id=1394088761989533780](https://discord.com/oauth2/authorize?client_id=1394088761989533780)

This bot helps you moderate your server!

Here is a list of the commands it has:
- slash commands:
  - /ping => Show the bot's ping.
  - /prefix show => Show the bot's server prefix.
  - /prefix change `prefix` => Change the bot's server prefix.
  - /ban `member` `duration` `reason` => Ban a user with a duration and reason (you can use the member ID, mention, or tag).
  - /unban `member` `reason` => Unban a user with a reason (you can use the member ID, mention, or tag).
  - /unban-all `reason` => Unban all banned users from the server with a reason.
  - /muterole setup `role` => Choose which role to use as the mute role. If not used, the bot will search for a role called muted, and if it doesn't find one, it will create one.
  - /muterole remove => Removes the mute role (this does not delete the role, it simply means the previously set role will no longer be used for mutes - USING THIS COMMAND WILL REMOVE THE MUTE ROLE FROM ALL USERS WHO HAVE IT).
  - /mute `member` `duration` `reason` => Mute a user using roles with a duration and reason (you can use the member ID, mention, or tag).
  - /unmute `member` `reason` => Unmute a user using roles with a reason (you can use the member ID, mention, or tag).
  - /unmute-all `reason` => Unmute all muted users on the server with a reason.
  - /timeout set `member` `duration` `reason` => Timeout a user with a duration (required) and reason (you can use the member ID, mention, or tag).
  - /timeout remove `member` `reason` => Remove a user's timeout with a reason (you can use the member ID, mention, or tag).
- chat commands:
  I put [PREFIX] to indicate where the prefix goes in the command. The default prefix is `--`.
  - [PREFIX]ping => Show the bot's ping.
  - [PREFIX]prefix => Show the bot's server prefix.
  - [PREFIX]prefix `prefix` => Change the bot's server prefix.
  - [PREFIX]ban `member` `duration` `reason` => Ban a user with a duration and reason (you can use the member ID, mention, or tag).
  - [PREFIX]unban `member` `reason` => Unban a user with a reason (you can use the member ID, mention, or tag).
  - [PREFIX]unban-all `reason` => Unban all banned users from the server with a reason.
  - [PREFIX]muterole setup `role` => Choose which role to use as the mute role. If not used, the bot will search for a role called muted, and if it doesn't find one, it will create one.
  - [PREFIX]muterole remove => Removes the mute role (this does not delete the role, it simply means the previously set role will no longer be used for mutes - USING THIS COMMAND WILL REMOVE THE MUTE ROLE FROM ALL USERS WHO HAVE IT).
  - [PREFIX]mute `member` `duration` `reason` => Mute a user using roles with a duration and reason (you can use the member ID, mention, or tag).
  - [PREFIX]unmute `member` `reason` => Unmute a user using roles with a reason (you can use the member ID, mention, or tag).
  - [PREFIX]unmute-all `reason` => Unmute all muted users on the server with a reason.
  - [PREFIX]timeout set `member` `duration` `reason` => Timeout a user with a duration (required) and reason (you can use the member ID, mention, or tag).
  - [PREFIX]timeout remove `member` `reason` => Remove a user's timeout with a reason (you can use the member ID, mention, or tag).

## How to Install

1) Install [Node.js](https://nodejs.org/en/download/package-manager/current) and [Git](https://git-scm.com/downloads);
2) Open terminal in the folder where you want to install ModBot and run `git clone https://github.com/Ciao287/ModBot`
3) Open the [config.json](https://github.com/Ciao287/ModBot/blob/main/config.json) file, change the `token` value to your bot's token, which you can find in the [Discord Developer Portal](https://discord.com/developers/applications) and change the `mongodb` value to your MongoDB token.
4) Type `npm install` in the terminal;
5) Type `node .` in the terminal to start your bot.