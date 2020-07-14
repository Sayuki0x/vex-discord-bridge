import ax from "axios";
import { Client as DiscordClient, Message } from "discord.js";
import { Client as VexClient, KeyRing } from "libvex";
import { loadEnv } from "./utils/loadEnv";

loadEnv();

const keyring = new KeyRing("./keys");
const vexClient = new VexClient(process.env.VEX_SERVER!, keyring, null);
const username = "BridgeBot";

const markdownImageRegex = /!\[.*?\]\((.*?)\)/g;

let guildMember: any;

vexClient.on("ready", async () => {
  await vexClient.register();
  vexClient.auth();
});

vexClient.on("authed", async () => {
  vexClient.channels.join(process.env.VEX_CHANNEL_ID!);
});

function getURLFromMarkdown(markdown: string) {
  const url = markdown.split("(")[1];
  return url.slice(0, url.length - 1);
}

vexClient.on("message", async (message) => {
  if (message.message.match(markdownImageRegex)) {
    const matches = message.message.match(markdownImageRegex);
    if (matches) {
      message.message = message.message.replace(
        matches[0],
        getURLFromMarkdown(matches[0])
      );
    }
  }

  const channel = discordClient.channels.cache.get(
    process.env.DISCORD_CHANNEL_ID!
  );
  if (!channel) {
    return;
  }

  if (message.userID !== vexClient.info().client?.userID) {
    // await guildMember.setNickname(message.username);
    if (channel) {
      await (channel as any).send(
        "**" + message.username + "**: " + message.message
      );
    }
    // await guildMember.setNickname("MarketTalk");
  }
});

const discordClient: DiscordClient = new DiscordClient();

discordClient.login(process.env.DISCORD_TOKEN);

discordClient.on("ready", async () => {
  console.log(`Logged in as ${discordClient.user!.tag}!`);
  const guild: any = await discordClient.guilds.resolve("579913226129637376");
  guildMember = await guild.members.resolve((discordClient as any).user.id);
});

discordClient.on("message", async (msg: Message) => {
  if (msg.channel.id === process.env.DISCORD_CHANNEL_ID) {
    let attachment = "";
    if (msg.author.id !== process.env.DISCORD_USER_ID) {
      if (msg.attachments.first()) {
        const name = msg.attachments.first()?.name;
        const url = msg.attachments.first()?.url;

        const res = await ax.get(url!, { responseType: "arraybuffer" });
        const fileInfo = await vexClient.files.create(
          res.data,
          "untitled",
          process.env.VEX_CHANNEL_ID!
        );

        // markdown formatted link
        attachment = `![${name || fileInfo.url}](${fileInfo.url})`;
      }

      try {
        await vexClient.users.nick(msg.author.username);
      } catch (err) {
        console.warn(err);
      }

      await vexClient.messages.send(
        process.env.VEX_CHANNEL_ID!,
        msg.content + attachment
      );

      await vexClient.users.nick(username);
    }
  }
});
