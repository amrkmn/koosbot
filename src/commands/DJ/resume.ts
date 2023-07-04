import type { Player } from "#lib/audio";
import { KoosCommand } from "#lib/extensions";
import { KoosColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { EmbedBuilder, Message } from "discord.js";

@ApplyOptions<KoosCommand.Options>({
    description: "Resume the current queue.",
    preconditions: ["VoiceOnly", "DJ"],
    aliases: ["continue"],
})
export class ResumeCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand((builder) =>
            builder //
                .setName(this.name)
                .setDescription(this.description)
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const { manager } = this.container;
        const player = manager.players.get(`${interaction.guildId}`);

        if (!player || !player.current)
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
                ephemeral: true,
            });

        await interaction.deferReply();

        interaction.followUp({ embeds: [this.resume(player)] });
    }

    public async messageRun(message: Message) {
        const { manager } = this.container;
        const player = manager.players.get(message.guildId!)!;

        if (!player || !player.current) {
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
            });
        }

        send(message, { embeds: [this.resume(player)] });
    }

    private resume(player: Player) {
        if (!player.paused) return new EmbedBuilder().setDescription(`The song is not paused.`).setColor(KoosColor.Warn);

        player.pause(false);

        return new EmbedBuilder().setDescription(`Resumed the song.`).setColor(KoosColor.Default);
    }
}
