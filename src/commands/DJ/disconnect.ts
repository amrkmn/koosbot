import { KoosCommand } from "#lib/extensions";
import { EmbedColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { Message, EmbedBuilder } from "discord.js";
import { KazagumoPlayer } from "kazagumo";

@ApplyOptions<KoosCommand.Options>({
    description: "Disconnects the bot from its current voice channel.",
    preconditions: ["VoiceOnly", "DJ"],
    aliases: ["dc", "leave"],
})
export class DisconnectCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand(
            (builder) =>
                builder //
                    .setName(this.name)
                    .setDescription(this.description),
            { idHints: ["1053318753800175707", "1053318960638087218"] }
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(`${interaction.guildId}`);

        if (player) await interaction.deferReply();
        if (!player) {
            return interaction.reply({
                embeds: [{ description: "There's nothing playing in this server", color: EmbedColor.Warn }],
                ephemeral: true,
            });
        }

        interaction.followUp({ embeds: [await this.disconnect(player)] });
    }

    public async messageRun(message: Message) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(`${message.guildId}`);

        if (!player) {
            return reply(message, {
                embeds: [{ description: "There's nothing playing in this server", color: EmbedColor.Warn }],
            });
        }

        send(message, { embeds: [this.disconnect(player)] });
    }

    private disconnect(player: KazagumoPlayer) {
        player.destroy();
        return new EmbedBuilder().setDescription(`Destroyed the player and left the voice channel`).setColor(EmbedColor.Default);
    }
}
