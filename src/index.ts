import { sleep } from "@extrahash/sleep";
import { Client as VexClient, IFile, IUser } from "@vex-chat/libvex";
import { XTypes } from "@vex-chat/types";
import ax from "axios";
import { Client as DiscordClient, Message } from "discord.js";
import log from "electron-log";
import FileType from "file-type";
import fs from "fs";

import { loadEnv } from "./utils/loadEnv";

const fileRegex = /{{[^]+}}/;

const discordMentionRegex = /(<@!\d+>)/g;

const disordUsernames: Record<string, string> = {};

if (!fs.existsSync("./emojis.json")) {
    fs.writeFileSync("./emojis.json", "{}", { flag: "wx" });
}

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

    let guildMember: any;

    const userRecords: Record<string, IUser> = {};

    const err2 = await vexClient.login(username, PW!);
    if (err2) {
        console.error(err2.toString());
    }

    let emojiList: XTypes.SQL.IEmoji[] = await vexClient.emoji.retrieveList();

    const containsEmoji = (name: string): boolean => {
        for (const emoji of emojiList) {
            if (name === emoji.name) {
                return true;
            }
        }
        return false;
    };

    const getEmoji = (name: string): XTypes.SQL.IEmoji | null => {
        for (const emoji of emojiList) {
            if (name === emoji.name) {
                return emoji;
            }
        }
        return null;
    };

    // fs.readdir("./emojis", (err, files) => {
    //     for (const filePath of files) {
    //         const emojiName = filePath.split("-").shift();
    //         if (!emojiName || containsEmoji(emojiName)) {
    //             continue;
    //         }
    //         const buf = fs.readFile("./emojis/"+filePath,  (err, buf) => {
    //             if (err) {
    //                 console.warn(err.toString());
    //                 return;
    //             }
    //             vexClient.emoji.create(buf, emojiName);
    //         })
    //     }
    // })

    log.info(vexClient.me.user());

    await vexClient.connect();

    function getURLFromMarkdown(markdown: string) {
        const url = markdown.split("(")[1];
        return url.slice(0, url.length - 1);
    }

    vexClient.on("disconnect", () => {
        console.error("The vex client disconnected.");
        process.exit(1);
    });

    vexClient.on("message", async (message) => {
        if (message.group !== process.env.VEX_CHANNEL_ID) {
            return;
        }

        // don't echo the bot
        if (message.authorID === "32f01b3c-0424-46eb-a3c1-c4ec9fb5fcf9") {
            return;
        }

        if (message.message.match(fileRegex) !== null) {
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
                await (channel as any).send(
                    userRecords[message.authorID].username +
                        ": " +
                        message.message
                );
            }
        }
    });

    const discordClient: DiscordClient = new DiscordClient();

    discordClient.login(DISCORD_TOKEN);

    discordClient.on("disconnect", () => {
        console.error("The discord client disconnected.");
        process.exit(1);
    });

    discordClient.on("ready", async () => {
        log.info(`Logged in as ${discordClient.user!.tag}!`);

        await discordClient.user?.setStatus("invisible");

        const guild: any = await discordClient.guilds.resolve(
            DISCORD_SERVER_ID!
        );
        guildMember = await guild.members.resolve(
            (discordClient as any).user.id
        );

        (async () => {
            while (true) {
                if (guildMember.nickname !== "PepeBot") {
                    await guildMember.setNickname("PepeBot");
                }
                await sleep(1000);
            }
        })();
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
        if (disordUsernames[msg.author.id] === undefined) {
            disordUsernames[msg.author.id] = msg.author.username;
        }
        if (msg.channel.id === process.env.DISCORD_CHANNEL_ID) {
            if (msg.author.id !== process.env.DISCORD_USER_ID) {
                let message = msg.content;
                const emojiMatches = msg.content.match(emojiRegex);

                if (emojiMatches) {
                    for (const emojiString of emojiMatches) {
                        const [emojiName, emojiID] = getEmojiID(emojiString);
                        const res = await ax.get(
                            `https://cdn.discordapp.com/emojis/${emojiID}`,
                            { responseType: "arraybuffer" }
                        );
                        const buf: Buffer = res.data;

                        if (!containsEmoji(emojiName)) {
                            const emoji = await vexClient.emoji.create(
                                buf,
                                emojiName
                            );
                            if (!emoji) {
                                throw new Error("Couldn't create emoji!");
                            }
                            emojiList = await vexClient.emoji.retrieveList();
                            message = message.replace(
                                emojiString,
                                emojiToString(emoji)
                            );
                        } else {
                            const emoji = getEmoji(emojiName);
                            if (!emoji) {
                                throw new Error("Couldn't fetch emoji!");
                            }
                            message = message.replace(
                                emojiString,
                                emojiToString(emoji)
                            );
                        }
                    }
                }

                const matches = message.match(discordMentionRegex);
                if (matches) {
                    for (const match of matches) {
                        const userID = match.replace(/[@<!>]/g, "");
                        log.info(userID);
                        if (disordUsernames[userID] === undefined) {
                            const user = discordClient.users.resolve(userID);
                            if (user) {
                                disordUsernames[userID] = user.username;
                            }
                        }
                        if (!disordUsernames[userID]) {
                            throw new Error(
                                "Something is wrong gettging users!"
                            );
                        }
                        message = message.replace(
                            match,
                            `**@${disordUsernames[userID]}**`
                        );
                    }
                }

                vexClient.messages.group(
                    VEX_CHANNEL_ID!,
                    `**${msg.author.username}**: ${message}`
                );

                if (msg.attachments.first()) {
                    const name = msg.attachments.first()?.name;
                    const url = msg.attachments.first()?.url;

                    const res = await ax.get(url!, {
                        responseType: "arraybuffer",
                    });
                    const [details, key] = await vexClient.files.create(
                        res.data
                    );

                    const attachmentType = await FileType.fromBuffer(res.data);
                    // markdown formatted link
                    vexClient.messages.group(
                        VEX_CHANNEL_ID!,
                        fileToString(
                            name || "file",
                            details,
                            key,
                            attachmentType?.mime || "unknown"
                        )
                    );
                }
            }
        }
    });
}

const normalizeLength = (s: string) => {
    while (s.length < 25) {
        s += " ";
    }
    return s;
};

const fileToString = (name: string, file: IFile, key: string, type: string) => {
    return `{{${name}:${file.fileID}:${key}:${type}}}`;
};

const emojiToString = (emoji: XTypes.SQL.IEmoji): string => {
    return `<<${emoji.name}:${emoji.emojiID}>>`;
};
