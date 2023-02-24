import { ApplicationCommandOptionChoiceData, MessageEmbed } from "discord.js";
import { embedColor, Emojis, userAgent } from "#utils/constants";
import { KoosCommand } from "#lib/extensions";
import { ApplyOptions } from "@sapphire/decorators";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import { chunk, cutText, decodeEntities, pagination } from "#utils/functions";
import { request } from "@aytea/request";
import * as cheerio from "cheerio";
import { send } from "@sapphire/plugin-editable-commands";
import { Args } from "@sapphire/framework";
import { Message, MessageSelectOptionData, MessageActionRow, MessageSelectMenu, TextChannel } from "discord.js";
import ms from "ms";

@ApplyOptions<KoosCommand.Options>({
    description: "Get the lyrics of a song.",
    aliases: ["ly"],
    slashOnly: true,
})
export class UserCommand extends KoosCommand {
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
        const { genius } = this.container;

        let query = interaction.options.getString("query", true);
        if (isNullish(query))
            return interaction.reply({
                embeds: [new MessageEmbed().setDescription("Please provide a song title").setColor(embedColor.error)],
                ephemeral: true,
            });
        await interaction.deferReply();

        const song = await genius.songs.get(Number(query)).catch(() => undefined);
        const lyrics = await this.getLyrics(song?.url).catch(() => undefined);
        if (!song)
            return interaction.followUp({
                embeds: [new MessageEmbed().setDescription("Something went wrong!").setColor(embedColor.error)],
            });
        if (!lyrics)
            return interaction.followUp({
                embeds: [new MessageEmbed().setDescription("No result was found").setColor(embedColor.error)],
            });

        const lyric = chunk(lyrics.split("\n"), 25);

        const embeds = lyric.reduce((prev: MessageEmbed[], curr) => {
            prev.push(
                new MessageEmbed()
                    .setDescription(`${decodeEntities(curr.map((x) => x.replace(/^\[[^\]]+\]$/g, "**$&**")).join("\n"))}`)
                    .setTitle(`${cutText(song.fullTitle, 128)}`)
                    .setThumbnail(song.thumbnail)
                    .setURL(song.url)
                    .setColor(embedColor.default)
            );
            return prev;
        }, []);

        await pagination({ channel: interaction, embeds, target: interaction.user, fastSkip: true });
    }
    public async messageRun(message: Message, args: Args) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(message.guildId!)!;
        const query = await args.rest("string").catch(() => {
            if (!player || (player && !player.queue.current)) {
                return undefined;
            }
            return `${player.queue.current?.title}`;
        });

        const { embed, row } = await this.lyrics(query);

        const msg = await send(message, { embeds: [embed], components: row ? [row] : undefined });

        const collector = msg.createMessageComponentCollector({
            filter: (i) => {
                if (i.user.id !== message.author.id) {
                    i.reply({
                        embeds: [{ description: `This select menu can only be use by ${message.author}`, color: embedColor.error }],
                        ephemeral: true,
                    });
                    return false;
                }
                return true;
            },
            componentType: "SELECT_MENU",
            idle: ms("1m"),
        });

        collector.on("collect", async (i) => {
            if (!i.isSelectMenu()) return;
            await i.deferUpdate();
            const id = i.customId;
            if (id !== "lyricsOptions") return;

            await send(message, { embeds: [{ description: "Fetching lyrics...", color: embedColor.default }] });
            const song = await this.container.genius.songs.get(Number(i.values[0])).catch(() => undefined);
            const lyrics = await this.getLyrics(song?.url).catch(() => undefined);
            if (!song) {
                send(message, {
                    embeds: [new MessageEmbed().setDescription("Something went wrong!").setColor(embedColor.error)],
                });
                return;
            }
            if (!lyrics) {
                send(message, {
                    embeds: [new MessageEmbed().setDescription("No result was found").setColor(embedColor.error)],
                });
                return;
            }

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

            await i.deleteReply();
            pagination({ channel: message.channel as TextChannel, embeds, target: message.author, fastSkip: true });
            collector.stop("selected");
            return;
        });
    }
    // public async messageRun(message: Message) {
    //     return send(message, `${Emojis.No} This command can only be used with the slash command.`);
    // }

    public async autocompleteRun(interaction: KoosCommand.AutocompleteInteraction) {
        const { genius } = this.container;

        const query = interaction.options.getFocused(true);

        if (isNullishOrEmpty(query.value)) return interaction.respond([]);
        let songs = await genius.songs.search(query.value);
        songs = songs.slice(0, 10);

        const options: ApplicationCommandOptionChoiceData[] = songs.map((song) => ({
            name: `${cutText(song.fullTitle, 100)}`,
            value: `${song.id}`,
        }));
        return interaction.respond(options);
    }

    private async getLyrics(url?: string) {
        if (!url) throw new Error(`Something went wrong!`);
        try {
            const body = await request(url).agent(userAgent).options({ throwOnError: true }).text();

            const $ = cheerio.load(body);

            const lyrics = $("div[data-lyrics-container=true]")
                .toArray()
                .map((x) => {
                    let ele = $(x);
                    ele.find("div[data-exclude-from-selection=true]").replaceWith("\n");
                    ele.find("br").replaceWith("\n");
                    return ele.text();
                })
                .join("\n")
                .trim();

            return lyrics;
        } catch (error) {
            throw new Error("No result was found");
        }
    }

    private async lyrics(query?: string) {
        if (!query) return { embed: new MessageEmbed().setDescription("Please provide a song title.").setColor(embedColor.error) };
        let result = await this.container.genius.songs.search(query);

        result = result.slice(0, 10);

        if (isNullishOrEmpty(result)) return { embed: new MessageEmbed().setDescription("No result").setColor(embedColor.error) };

        const description = result.map(({ fullTitle, url }, i) => `**${i + 1}.** [${fullTitle}](${url})`);
        const options: MessageSelectOptionData[] = result.map((song, i) => ({
            label: cutText(`${i + 1}. ${song.fullTitle}`, 100),
            value: `${song.id}`,
        }));

        const selectMenu = new MessageSelectMenu().setCustomId("lyricsOptions").setOptions(options).setPlaceholder("Make a selection");

        return {
            embed: new MessageEmbed().setDescription(description.join("\n")).setColor(embedColor.default),
            row: new MessageActionRow().setComponents(selectMenu),
        };
    }
}
