import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { KazagumoPlayer } from "kazagumo";
import { MessageEmbed, Message } from "discord.js";
import { embedColor } from "#utils/constants";
import { reply, send } from "@sapphire/plugin-editable-commands";

@ApplyOptions<Command.Options>({
    description: "Shuffle the queue",
    preconditions: ["GuildOnly", "VoiceOnly"],
})
export class UserCommand extends Command {
    public override registerApplicationCommands(registery: Command.Registry) {
        registery.registerChatInputCommand(
            (builder) =>
                builder //
                    .setName(this.name)
                    .setDescription(this.description),
            { idHints: ["1047884791510474853", "1048159942223335425"] }
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

        return interaction.followUp({ embeds: [this.shuffle(player)] });
    }

    public async messageRun(message: Message) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(message.guildId!)!;

        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [{ description: "There's nothing playing in this server", color: embedColor.default }],
            });
        }

        return send(message, { embeds: [this.shuffle(player)] });
    }

    private shuffle(player: KazagumoPlayer) {
        player.queue.shuffle();

        return new MessageEmbed({ description: `Shuffled the queue`, color: embedColor.default });
    }
}
