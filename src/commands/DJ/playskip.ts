import { KoosCommand } from "#lib/extensions";
import { type PlayCommandOptions } from "#lib/types";
import { KoosColor } from "#utils/constants";
import { createTitle, cutText, sendLoadingMessage, canJoinVoiceChannel } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { Args } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import { filterNullishAndEmpty, isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import { oneLine } from "common-tags";
import {
    type ApplicationCommandOptionChoiceData,
    EmbedBuilder,
    GuildMember,
    Message,
    type VoiceBasedChannel,
    ChannelType,
} from "discord.js";
import { KazagumoTrack } from "kazagumo";
import pluralize from "pluralize";

@ApplyOptions<KoosCommand.Options>({
    description: "Play the tracks right away.",
    aliases: ["ps"],
    preconditions: ["VoiceOnly", "DJ"],
    detailedDescription: {
        usage: [":query"],
    },
})
export class PlaySkipCommand extends KoosCommand {
    private tracks: Map<string, string[]> = new Map<string, string[]>();

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

        let index = Number(query.split(":").filter(filterNullishAndEmpty)[1]);
        let player = kazagumo.getPlayer(interaction.guildId!);
        let tracks = this.tracks.get(`${guildId}:${member.id}`) ?? [];
        let selected = query.startsWith("a:") ? tracks[index] : query;
        this.tracks.delete(`${guildId}:${member.id}`);

        const response = await this.playSkip(selected, { message: interaction, player, channel, data });

        await interaction.editReply({
            embeds: [response],
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

        const response = await this.playSkip(query, { message, player, channel, data });

        await send(message, { embeds: [response] });
    }

    public async autocompleteRun(interaction: KoosCommand.AutocompleteInteraction) {
        const { kazagumo } = this.container;
        const query = interaction.options.getFocused(true);
        const guildId = `${interaction.guildId}`;
        const memberId = (interaction.member as GuildMember).id;

        if (!query.value) return interaction.respond([]);
        let { tracks, type, playlistName } = await kazagumo.search(query.value, {
            requester: interaction.member,
            engine: "youtube_music",
        });

        if (type === "PLAYLIST") {
            let tracks = [query.value];
            this.tracks.set(`${guildId}:${memberId}`, tracks);
            return interaction.respond([{ name: cutText(`${playlistName}`, 100), value: `a:${tracks.length - 1}` }]);
        } else {
            tracks = tracks.slice(0, 10);

            this.tracks.set(
                `${guildId}:${memberId}`,
                tracks.map((track) => track.uri)
            );
            const options: ApplicationCommandOptionChoiceData[] = tracks.map((track, i) => {
                const title = createTitle(track, false);
                return {
                    name: `${cutText(title, 100)}`,
                    value: `a:${i}`,
                };
            });

            return interaction.respond(options);
        }
    }

    private async playSkip(query: string, { message, player, channel, data }: PlayCommandOptions) {
        const { kazagumo } = this.container;
        const result = await kazagumo.search(query, { requester: message.member }).catch(() => undefined);
        if (!result) return new EmbedBuilder().setDescription(`Something went wrong`).setColor(KoosColor.Error);
        if (isNullishOrEmpty(result.tracks))
            return new EmbedBuilder().setDescription(`I couldn't find anything in the query you gave me`).setColor(KoosColor.Default);

        if (!player) {
            if (!canJoinVoiceChannel(channel))
                return new EmbedBuilder()
                    .setDescription(`I cannot join your voice channel. It seem like I don't have the right permissions.`)
                    .setColor(KoosColor.Error);
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

        if (result.type === "PLAYLIST") {
            const newQueue: KazagumoTrack[] = [];
            const currentQueue = player.queue.slice();
            player.queue.clear();

            for (let track of result.tracks) newQueue.push(track);

            const playlistLength = result.tracks.length;
            const msg = oneLine`
                Queued playlist [${result.playlistName}](${query}) with
                ${playlistLength} ${pluralize("track", playlistLength)}
            `;

            const firstTrack = newQueue.shift();

            if (!isNullish(player.queue.current)) player.queue.push(player.queue.current);

            for (let track of currentQueue) player.queue.push(track);
            for (let track of newQueue.reverse()) player.queue.unshift(track);
            player.play(firstTrack, { replaceCurrent: true });

            return new EmbedBuilder().setDescription(msg).setColor(KoosColor.Default);
        } else if (["SEARCH", "TRACK"].includes(result.type)) {
            const track = result.tracks[0];
            const title = createTitle(track);

            player.play(track);
            return new EmbedBuilder().setDescription(`Playing ${title} right away`).setColor(KoosColor.Default);
        } else
            return new EmbedBuilder().setDescription(`Something went wrong when trying to play the track`).setColor(KoosColor.Error);
    }
}
