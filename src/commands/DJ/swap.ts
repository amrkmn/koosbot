import { KoosCommand } from "#lib/extensions";
import { KoosColor } from "#utils/constants";
import { createTitle } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { Args } from "@sapphire/framework";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { isNullish } from "@sapphire/utilities";
import { EmbedBuilder } from "discord.js";
import { KazagumoPlayer } from "kazagumo";

@ApplyOptions<KoosCommand.Options>({
    description: "Swap the positions of two tracks in the queue.",
    preconditions: ["VoiceOnly", "DJ"],
    detailedDescription: {
        usage: [":source", ":destination"],
        examples: ["1 5", "5 1"],
    },
})
export class SwapCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption((option) =>
                    option //
                        .setName("source")
                        .setDescription(`The position of the track you want to swap from in the queue`)
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option //
                        .setName("destination")
                        .setDescription(`The position where you want to swap the track to in the queue`)
                        .setRequired(true)
                )
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(interaction.guildId!)!;
        const source = interaction.options.getNumber("source", true);
        const destination = interaction.options.getNumber("destination", true);

        if (!player || (player && !player.queue.current))
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
                ephemeral: true,
            });

        await interaction.deferReply();

        interaction.followUp({
            embeds: [this.swap(player, source, destination)],
        });
    }

    public async messageRun(message: KoosCommand.Message, args: Args) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(message.guildId!)!;
        const source = await args.pick("number").catch(() => undefined);
        const destination = await args.pick("number").catch(() => undefined);

        if (isNullish(source) || isNullish(destination)) {
            return reply(message, {
                embeds: [
                    new EmbedBuilder()
                        .setDescription(
                            isNullish(source)
                                ? `Please specify the position of the track to swap from`
                                : `Please specify the position where you want to swap the track to`
                        )
                        .setColor(KoosColor.Error),
                ],
            });
        }
        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
            });
        }

        send(message, { embeds: [this.swap(player, source, destination)] });
    }

    private swap(player: KazagumoPlayer, source: number, destination: number) {
        const queue = player.queue;

        if (source > queue.size || destination > queue.size)
            return new EmbedBuilder()
                .setDescription(`The queue doesn't have that many tracks (Total tracks: ${player.queue.size})`)
                .setColor(KoosColor.Error);
        if (source < 1 || destination < 1)
            return new EmbedBuilder()
                .setDescription(`The position number must be from 1 to ${player.queue.size}`)
                .setColor(KoosColor.Error);

        const sourceTrack = queue[source - 1];
        const destinationTrack = queue[destination - 1];

        queue[source - 1] = destinationTrack;
        queue[destination - 1] = sourceTrack;

        return new EmbedBuilder()
            .setDescription(
                `The track ${createTitle(sourceTrack)} has been swapped with the track ${createTitle(destinationTrack)} in the queue`
            )
            .setColor(KoosColor.Default);
    }
}
