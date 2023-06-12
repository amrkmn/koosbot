import { KoosColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { Args } from "@sapphire/framework";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { Message, EmbedBuilder } from "discord.js";
import { KazagumoPlayer } from "kazagumo";
import { isNullish } from "@sapphire/utilities";
import { KoosCommand } from "#lib/extensions";
import { createTitle } from "#utils/functions";

@ApplyOptions<KoosCommand.Options>({
    description: "Remove one or multiple tracks from the queue.",
    preconditions: ["VoiceOnly", "DJ"],
    aliases: ["rm"],
    detailedDescription: {
        usage: [":position", ";to"],
    },
})
export class RemoveCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand((builder) =>
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
                )
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(interaction.guildId!)!;
        const position = interaction.options.getNumber("position");
        const to = interaction.options.getNumber("to") ?? undefined;

        if (isNullish(position))
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription("Please specify the song positions to remove.").setColor(KoosColor.Error)],
                ephemeral: true,
            });
        if (!player || (player && !player.queue.current))
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
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
                embeds: [new EmbedBuilder().setDescription("Please specify the song positions to remove.").setColor(KoosColor.Error)],
            });
        }
        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
            });
        }

        return send(message, { embeds: [await this.remove(player, position, to)] });
    }

    private async remove(player: KazagumoPlayer, position: number, to?: number) {
        if (position === to) to = undefined;
        if (to && to < position) to = undefined;

        if (position > player.queue.size || (to && to > player.queue.size))
            return new EmbedBuilder()
                .setDescription(`The queue doesn't have that many tracks (Total tracks: ${player.queue.size})`)
                .setColor(KoosColor.Error);
        if (position < 1)
            return new EmbedBuilder()
                .setDescription(`The position number must be from 1 to ${player.queue.size}`)
                .setColor(KoosColor.Error);
        if (to && to <= player.queue.size && to > position) {
            player.queue.splice(position - 1, to - position + 1);

            return new EmbedBuilder().setDescription(`Removed song from index ${position} to ${to}`).setColor(KoosColor.Default);
        }

        const track = player.queue[position - 1];
        const title = createTitle(track);
        player.queue.remove(position - 1);

        return new EmbedBuilder().setDescription(`Removed ${title} from the queue`).setColor(KoosColor.Default);
    }
}
