import { KoosCommand } from "#lib/extensions";
import { embedColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { Message, MessageEmbed } from "discord.js";
import { KazagumoPlayer } from "kazagumo";

@ApplyOptions<KoosCommand.Options>({
    description: "Clears the current queue.",
    preconditions: ["GuildOnly", "VoiceOnly", "DJ"],
    aliases: ["continue"],
})
export class UserCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand(
            (builder) =>
                builder //
                    .setName(this.name)
                    .setDescription(this.description),
            { idHints: ["1050092752181940354", "1050094676948029440"] }
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputInteraction) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(`${interaction.guildId}`);

        if (player) await interaction.deferReply();
        if (!player || (player && !player.queue.current)) {
            return interaction.reply({
                embeds: [{ description: "There's nothing playing in this server", color: embedColor.warn }],
                ephemeral: true,
            });
        }

        interaction.followUp({ embeds: [this.resume(player)] });
    }

    public async messageRun(message: Message) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(message.guildId!)!;

        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [{ description: "There's nothing playing in this server", color: embedColor.warn }],
            });
        }

        send(message, { embeds: [this.resume(player)] });
    }

    private resume(player: KazagumoPlayer) {
        if (!player.paused) return new MessageEmbed({ description: `The song is not paused.`, color: embedColor.warn });

        player.pause(false);

        return new MessageEmbed({ description: `Paused the song.`, color: embedColor.default });
    }
}
