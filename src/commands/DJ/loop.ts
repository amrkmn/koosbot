import { KoosCommand } from "#lib/extensions";
import { KoosColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { Args } from "@sapphire/framework";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { Message, EmbedBuilder } from "discord.js";
import { KazagumoPlayer } from "kazagumo";

@ApplyOptions<KoosCommand.Options>({
    description: `Change the current loop mode (queue, song, off).`,
    preconditions: ["VoiceOnly", "DJ"],
    detailedDescription: {
        usage: [";queue|;song|;off"],
        examples: ["", "queue", "off"],
    },
})
export class LoopCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand((builder) =>
            builder //
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption((option) =>
                    option //
                        .setName("mode")
                        .setDescription("Select a loop mode")
                        .setRequired(true)
                        .addChoices(
                            { name: "queue", value: "queue" }, //
                            { name: "song", value: "song" },
                            { name: "off", value: "off" }
                        )
                )
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(interaction.guildId!)!;
        const mode = interaction.options.getString("mode", true) as "off" | "queue" | "song";

        if (!player || (player && !player.queue.current))
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
                ephemeral: true,
            });

        await interaction.deferReply();

        interaction.followUp({ embeds: [await this.loop(player, mode)] });
    }

    public async messageRun(message: Message, args: Args) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(message.guildId!)!;
        const mode = await args.pick("enum", { enum: ["queue", "song", "off"], caseInsensitive: true }).catch(() => undefined);

        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
            });
        }

        send(message, { embeds: [await this.loop(player, mode as "off" | "queue" | "song" | undefined)] });
    }

    private async loop(player: KazagumoPlayer, type?: "off" | "queue" | "song") {
        if (!type) {
            let msg: string;
            switch (player.loop) {
                case "none":
                    player.setLoop("queue");
                    msg = "Looping the queue activated.";
                    break;
                case "queue":
                    player.setLoop("track");
                    msg = "Looping the current song enabled.";
                    break;
                case "track":
                    player.setLoop("none");
                    msg = "Looping disabled.";
                    break;
            }
            return new EmbedBuilder().setDescription(msg).setColor(KoosColor.Default);
        } else {
            switch (type) {
                case "song":
                    if (player.loop === "track") {
                        player.setLoop("none");
                        return new EmbedBuilder().setDescription("Looping disabled.").setColor(KoosColor.Default);
                    }
                    player.setLoop("track");
                    return new EmbedBuilder().setDescription("Looping the current song enabled.").setColor(KoosColor.Default);
                case "queue":
                    if (player.loop === "queue") {
                        player.setLoop("none");
                        return new EmbedBuilder().setDescription("Looping disabled.").setColor(KoosColor.Default);
                    }
                    player.setLoop("queue");
                    return new EmbedBuilder().setDescription("Looping the queue activated.").setColor(KoosColor.Default);
                case "off":
                    if (player.loop === "none") {
                        return new EmbedBuilder().setDescription("Looping is already set to off.").setColor(KoosColor.Warn);
                    }
                    player.setLoop("none");
                    return new EmbedBuilder().setDescription("Looping disabled.").setColor(KoosColor.Default);
            }
        }
    }
}
