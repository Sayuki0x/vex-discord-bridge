import { Client as DiscordClient, Message } from 'discord.js';
import log from 'electron-log';
import { Client as VexClient, KeyRing } from 'libvex';
import { loadEnv } from './utils/loadEnv';

loadEnv();

const keyring = new KeyRing('./keys');
const vexClient = new VexClient('us.vex.chat', keyring, true);

const vexAccount = {
  hostname: 'us.vex.chat',
  pubkey: 'a91904f025749069c4962f9b3e86d34974f4462ee31c18ed72e2b98e31927137',
  serverPubkey:
    '4a94fea243270f1d89de7dfaf5d165840798d963c056eac08fdc76b293b63411',
  uuid: '8604c21f-9b98-4503-bb55-cf27779d6b0f',
};

vexClient.on('ready', async () => {
  await vexClient.auth(vexAccount);
  vexClient.channels.join(process.env.VEX_CHANNEL_ID!);

  console.log('Logged in to vex', vexClient.info());
});

vexClient.on('message', async (message) => {
  const channel = discordClient.channels.cache.get(
    process.env.DISCORD_CHANNEL_ID!
  );
  if (!channel) {
    return;
  }

  if (message.userID !== vexAccount.uuid) {
    (channel as any).send(message.username + ': ' + message.message);
  }
});

const discordClient = new DiscordClient();

discordClient.login(process.env.DISCORD_TOKEN);

discordClient.on('ready', () => {
  console.log(`Logged in as ${discordClient.user!.tag}!`);
});

discordClient.on('message', (msg: Message) => {
  if (msg.channel.id === process.env.DISCORD_CHANNEL_ID) {
    if (msg.author.id !== process.env.DISCORD_USER_ID) {
      vexClient.messages.send(
        process.env.VEX_CHANNEL_ID!,
        msg.author.username + ':  ' + msg.content
      );
    }
  }
});
