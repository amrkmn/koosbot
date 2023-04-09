import { KoosColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { Args } from "@sapphire/framework";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { Message, EmbedBuilder } from "discord.js";
import { KazagumoPlayer, RawTrack } from "kazagumo";
import { isNullish } from "@sapphire/utilities";
import { KoosCommand } from "#lib/extensions";

@ApplyOptions<KoosCommand.Options>({
    description: "Remove a track from the queue.",
    preconditions: ["VoiceOnly", "DJ"],
    aliases: ["rm", "del", "delete"],
    usage: {
        types: [{ type: "position", required: true }, { type: "to" }],
    },
})
export class RemoveCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand(
            (builder) =>
                builder //
                    .setName(this.name)
                    .setDescription(this.description)
                    .addNumberOption((option) =>
                        option //
                            .setName("position")
                            .setDescription("Position of song to remove.")
                            .setRequired(true)
                    )
                    .addNumberOption((option) =>
                        option //
                            .setName("to")
                            .setDescription("Remove a range of tracks from the queue")
                            .setRequired(false)
                    ),
            { idHints: ["1050092669860319292", "1050094595914076201"] }
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(interaction.guildId!)!;
        const position = interaction.options.getNumber("position");
        const to = interaction.options.getNumber("to") ?? undefined;

        if (isNullish(position))
            return interaction.reply({
                embeds: [{ description: "Please specify the song positions to remove.", color: KoosColor.Error }],
                ephemeral: true,
            });
        if (!player || (player && !player.queue.current))
            return interaction.reply({
                embeds: [{ description: "There's nothing playing in this server", color: KoosColor.Warn }],
                ephemeral: true,
            });

        await interaction.deferReply();

        return interaction.followUp({ embeds: [await this.remove(player, position, to)] });
    }

    public async messageRun(message: Message, args: Args) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(message.guildId!)!;
        const position = await args.pick("number").catch(() => undefined);
        const to = await args.pick("number").catch(() => undefined);

        if (isNullish(position)) {
            return reply(message, {
                embeds: [{ description: "Please specify the song positions to remove.", color: KoosColor.Error }],
            });
        }
        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [{ description: "There's nothing playing in this server", color: KoosColor.Warn }],
            });
        }

        return send(message, { embeds: [await this.remove(player, position, to)] });
    }

    private async remove(player: KazagumoPlayer, position: number, to?: number) {
        if (position === to) to = undefined;
        if (to && to < position) to = undefined;

        const queue = player.data.get("queue") as RawTrack[];

        if (position > player.queue.size || (to && to > player.queue.size))
            return new EmbedBuilder({
                description: `The queue doesn't have that many tracks (Total tracks: ${player.queue.size})`,
                color: KoosColor.Error,
            });
        if (position < 1)
            return new EmbedBuilder({
                description: `The position number must be from 1 to ${player.queue.size}`,
                color: KoosColor.Error,
            });
        if (to && to <= player.queue.size && to > position) {
            const firstTrack = player.queue[position - 1];
            const lastTrack = player.queue[to - 1];

            const firstTrackIndex = queue.findIndex((rawTrack) => rawTrack.track === firstTrack.track);
            const lastTrackIndex = queue.findIndex((rawTrack) => rawTrack.track === lastTrack.track);

            queue.splice(firstTrackIndex, lastTrackIndex - firstTrackIndex + 1);
            player.queue.splice(position - 1, to - position + 1);

            return new EmbedBuilder({ description: `Removed song from index ${position} to ${to}`, color: KoosColor.Default });
        }

        const track = player.queue[position - 1];
        const title =
            track.sourceName === "youtube" //
                ? `[${track.title}](${track.uri})`
                : `[${track.title} by ${track.author}](${track.uri})`;
        player.queue.remove(position - 1);

        return new EmbedBuilder({ description: `Removed ${title} from the queue`, color: KoosColor.Default });
    }
}
