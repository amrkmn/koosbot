import { KoosCommand } from "#lib/extensions";
import { KoosColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { isNullish } from "@sapphire/utilities";
import { Message, EmbedBuilder } from "discord.js";
import { KazagumoPlayer } from "kazagumo";

@ApplyOptions<KoosCommand.Options>({
    description: "Disconnects the bot from its current voice channel.",
    preconditions: ["VoiceOnly", "DJ"],
    aliases: ["dc", "leave"],
})
export class DisconnectCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand((builder) =>
            builder //
                .setName(this.name)
                .setDescription(this.description)
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(`${interaction.guildId}`);

        if (isNullish(player)) {
            if (!isNullish(interaction.guild?.members.me?.voice)) {
                await interaction.guild?.members.me?.voice.disconnect();
                return interaction.reply({
                    embeds: [new EmbedBuilder().setDescription("Left the voice channel").setColor(KoosColor.Default)],
                    ephemeral: true,
                });
            }
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
                ephemeral: true,
            });
        }

        await interaction.deferReply();

        interaction.followUp({ embeds: [this.disconnect(player)] });
    }

    public async messageRun(message: Message) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(`${message.guildId}`);

        if (isNullish(player)) {
            if (!isNullish(message.guild?.members.me?.voice)) {
                await message.guild?.members.me?.voice.disconnect();
                return send(message, {
                    embeds: [new EmbedBuilder().setDescription("Left the voice channel").setColor(KoosColor.Default)],
                });
            }
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
            });
        }

        send(message, { embeds: [this.disconnect(player)] });
    }

    private disconnect(player: KazagumoPlayer) {
        player.destroy();
        return new EmbedBuilder().setDescription(`Destroyed the player and left the voice channel`).setColor(KoosColor.Default);
    }
}
