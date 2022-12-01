import { embedColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { Args, Command } from "@sapphire/framework";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { Message, MessageEmbed } from "discord.js";
import { KazagumoPlayer } from "kazagumo";
import { isNullish } from "@sapphire/utilities";

@ApplyOptions<Command.Options>({
    description: "Remove a track from the queue",
    preconditions: ["GuildOnly", "VoiceOnly"],
    aliases: ["rm"],
})
export class UserCommand extends Command {
    public override registerApplicationCommands(registery: Command.Registry) {
        registery.registerChatInputCommand(
            (builder) =>
                builder //
                    .setName(this.name)
                    .setDescription(this.description)
                    .addNumberOption((option) =>
                        option //
                            .setName("position")
                            .setDescription("Position of song to remove")
                            .setRequired(true)
                    ),
            { idHints: ["1047879470654181416"] }
        );
    }

    public async chatInputRun(interaction: Command.ChatInputInteraction) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(interaction.guildId!)!;
        const position = interaction.options.getNumber("position");

        if (player) await interaction.deferReply();
        if (isNullish(position))
            return interaction.reply({
                embeds: [{ description: "Please specify the song positions to remove.", color: embedColor.red }],
                ephemeral: true,
            });
        if (!player || (player && !player.queue.current))
            return interaction.reply({
                embeds: [{ description: "There's nothing playing in this server", color: embedColor.default }],
                ephemeral: true,
            });

        return interaction.followUp({ embeds: [await this.remove(player, position)] });
    }

    public async messageRun(message: Message, args: Args) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(message.guildId!)!;
        const position = await args.pick("number").catch(() => undefined);

        if (isNullish(position)) {
            return reply(message, {
                embeds: [{ description: "Please specify the song positions to remove.", color: embedColor.red }],
            });
        }
        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [{ description: "There's nothing playing in this server", color: embedColor.default }],
            });
        }

        return send(message, { embeds: [await this.remove(player, position)] });
    }

    private async remove(player: KazagumoPlayer, position: number) {
        if (position > player.queue.size)
            return new MessageEmbed({
                description: `The queue doesn't have that many tracks (Total Songs: ${player.queue.size})`,
                color: embedColor.red,
            });
        if (position < 1)
            return new MessageEmbed({
                description: `The position number must be from 1 to ${player.queue.size}`,
                color: embedColor.red,
            });

        const track = player.queue[position - 1];
        const title =
            track.sourceName === "youtube" //
                ? `[${track.title}](${track.uri})`
                : `[${track.title} by ${track.author}](${track.uri})`;
        player.queue.remove(position - 1);

        return new MessageEmbed({ description: `Removed ${title} from the queue`, color: embedColor.default });
    }
}
