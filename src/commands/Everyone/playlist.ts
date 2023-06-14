import { KoosCommand } from "#lib/extensions";
import { ButtonId, KoosColor, SelectMenuId, SelectMenuValue } from "#utils/constants";
import { parseDuration } from "#utils/functions";
import { deconstruct } from "#utils/snowflake";
import { ApplyOptions } from "@sapphire/decorators";
import type { Args } from "@sapphire/framework";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { isNullish } from "@sapphire/utilities";
import { stripIndents } from "common-tags";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder,
    time,
    type GuildMember,
    type Message,
    type SelectMenuComponentOptionData,
} from "discord.js";
import type { RawTrack } from "kazagumo";
import pluralize from "pluralize";

@ApplyOptions<KoosCommand.Options>({
    description: "Manage your created playlists.",
    aliases: ["pl"],
})
export class PlaylistCommand extends KoosCommand {
    public async messageRun(message: Message, args: Args) {
        const { db, client } = this.container;
        const member = message.member as GuildMember;

        const playlistName = await args.pick("string").catch(() => null);
        let user = await db.user.findUnique({ where: { id: member.id } });

        if (isNullish(user)) {
            if (!isNullish(playlistName))
                return reply(message, {
                    embeds: [new EmbedBuilder().setDescription(`You do not have that playlist`).setColor(KoosColor.Error)],
                });

            user = await db.user.create({ data: { id: member.id } });
        }

        if (isNullish(playlistName)) {
            const playlists = user.playlists;

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

            return send(message, { embeds: [embed], components: [firstRow, secondRow] });
        }

        const playlists = new Map(user.playlists.map((obj) => [obj.id, obj]));
        const playlist = playlists.get(playlistName);
        if (isNullish(playlist))
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription(`You do not have that playlist`).setColor(KoosColor.Error)],
            });

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

        return send(message, { embeds: [embed], components: [firstRow, secondRow] });
    }
}
