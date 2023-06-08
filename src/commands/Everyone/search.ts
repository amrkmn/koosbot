import { KoosCommand } from "#lib/extensions";
import { ButtonId, KoosColor, SelectMenuId } from "#utils/constants";
import { canJoinVoiceChannel, convertTime, createTitle, cutText, mins, sendLoadingMessage } from "#utils/functions";
import { generateId } from "#utils/snowflake";
import { ApplyOptions } from "@sapphire/decorators";
import { Args } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    CommandInteraction,
    EmbedBuilder,
    GuildMember,
    Message,
    type Snowflake,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ChannelType,
} from "discord.js";
import { Kazagumo, KazagumoTrack } from "kazagumo";
import pluralize from "pluralize";

@ApplyOptions<KoosCommand.Options>({
    description: `Searches and lets you choose a track.`,
    aliases: ["s"],
    preconditions: ["VoiceOnly"],
    detailedDescription: {
        usage: [":query"],
        examples: ["no glory", "https://youtu.be/VwE-tWBrpPs"],
    },
})
export class SearchCommand extends KoosCommand {
    private tracksMap: Map<Snowflake, KazagumoTrack> = new Map<Snowflake, KazagumoTrack>();

    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand((builder) =>
            builder //
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption((option) =>
                    option //
                        .setName("query")
                        .setDescription("The url or search term of track you want to play")
                        .setRequired(true)
                )
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const { kazagumo } = this.container;
        const query = interaction.options.getString("query");

        if (!query)
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription("Please provide a URL or search query").setColor(KoosColor.Error)],
                ephemeral: true,
            });

        await this.search(kazagumo, interaction, query);
    }

    public async messageRun(message: Message, args: Args) {
        await sendLoadingMessage(message);
        const { kazagumo } = this.container;
        const query = await args.rest("string").catch(() => undefined);
        if (!query)
            return send(message, {
                embeds: [new EmbedBuilder().setDescription("Please provide a URL or search query").setColor(KoosColor.Error)],
            });

        await this.search(kazagumo, message, query);
    }

    private async search(kazagumo: Kazagumo, message: Message | KoosCommand.ChatInputCommandInteraction, query: string) {
        if (message instanceof CommandInteraction && !message.deferred) await message.deferReply();
        const member = message.member as GuildMember;
        const data = await this.container.db.guild.findUnique({ where: { id: `${message.guildId}` } });
        const options: StringSelectMenuOptionBuilder[] = [];

        let { tracks, type, playlistName } = await kazagumo.search(query, { requester: message.member });
        tracks = type === "PLAYLIST" ? tracks : tracks.slice(0, 15);

        if (isNullishOrEmpty(tracks)) {
            const embed = new EmbedBuilder().setDescription(`No result for that query.`).setColor(KoosColor.Error);
            message instanceof CommandInteraction
                ? await message.followUp({ embeds: [embed] })
                : await send(message, { embeds: [embed] });
            return;
        } else if (type === "PLAYLIST") {
            let duration = tracks.reduce((all, track) => all + Number(track.length), 0);
            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel(cutText(`${playlistName}`, 100))
                    .setDescription(`Duration: ${convertTime(duration)} | Tracks: ${tracks.length}`)
                    .setValue(`playlist`)
            );
        } else {
            for (let track of tracks) {
                const id = generateId();
                this.tracksMap.set(id, track);

                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(cutText(`${track.title}`, 100))
                        .setDescription(`Duration: ${convertTime(track.length!)} | Author: ${track.author ?? "Unknown artist"}`)
                        .setValue(id)
                );
            }
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(SelectMenuId.Search)
            .setOptions(options)
            .setPlaceholder("Pick a tracks")
            .setMinValues(1)
            .setMaxValues(options.length);
        const cancelButton = new ButtonBuilder().setCustomId(ButtonId.Cancel).setLabel("Cancel").setStyle(ButtonStyle.Danger);

        const embed = new EmbedBuilder()
            .setDescription(
                type === "PLAYLIST" ? `Here is the result` : `There are ${tracks.length} ${pluralize("result", tracks.length)}`
            )
            .setColor(KoosColor.Default);
        const row = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(selectMenu);
        const buttonRow = new ActionRowBuilder<ButtonBuilder>().setComponents(cancelButton);
        const msg =
            message instanceof CommandInteraction
                ? ((await message.followUp({ embeds: [embed], components: [row, buttonRow] })) as Message)
                : await send(message, { embeds: [embed], components: [row, buttonRow] });

        const collector = msg.createMessageComponentCollector({
            time: mins(1),
            filter: (i) => i.user.id === message.member?.user.id && i.message.id === msg.id,
        });

        collector.on("collect", async (interaction) => {
            if (interaction.isButton() && interaction.customId === ButtonId.Cancel) {
                await interaction.deferUpdate();
                interaction.followUp({
                    embeds: [new EmbedBuilder().setDescription(`Canceled the search`).setColor(KoosColor.Default)],
                });
                collector.stop("cancel");
                return;
            } else if (interaction.isStringSelectMenu() && interaction.customId === SelectMenuId.Search) {
                const userOptions = interaction.values;
                await interaction.deferUpdate();

                let player = kazagumo.getPlayer(`${message.guildId}`);
                if (!player) {
                    if (!canJoinVoiceChannel(member.voice.channel)) {
                        interaction.followUp({
                            embeds: [
                                new EmbedBuilder()
                                    .setDescription(
                                        `I cannot join your voice channel. It seem like I don't have the right permissions`
                                    )
                                    .setColor(KoosColor.Error),
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

                    if (member.voice.channel?.type === ChannelType.GuildStageVoice) {
                        message.guild?.members.me?.voice.setSuppressed(false);
                    }
                }

                try {
                    if (userOptions.length === 1 && type === "PLAYLIST" && userOptions[0] === "playlist") {
                        collector.stop("picked");
                        const title = `[${playlistName}](${query})`;

                        player.queue.add(tracks);
                        if (!player.playing && !player.paused) player.play();

                        interaction.followUp({
                            embeds: [
                                new EmbedBuilder()
                                    .setDescription(
                                        `Queued playlist ${title} with ${tracks.length} ${pluralize("track", tracks.length)}`
                                    )
                                    .setColor(KoosColor.Default),
                            ],
                        });

                        return;
                    } else if (userOptions.length >= 1 && type === "SEARCH") {
                        collector.stop("picked");
                        let selected = [];
                        let msg = "";

                        for (let id of userOptions) selected.push(this.tracksMap.get(id)!);

                        if (selected.length > 1) msg = `Queued ${selected.length} ${pluralize("track", selected.length)}`;
                        else msg = `Queued ${createTitle(selected[0])} at position #${player.queue.totalSize ?? 0}`;

                        player.queue.add(selected);
                        if (!player.playing && !player.paused) player.play();

                        interaction.followUp({
                            embeds: [new EmbedBuilder().setDescription(msg).setColor(KoosColor.Default)],
                        });
                        return;
                    } else {
                        collector.stop("picked");
                        let option = userOptions[0];
                        let selected = this.tracksMap.get(option)!;

                        player.queue.add(selected);
                        if (!player.playing && !player.paused) player.play();

                        interaction.followUp({
                            embeds: [
                                new EmbedBuilder()
                                    .setDescription(`Queued ${createTitle(selected)} at position #${player.queue.totalSize ?? 0}`)
                                    .setColor(KoosColor.Default),
                            ],
                        });
                        return;
                    }
                } catch (error) {
                    collector.stop("error");
                }
            }
            collector.stop("error");
        });

        collector.on("end", (_, reason) => {
            const row = new ActionRowBuilder<StringSelectMenuBuilder>();

            switch (reason) {
                case "cancel":
                case "picked":
                    let pickedRow = row.setComponents(selectMenu.setPlaceholder("You already picked a choice").setDisabled(true));
                    msg.edit({ embeds: [embed], components: [pickedRow] });
                    break;
                case "time":
                    let timedOutRow = row.setComponents(selectMenu.setPlaceholder("Timed out").setDisabled(true));
                    msg.edit({ embeds: [embed], components: [timedOutRow] });
                    break;
                case "error":
                    let errorRow = row.setComponents(selectMenu.setPlaceholder("Something went wrong").setDisabled(true));
                    msg.edit({
                        embeds: [
                            new EmbedBuilder()
                                .setDescription(`Something went wrong when trying to add track to queue.`)
                                .setColor(KoosColor.Error),
                        ],
                        components: [errorRow],
                    });
                    break;
            }
        });
    }
}
