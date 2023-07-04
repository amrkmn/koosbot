import type { Player } from "#lib/audio";
import { KoosCommand } from "#lib/extensions";
import { KoosColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { EmbedBuilder, Message } from "discord.js";

@ApplyOptions<KoosCommand.Options>({
    description: "Stops the player and clear the queue.",
    preconditions: ["VoiceOnly", "DJ"],
})
export class StopCommand extends KoosCommand {
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

        interaction.followUp({ embeds: [await this.stop(player)] });
    }

    public async messageRun(message: Message) {
        const { manager } = this.container;
        const player = manager.players.get(`${message.guildId}`);

        if (!player || !player.current) {
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
            });
        }

        send(message, { embeds: [await this.stop(player)] });
    }

    private async stop(player: Player) {
        player.queue.clear();
        player.history.clear();
        player.shoukaku.stopTrack();

        return new EmbedBuilder().setDescription("Stopped playback and cleared the queue").setColor(KoosColor.Default);
    }
}
