import { KoosCommand } from "#lib/extensions";
import { embedColor, regex } from "#utils/constants";
import { progressBar } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { Message, MessageEmbed } from "discord.js";
import { KazagumoPlayer } from "kazagumo";
import prettyMs from "pretty-ms";

@ApplyOptions<KoosCommand.Options>({
    description: "Show information about the currently playing track.",
    aliases: ["np"],
    preconditions: ["GuildOnly", "VoiceOnly"],
})
export class UserCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand(
            (builder) =>
                builder //
                    .setName(this.name)
                    .setDescription(this.description),
            { idHints: ["1047562980495196340", "1048159856697278464"] }
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputInteraction) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(interaction.guildId!);

        if (player) await interaction.deferReply();
        if (!player || (player && !player.queue.current)) {
            return interaction.reply({
                embeds: [{ description: "There's nothing playing in this server", color: embedColor.warn }],
                ephemeral: true,
            });
        }

        return interaction.followUp({ embeds: [this.nowPlaying(player)] });
    }

    public async messageRun(message: Message) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(message.guildId!)!;

        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [{ description: "There's nothing playing in this server", color: embedColor.warn }],
            });
        }

        send(message, { embeds: [this.nowPlaying(player)] });
    }

    private nowPlaying(player: KazagumoPlayer) {
        const current = player.queue.current!;
        const title = regex.youtube.test(current.uri)
            ? `[${current.title}](${current.uri})`
            : `[${current.title} by ${current.author ?? "Unknown artist"}](${current.uri})`;

        const description = `${title} [${current.requester}]`;
        const duration = Number(current.length);
        const progress =
            `${progressBar(player.shoukaku.position, duration, 20, current.isStream).bar} ` +
            `${prettyMs(player.shoukaku.position, { secondsDecimalDigits: 0 }).replace("ms", "s")} / ` +
            `${!current.isStream ? prettyMs(duration, { secondsDecimalDigits: 0 }) : "∞"}`;

        return new MessageEmbed({ description, footer: { text: progress }, color: embedColor.default });
    }
}
