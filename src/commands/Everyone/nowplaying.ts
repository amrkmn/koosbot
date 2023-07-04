import type { Player } from "#lib/audio";
import { KoosCommand } from "#lib/extensions";
import { KoosColor } from "#utils/constants";
import { createTitle } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { EmbedBuilder, Message } from "discord.js";

@ApplyOptions<KoosCommand.Options>({
    description: "Show information about the currently playing track.",
    aliases: ["np"],
    preconditions: ["VoiceOnly"],
})
export class NowPlayingCommand extends KoosCommand {
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

        if (player) await interaction.deferReply();
        if (!player || !player.current) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
                ephemeral: true,
            });
        }

        return interaction.followUp({ embeds: [await this.nowPlaying(player)] });
    }

    public async messageRun(message: Message) {
        const { manager } = this.container;
        const player = manager.players.get(message.guildId!)!;

        if (!player || !player.current) {
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
            });
        }

        send(message, { embeds: [await this.nowPlaying(player)] });
    }

    private async nowPlaying(player: Player) {
        const data = await this.container.db.guild.findUnique({ where: { id: player.guildId } });
        const current = player.current!;
        const title = createTitle(current);

        const description = `${title}${data?.requester ? ` ~ ${current.requester}` : ``}`;
        const progressBar = player.createProgressBar({ length: 20 });

        return new EmbedBuilder().setDescription(description).setFooter({ text: progressBar }).setColor(KoosColor.Default);
    }
}
