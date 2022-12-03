import { Args } from "@sapphire/framework";
import { ApplyOptions } from "@sapphire/decorators";
import { GuildMember, Message, MessageEmbed, VoiceBasedChannel } from "discord.js";
import { send } from "@sapphire/plugin-editable-commands";
import { KazagumoPlayer, KazagumoTrack } from "kazagumo";
import { embedColor } from "#utils/constants";
import pluralize from "pluralize";
import { KoosCommand } from "#lib/extensions";

interface PlayOptions {
    message: Message | KoosCommand.ChatInputInteraction;
    player: KazagumoPlayer | undefined;
    channel: VoiceBasedChannel;
}

@ApplyOptions<KoosCommand.Options>({
    description: "Add a track to queue.",
    aliases: ["p"],
    preconditions: ["GuildOnly", "VoiceOnly"],
    usage: {
        type: "query",
        required: true,
    },
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
                            .setDescription("Could be a link of the track, or a search term")
                            .setRequired(true)
                    ),
            { idHints: ["1047561979314843730", "1048159858911870977"] }
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputInteraction) {
        const { kazagumo } = this.container;
        const query = interaction.options.getString("query")!;
        await interaction.deferReply();

        const member = interaction.member! as GuildMember;
        const channel = member.voice.channel as VoiceBasedChannel;
        let player = kazagumo.getPlayer(interaction.guildId!);

        return interaction.followUp({ embeds: [await this.play(query, { message: interaction, player, channel })] });
    }

    public async messageRun(message: Message, args: Args) {
        const { kazagumo } = this.container;
        const query = await args.rest("string").catch(() => undefined);
        if (!query)
            return send(message, { embeds: [{ description: "Please provide an URL or search query", color: embedColor.error }] });

        const channel = message.member?.voice.channel as VoiceBasedChannel;
        let player = kazagumo.getPlayer(message.guildId!);

        return send(message, { embeds: [await this.play(query, { message, player, channel })] });
    }

    private async play(query: string, { message, player, channel }: PlayOptions) {
        const { kazagumo } = this.container;
        const result = await kazagumo.search(query, { requester: message.member });
        if (!result.tracks.length) return new MessageEmbed({ description: `Something went wrong`, color: embedColor.error });

        let tracks: KazagumoTrack[] = [],
            msg: string = "";
        switch (result.type) {
            case "PLAYLIST":
                for (let track of result.tracks) tracks.push(track);
                msg = `Queued playlist [${result.playlistName}](${query}) with ${tracks.length} ${pluralize("track", tracks.length)}`;
                break;
            case "SEARCH":
            case "TRACK":
                let [track] = result.tracks;
                let title =
                    track.sourceName === "youtube"
                        ? `[${track.title}](${track.uri})`
                        : `[${track.title} by ${track.author}](${track.uri})`;

                tracks.push(track);
                msg = `Queued ${title}`;
                break;
        }

        if (!player) {
            player ??= await kazagumo.createPlayer({
                guildId: message.guildId!,
                textId: message.channelId!,
                voiceId: channel!.id,
                deaf: true,
            });
        }

        player.queue.add(tracks);
        if (!player.playing && !player.paused) player.play();

        return new MessageEmbed({ description: msg, color: embedColor.default });
    }
}
