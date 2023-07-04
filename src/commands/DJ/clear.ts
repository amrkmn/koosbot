import type { Player } from "#lib/audio";
import { KoosCommand } from "#lib/extensions";
import { KoosColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { isNullish } from "@sapphire/utilities";
import { Message, EmbedBuilder } from "discord.js";

@ApplyOptions<KoosCommand.Options>({
    description: "Clear the current queue.",
    preconditions: ["VoiceOnly", "DJ"],
    aliases: ["c", "empty"],
})
export class ClearCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand((builder) =>
            builder //
                .setName(this.name)
                .setDescription(this.description)
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const { manager } = this.container;
        const player = manager.players.get(interaction.guildId!);

        if (isNullish(player) || isNullish(player.current))
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
                ephemeral: true,
            });

        await interaction.deferReply();

        interaction.followUp({ embeds: [this.clear(player)] });
    }

    public async messageRun(message: Message) {
        const { manager } = this.container;
        const player = manager.players.get(message.guildId!)!;

        if (isNullish(player) || isNullish(player.current)) {
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
            });
        }

        return send(message, { embeds: [this.clear(player)] });
    }

    private clear(player: Player) {
        if (player.queue.empty)
            return new EmbedBuilder().setDescription(`There is currently no song in the queue.`).setColor(KoosColor.Error);

        player.queue.clear();

        return new EmbedBuilder().setDescription(`The queue has been cleared.`).setColor(KoosColor.Default);
    }
}
