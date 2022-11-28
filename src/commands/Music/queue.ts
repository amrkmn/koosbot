import { convertTime, embedColor, regex } from "#lib/utils";
import { ApplyOptions } from "@sapphire/decorators";
import { Command, Args } from "@sapphire/framework";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { Message, GuildMember, MessageEmbed } from "discord.js";

@ApplyOptions<Command.Options>({
    description: "Display the current queue.",
    aliases: ["q"],
})
export class UserCommand extends Command {
    public async messageRun(message: Message, _args: Args) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(`${message.guildId}`);
        const member = message.member as GuildMember;
        const channel = member.voice.channel;

        if (!channel) return reply(message, { content: "You aren't connected to a voice channel" });

        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [{ description: "There's nothing playing in this server" }],
            });
        }

        const current = player.queue.current!;
        if (!player.queue.length) {
            let timeLeft = current.isStream //
                ? "Live"
                : `${convertTime(Number(current.length) - player.shoukaku.position)} left`;
            let totalDuration =
                player.queue.some((track) => track.isStream) || current.isStream
                    ? "Live"
                    : `${convertTime(Number(current.length) - player.shoukaku.position)} left`;
            let title = regex.youtube.test(current.uri)
                ? `[${current.title}](${current.uri})`
                : `[${current.title} by ${current.author}](${current.uri})`;

            const embed = new MessageEmbed()
                .setDescription([`🔊 Now playing:`, `${title} [${timeLeft}]`, ``, `🔊 Up next:`, `No other tracks here`].join("\n"))
                .setFooter({ text: `Tracks in queue: ${player.queue.size} | Total Length: ${totalDuration}` })
                .setColor(embedColor.default);

            send(message, { embeds: [embed] });
        }
    }
}
