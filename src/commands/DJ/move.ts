import type { Player } from "#lib/audio";
import { KoosCommand } from "#lib/extensions";
import { KoosColor } from "#utils/constants";
import { createTitle } from "#utils/functions";
import { EmbedBuilder } from "@discordjs/builders";
import { ApplyOptions } from "@sapphire/decorators";
import { Args } from "@sapphire/framework";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { isNullish } from "@sapphire/utilities";

@ApplyOptions<KoosCommand.Options>({
    description: "Move a track in the queue.",
    aliases: ["m"],
    preconditions: ["VoiceOnly", "DJ"],
    detailedDescription: {
        usage: [":from", ":to"],
    },
})
export class MoveCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption((option) =>
                    option //
                        .setName("from")
                        .setDescription(`The position of the track in the queue that you want to move`)
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option //
                        .setName("to")
                        .setDescription(`The destination position in the queue where you want to move the track`)
                        .setRequired(true)
                )
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const { manager } = this.container;
        const player = manager.players.get(interaction.guildId!)!;
        const from = interaction.options.getNumber("from", true);
        const to = interaction.options.getNumber("to", true);

        if (isNullish(player) || isNullish(player.current))
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
                ephemeral: true,
            });

        await interaction.deferReply();

        interaction.followUp({
            embeds: [this.move(player, from, to)],
        });
    }

    public async messageRun(message: KoosCommand.Message, args: Args) {
        const { manager } = this.container;
        const player = manager.players.get(message.guildId!)!;
        const from = await args.pick("number").catch(() => undefined);
        const to = await args.pick("number").catch(() => undefined);

        if (isNullish(from) || isNullish(to)) {
            return reply(message, {
                embeds: [
                    new EmbedBuilder()
                        .setDescription(
                            isNullish(from)
                                ? "Please specify the position of the track to be moved"
                                : "Please provide the destination position to move the track"
                        )
                        .setColor(KoosColor.Error),
                ],
            });
        }
        if (isNullish(player) || isNullish(player.current)) {
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
            });
        }

        send(message, { embeds: [this.move(player, from, to)] });
    }

    private move(player: Player, from: number, to: number) {
        const queue = player.queue;

        if (from > player.queue.size || to > player.queue.size)
            return new EmbedBuilder()
                .setDescription(`The queue doesn't have that many tracks (Total tracks: ${player.queue.size})`)
                .setColor(KoosColor.Error);
        if (from < 1 || to < 1)
            return new EmbedBuilder()
                .setDescription(`The position number must be from 1 to ${player.queue.size}`)
                .setColor(KoosColor.Error);

        let removed = null;
        if (from >= 0 && from < queue.size) removed = queue.splice(from - 1, 1)[0];

        if (isNullish(removed))
            return new EmbedBuilder().setDescription(`There is no track at that position`).setColor(KoosColor.Error);

        queue.splice(to - 1, 0, removed);
        return new EmbedBuilder()
            .setDescription(`Moved ${createTitle(removed)} from index ${from} to index ${to}`)
            .setColor(KoosColor.Default);
    }
}
