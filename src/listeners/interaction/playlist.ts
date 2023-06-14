import type { KoosCommand } from "#lib/extensions";
import { ButtonId, KoosColor, SelectMenuId, SelectMenuValue, TextInputId } from "#utils/constants";
import { canJoinVoiceChannel, mins, parseDuration, sec } from "#utils/functions";
import { deconstruct, generateId } from "#utils/snowflake";
import type { Playlist } from "@prisma/client";
import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import { oneLine, stripIndents } from "common-tags";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    EmbedBuilder,
    GuildMember,
    ModalBuilder,
    StringSelectMenuBuilder,
    TextInputBuilder,
    TextInputStyle,
    time,
    type Interaction,
    type ModalActionRowComponentBuilder,
    type SelectMenuComponentOptionData,
    type VoiceBasedChannel,
} from "discord.js";
import { KazagumoTrack, type RawTrack } from "kazagumo";
import pluralize from "pluralize";

@ApplyOptions<Listener.Options>({
    name: `${Events.InteractionCreate}:playlist`,
    event: Events.InteractionCreate,
})
export class ClientListener extends Listener {
    public async run(interaction: Interaction) {
        const { db, kazagumo } = this.container;

        if (interaction.isButton()) {
            const id = interaction.customId as ButtonId;
            const member = interaction.member as GuildMember;
            if (!this.isValidButton(id)) return;

            if (![`${ButtonId.ManagePlaylist};`, `${ButtonId.Rename};`].some((buttonId) => id.startsWith(buttonId)))
                await interaction.deferUpdate();

            if (id === `${ButtonId.Return}:playlists`) {
                const user = await this.getUser(member.id);
                return interaction.editReply(await this.homePage(user.playlists));
            } else if (id === `${ButtonId.Refresh}:playlists`) {
                const user = await this.getUser(member.id);
                return await interaction.editReply(await this.homePage(user.playlists));
            } else if (id === `${ButtonId.Close}:playlists`) {
                return interaction.deleteReply();
            } else if (id.startsWith(`${ButtonId.Refresh};`)) {
                const user = await this.getUser(member.id);
                const [, playlistId] = id.split(";");

                const playlists = new Map(user.playlists.map((obj) => [obj.id, obj]));

                const playlist = playlists.get(`${playlistId}`);
                if (isNullish(playlist))
                    return interaction.followUp({
                        embeds: [new EmbedBuilder().setDescription(`You do not have that playlist`).setColor(KoosColor.Error)],
                        ephemeral: true,
                    });

                return interaction.editReply(await this.managePlaylist(member, playlist));
            } else if (id.startsWith(`${ButtonId.PlayPlaylist};`)) {
                const [, playlistId] = id.split(";");
                const user = await this.getUser(member.id);

                const playlists = new Map(user.playlists.map((obj) => [obj.id, obj]));
                const playlist = playlists.get(playlistId);
                if (isNullish(playlist))
                    return interaction.followUp({
                        embeds: [new EmbedBuilder().setDescription(`You do not have that playlist`).setColor(KoosColor.Error)],
                        ephemeral: true,
                    });

                await interaction.editReply(
                    await this.playPlaylist(playlist, { message: interaction.message, channel: member.voice.channel! })
                );
            } else if (id.startsWith(`${ButtonId.ManagePlaylist};`)) {
                const [, playlistId] = id.split(";");

                const modal = this.addTracksModal();
                await interaction.showModal(modal);

                const response = await interaction.awaitModalSubmit({
                    filter: (i) => i.user.id === member.id,
                    time: sec(30),
                });
                await response.deferUpdate();

                const query = response.fields.getTextInputValue(TextInputId.AddTracks);
                const [user, result] = await Promise.all([
                    this.getUser(member.id),
                    kazagumo.search(query, { requester: member, engine: "youtube_music" }).catch(() => null),
                ]);

                if (isNullish(result)) {
                    const embed = new EmbedBuilder()
                        .setDescription(`Something went wrong when trying to search`)
                        .setColor(KoosColor.Error);
                    return interaction.followUp({ embeds: [embed], ephemeral: true });
                }
                if (isNullishOrEmpty(result.tracks)) {
                    const embed = new EmbedBuilder()
                        .setDescription(`I couldn't find anything in the query you gave me`)
                        .setColor(KoosColor.Error);
                    return interaction.followUp({ embeds: [embed], ephemeral: true });
                }

                const playlists = new Map(user.playlists.map((obj) => [obj.id, obj]));
                const playlist = playlists.get(playlistId);
                if (isNullish(playlist))
                    return interaction.followUp({
                        embeds: [new EmbedBuilder().setDescription(`You do not have that playlist`).setColor(KoosColor.Error)],
                        ephemeral: true,
                    });

                const msg = await response.followUp({
                    embeds: [new EmbedBuilder().setDescription(`Updating playlist **${playlist.name}**`).setColor(KoosColor.Default)],
                    ephemeral: true,
                });

                const updatedPlaylist = {
                    id: playlist.id,
                    name: playlist.name,
                    tracks: [...playlist.tracks, ...result.tracks.map((track) => JSON.stringify(track.getRaw()))],
                };
                const updatedPlaylists = [...playlists.values()].map((pl): Playlist => {
                    if (pl.id === updatedPlaylist.id) return updatedPlaylist;
                    return pl;
                });

                await db.user.update({ where: { id: member.id }, data: { playlists: updatedPlaylists } });

                return response
                    .editReply({
                        message: msg,
                        embeds: [
                            new EmbedBuilder()
                                .setDescription(`Successfully updated playlist **${playlist.name}**`)
                                .setColor(KoosColor.Default),
                        ],
                    })
                    .then(async () => await response.editReply(await this.managePlaylist(member, updatedPlaylist)));
            } else if (id.startsWith(`${ButtonId.Rename};`)) {
                const [, playlistId] = id.split(";");
                const user = await this.getUser(member.id);

                const playlists = new Map(user.playlists.map((obj) => [obj.id, obj]));
                const playlist = playlists.get(playlistId);
                if (isNullish(playlist))
                    return interaction.followUp({
                        embeds: [new EmbedBuilder().setDescription(`You do not have that playlist`).setColor(KoosColor.Error)],
                        ephemeral: true,
                    });

                const modal = this.renamePlaylistModal(playlist.name);
                await interaction.showModal(modal);

                const response = await interaction.awaitModalSubmit({
                    filter: (i) => i.user.id === member.id,
                    time: sec(30),
                });
                await response.deferUpdate();

                const newName = response.fields.getTextInputValue(TextInputId.RenamePlaylist);
                const msg = await response.followUp({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`Updating playlist **${playlist.name}** name to **${newName}**`)
                            .setColor(KoosColor.Default),
                    ],
                    ephemeral: true,
                });

                const renamedPlaylist = { id: playlist.id, name: newName, tracks: playlist.tracks };
                const updatedPlaylists = [...playlists.values()].map((pl) => {
                    if (pl.id === renamedPlaylist.id) return renamedPlaylist;
                    return pl;
                });

                await db.user.update({ where: { id: member.id }, data: { playlists: updatedPlaylists } });

                return response
                    .editReply({
                        message: msg,
                        embeds: [
                            new EmbedBuilder()
                                .setDescription(
                                    `Successfully updated playlist **${playlist.name}** name to **${renamedPlaylist.name}**`
                                )
                                .setColor(KoosColor.Default),
                        ],
                    })
                    .then(async () => await response.editReply(await this.managePlaylist(member, renamedPlaylist)));
            }
        } else if (interaction.isStringSelectMenu()) {
            const id = interaction.customId as SelectMenuId;
            const member = interaction.member as GuildMember;
            if (id !== SelectMenuId.PlaylistManage) return;

            const [value] = interaction.values;

            if (value === SelectMenuValue.NewPlaylist) {
                const modal = this.newPlaylistModal();
                await interaction.showModal(modal);

                const response = await interaction.awaitModalSubmit({
                    filter: (i) => i.user.id === member.id,
                    time: mins(2),
                });
                await response.deferUpdate();

                const playlistName = response.fields.getTextInputValue(TextInputId.PlaylistName);
                const user = await this.getUser(member.id);
                const playlists = user.playlists;

                const msg = await response.followUp({
                    embeds: [new EmbedBuilder().setDescription(`Creating playlist **${playlistName}**`).setColor(KoosColor.Default)],
                    ephemeral: true,
                });

                if (playlists.some((v) => v.name === playlistName)) {
                    const embed = new EmbedBuilder()
                        .setDescription(`You already have a playlist with that name`)
                        .setColor(KoosColor.Error);
                    const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
                        new ButtonBuilder()
                            .setCustomId(`${ButtonId.Return}:playlists`)
                            .setLabel("Return to list")
                            .setStyle(ButtonStyle.Secondary)
                    );
                    return response.editReply({ embeds: [embed], components: [row], message: msg });
                }

                const newData = await db.user.update({
                    where: { id: member.id },
                    data: {
                        playlists: [...playlists, { id: generateId(), name: playlistName, tracks: [] }],
                    },
                });

                return response
                    .editReply({
                        message: msg,
                        embeds: [
                            new EmbedBuilder()
                                .setDescription(`Successfully created playlist **${playlistName}**`)
                                .setColor(KoosColor.Default),
                        ],
                    })
                    .then(async () => await response.editReply(await this.homePage(newData.playlists)));
            } else if (value.startsWith(`${SelectMenuValue.PlaylistManage};`)) {
                await interaction.deferUpdate();
                const [, playlistId] = value.split(";");

                const user = await this.getUser(member.id);

                const playlists = new Map(user.playlists.map((obj) => [obj.id, obj]));
                const playlist = playlists.get(playlistId);

                if (isNullish(playlist))
                    return interaction.followUp({
                        embeds: [new EmbedBuilder().setDescription(`You do not have that playlist`).setColor(KoosColor.Error)],
                        ephemeral: true,
                    });

                return interaction.editReply(await this.managePlaylist(member, playlist));
            }
        }
    }

    private renamePlaylistModal(playlistName: string) {
        const { client } = this.container;
        const randomId = generateId();
        const modal = new ModalBuilder().setCustomId(randomId).setTitle(client.user!.username);
        const pageInput = new TextInputBuilder()
            .setCustomId(TextInputId.RenamePlaylist)
            .setLabel("New playlist name")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Enter a new name for the playlist")
            .setValue(playlistName)
            .setMinLength(2)
            .setRequired(true);
        const actionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(pageInput);

        modal.setComponents(actionRow);

        return modal;
    }

    private addTracksModal() {
        const { client } = this.container;
        const randomId = generateId();
        const modal = new ModalBuilder().setCustomId(randomId).setTitle(client.user!.username);
        const pageInput = new TextInputBuilder()
            .setCustomId(TextInputId.AddTracks)
            .setLabel("Track's link or title")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Could be a link of the track, or a search term")
            .setMinLength(1)
            .setMaxLength(500)
            .setRequired(true);
        const actionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(pageInput);

        modal.setComponents(actionRow);

        return modal;
    }

    private newPlaylistModal() {
        const { client } = this.container;
        const randomId = generateId();
        const modal = new ModalBuilder().setCustomId(randomId).setTitle(client.user!.username);
        const pageInput = new TextInputBuilder()
            .setCustomId(TextInputId.PlaylistName)
            .setLabel("Playlist name")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Enter a name for the playlist")
            .setRequired(true);
        const actionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(pageInput);

        modal.setComponents(actionRow);

        return modal;
    }

    private async homePage(playlists: Playlist[]) {
        const { client } = this.container;

        const options: SelectMenuComponentOptionData[] = [];
        options.push({ label: "Create new playlist", value: SelectMenuValue.NewPlaylist });

        for (let playlist of playlists) {
            options.push({
                label: playlist.name,
                value: `${SelectMenuValue.PlaylistManage};${playlist.id}`,
                description: `${playlist.tracks.length} ${pluralize("track", playlist.tracks.length)}`,
            });
        }

        const embed = new EmbedBuilder()
            .setAuthor({ name: `${client.user?.username}`, iconURL: client.user?.displayAvatarURL() })
            .setDescription(`Select one of your playlists to manage`)
            .setColor(KoosColor.Default);
        const firstRow = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
            new StringSelectMenuBuilder()
                .setCustomId(SelectMenuId.PlaylistManage)
                .setOptions(options)
                .setPlaceholder(`Choose your playlist to manage`)
        );
        const secondRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder().setCustomId(`${ButtonId.Refresh}:playlists`).setLabel("Refresh").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`${ButtonId.Close}:playlists`).setLabel("Close").setStyle(ButtonStyle.Danger)
        );

        return { embeds: [embed], components: [firstRow, secondRow] };
    }

    private async managePlaylist(member: GuildMember, playlist: Playlist) {
        const createdAt = Math.floor(Number(deconstruct(playlist.id).timestamp) / 1000);
        const totalDuration = playlist.tracks
            .map((track) => JSON.parse(track ?? "{}") as RawTrack)
            .reduce((total, track) => total + (track?.info?.length ?? 0), 0);
        const embed = new EmbedBuilder()
            .setAuthor({ name: `Playlist: ${playlist.name}`, iconURL: member.displayAvatarURL() })
            .setDescription(
                stripIndents`
                    **Songs:** ${playlist.tracks.length}/250
                    **Created:** ${time(createdAt, "R")}
                    **Total duration:** ${parseDuration(totalDuration)}
                `
            )
            .setThumbnail("https://telegra.ph/file/3f3602a9dff4187a72d16.png")
            .setFooter({ text: `ID: ${playlist.id}` })
            .setColor(KoosColor.Default);
        const firstRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder().setCustomId(`${ButtonId.Return}:playlists`).setLabel("Return to list").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`${ButtonId.Refresh};${playlist.id}`).setLabel("Refresh").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`${ButtonId.PlayPlaylist};${playlist.id}`)
                .setLabel("Play playlist")
                .setStyle(ButtonStyle.Secondary)
        );
        const secondRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder()
                .setCustomId(`${ButtonId.ManagePlaylist};${playlist.id}`)
                .setLabel("Manage playlist")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`${ButtonId.Rename};${playlist.id}`).setLabel("Rename").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`${ButtonId.Delete};${playlist.id}`).setLabel("Delete").setStyle(ButtonStyle.Danger)
        );

        return { embeds: [embed], components: [firstRow, secondRow] };
    }

    private async playPlaylist(
        playlist: Playlist,
        { message, channel }: { message: KoosCommand.Message | KoosCommand.ChatInputCommandInteraction; channel: VoiceBasedChannel }
    ) {
        const { kazagumo } = this.container;

        const rawTracks = playlist.tracks.map((track) => JSON.parse(track) as RawTrack);

        const tracks = rawTracks.reduce((array, track) => {
            array.push(new KazagumoTrack(track, message.member));
            return array;
        }, [] as KazagumoTrack[]);

        if (isNullishOrEmpty(tracks)) {
            const embed = new EmbedBuilder()
                .setDescription(`Playlist **${playlist.name}** is empty, please add a track first before playing`)
                .setColor(KoosColor.Error);
            return { embeds: [embed] };
        }

        let player = kazagumo.getPlayer(message.guild!.id);
        if (isNullish(player)) {
            if (!canJoinVoiceChannel(channel)) {
                const embed = new EmbedBuilder()
                    .setDescription(`I cannot join your voice channel. It seem like I don't have the right permissions.`)
                    .setColor(KoosColor.Error);
                return { embeds: [embed] };
            }
            player ??= await kazagumo.createPlayer({
                guildId: message.guildId!,
                textId: message.channelId,
                voiceId: channel.id,
                deaf: true,
                volume: 100,
            });

            if (channel.type === ChannelType.GuildStageVoice) {
                message.guild?.members.me?.voice.setSuppressed(false);
            }
        }

        console.log(tracks);

        player.queue.add(tracks);
        if (!player.playing && !player.paused) player.play();

        const embed = new EmbedBuilder()
            .setDescription(
                oneLine`
                    Queued playlist **${playlist.name}** with
                    ${tracks.length} ${pluralize("track", tracks.length)}
                `
            )
            .setColor(KoosColor.Default);
        return { embeds: [embed] };
    }

    private async getUser(id: string) {
        const user = await this.container.db.user.findUnique({ where: { id } });
        if (isNullish(user)) return await this.container.db.user.create({ data: { id } });

        return user;
    }

    private isValidButton(id: ButtonId) {
        return [
            `${ButtonId.Return}:playlists`,
            `${ButtonId.Refresh}:playlists`,
            `${ButtonId.Close}:playlists`,
            `${ButtonId.Refresh};`,
            `${ButtonId.PlayPlaylist};`,
            `${ButtonId.ManagePlaylist};`,
            `${ButtonId.Rename};`,
            `${ButtonId.Delete};`,
        ].some((buttonId) => id.startsWith(buttonId));
    }
}
