import { KoosCommand } from "#lib/extensions";
import { SearchEngine, type PlayCommandOptions } from "#lib/types";
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
import pluralize from "pluralize";
import { LoadType } from "shoukaku";

@ApplyOptions<KoosCommand.Options>({
    description: "Insert the tracks right after the current song playing.",
    aliases: ["pt"],
    preconditions: ["VoiceOnly", "DJ"],
    detailedDescription: {
        usage: [":query"],
    },
})
export class PlayTopCommand extends KoosCommand {
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

        const { manager, db } = this.container;
        const guildId = `${interaction.guildId}`;
        const query = interaction.options.getString("query", true)!;

        const data = await db.guild.findUnique({ where: { id: guildId } });

        const member = interaction.member! as GuildMember;
        const channel = member.voice.channel as VoiceBasedChannel;

        let index = Number(query.split(":").filter(filterNullishAndEmpty)[1]);
        let player = manager.players.get(interaction.guildId!);
        let tracks = this.tracks.get(`${guildId}:${member.id}`) ?? [];
        let selected = query.startsWith("a:") ? tracks[index] : query;
        this.tracks.delete(`${guildId}:${member.id}`);

        // await this.playSkip(selected, { message: interaction, player, channel, data });
        await interaction.editReply({
            embeds: [await this.playTop(selected, { message: interaction, player, channel, data })],
        });
    }

    public async messageRun(message: Message, args: Args) {
        await sendLoadingMessage(message);
        const { manager, db } = this.container;
        const data = await db.guild.findUnique({ where: { id: `${message.guildId}` } });
        const attachment = message.attachments.first();
        const query = attachment ? attachment.proxyURL : await args.rest("string").catch(() => undefined);
        if (!query)
            return await send(message, {
                embeds: [new EmbedBuilder().setDescription("Please provide a URL or search query").setColor(KoosColor.Error)],
            });

        const channel = message.member?.voice.channel as VoiceBasedChannel;
        let player = manager.players.get(message.guildId!);

        // await this.playSkip(query, { message, player, channel, data });
        await send(message, { embeds: [await this.playTop(query, { message, player, channel, data })] });
    }

    public async autocompleteRun(interaction: KoosCommand.AutocompleteInteraction) {
        const { manager } = this.container;
        const query = interaction.options.getFocused(true);
        const guildId = `${interaction.guildId}`;
        const memberId = (interaction.member as GuildMember).id;

        if (!query.value) return interaction.respond([]);
        let { tracks, loadType, playlistName } = await manager.search(query.value, {
            requester: interaction.member as GuildMember,
            engine: SearchEngine.YoutubeMusic,
        });

        if (loadType === LoadType.PLAYLIST) {
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

    private async playTop(query: string, { message, player, channel, data }: PlayCommandOptions) {
        const { manager } = this.container;
        const result = await manager.search(query, { requester: message.member as GuildMember }).catch(() => undefined);
        if (!result) return new EmbedBuilder().setDescription(`Something went wrong`).setColor(KoosColor.Error);
        if (isNullishOrEmpty(result.tracks))
            return new EmbedBuilder().setDescription(`I couldn't find anything in the query you gave me`).setColor(KoosColor.Default);

        if (!player) {
            if (!canJoinVoiceChannel(channel))
                return new EmbedBuilder()
                    .setDescription(`I cannot join your voice channel. It seem like I don't have the right permissions.`)
                    .setColor(KoosColor.Error);
            player ??= await manager.createPlayer({
                guildId: message.guildId!,
                textChannel: message.channelId!,
                voiceChannel: channel!.id,
                selfDeafen: true,
                volume: isNullish(data) ? 100 : data.volume,
            });

            if (channel.type === ChannelType.GuildStageVoice) {
                message.guild?.members.me?.voice.setSuppressed(false);
            }
        }

        let msg: string = "";
        switch (result.loadType) {
            case LoadType.PLAYLIST:
                for (let track of result.tracks.reverse()) player.queue.unshift(track);
                const playlistLength = result.tracks.length;
                msg = oneLine`
                    Queued playlist [${result.playlistName}](${query}) with
                    ${playlistLength} ${pluralize("track", playlistLength)}
                `;
                break;
            case LoadType.SEARCH:
            case LoadType.TRACK:
                let [track] = result.tracks;
                let title = createTitle(track);

                player.queue.unshift(track);
                msg = `Queued ${title} at position #0`;
                break;
        }

        if (!player.playing && !player.paused) player.play();

        return new EmbedBuilder().setDescription(msg).setColor(KoosColor.Default);
    }
}
