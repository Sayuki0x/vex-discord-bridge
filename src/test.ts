import crypto from "crypto";
import {
  Client as DiscordClient,
  Guild,
  GuildMember,
  Message,
} from "discord.js";
import { loadEnv } from "./utils/loadEnv";

loadEnv();

const discordClient: DiscordClient = new DiscordClient();
discordClient.login(process.env.DISCORD_TOKEN);

discordClient.on("ready", async () => {
  console.log(`Logged in as ${discordClient.user!.tag}!`);

  const guild: any = await discordClient.guilds.resolve("579913226129637376");
  const guildMember: any = await guild.members.resolve(
    (discordClient as any).user.id
  );
  await guildMember.setNickname(crypto.randomBytes(4).toString("hex"));
});
