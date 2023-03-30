import { KoosCommand } from "#lib/extensions";
import { EmbedColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { Message, EmbedBuilder } from "discord.js";
import { KazagumoPlayer } from "kazagumo";

@ApplyOptions<KoosCommand.Options>({
    description: "Stops the player and clear the queue.",
    preconditions: ["VoiceOnly", "DJ"],
})
export class StopCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand(
            (builder) =>
                builder //
                    .setName(this.name)
                    .setDescription(this.description),
            { idHints: ["1050092758070730815", "1050094683856048268"] }
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

        interaction.followUp({ embeds: [await this.stop(player)] });
    }

    public async messageRun(message: Message) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(`${message.guildId}`);

        if (!player) {
            return reply(message, {
                embeds: [{ description: "There's nothing playing in this server", color: EmbedColor.Warn }],
            });
        }

        send(message, { embeds: [await this.stop(player)] });
    }

    private async stop(player: KazagumoPlayer) {
        player.queue.clear();
        player.shoukaku.stopTrack();

        return new EmbedBuilder().setDescription("Stopped playback and cleared the queue").setColor(EmbedColor.Default);
    }
}
