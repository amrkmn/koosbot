import type { Player } from "#lib/audio";
import { KoosCommand } from "#lib/extensions";
import { Paginator } from "#lib/structures";
import { KoosColor } from "#utils/constants";
import { convertTime, createTitle } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { Args } from "@sapphire/framework";
import { reply } from "@sapphire/plugin-editable-commands";
import { chunk, isNullishOrEmpty } from "@sapphire/utilities";
import { stripIndents } from "common-tags";
import { EmbedBuilder, GuildMember, Message } from "discord.js";

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
        const { manager } = this.container;
        const player = manager.players.get(`${interaction.guildId}`);
        const member = interaction.member! as GuildMember;

        if (player) await interaction.deferReply();
        if (!player || !player.current) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
                ephemeral: true,
            });
        }

        const pagination = new Paginator({ member, message: interaction });
        const pages = await this.queue(player);

        await pagination.addPages(pages).run();
    }

    public async messageRun(message: Message, _args: Args) {
        const { manager } = this.container;
        const player = manager.players.get(`${message.guildId}`);

        if (!player || !player.current) {
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
            });
        }

        const pagination = new Paginator({ message, member: message.member! });
        const pages = await this.queue(player);

        await pagination.addPages(pages).run();
    }

    private async queue(player: Player) {
        const data = await this.container.db.guild.findUnique({ where: { id: player.guildId } });
        const current = player.current!;
        let timeLeft = current.isStream //
            ? "Live"
            : `${convertTime(Number(current.length) - player.shoukaku.position)} left`;
        let duration = player.queue.empty ? current.length : player.queue.duration + Number(current.length);
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
