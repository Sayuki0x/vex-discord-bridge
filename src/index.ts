import { sleep } from "@extrahash/sleep";
import { Client as VexClient, IFile, IUser } from "@vex-chat/libvex";
import ax from "axios";
import { Client as DiscordClient, Message } from "discord.js";
import FileType from "file-type";
import fs from "fs";

import { loadEnv } from "./utils/loadEnv";

if (!fs.existsSync("./emojis.json")) {
    fs.writeFileSync("./emojis.json", "{}", { flag: "wx" });
}

const emojiList = JSON.parse(
    fs.readFileSync("./emojis.json", { encoding: "utf8" })
);

loadEnv();
export const {
    VEX_CHANNEL_ID,
    PK,
    PW,
    DISCORD_TOKEN,
    DISCORD_SERVER_ID,
    DISCORD_CHANNEL_ID,
} = process.env;

main();

async function main() {
    const vexClient = await VexClient.create(PK!);
    const username = "BridgeBot";

    const markdownImageRegex = /!\[.*?\]\((.*?)\)/g;

    let guildMember: any;

    const userRecords: Record<string, IUser> = {};

    const err2 = await vexClient.login(username, PW!);
    if (err2) {
        console.error(err2.toString());
    }

    console.log(vexClient.me.user());

    await vexClient.connect();

    function getURLFromMarkdown(markdown: string) {
        const url = markdown.split("(")[1];
        return url.slice(0, url.length - 1);
    }

    vexClient.on("disconnect", () => {
        console.log("The vex client disconnected.");
        process.exit(1);
    });

    vexClient.on("message", async (message) => {
        if (message.group !== process.env.VEX_CHANNEL_ID) {
            return;
        }

        const channel = discordClient.channels.cache.get(
            process.env.DISCORD_CHANNEL_ID!
        );
        if (!channel) {
            return;
        }

        if (!userRecords[message.authorID]) {
            const [user, err] = await vexClient.users.retrieve(
                message.authorID
            );
            if (err) {
                console.error(err);
                return;
            }
            userRecords[message.authorID] = user!;
        }

        if (message.authorID !== vexClient.me.user().userID) {
            if (channel) {
                (channel as any).send(
                    "**" +
                        userRecords[message.authorID].username +
                        "**: " +
                        message.message
                );
            }
        }
    });

    const discordClient: DiscordClient = new DiscordClient();

    discordClient.login(DISCORD_TOKEN);

    discordClient.on("disconnect", () => {
        console.log("The discord client disconnected.");
        process.exit(1);
    });

    discordClient.on("ready", async () => {
        console.log(`Logged in as ${discordClient.user!.tag}!`);

        await discordClient.user?.setStatus("invisible");

        const guild: any = await discordClient.guilds.resolve(
            DISCORD_SERVER_ID!
        );
        guildMember = await guild.members.resolve(
            (discordClient as any).user.id
        );
    });

    const emojiRegex = /<a?:\S+:\d{18}>/g;

    const getEmojiID = (emojiString: string) => {
        return [
            emojiString.split(":")[1],
            emojiString
                .split(":")[2]
                .slice(0, emojiString.split(":")[2].length - 1),
        ];
    };

    discordClient.on("message", async (msg: Message) => {
        if (msg.channel.id === process.env.DISCORD_CHANNEL_ID) {
            if (msg.author.id !== process.env.DISCORD_USER_ID) {
                // const emojiMatches = msg.content.match(emojiRegex);

                // if (emojiMatches) {
                //   for (const emojiString of emojiMatches) {
                //     const [emojiName, emojiID] = getEmojiID(emojiString);
                //     const res = await ax.get(
                //         `https://cdn.discordapp.com/emojis/${emojiID}`,
                //         { responseType: "arraybuffer" }
                //       );
                //       const [fileInfo, key] = await vexClient.files.create(
                //         res.data
                //       );
                //       const type = await FileType.fromBuffer(res.data);
                //       await vexClient.messages.group(VEX_CHANNEL_ID!, fileToString(emojiName, fileInfo, key, type?.mime || "image"))
                //   }
                // }

                // if (msg.attachments.first()) {
                //     const name = msg.attachments.first()?.name;
                //     const url = msg.attachments.first()?.url;

                //     const res = await ax.get(url!, {
                //         responseType: "arraybuffer",
                //     });
                //     const [details, key] = await vexClient.files.create(
                //         res.data
                //     );

                //     const attachmentType = await FileType.fromBuffer(res.data);
                //     // markdown formatted link
                //     vexClient.messages.group(
                //         VEX_CHANNEL_ID!,
                //         fileToString(
                //             name || "file",
                //             details,
                //             key,
                //             attachmentType?.mime || "unknown"
                //         )
                //     );
                // }

                vexClient.messages.group(
                    VEX_CHANNEL_ID!,
                    `${msg.author.username}: ${msg.content}`
                );
            }
        }
    });
}

const fileToString = (name: string, file: IFile, key: string, type: string) => {
    return `{{${name}:${file.fileID}:${key}:${type}}}`;
};
