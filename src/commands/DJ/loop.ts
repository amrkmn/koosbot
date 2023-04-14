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
    usage: {
        type: ["queue", "song", "off"],
    },
})
export class LoopCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand((builder) =>
            builder //
                .setName(this.name)
                .setDescription(this.description)
                .addSubcommand((subcommand) => subcommand.setName("queue").setDescription("Loop the queue."))
                .addSubcommand((subcommand) => subcommand.setName("song").setDescription("Loop the current playing song."))
                .addSubcommand((subcommand) => subcommand.setName("off").setDescription("Turn looping off"))
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(interaction.guildId!)!;
        const mode = interaction.options.getSubcommand(true) as "off" | "queue" | "song";

        if (!player || (player && !player.queue.current))
            return interaction.reply({
                embeds: [{ description: "There's nothing playing in this server", color: KoosColor.Warn }],
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
                embeds: [{ description: "There's nothing playing in this server", color: KoosColor.Warn }],
            });
        }

        send(message, { embeds: [await this.loop(player, mode as "off" | "queue" | "song" | undefined)] });
    }

    private async loop(player: KazagumoPlayer, type?: "off" | "queue" | "song") {
        if (!type) {
            switch (player.loop) {
                case "none":
                    player.setLoop("queue");
                    return new EmbedBuilder({ description: "Looping the queue activated.", color: KoosColor.Default });
                case "queue":
                    player.setLoop("track");
                    return new EmbedBuilder({ description: "Looping the current song enabled.", color: KoosColor.Default });
                case "track":
                    player.setLoop("none");
                    return new EmbedBuilder({ description: "Looping disabled.", color: KoosColor.Default });
            }
        } else {
            switch (type) {
                case "song":
                    if (player.loop === "track") {
                        player.setLoop("none");
                        return new EmbedBuilder({ description: "Looping disabled.", color: KoosColor.Default });
                    }
                    player.setLoop("track");
                    return new EmbedBuilder({ description: "Looping the current song enabled.", color: KoosColor.Default });
                case "queue":
                    if (player.loop === "queue") {
                        player.setLoop("none");
                        return new EmbedBuilder({ description: "Looping disabled.", color: KoosColor.Default });
                    }
                    player.setLoop("queue");
                    return new EmbedBuilder({ description: "Looping the queue activated.", color: KoosColor.Default });
                case "off":
                    if (player.loop === "none") {
                        return new EmbedBuilder({ description: "Looping is already set to off.", color: KoosColor.Default });
                    }
                    player.setLoop("none");
                    return new EmbedBuilder({ description: "Looping disabled.", color: KoosColor.Default });
            }
        }
    }
}
