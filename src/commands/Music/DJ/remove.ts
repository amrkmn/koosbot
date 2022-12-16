import { embedColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { Args } from "@sapphire/framework";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { Message, MessageEmbed } from "discord.js";
import { KazagumoPlayer } from "kazagumo";
import { isNullish } from "@sapphire/utilities";
import { KoosCommand } from "#lib/extensions";

@ApplyOptions<KoosCommand.Options>({
    description: "Remove a track from the queue.",
    preconditions: ["VoiceOnly", "DJ"],
    aliases: ["rm", "del", "delete"],
    usage: {
        type: [
            { type: "position", required: true },
            { type: "to", required: false },
        ],
    },
})
export class UserCommand extends KoosCommand {
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

    public async chatInputRun(interaction: KoosCommand.ChatInputInteraction) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(interaction.guildId!)!;
        const position = interaction.options.getNumber("position");
        const to = interaction.options.getNumber("to") ?? undefined;

        if (player) await interaction.deferReply();
        if (isNullish(position))
            return interaction.reply({
                embeds: [{ description: "Please specify the song positions to remove.", color: embedColor.error }],
                ephemeral: true,
            });
        if (!player || (player && !player.queue.current))
            return interaction.reply({
                embeds: [{ description: "There's nothing playing in this server", color: embedColor.warn }],
                ephemeral: true,
            });

        return interaction.followUp({ embeds: [await this.remove(player, position, to)] });
    }

    public async messageRun(message: Message, args: Args) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(message.guildId!)!;
        const position = await args.pick("number").catch(() => undefined);
        const to = await args.pick("number").catch(() => undefined);

        if (isNullish(position)) {
            return reply(message, {
                embeds: [{ description: "Please specify the song positions to remove.", color: embedColor.error }],
            });
        }
        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [{ description: "There's nothing playing in this server", color: embedColor.warn }],
            });
        }

        return send(message, { embeds: [await this.remove(player, position, to)] });
    }

    private async remove(player: KazagumoPlayer, position: number, to?: number) {
        if (position === to) to = undefined;
        if (to && to < position) to = undefined;

        if (position > player.queue.size || (to && to > player.queue.size))
            return new MessageEmbed({
                description: `The queue doesn't have that many tracks (Total tracks: ${player.queue.size})`,
                color: embedColor.error,
            });
        if (position < 1)
            return new MessageEmbed({
                description: `The position number must be from 1 to ${player.queue.size}`,
                color: embedColor.error,
            });
        if (to && to <= player.queue.size && to > position) {
            player.queue.splice(position - 1, to - position + 1);
            return new MessageEmbed({ description: `Removed song from index ${position} to ${to}`, color: embedColor.default });
        }

        const track = player.queue[position - 1];
        const title =
            track.sourceName === "youtube" //
                ? `[${track.title}](${track.uri})`
                : `[${track.title} by ${track.author}](${track.uri})`;
        player.queue.remove(position - 1);

        return new MessageEmbed({ description: `Removed ${title} from the queue`, color: embedColor.default });
    }
}
