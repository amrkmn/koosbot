import { KoosCommand } from "#lib/extensions";
import { ApplyOptions } from "@sapphire/decorators";
import { Duration } from "@sapphire/duration";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { Args } from "@sapphire/framework";
import { EmbedBuilder, Message } from "discord.js";
import { KazagumoPlayer } from "kazagumo";
import { KoosColor } from "#utils/constants";
import { convertTime, createTitle, timeToMs } from "#utils/functions";

@ApplyOptions<KoosCommand.Options>({
    description: "Seek to a specific time in the currently playing track",
    detailedDescription: {
        usage: [":time"],
        examples: ["10s", "1m10s", "02:50"],
    },
})
export class SeekCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption((option) =>
                    option //
                        .setName("format")
                        .setDescription("The time format. (e.g. hh:mm:ss, mm:ss, 2m 30s or 2 minutes 30 seconds)")
                        .setRequired(true)
                )
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(`${interaction.guildId}`);
        const input = interaction.options.getString("format", true);

        if (!player || (player && !player.queue.current))
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
                ephemeral: true,
            });

        await interaction.deferReply();

        return interaction.followUp({ embeds: [this.seek(player, input)] });
    }

    public async messageRun(message: Message, args: Args) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(message.guildId!)!;
        const input = await args.pick("string").catch(() => undefined);

        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
            });
        }
        if (!input)
            return send(message, {
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`Please enter an input. (e.g. hh:mm:ss, mm:ss, 2m 30s or 2 minutes 30 seconds)`)
                        .setColor(KoosColor.Error),
                ],
            });

        send(message, { embeds: [this.seek(player, input)] });
    }

    private seek(player: KazagumoPlayer, input: string) {
        const current = player.queue.current!;
        const title = createTitle(current);

        let position: number;
        if (input.includes(":")) position = timeToMs(input);
        else position = new Duration(input).offset;

        if (isNaN(position))
            return new EmbedBuilder()
                .setDescription(`Please enter the correct format. (e.g. hh:mm:ss, mm:ss, 2m 30s or 2 minutes 30 seconds)`)
                .setColor(KoosColor.Error);

        player.seek(position);
        return new EmbedBuilder()
            .setDescription(`Seeked ${title} to ${convertTime(current.position!)} / ${convertTime(current.length!)}`)
            .setColor(KoosColor.Success);
    }
}
