import { KoosCommand } from "#lib/extensions";
import { EmbedColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { Message, EmbedBuilder } from "discord.js";
import { KazagumoPlayer } from "kazagumo";

@ApplyOptions<KoosCommand.Options>({
    description: "Clear the current queue.",
    preconditions: ["VoiceOnly", "DJ"],
    aliases: ["c", "empty"],
})
export class ClearCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand(
            (builder) =>
                builder //
                    .setName(this.name)
                    .setDescription(this.description),
            { idHints: ["1050092666483904613", "1050094591858184242"] }
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

        interaction.followUp({ embeds: [this.clear(player)] });
    }

    public async messageRun(message: Message) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(message.guildId!)!;

        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [{ description: "There's nothing playing in this server", color: EmbedColor.Warn }],
            });
        }

        return send(message, { embeds: [this.clear(player)] });
    }

    private clear(player: KazagumoPlayer) {
        if (player.queue.isEmpty)
            return new EmbedBuilder({ description: `There is currently no song in the queue.`, color: EmbedColor.Error });

        player.queue.clear();

        return new EmbedBuilder({ description: `The queue has been cleared.`, color: EmbedColor.Default });
    }
}
