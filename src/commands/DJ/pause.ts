import type { Player } from "#lib/audio";
import { KoosCommand } from "#lib/extensions";
import { KoosColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { isNullish } from "@sapphire/utilities";
import { Message, EmbedBuilder } from "discord.js";

@ApplyOptions<KoosCommand.Options>({
    description: "Pause the current queue.",
    preconditions: ["VoiceOnly", "DJ"],
    aliases: ["break"],
})
export class PauseCommand extends KoosCommand {
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

        if (isNullish(player) || isNullish(player.current))
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
                ephemeral: true,
            });

        await interaction.deferReply();

        interaction.followUp({ embeds: [this.pause(player)] });
    }

    public async messageRun(message: Message) {
        const { manager } = this.container;
        const player = manager.players.get(message.guildId!)!;

        if (isNullish(player) || isNullish(player.current))
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
            });

        send(message, { embeds: [this.pause(player)] });
    }

    private pause(player: Player) {
        if (player.paused) return new EmbedBuilder().setDescription(`The song is already paused.`).setColor(KoosColor.Warn);

        player.pause(true);

        return new EmbedBuilder().setDescription(`Paused the song.`).setColor(KoosColor.Default);
    }
}
