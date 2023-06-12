import { KoosCommand } from "#lib/extensions";
import { type PlayOptions } from "#lib/types";
import { KoosColor } from "#utils/constants";
import { canJoinVoiceChannel, createTitle, cutText, sendLoadingMessage } from "#utils/functions";
import { generateId } from "#utils/snowflake";
import { ApplyOptions } from "@sapphire/decorators";
import { Args } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import { oneLine } from "common-tags";
import {
    type ApplicationCommandOptionChoiceData,
    ChannelType,
    EmbedBuilder,
    GuildMember,
    Message,
    type Snowflake,
    type VoiceBasedChannel,
} from "discord.js";
import { KazagumoTrack } from "kazagumo";
import pluralize from "pluralize";

@ApplyOptions<KoosCommand.Options>({
    description: "Add a track to queue.",
    aliases: ["p"],
    preconditions: ["VoiceOnly"],
    detailedDescription: {
        usage: [":query"],
    },
})
export class PlayCommand extends KoosCommand {
    private tracks: Map<Snowflake, Map<Snowflake, string>> = new Map<Snowflake, Map<Snowflake, string>>();

    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand((builder) =>
            builder //
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption((option) =>
                    option //
                        .setName("query")
                        .setDescription("Could be a link of the track, or a search term")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        await interaction.deferReply();

        const { kazagumo, db } = this.container;
        const guildId = `${interaction.guildId}`;
        const query = interaction.options.getString("query", true)!;

        const data = await db.guild.findUnique({ where: { id: guildId } });

        const member = interaction.member! as GuildMember;
        const channel = member.voice.channel as VoiceBasedChannel;

        let player = kazagumo.getPlayer(interaction.guildId!);
        let tracks = this.tracks.get(`${guildId}:${member.id}`) ?? new Map<string, string>();
        let selected = tracks.has(query) ? tracks.get(query)! : query;

        this.tracks.delete(`${guildId}:${member.id}`);

        await interaction.editReply({
            embeds: [await this.play(selected, { message: interaction, player, channel, data })],
        });
    }

    public async messageRun(message: Message, args: Args) {
        await sendLoadingMessage(message);
        const { kazagumo, db } = this.container;
        const data = await db.guild.findUnique({ where: { id: `${message.guildId}` } });
        const attachment = message.attachments.first();
        const query = attachment ? attachment.proxyURL : await args.rest("string").catch(() => undefined);
        if (!query)
            return await send(message, {
                embeds: [new EmbedBuilder().setDescription("Please provide a URL or search query").setColor(KoosColor.Error)],
            });

        const channel = message.member?.voice.channel as VoiceBasedChannel;
        let player = kazagumo.getPlayer(message.guildId!);

        await send(message, { embeds: [await this.play(query, { message, player, channel, data })] });
    }

    public async autocompleteRun(interaction: KoosCommand.AutocompleteInteraction) {
        const { kazagumo } = this.container;
        const query = interaction.options.getFocused(true);
        const guildId = `${interaction.guildId}`;
        const memberId = (interaction.member as GuildMember).id;
        const tracksMap = new Map<string, string>();

        const queryId = generateId();
        const options: ApplicationCommandOptionChoiceData[] = [];

        if (isNullishOrEmpty(query.value)) return interaction.respond([]);
        let { tracks, type, playlistName } = await kazagumo.search(query.value, {
            requester: interaction.member,
            engine: "youtube_music",
        });

        tracksMap.set(queryId, query.value);
        options.push({ name: cutText(`${query.value}`, 100), value: queryId });

        if (type === "PLAYLIST") {
            const id = generateId();
            const tracks = tracksMap.set(id, query.value);

            this.tracks.set(`${guildId}:${memberId}`, tracks);
            options.push({ name: cutText(`${playlistName}`, 100), value: id });

            return interaction.respond(options);
        } else {
            tracks = tracks.slice(0, 10);

            for (let track of tracks) {
                const id = generateId();
                const author = track.author;
                const title = `${track.title} ${author && author.toLowerCase() !== "unknown artist" ? `by ${author}` : ``}`;

                tracksMap.set(id, track.uri);

                options.push({
                    name: `${cutText(title, 100)}`,
                    value: id,
                });
            }

            this.tracks.set(`${guildId}:${memberId}`, tracksMap);

            return interaction.respond(options);
        }
    }

    private async play(query: string, { message, player, channel, data }: PlayOptions) {
        const { kazagumo } = this.container;
        const result = await kazagumo.search(query, { requester: message.member }).catch(() => undefined);
        if (!result) return new EmbedBuilder().setDescription(`Something went wrong when trying to search`).setColor(KoosColor.Error);
        if (isNullishOrEmpty(result.tracks))
            return new EmbedBuilder().setDescription(`I couldn't find anything in the query you gave me`).setColor(KoosColor.Error);

        if (!player) {
            if (!canJoinVoiceChannel(channel)) {
                return new EmbedBuilder()
                    .setDescription(`I cannot join your voice channel. It seem like I don't have the right permissions.`)
                    .setColor(KoosColor.Error);
            }
            player ??= await kazagumo.createPlayer({
                guildId: message.guildId!,
                textId: message.channelId!,
                voiceId: channel!.id,
                deaf: true,
                volume: isNullish(data) ? 100 : data.volume,
            });

            if (channel.type === ChannelType.GuildStageVoice) {
                message.guild?.members.me?.voice.setSuppressed(false);
            }
        }

        let msg: string = "";
        let queue: KazagumoTrack[] = [];

        switch (result.type) {
            case "PLAYLIST":
                for (let track of result.tracks) queue.push(track);
                const playlistLength = result.tracks.length;
                msg = oneLine`
                    Queued playlist [${result.playlistName}](${query}) with
                    ${playlistLength} ${pluralize("track", playlistLength)}
                `;
                break;
            case "SEARCH":
            case "TRACK":
                let [track] = result.tracks;
                let title = createTitle(track);

                queue.push(track);
                const position = player.queue.totalSize ?? 0;
                msg = `Queued ${title} at position #${position}`;
                break;
        }

        player.queue.add(queue);
        if (!player.playing && !player.paused) player.play();

        return new EmbedBuilder().setDescription(msg).setColor(KoosColor.Default);
    }
}
