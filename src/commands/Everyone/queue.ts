import { KoosCommand } from "#lib/extensions";
import { convertTime, createTitle, pagination } from "#utils/functions";
import { KoosColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { Args } from "@sapphire/framework";
import { reply } from "@sapphire/plugin-editable-commands";
import { Message, EmbedBuilder, TextChannel, User } from "discord.js";
import { KazagumoPlayer } from "kazagumo";
import { stripIndents } from "common-tags";
import { chunk, isNullishOrEmpty } from "@sapphire/utilities";

@ApplyOptions<KoosCommand.Options>({
    description: "Display the current queue.",
    preconditions: ["VoiceOnly"],
    aliases: ["q"],
})
export class QueueCommand extends KoosCommand {
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
        const target = interaction.member!.user as User;

        if (player) await interaction.deferReply();
        if (!player || (player && !player.queue.current)) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
                ephemeral: true,
            });
        }

        pagination({ target, channel: interaction, fastSkip: true, embeds: await this.queue(player) });
    }

    public async messageRun(message: Message, _args: Args) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(`${message.guildId}`);
        const channel = message.channel as TextChannel;
        const target = message.author;

        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
            });
        }

        pagination({ channel, target, fastSkip: true, embeds: await this.queue(player) });
    }

    private async queue(player: KazagumoPlayer) {
        const data = await this.container.db.guild.findUnique({ where: { id: player.guildId } });
        const current = player.queue.current!;
        let timeLeft = current.isStream //
            ? "Live"
            : `${convertTime(Number(current.length) - player.shoukaku.position)} left`;
        let duration = player.queue.isEmpty ? current.length : player.queue.durationLength + Number(current.length);
        let totalDuration =
            player.queue.some((track) => track.isStream) || current.isStream
                ? "Live"
                : `${convertTime(Number(duration) - player.shoukaku.position)}`;
        let nowPlaying =
            current.sourceName === "youtube"
                ? `[${current.title}](${current.uri})`
                : `[${current.title} ${current.author ? `by ${current.author}` : ``}](${current.uri})`;

        let tracks = player.queue.map((track, i) => {
            const title = createTitle(track);
            const duration = convertTime(track.length ?? 0);
            const requester = data?.requester ? `~ ${track.requester}` : ``;
            return `**${i + 1}.** ${title} [${duration}] ${requester}`;
        });
        let pagesNum = Math.ceil(tracks.length / 10) <= 0 ? 1 : Math.ceil(tracks.length / 10);
        let list = chunk(tracks, 10);

        const embeds = [];

        for (let i = 0; i < pagesNum; i++) {
            const upNext = isNullishOrEmpty(list) ? `No other tracks here` : list[i].join("\n");

            embeds.push(
                new EmbedBuilder()
                    .setDescription(
                        stripIndents`
                            __Now playing:__
                            ${nowPlaying} [${timeLeft}]${data?.requester ? ` ~ ${current.requester}` : ``}

                            __Up next:__
                            ${upNext}
                        `
                    )
                    .setThumbnail(current.thumbnail ?? null)
                    .setFooter({ text: `Tracks in queue: ${player.queue.size} | Total Length: ${totalDuration}` })
                    .setColor(KoosColor.Default)
            );
        }

        return embeds;
    }
}
