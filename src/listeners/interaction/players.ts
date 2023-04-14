import { Button } from "#lib/utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { Listener, Events } from "@sapphire/framework";
import {
    Message,
    ButtonBuilder,
    ActionRowBuilder,
    EmbedBuilder,
    GuildMember,
    Guild,
    ButtonStyle,
    Interaction,
    ButtonInteraction,
} from "discord.js";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import { KazagumoPlayer, KazagumoTrack, RawTrack } from "kazagumo";
import { convertTime } from "#utils/functions";
import { KoosColor } from "#utils/constants";
import { stripIndents } from "common-tags";

@ApplyOptions<Listener.Options>({
    name: "players",
    event: Events.InteractionCreate,
})
export class ClientListener extends Listener {
    public async run(interaction: Interaction) {
        if (!interaction.isButton()) return;
        const player = this.container.kazagumo.getPlayer(interaction.guildId!);
        const data = await this.container.db.guild.findUnique({ where: { id: interaction.guildId! } });
        if (isNullish(player) || isNullish(data)) return;

        const msg = player.data.get("nowPlayingMessage") as Message;
        const id = interaction.customId as Button;
        const checkMember = this.checkMember(interaction.guild!, interaction.member as GuildMember);

        if (Object.values(Button).includes(id)) await interaction.deferUpdate();
        if (!isNullish(checkMember)) return interaction.followUp({ embeds: [checkMember], ephemeral: true });
        if (
            [Button.PauseOrResume, Button.Previous, Button.Skip, Button.Stop].includes(id) && //
            !this.checkDJ(interaction, player, data.dj)
        )
            return interaction.followUp({
                embeds: [{ description: `This button can only be use by DJ.`, color: KoosColor.Error }],
                ephemeral: true,
            });

        const currentTrack = player.data.get("currentTrack") as RawTrack;
        const queueData = player.data.get("queue") as RawTrack[];

        const currentIndex = queueData.findIndex((rawTrack) => rawTrack.track === currentTrack.track);
        const previousTrack = queueData[currentIndex - 1];

        switch (id) {
            case Button.PauseOrResume:
                player.pause(!player.paused);
                msg.edit({ components: [this.buttons(player.paused, isNullish(previousTrack))] });
                break;
            case Button.Previous:
                if (isNullish(previousTrack)) return;
                const resolvedTrack = new KazagumoTrack(previousTrack, interaction.member);
                player.play(resolvedTrack);
                break;
            case Button.Skip:
                player.skip();
                break;
            case Button.Stop:
                player.queue.clear();
                player.skip();
                break;
            case Button.ShowQueue:
                const queue = await this.queue(player);
                const embed = queue[0];

                if (embed.data.footer?.text)
                    embed.setFooter({
                        text: `Page 1/${queue.length} | ${embed.data.footer?.text}`,
                        iconURL: embed.data.footer?.icon_url,
                    });

                await interaction.followUp({ embeds: [embed], ephemeral: true });
                break;
        }
    }

    private checkMember(guild: Guild | null, member: GuildMember) {
        if (!guild) return new EmbedBuilder({ description: "You cannot run this message command in DMs.", color: KoosColor.Error });
        if (
            !isNullish(guild.members.me) &&
            member.voice.channel !== null && //
            guild.members.me.voice.channel !== null &&
            member.voice.channelId !== guild.members.me!.voice.channelId
        )
            return new EmbedBuilder({
                description: `You aren't connected to the same voice channel as I am. I'm currently connected to ${guild.members.me.voice.channel}`,
                color: KoosColor.Error,
            });

        return member.voice.channel !== null //
            ? undefined
            : new EmbedBuilder({ description: "You aren't connected to a voice channel.", color: KoosColor.Error });
    }

    private checkDJ(message: Message | ButtonInteraction, player: KazagumoPlayer, dj: string[]) {
        const member = message.member as GuildMember;

        // const current = player.queue.current!;
        // const requester = current.requester;

        const roles = [...member.roles.cache.keys()].filter((id) => dj.includes(id));

        // if (requester instanceof GuildMember && requester.user.id === member.user.id) {
        //     return requester.user.id === member.user.id;
        // }

        return !isNullishOrEmpty(roles);
    }

    private buttons(paused = false, firstTrack: boolean) {
        return new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder()
                .setCustomId(Button.PauseOrResume)
                .setStyle(ButtonStyle.Success)
                .setLabel(!paused ? "Pause" : "Resume"),
            new ButtonBuilder()
                .setCustomId(Button.Previous)
                .setStyle(ButtonStyle.Primary)
                .setLabel("Previous")
                .setDisabled(firstTrack),
            new ButtonBuilder().setCustomId(Button.Skip).setStyle(ButtonStyle.Primary).setLabel("Skip"),
            new ButtonBuilder().setCustomId(Button.Stop).setStyle(ButtonStyle.Danger).setLabel("Stop"),
            new ButtonBuilder().setCustomId(Button.ShowQueue).setStyle(ButtonStyle.Secondary).setLabel("Show Queue")
        );
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
                : `[${current.title} by ${current.author ?? "Unknown artist"}](${current.uri})`;

        if (player.queue.isEmpty) {
            const embed = new EmbedBuilder()
                .setDescription(
                    stripIndents`
                        __Now playing:__
                        ${nowPlaying} [${timeLeft}]${data?.requester ? ` ~ ${current.requester}` : ``}

                        __Up next:__
                        No other tracks here
                    `
                )
                .setFooter({ text: `Tracks in queue: ${player.queue.size} | Total Length: ${totalDuration}` })
                .setColor(KoosColor.Default);

            return [embed];
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
                    return `**${i + ++index}.** ${title} [${track.isStream ? "Live" : convertTime(track.length!)}]${
                        data?.requester ? ` ~ ${track.requester}` : ``
                    }`;
                })
            );
        }

        let embeds = [];
        for (let list of queueList) {
            let upNext = list.join("\n");
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
                    .setFooter({ text: `Tracks in queue: ${player.queue.size} | Total Length: ${totalDuration}` })
                    .setColor(KoosColor.Default)
            );
        }

        return embeds;
    }
}
