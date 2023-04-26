import { KoosCommand } from "#lib/extensions";
import { ApplyOptions } from "@sapphire/decorators";
import { KazagumoPlayer } from "kazagumo";
import { EmbedBuilder, Message } from "discord.js";
import { KoosColor } from "#utils/constants";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { createTitle } from "#utils/functions";

@ApplyOptions<KoosCommand.Options>({
    description: `Replay the current song.`,
    preconditions: ["VoiceOnly", "DJ"],
    aliases: ["rp", "restart"],
})
export class ReplayCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand((builder) =>
            builder //
                .setName(this.name)
                .setDescription(this.description)
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(`${interaction.guildId}`);

        if (!player || (player && !player.queue.current))
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn),],
                ephemeral: true,
            });

        await interaction.deferReply();

        interaction.followUp({ embeds: [this.replay(player)] });
    }

    public async messageRun(message: Message) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(message.guildId!)!;

        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn),],
            });
        }

        send(message, { embeds: [this.replay(player)] });
    }

    private replay(player: KazagumoPlayer) {
        const current = player.queue.current!;
        const title = createTitle(current);

        player.shoukaku.seekTo(0);

        return new EmbedBuilder().setDescription(`Starting over ${title}`).setColor(KoosColor.Default);
    }
}
