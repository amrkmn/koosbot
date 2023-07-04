import type { Player } from "#lib/audio";
import { KoosCommand } from "#lib/extensions";
import { KoosColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { isNullish } from "@sapphire/utilities";
import { EmbedBuilder, Message } from "discord.js";

@ApplyOptions<KoosCommand.Options>({
    description: "Goes back to the first track in listening history",
    aliases: ["prev", "back"],
})
export class PreviousCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand((builder) =>
            builder //
                .setName(this.name)
                .setDescription(this.description)
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const { manager } = this.container;
        const player = manager.players.get(interaction.guildId!)!;

        if (isNullish(player) || isNullish(player.current))
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription("There's nothing playing in this server").setColor(KoosColor.Warn)],
                ephemeral: true,
            });

        interaction.reply({
            embeds: [this.previous(player)],
        });
    }

    public async messageRun(message: Message) {
        const { manager } = this.container;
        const player = manager.players.get(message.guildId!)!;

        if (isNullish(player) || isNullish(player.current))
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription("There's nothing playing in this server").setColor(KoosColor.Warn)],
            });

        send(message, {
            embeds: [this.previous(player)],
        });
    }

    private previous(player: Player) {
        try {
            player.history.previous();
            return new EmbedBuilder().setDescription(`Playing the previous track`).setColor(KoosColor.Success);
        } catch (error) {
            return new EmbedBuilder().setDescription(`There are no previous tracks`).setColor(KoosColor.Error);
        }
    }
}
