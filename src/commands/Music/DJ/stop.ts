import { KoosCommand } from "#lib/extensions";
import { embedColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { Message } from "discord.js";

@ApplyOptions<KoosCommand.Options>({
    description: "Stops and disconnects the player.",
    preconditions: ["VoiceOnly", "DJ"],
})
export class UserCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand(
            (builder) =>
                builder //
                    .setName(this.name)
                    .setDescription(this.description),
            { idHints: ["1050092758070730815", "1050094683856048268"] }
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputInteraction) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(`${interaction.guildId}`);

        if (player) await interaction.deferReply();
        if (!player) {
            return interaction.reply({
                embeds: [{ description: "There's nothing playing in this server", color: embedColor.warn }],
                ephemeral: true,
            });
        }

        try {
            player.destroy();
            interaction.followUp({
                embeds: [{ description: `Destroyed the player and left the voice channel`, color: embedColor.default }],
            });
            return;
        } catch (error) {
            interaction.followUp({ embeds: [{ description: `Something went wrong`, color: embedColor.error }] });
            this.container.logger.error(error);
            return;
        }
    }

    public async messageRun(message: Message) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(`${message.guildId}`);

        if (!player) {
            return reply(message, {
                embeds: [{ description: "There's nothing playing in this server", color: embedColor.warn }],
            });
        }

        try {
            player.destroy();
            send(message, { embeds: [{ description: `Destroyed the player and left the voice channel`, color: embedColor.default }] });
            return;
        } catch (error) {
            send(message, { embeds: [{ description: `Something went wrong`, color: embedColor.error }] });
            this.container.logger.error(error);
            return;
        }
    }
}
