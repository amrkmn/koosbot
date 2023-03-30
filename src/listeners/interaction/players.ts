import { Button } from "#lib/utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { Listener, Events, container } from "@sapphire/framework";
import {
    Message,
    CommandInteraction,
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
import { KazagumoPlayer } from "kazagumo";
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
        const id = interaction.customId as "buttonPauseOrResume" | "buttonSkip" | "buttonStop" | "buttonShowQueue";
        const checkMember = this.checkMember(interaction.guild!, interaction.member as GuildMember);

        if (Object.values(Button).includes(id)) await interaction.deferUpdate();
        if (!isNullish(checkMember)) return interaction.followUp({ embeds: [checkMember], ephemeral: true });
        if (
            ["buttonPauseOrResume", "buttonSkip", "buttonStop"].includes(id) && //
            !this.checkDJ(interaction, player, data.dj)
        )
            return interaction.followUp({
                embeds: [{ description: `This button can only be use by DJ.`, color: KoosColor.Error }],
                ephemeral: true,
            });

        switch (id) {
            case "buttonPauseOrResume":
                player.pause(!player.paused);
                msg.edit({ components: [this.buttons(player.paused)] });
                break;
            case "buttonSkip":
                player.skip();
                break;
            case "buttonStop":
                player.queue.clear();
                player.skip();
                break;
            case "buttonShowQueue":
                const queue = await this.queue(player);
                const embed = queue[0];

                if (embed.data.footer?.text) {
                    embed.setFooter({
                        text: `Page 1/${queue.length} | ${embed.data.footer?.text}`,
                        iconURL: embed.data.footer?.icon_url,
                    });
                }

                await interaction.followUp({ embeds: [embed], ephemeral: true });
                // const generateButtons = (state: boolean) => {
                //     const checkState = (name: string) => {
                //         if (queue.length === 1) return true;
                //         if (["first", "previous"].includes(name) && currentPage === 1) return true;
                //         if (["next", "last"].includes(name) && currentPage === queue.length) return true;
                //         return false;
                //     };
                //     let names = ["first", "previous", "next", "last"];
                //     names.push("stop");
                //     const buttons = names.reduce((accumulator: MessageButton[], name) => {
                //         accumulator.push(
                //             new MessageButton()
                //                 .setCustomId(name)
                //                 .setDisabled(state || checkState(name))
                //                 .setLabel(this.defaultLabels[name])
                //                 .setStyle(this.defaultStyles[name])
                //         );
                //         return accumulator;
                //     }, []);
                //     return buttons;
                // };
                // const components = (state = false) => new ActionRowBuilder().addComponents(generateButtons(state));
                // const changeFooter = () => {
                //     const embed = queue[currentPage - 1];
                //     const newEmbed = new EmbedBuilder(embed);
                //     if (embed?.footer?.text) {
                //         return newEmbed.setFooter({
                //             text: `Page ${currentPage}/${queue.length} | ${embed.footer.text}`,
                //             iconURL: embed.footer.iconURL,
                //         });
                //     }
                //     return newEmbed.setFooter({ text: `Page ${currentPage}/${queue.length}` });
                // };

                // await interaction.reply({ embeds: [changeFooter()], components: [components()], ephemeral: true });

                // const collector = interaction.channel?.createMessageComponentCollector({
                //     filter: (i) => i.user.id === interaction.user.id && !interaction.user.bot,
                //     componentType: "BUTTON",
                //     time: ms("30s"),
                // });
                // if (isNullish(collector)) return;

                // collector.on("collect", async (i) => {
                //     try {
                //         const id = i.customId;
                //         if (id === "first") currentPage = 1;
                //         if (id === "previous") currentPage--;
                //         if (id === "next") currentPage++;
                //         if (id === "last") currentPage = queue.length;
                //         if (id === "stop") {
                //             collector.stop("user");
                //             await i.update({ embeds: [changeFooter()], components: [components(true)] });
                //             return;
                //         }

                //         collector.resetTimer();
                //         await i.update({ embeds: [changeFooter()], components: [components()] });
                //     } catch (error) {}
                // });
                // collector.on("end", (_, reason) => {
                //     try {
                //         if (reason == "user" || reason == "time") interaction.editReply({ components: [components(true)] });
                //         else return;
                //     } catch (error) {}
                // });

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

    private buttons(paused = false) {
        return new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder({ style: ButtonStyle.Success, label: !paused ? "Pause" : "Resume", customId: Button.PauseOrResume }),
            new ButtonBuilder({ style: ButtonStyle.Primary, label: "Skip", customId: Button.Skip }),
            new ButtonBuilder({ style: ButtonStyle.Danger, label: "Stop", customId: Button.Stop }),
            new ButtonBuilder({ style: ButtonStyle.Secondary, label: "Show Queue", customId: Button.ShowQueue })
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
