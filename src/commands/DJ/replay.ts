import type { Player } from "#lib/audio";
import { KoosCommand } from "#lib/extensions";
import { KoosColor } from "#utils/constants";
import { createTitle } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { EmbedBuilder, Message } from "discord.js";

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
        const { manager } = this.container;
        const player = manager.players.get(interaction.guildId!)!;

        if (!player || !player.current)
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
                ephemeral: true,
            });

        await interaction.deferReply();

        interaction.followUp({ embeds: [this.replay(player)] });
    }

    public async messageRun(message: Message) {
        const { manager } = this.container;
        const player = manager.players.get(message.guildId!)!;

        if (!player || !player.current) {
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
            });
        }

        send(message, { embeds: [this.replay(player)] });
    }

    private replay(player: Player) {
        const current = player.current!;
        const title = createTitle(current);

        player.seek(0);

        return new EmbedBuilder().setDescription(`Starting over ${title}`).setColor(KoosColor.Default);
    }
}
