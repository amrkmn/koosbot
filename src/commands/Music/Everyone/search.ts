import { KoosCommand } from "#lib/extensions";
import { embedColor } from "#utils/constants";
import { convertTime, cutText, mins } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { canJoinVoiceChannel } from "@sapphire/discord.js-utilities";
import { Args } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import {
    Message,
    MessageSelectOptionData,
    MessageSelectMenu,
    CommandInteraction,
    MessageEmbed,
    MessageActionRow,
    GuildMember,
} from "discord.js";
import { Kazagumo } from "kazagumo";
import pluralize from "pluralize";

@ApplyOptions<KoosCommand.Options>({
    description: `Searches and lets you choose a song.`,
    preconditions: ["VoiceOnly"],
    usage: "query",
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
                            .setDescription("The url or search term of track you want to play")
                            .setRequired(true)
                    ),
            { idHints: ["1050092844116877416", "1050094769092690020"] }
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputInteraction) {
        const { kazagumo } = this.container;
        const query = interaction.options.getString("query");

        if (!query)
            return interaction.reply({
                embeds: [{ description: "Please provide an URL or search query", color: embedColor.error }],
                ephemeral: true,
            });

        await this.search(kazagumo, interaction, query);
    }

    public async messageRun(message: Message, args: Args) {
        const { kazagumo } = this.container;
        const query = await args.rest("string").catch(() => undefined);
        if (!query)
            return send(message, { embeds: [{ description: "Please provide an URL or search query", color: embedColor.error }] });

        await this.search(kazagumo, message, query);
    }

    private async search(kazagumo: Kazagumo, message: Message | KoosCommand.ChatInputInteraction, query: string) {
        if (message instanceof CommandInteraction && !message.deferred) await message.deferReply();
        const member = message.member as GuildMember;
        const data = await this.container.db.guilds.findUnique({ where: { id: `${message.guildId}` } });
        const options: MessageSelectOptionData[] = [];

        let { tracks, type, playlistName } = await kazagumo.search(query, { requester: message.member });
        tracks = type === "PLAYLIST" ? tracks : tracks.slice(0, 15);

        if (isNullishOrEmpty(tracks)) {
            const embed = new MessageEmbed().setDescription(`No result for that query.`).setColor(embedColor.error);
            message instanceof CommandInteraction
                ? await message.followUp({ embeds: [embed] })
                : await send(message, { embeds: [embed] });
            return;
        } else if (type === "PLAYLIST") {
            let duration = tracks.reduce((all, track) => all + Number(track.length), 0);
            options.push({
                label: cutText(`${playlistName}`, 100),
                description: `Duration: ${convertTime(duration)} | Tracks: ${tracks.length}`,
                value: `${query}`,
            });
        } else {
            for (let track of tracks) {
                options.push({
                    label: cutText(`${track.title}`, 100),
                    description: `Duration: ${convertTime(track.length!)} | Author: ${track.author}`,
                    value: `${track.uri}`,
                });
            }
        }
        options.push({ label: "Cancel", description: "Cancel this search", value: `cancel` });

        const selectMenu = new MessageSelectMenu().setCustomId("searchSongs").setOptions(options).setPlaceholder("Pick a track");

        const embed = new MessageEmbed()
            .setDescription(
                type === "PLAYLIST" ? `Here is the result` : `There are ${tracks.length} ${pluralize("result", tracks.length)}`
            )
            .setColor(embedColor.default);
        const row = new MessageActionRow().setComponents(selectMenu);
        const msg =
            message instanceof CommandInteraction
                ? ((await message.followUp({ embeds: [embed], components: [row] })) as Message)
                : await send(message, { embeds: [embed], components: [row] });

        const collector = msg.createMessageComponentCollector({
            time: mins(1),
            componentType: "SELECT_MENU",
            filter: (i) => i.user.id === message.member?.user.id,
        });

        collector.on("collect", async (interaction) => {
            if (!interaction.isSelectMenu() || interaction.customId !== "searchSongs") return;
            await interaction.deferUpdate();

            let player = kazagumo.getPlayer(`${message.guildId}`);
            try {
                const userOption = Number(interaction.values.at(0));
                if (isNaN(userOption) && interaction.values.at(0) === "cancel") {
                    interaction.followUp({ embeds: [{ description: `Canceled the search`, color: embedColor.default }] });
                    collector.stop("cancel");
                    return;
                }

                const selected = type === "PLAYLIST" && isNaN(userOption) ? tracks : tracks[userOption];

                const title = !Array.isArray(selected)
                    ? selected.sourceName === "youtube"
                        ? `[${selected.title}](${selected.uri})`
                        : `[${selected.title} by ${selected.author}](${selected.uri})`
                    : `[${playlistName}](${interaction.values.at(0)})`;

                if (!player) {
                    if (!canJoinVoiceChannel(member.voice.channel)) {
                        interaction.followUp({
                            embeds: [
                                {
                                    description: `I cannot join your voice channel. It seem like I don't have the right permissions`,
                                    color: embedColor.error,
                                },
                            ],
                        });
                        return;
                    }
                    player ??= await kazagumo.createPlayer({
                        guildId: `${message.guildId}`,
                        textId: `${message.channelId}`,
                        voiceId: `${member.voice.channelId}`,
                        deaf: true,
                        volume: isNullish(data) ? 100 : data.volume,
                    });
                }

                interaction.followUp({
                    embeds: [
                        {
                            description:
                                type === "PLAYLIST"
                                    ? `Queued playlist ${title} with ${tracks.length} ${pluralize("track", tracks.length)}`
                                    : `Queued ${title} at position #${Number(player?.queue.totalSize ?? 0)}`,
                            color: embedColor.default,
                        },
                    ],
                });

                player.queue.add(selected);
                if (!player.playing && !player.paused) player.play();
                collector.stop("picked");
            } catch (error) {
                collector.stop("error");
            }
        });

        collector.on("end", (_, reason) => {
            switch (reason) {
                case "cancel":
                case "picked":
                    let pickedRow = new MessageActionRow().setComponents(
                        selectMenu.setPlaceholder("You already picked a choice").setDisabled(true)
                    );
                    msg.edit({ embeds: [embed], components: [pickedRow] });
                    break;
                case "time":
                    let timedOutRow = new MessageActionRow().setComponents(selectMenu.setPlaceholder("Timed out").setDisabled(true));
                    msg.edit({ embeds: [embed], components: [timedOutRow] });
                    break;
                case "error":
                    msg.edit({
                        embeds: [{ description: `Something went wrong when trying to add track to queue.`, color: embedColor.error }],
                    });
                    break;
            }
        });
    }
}
