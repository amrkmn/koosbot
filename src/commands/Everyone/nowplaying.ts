import { KoosCommand } from "#lib/extensions";
import { KoosColor } from "#utils/constants";
import { createTitle, progressBar } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { oneLine } from "common-tags";
import { Message, EmbedBuilder } from "discord.js";
import { KazagumoPlayer } from "kazagumo";
import prettyMs from "pretty-ms";

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
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(interaction.guildId!);

        if (player) await interaction.deferReply();
        if (!player || (player && !player.queue.current)) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn),],
                ephemeral: true,
            });
        }

        return interaction.followUp({ embeds: [await this.nowPlaying(player)] });
    }

    public async messageRun(message: Message) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(message.guildId!)!;

        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn),],
            });
        }

        send(message, { embeds: [await this.nowPlaying(player)] });
    }

    private async nowPlaying(player: KazagumoPlayer) {
        const data = await this.container.db.guild.findUnique({ where: { id: player.guildId } });
        const current = player.queue.current!;
        const title = createTitle(current);

        const description = `${title}${data?.requester ? ` ~ ${current.requester}` : ``}`;
        const duration = Number(current.length);
        const progress = oneLine`
                ${progressBar(player.shoukaku.position, duration, 20, current.isStream)}
                ${prettyMs(player.shoukaku.position, { secondsDecimalDigits: 0 }).replace("ms", "s")} /
                ${!current.isStream ? prettyMs(duration, { secondsDecimalDigits: 0 }) : "∞"}
            `;

        return new EmbedBuilder({ description, footer: { text: progress }, color: KoosColor.Default });
    }
}
