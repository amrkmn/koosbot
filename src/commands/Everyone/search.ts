import type { Manager, Track } from "#lib/audio";
import { KoosCommand } from "#lib/extensions";
import { ButtonId, KoosColor, SelectMenuId } from "#utils/constants";
import { canJoinVoiceChannel, convertTime, createTitle, cutText, mins, sendLoadingMessage } from "#utils/functions";
import { generateId } from "#utils/snowflake";
import { ApplyOptions } from "@sapphire/decorators";
import { isAnyInteraction } from "@sapphire/discord.js-utilities";
import { Args } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    EmbedBuilder,
    GuildMember,
    Message,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    type Snowflake,
} from "discord.js";
import pluralize from "pluralize";
import { LoadType } from "shoukaku";

@ApplyOptions<KoosCommand.Options>({
    description: `Searches and lets you choose a track.`,
    aliases: ["s"],
    preconditions: ["VoiceOnly"],
    detailedDescription: {
        usage: [":query"],
    },
})
export class SearchCommand extends KoosCommand {
    private tracksMap: Map<Snowflake, Track> = new Map<Snowflake, Track>();

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
        const { manager } = this.container;
        const query = interaction.options.getString("query");

        if (!query)
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription("Please provide a URL or search query").setColor(KoosColor.Error)],
                ephemeral: true,
            });

        await this.search(manager, interaction, query);
    }

    public async messageRun(message: Message, args: Args) {
        await sendLoadingMessage(message);
        const { manager } = this.container;
        const query = await args.rest("string").catch(() => undefined);
        if (!query)
            return send(message, {
                embeds: [new EmbedBuilder().setDescription("Please provide a URL or search query").setColor(KoosColor.Error)],
            });

        await this.search(manager, message, query);
    }

    private async search(manager: Manager, message: Message | KoosCommand.ChatInputCommandInteraction, query: string) {
        if (isAnyInteraction(message) && !message.deferred) await message.deferReply();
        const member = message.member as GuildMember;
        const data = await this.container.db.guild.findUnique({ where: { id: `${message.guildId}` } });
        const options: StringSelectMenuOptionBuilder[] = [];

        let { tracks, loadType, playlistName } = await manager.search(query, { requester: message.member as GuildMember });
        tracks = loadType === LoadType.PLAYLIST ? tracks : tracks.slice(0, 15);

        if (isNullishOrEmpty(tracks)) {
            const embed = new EmbedBuilder().setDescription(`No result for that query.`).setColor(KoosColor.Error);
            isAnyInteraction(message) //
                ? await message.followUp({ embeds: [embed] })
                : await send(message, { embeds: [embed] });
            return;
        } else if (loadType === LoadType.PLAYLIST) {
            let duration = tracks.reduce((total, track) => total + Number(track.length), 0);
            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel(cutText(`${playlistName}`, 100))
                    .setDescription(`Duration: ${convertTime(duration)} | Tracks: ${tracks.length}`)
                    .setValue(SelectMenuId.Playlist)
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
                loadType === LoadType.PLAYLIST
                    ? `Here is the result for that query`
                    : `There are ${tracks.length} ${pluralize("result", tracks.length)}`
            )
            .setColor(KoosColor.Default);
        const selectMenurow = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(selectMenu);
        const buttonRow = new ActionRowBuilder<ButtonBuilder>().setComponents(cancelButton);
        const msg = isAnyInteraction(message)
            ? await message.followUp({ embeds: [embed], components: [selectMenurow, buttonRow] })
            : await send(message, { embeds: [embed], components: [selectMenurow, buttonRow] });

        const collector = msg.createMessageComponentCollector({
            time: mins(1),
            filter: (i) => i.user.id === message.member?.user.id && i.message.id === msg.id,
        });

        collector.on("collect", async (interaction) => {
            if (
                (interaction.isButton() && interaction.customId === ButtonId.Cancel) ||
                (interaction.isStringSelectMenu() && interaction.customId === SelectMenuId.Search)
            )
                await interaction.deferUpdate();

            if (interaction.isButton() && interaction.customId === ButtonId.Cancel) {
                const embed = new EmbedBuilder().setDescription(`Cancelled the search`).setColor(KoosColor.Default);
                interaction.editReply({ embeds: [embed], components: [] });
                return collector.stop("cancelled");
            } else if (interaction.isStringSelectMenu() && interaction.customId === SelectMenuId.Search) {
                const userOptions = interaction.values;

                let player = manager.players.get(`${message.guildId}`);
                if (!player) {
                    if (!canJoinVoiceChannel(member.voice.channel)) {
                        const embed = new EmbedBuilder()
                            .setDescription(`I cannot join your voice channel. It seem like I don't have the right permissions`)
                            .setColor(KoosColor.Error);
                        interaction.followUp({ embeds: [embed] });
                        return;
                    }
                    player ??= await manager.createPlayer({
                        guildId: `${message.guildId}`,
                        textChannel: `${message.channelId}`,
                        voiceChannel: `${member.voice.channelId}`,
                        selfDeafen: true,
                        volume: isNullish(data) ? 100 : data.volume,
                    });

                    if (member.voice.channel?.type === ChannelType.GuildStageVoice) {
                        message.guild?.members.me?.voice.setSuppressed(false);
                    }
                }

                try {
                    if (userOptions.length === 1 && loadType === LoadType.PLAYLIST && userOptions[0] === SelectMenuId.Playlist) {
                        const title = `[${playlistName}](${query})`;

                        player.queue.add(tracks);
                        if (!player.playing && !player.paused) player.play();

                        const embed = new EmbedBuilder()
                            .setDescription(`Queued playlist ${title} with ${tracks.length} ${pluralize("track", tracks.length)}`)
                            .setColor(KoosColor.Default);
                        interaction.editReply({ embeds: [embed], components: [] });
                        return collector.stop("picked");
                    } else if (userOptions.length >= 1 && loadType === LoadType.PLAYLIST) {
                        let selected = [];
                        let msg = "";

                        for (let id of userOptions) selected.push(this.tracksMap.get(id)!);

                        if (selected.length > 1) msg = `Queued ${selected.length} ${pluralize("track", selected.length)}`;
                        else msg = `Queued ${createTitle(selected[0])} at position #${player.queueTotal}`;

                        player.queue.add(selected);
                        if (!player.playing && !player.paused) player.play();

                        const embed = new EmbedBuilder().setDescription(msg).setColor(KoosColor.Default);
                        interaction.editReply({
                            embeds: [embed],
                            components: [],
                        });
                        return collector.stop("picked");
                    } else {
                        let option = userOptions[0];
                        let selected = this.tracksMap.get(option)!;

                        player.queue.add(selected);
                        if (!player.playing && !player.paused) player.play();

                        const embed = new EmbedBuilder()
                            .setDescription(`Queued ${createTitle(selected)} at position #${player.queueTotal}`)
                            .setColor(KoosColor.Default);
                        interaction.editReply({ embeds: [embed], components: [] });
                        return collector.stop("picked");
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
                case "time":
                    let timedOutRow = row.setComponents(selectMenu.setPlaceholder("Timed out").setDisabled(true));
                    msg.edit({ embeds: [embed], components: [timedOutRow] });
                    break;
                case "error":
                    let errorEmbed = new EmbedBuilder()
                        .setDescription(`Something went wrong when trying to add track to queue.`)
                        .setColor(KoosColor.Error);
                    msg.edit({ embeds: [errorEmbed], components: [] });
                    break;
            }
        });
    }
}
