import { KoosCommand } from "#lib/extensions";
import { ApplyOptions } from "@sapphire/decorators";
import { KazagumoPlayer, KazagumoTrack } from "kazagumo";
import { Message, EmbedBuilder } from "discord.js";
import { KoosColor } from "#utils/constants";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { isNullish } from "@sapphire/utilities";
import { getPreviousTrack } from "#utils/functions";

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
        const previousTrack = getPreviousTrack(player.guildId!);

        if (isNullish(previousTrack))
            return new EmbedBuilder().setDescription(`There are no previous tracks`).setColor(KoosColor.Error);

        player.play(previousTrack);
        return new EmbedBuilder().setDescription(`Playing the previous track`).setColor(KoosColor.Success);
    }
}
