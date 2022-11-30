import { convertTime, embedColor, pagination } from "#lib/utils";
import { ApplyOptions } from "@sapphire/decorators";
import { Command, Args } from "@sapphire/framework";
import { reply } from "@sapphire/plugin-editable-commands";
import { Message, MessageEmbed, TextChannel } from "discord.js";

@ApplyOptions<Command.Options>({
    description: "Display the current queue.",
    aliases: ["q"],
    preconditions: ["GuildOnly", "VoiceOnly"],
})
export class UserCommand extends Command {
    public async messageRun(message: Message, _args: Args) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(`${message.guildId}`);
        const channel = message.channel! as TextChannel;

        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [{ description: "There's nothing playing in this server", color: embedColor.default }],
            });
        }

        const current = player.queue.current!;
        let timeLeft = current.isStream //
            ? "Live"
            : `${convertTime(Number(current.length) - player.shoukaku.position)} left`;
        let totalDuration =
            player.queue.some((track) => track.isStream) || current.isStream
                ? "Live"
                : `${convertTime(Number(player.queue.durationLength || current.length) - player.shoukaku.position)}`;
        let nowPlaying =
            current.sourceName === "youtube"
                ? `[${current.title}](${current.uri})`
                : `[${current.title} by ${current.author ?? "Unknown artist"}](${current.uri})`;

        if (!player.queue.length) {
            const embed = new MessageEmbed()
                .setDescription(
                    [`__Now playing:__`, `${nowPlaying} [${timeLeft}]`, ``, `__Up next:__`, `No other tracks here`].join("\n")
                )
                .setFooter({ text: `Tracks in queue: ${player.queue.size} | Total Length: ${totalDuration}` })
                .setColor(embedColor.default);

            pagination({ channel, target: message.author, fastSkip: true, embeds: [embed] });
            return;
        }

        let queueList = [];
        for (let i = 0; i < player.queue.length; i += 10) {
            let queue = player.queue.slice(i, i + 10);
            queueList.push(
                queue.map((track, index) => {
                    let title =
                        track.sourceName === "youtube"
                            ? `[${track.title}](${track.uri})`
                            : `[${track.title} by ${track.author ?? "Unknown artist"}](${track.uri})`;
                    return `**${i + ++index}.** ${title} [${track.isStream ? "Live" : convertTime(track.length!)}]`;
                })
            );
        }

        let embeds = [];
        for (let list of queueList) {
            let upNext = list.join("\n");
            embeds.push(
                new MessageEmbed()
                    .setDescription([`__Now playing:__`, `${nowPlaying} [${timeLeft}]`, ``, `__Up next:__`, `${upNext}`].join("\n"))
                    .setFooter({ text: `Tracks in queue: ${player.queue.size} | Total Length: ${totalDuration}` })
                    .setColor(embedColor.default)
            );
        }

        pagination({ channel, embeds, target: message.author, fastSkip: true });
    }
}
