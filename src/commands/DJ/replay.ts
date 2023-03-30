import { KoosCommand } from "#lib/extensions";
import { ApplyOptions } from "@sapphire/decorators";
import { KazagumoPlayer } from "kazagumo";
import { EmbedBuilder, Message } from "discord.js";
import { EmbedColor } from "#utils/constants";
import { reply, send } from "@sapphire/plugin-editable-commands";

@ApplyOptions<KoosCommand.Options>({
    description: `Replay the current song.`,
    preconditions: ["VoiceOnly", "DJ"],
    aliases: ["rp", "restart"],
})
export class ReplayCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand(
            (builder) =>
                builder //
                    .setName(this.name)
                    .setDescription(this.description),
            { idHints: ["1050092750269325464", "1050094674876055563"] }
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(`${interaction.guildId}`);

        if (player) await interaction.deferReply();
        if (!player || (player && !player.queue.current)) {
            return interaction.reply({
                embeds: [{ description: "There's nothing playing in this server", color: EmbedColor.Warn }],
                ephemeral: true,
            });
        }

        interaction.followUp({ embeds: [this.replay(player)] });
    }

    public async messageRun(message: Message) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(message.guildId!)!;

        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [{ description: "There's nothing playing in this server", color: EmbedColor.Warn }],
            });
        }

        send(message, { embeds: [this.replay(player)] });
    }

    private replay(player: KazagumoPlayer) {
        const current = player.queue.current!;
        const title =
            current.sourceName === "youtube"
                ? `[${current.title}](${current.uri})`
                : `[${current.title} by ${current.author}](${current.uri})`;

        player.shoukaku.seekTo(0);

        return new EmbedBuilder().setDescription(`Starting over ${title}`).setColor(EmbedColor.Default);
    }
}
