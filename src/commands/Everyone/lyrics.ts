import { envParseString } from "#env";
import { MessageEmbed } from "discord.js";
import { embedColor } from "#utils/constants";
import { KoosCommand } from "#lib/extensions";
import { ApplyOptions } from "@sapphire/decorators";
import { Client as GeniusClient } from "genius-lyrics";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import { chunk, cutText, decodeEntities, pagination } from "#utils/functions";
// import { Args } from "@sapphire/framework";
// import { send } from "@sapphire/plugin-editable-commands";
// import { Message, MessageSelectOptionData, MessageActionRow, MessageSelectMenu, TextChannel } from "discord.js";
// import ms from "ms";

@ApplyOptions<KoosCommand.Options>({
    description: "Get the lyrics of a song.",
    // aliases: ["ly"],
    slashOnly: true,
})
export class UserCommand extends KoosCommand {
    genius = new GeniusClient(envParseString("GENIUS_TOKEN"));

    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand(
            (builder) =>
                builder //
                    .setName(this.name)
                    .setDescription(this.description)
                    .addStringOption((option) =>
                        option //
                            .setName("query")
                            .setDescription("The song name to search")
                            .setAutocomplete(true)
                            .setRequired(true)
                    ),
            { idHints: ["1054747570422947931", "1054764188817432597"] }
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputInteraction) {
        let query = interaction.options.getString("query", true);
        if (isNullish(query))
            return interaction.reply({
                embeds: [new MessageEmbed().setDescription("Please provide a song title").setColor(embedColor.error)],
                ephemeral: true,
            });
        await interaction.deferReply();

        const song = await this.genius.songs.get(Number(query));
        const lyrics = await song.lyrics();

        const lyric = chunk(lyrics.split("\n"), 25);

        const embeds = lyric.reduce((prev: MessageEmbed[], curr) => {
            prev.push(
                new MessageEmbed()
                    .setDescription(`${decodeEntities(curr.map((x) => x.replace(/^\[[^\]]+\]$/g, "**$&**")).join("\n"))}`)
                    .setTitle(`${cutText(song.title, 128)}`)
                    .setThumbnail(song.thumbnail)
                    .setURL(song.url)
                    .setColor(embedColor.default)
            );
            return prev;
        }, []);

        pagination({ channel: interaction, embeds, target: interaction.user, fastSkip: true });
    }

    // public async messageRun(message: Message, args: Args) {
    //     const { kazagumo } = this.container;
    //     const player = kazagumo.getPlayer(message.guildId!)!;
    //     const query = await args.rest("string").catch(() => {
    //         if (!player || (player && !player.queue.current)) {
    //             return undefined;
    //         }
    //         return `${player.queue.current?.title}`;
    //     });

    //     const { embed, row } = await this.lyrics(message, query);

    //     const msg = await send(message, { embeds: [embed], components: row ? [row] : undefined });

    //     const collector = msg.createMessageComponentCollector({
    //         filter: (i) => {
    //             if (i.user.id !== message.author.id) {
    //                 i.reply({
    //                     embeds: [{ description: `This select menu can only be use by ${message.author}`, color: embedColor.error }],
    //                     ephemeral: true,
    //                 });
    //                 return false;
    //             }
    //             return true;
    //         },
    //         componentType: "SELECT_MENU",
    //         idle: ms("1m"),
    //     });

    //     collector.on("collect", async (i) => {
    //         if (!i.isSelectMenu()) return;
    //         await i.deferUpdate();
    //         const id = i.customId;
    //         if (id !== "lyricsOptions") return;

    //         await send(message, { embeds: [{ description: "Fetching lyrics...", color: embedColor.default }] });
    //         const song = await this.genius.songs.get(Number(i.values[0]));
    //         const lyrics = await song.lyrics();

    //         const lyric = chunk(lyrics.split("\n"), 25);

    //         const embeds = lyric.reduce((prev: MessageEmbed[], curr) => {
    //             prev.push(
    //                 new MessageEmbed()
    //                     .setDescription(`${decodeEntities(curr.map((x) => x.replace(/^\[[^\]]+\]$/g, "**$&**")).join("\n"))}`)
    //                     .setTitle(`${cutText(song.title, 128)}`)
    //                     .setThumbnail(song.thumbnail)
    //                     .setURL(song.url)
    //                     .setColor(embedColor.default)
    //             );
    //             return prev;
    //         }, []);

    //         await i.deleteReply();
    //         pagination({ channel: message.channel as TextChannel, embeds, target: message.author, fastSkip: true });
    //         collector.stop("selected");
    //         return;
    //     });
    // }

    // private async lyrics(message: Message | KoosCommand.ChatInputInteraction, query?: string) {
    //     if (!query) return { embed: new MessageEmbed().setDescription("Please provide a song title").setColor(embedColor.error) };
    //     let result = await this.genius.songs.search(query);

    //     result = result.slice(0, 10);

    //     if (isNullishOrEmpty(result)) return { embed: new MessageEmbed().setDescription("No result").setColor(embedColor.error) };

    //     const options: MessageSelectOptionData[] = [];

    //     for (let i = 0; i < result.length; i++) {
    //         const song = result[i];
    //         options.push({
    //             label: cutText(`${i + 1}. ${song.fullTitle}`, 100),
    //             value: `${song.id}`,
    //         });
    //     }

    //     const selectMenu = new MessageSelectMenu().setCustomId("lyricsOptions").setOptions(options).setPlaceholder("Make a selection");
    //     const row = new MessageActionRow().setComponents(selectMenu);

    //     const description: string[] = [];

    //     let i = 0;
    //     for (let { fullTitle, url } of result) {
    //         description.push(`**${i++ + 1}.** [${fullTitle}](${url})`);
    //     }
    //     return {
    //         embed: new MessageEmbed().setDescription(description.join("\n")).setColor(embedColor.default),
    //         row,
    //     };
    // }
}
