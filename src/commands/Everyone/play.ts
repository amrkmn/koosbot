import { Args } from "@sapphire/framework";
import { ApplyOptions } from "@sapphire/decorators";
import { ApplicationCommandOptionChoiceData, GuildMember, Message, EmbedBuilder, VoiceBasedChannel, Snowflake } from "discord.js";
import { send } from "@sapphire/plugin-editable-commands";
import { KoosColor } from "#utils/constants";
import { KoosCommand } from "#lib/extensions";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import { canJoinVoiceChannel } from "@sapphire/discord.js-utilities";
import { createTitle, cutText, sendLoadingMessage } from "#utils/functions";
import { PlayOptions } from "#lib/interfaces";
import { oneLine } from "common-tags";
import { KazagumoTrack } from "kazagumo";
import { DiscordSnowflake } from "@sapphire/snowflake";
import pluralize from "pluralize";

@ApplyOptions<KoosCommand.Options>({
    description: "Add a track to queue.",
    aliases: ["p"],
    preconditions: ["VoiceOnly"],
    usage: "query",
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
                embeds: [new EmbedBuilder().setDescription("Please provide an URL or search query").setColor(KoosColor.Error)],
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
            const tracksMap = new Map<string, string>();

            const id = `${DiscordSnowflake.generate()}`;
            const tracks = tracksMap.set(id, query.value);

            this.tracks.set(`${guildId}:${memberId}`, tracks);

            return interaction.respond([{ name: cutText(`${playlistName}`, 100), value: id }]);
        } else {
            tracks = tracks.slice(0, 10);

            const options: ApplicationCommandOptionChoiceData[] = [];
            const tracksMap = new Map<string, string>();

            for (let track of tracks) {
                const id = `${DiscordSnowflake.generate()}`;
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
        if (!result) return new EmbedBuilder().setDescription(`Something went wrong`).setColor(KoosColor.Error);
        if (isNullishOrEmpty(!result.tracks.length))
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
                const position = player.queue.findIndex((x) => x.identifier === track.identifier);
                msg = `Queued ${title} at position #${position + 1}`;
                break;
        }

        player.queue.add(queue);
        if (!player.playing && !player.paused) player.play();

        return new EmbedBuilder().setDescription(msg).setColor(KoosColor.Default);
    }
}
