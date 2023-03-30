import { Args } from "@sapphire/framework";
import { ApplyOptions } from "@sapphire/decorators";
import { ApplicationCommandOptionChoiceData, GuildMember, Message, EmbedBuilder, VoiceBasedChannel } from "discord.js";
import { send } from "@sapphire/plugin-editable-commands";
import { EmbedColor } from "#utils/constants";
import { KoosCommand } from "#lib/extensions";
import { filterNullishAndEmpty, isNullish } from "@sapphire/utilities";
import { canJoinVoiceChannel } from "@sapphire/discord.js-utilities";
import { cutText, sendLoadingMessage } from "#utils/functions";
import { PlayOptions } from "#lib/interfaces";
import { oneLine } from "common-tags";
import pluralize from "pluralize";

@ApplyOptions<KoosCommand.Options>({
    description: "Add a track to queue.",
    aliases: ["p"],
    preconditions: ["VoiceOnly"],
    usage: "query",
})
export class PlayCommand extends KoosCommand {
    private tracks: Map<string, string[]> = new Map<string, string[]>();

    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand(
            (builder) =>
                builder //
                    .setName(this.name)
                    .setDescription(this.description)
                    .addStringOption((option) =>
                        option //
                            .setName("query")
                            .setDescription("Could be a link of the track, or a search term")
                            .setRequired(true)
                            .setAutocomplete(true)
                    ),
            { idHints: ["1050092839700287521", "1050094765485609030"] }
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
                embeds: [{ description: "Please provide an URL or search query", color: EmbedColor.Error }],
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
                const title = `${track.title} by ${track.author}`;
                return {
                    name: `${cutText(title, 100)}`,
                    value: `a:${i}`,
                };
            });

            return interaction.respond(options);
        }
    }

    private async play(query: string, { message, player, channel, data }: PlayOptions) {
        const { kazagumo } = this.container;
        const result = await kazagumo.search(query, { requester: message.member }).catch(() => undefined);
        if (!result || !result.tracks.length)
            return new EmbedBuilder({ description: `Something went wrong!`, color: EmbedColor.Error });

        if (!player) {
            if (!canJoinVoiceChannel(channel))
                return new EmbedBuilder()
                    .setDescription(`I cannot join your voice channel. It seem like I don't have the right permissions.`)
                    .setColor(EmbedColor.Error);
            player ??= await kazagumo.createPlayer({
                guildId: message.guildId!,
                textId: message.channelId!,
                voiceId: channel!.id,
                deaf: true,
                volume: isNullish(data) ? 100 : data.volume,
            });
        }

        let msg: string = "";

        switch (result.type) {
            case "PLAYLIST":
                for (let track of result.tracks) player.queue.add(track);
                const playlistLength = result.tracks.length;
                msg = oneLine`
                    Queued playlist [${result.playlistName}](${query}) with
                    ${playlistLength} ${pluralize("track", playlistLength)}
                `;
                break;
            case "SEARCH":
            case "TRACK":
                let [track] = result.tracks;
                let title =
                    track.sourceName === "youtube"
                        ? `[${track.title}](${track.uri})`
                        : `[${track.title} by ${track.author}](${track.uri})`;

                player.queue.add(track);
                const position = player.queue.findIndex((x) => x.identifier === track.identifier);
                msg = `Queued ${title} at position #${position + 1}`;
                break;
        }

        if (!player.playing && !player.paused) player.play();

        return new EmbedBuilder({ description: msg, color: EmbedColor.Default });
    }
}
