import { Client as DiscordClient, Message } from "discord.js";
import { Client as VexClient, KeyRing } from "libvex";
import { loadEnv } from "./utils/loadEnv";

loadEnv();

const keyring = new KeyRing("./keys");
const vexClient = new VexClient("dev.vex.chat", keyring, null);
const username = "BridgeBot";

vexClient.on("ready", async () => {
  vexClient.auth();
});

vexClient.on("authed", async () => {
  console.log("great!");
  await vexClient.channels.join(process.env.VEX_CHANNEL_ID!);
});

vexClient.on("bridge-ready" as any, async () => {
  // do something
});

vexClient.on("message", async (message) => {
  const channel = discordClient.channels.cache.get(
    process.env.DISCORD_CHANNEL_ID!
  );
  if (!channel) {
    return;
  }

  if (message.userID !== vexClient.info().client?.userID) {
    (channel as any).send("**" + message.username + "**: " + message.message);
  }
});

const discordClient = new DiscordClient();

discordClient.login(process.env.DISCORD_TOKEN);

discordClient.on("ready", () => {
  console.log(`Logged in as ${discordClient.user!.tag}!`);
});

discordClient.on("message", async (msg: Message) => {
  if (msg.channel.id === process.env.DISCORD_CHANNEL_ID) {
    let attachment = "";
    if (msg.author.id !== process.env.DISCORD_USER_ID) {
      if (msg.attachments.first()) {
        const name = msg.attachments.first()?.name;
        const url = msg.attachments.first()?.url;

        // markdown formatted link
        attachment = ` [${name || url}](${url})`;
      }

      await vexClient.users.nick(msg.author.username);

      await vexClient.messages.send(
        process.env.VEX_CHANNEL_ID!,
        msg.content + attachment
      );

      await vexClient.users.nick(username);
    }
  }
});
