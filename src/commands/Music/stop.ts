import { embedColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { Message } from "discord.js";

@ApplyOptions<Command.Options>({
    description: "Stops and disconnects the player.",
    preconditions: ["GuildOnly", "VoiceOnly"],
})
export class UserCommand extends Command {
    public override registerApplicationCommands(registery: Command.Registry) {
        registery.registerChatInputCommand(
            (builder) =>
                builder //
                    .setName(this.name)
                    .setDescription(this.description),
            { idHints: ["1047816993836904458", "1048159946673492008"] }
        );
    }

    public async chatInputRun(interaction: Command.ChatInputInteraction) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(`${interaction.guildId}`);

        if (player) await interaction.deferReply();
        if (!player || (player && !player.queue.current)) {
            return interaction.reply({
                embeds: [{ description: "There's nothing playing in this server", color: embedColor.default }],
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
            interaction.followUp({ embeds: [{ description: `Something went wrong`, color: embedColor.red }] });
            this.container.logger.error(error);
            return;
        }
    }

    public async messageRun(message: Message) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(`${message.guildId}`);

        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [{ description: "There's nothing playing in this server", color: embedColor.default }],
            });
        }

        try {
            player.destroy();
            send(message, { embeds: [{ description: `Destroyed the player and left the voice channel`, color: embedColor.default }] });
            return;
        } catch (error) {
            send(message, { embeds: [{ description: `Something went wrong`, color: embedColor.red }] });
            this.container.logger.error(error);
            return;
        }
    }
}
