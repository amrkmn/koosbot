import { KoosCommand } from "#lib/extensions";
import { KoosColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { EmbedBuilder, Message } from "discord.js";
import { KazagumoPlayer } from "kazagumo";

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
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(interaction.guildId!)!;

        if (!player || (player && !player.queue.current)) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription("There's nothing playing in this server").setColor(KoosColor.Warn)],
                ephemeral: true,
            });
        }

        interaction.reply({
            embeds: [this.previous(player)],
        });
    }

    public async messageRun(message: Message) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(message.guildId!)!;

        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription("There's nothing playing in this server").setColor(KoosColor.Warn)],
            });
        }

        send(message, {
            embeds: [this.previous(player)],
        });
    }

    private previous(player: KazagumoPlayer) {
        try {
            player.history.previous();
            return new EmbedBuilder().setDescription(`Playing the previous track`).setColor(KoosColor.Success);
        } catch (error) {
            return new EmbedBuilder().setDescription(`There are no previous tracks`).setColor(KoosColor.Error);
        }
    }
}
