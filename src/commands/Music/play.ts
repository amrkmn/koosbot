import { Args, Command } from "@sapphire/framework";
import { ApplyOptions } from "@sapphire/decorators";
import { GuildMember, Message, MessageEmbed, VoiceBasedChannel } from "discord.js";
import { send } from "@sapphire/plugin-editable-commands";
import { KazagumoPlayer, KazagumoTrack } from "kazagumo";
import { embedColor, regex } from "#utils/constants";
import pluralize from "pluralize";

interface PlayOptions {
    message: Message | Command.ChatInputInteraction;
    player: KazagumoPlayer | undefined;
    channel: VoiceBasedChannel;
}

@ApplyOptions<Command.Options>({
    description: "Add a track to queue.",
    aliases: ["p"],
    preconditions: ["GuildOnly", "VoiceOnly"],
})
export class UserCommand extends Command {
    public override registerApplicationCommands(registery: Command.Registry) {
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
            { idHints: ["1047561979314843730"] }
        );
    }

    public async chatInputRun(interaction: Command.ChatInputInteraction) {
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
            return send(message, { embeds: [{ description: "Please provide an URL or search query", color: embedColor.red }] });

        const channel = message.member?.voice.channel as VoiceBasedChannel;
        let player = kazagumo.getPlayer(message.guildId!);

        return send(message, { embeds: [await this.play(query, { message, player, channel })] });
    }

    private async play(query: string, { message, player, channel }: PlayOptions) {
        const { kazagumo } = this.container;
        const result = await kazagumo.search(query, { requester: message.member });
        if (!result.tracks.length) return new MessageEmbed({ description: `Something went wrong`, color: embedColor.red });

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
                let title = regex.youtube.test(track.uri)
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
