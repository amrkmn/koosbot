import type { Player } from "#lib/audio";
import { KoosCommand } from "#lib/extensions";
import { ButtonId, KoosColor } from "#utils/constants";
import { createTitle, mins } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { isAnyInteraction } from "@sapphire/discord.js-utilities";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { oneLine } from "common-tags";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, GuildMember, Message } from "discord.js";
import pluralize from "pluralize";

@ApplyOptions<KoosCommand.Options>({
    description: "Lets you vote for skipping the current track.",
    aliases: ["vs"],
    preconditions: ["VoiceOnly"],
})
export class VoteSkipCommand extends KoosCommand {
    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand((builder) =>
            builder //
                .setName(this.name)
                .setDescription(this.description)
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const { manager } = this.container;
        const player = manager.players.get(interaction.guildId!)!;

        if (player) await interaction.deferReply();
        if (!player || !player.current) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
                ephemeral: true,
            });
        }
        if (player.voting) {
            const embed = new EmbedBuilder()
                .setDescription(`There is already an active vote to skip the current track`)
                .setColor(KoosColor.Default);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        player.votes.add(interaction.user.id);

        await this.voteSkip(interaction, player);
    }

    public async messageRun(message: Message) {
        const { manager } = this.container;
        const player = manager.players.get(message.guildId!)!;

        if (!player || !player.current) {
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
            });
        }
        if (player.voting) {
            const embed = new EmbedBuilder()
                .setDescription(`There is already an active vote to skip the current track`)
                .setColor(KoosColor.Default);
            return send(message, { embeds: [embed] });
        }
        player.votes.add(message.author.id);

        await this.voteSkip(message, player);
    }

    private async voteSkip(messageOrInteraction: Message | KoosCommand.ChatInputCommandInteraction, player: Player) {
        const member = messageOrInteraction.member as GuildMember;
        const channel = member.voice.channel!;

        const listeners = channel.members.filter((member) => !member.user.bot);
        const current = player.current!;
        const title = createTitle(current);
        const required = Math.ceil(listeners.size * 0.4);

        const embed = new EmbedBuilder()
            .setDescription(
                oneLine`
                    ${member} requested to skip the current track,
                    ${player.votes.size}/${required} (${required} ${pluralize("vote", required)} required)
                `
            )
            .setColor(KoosColor.Default);
        const voteButton = new ButtonBuilder().setCustomId(ButtonId.Votes).setLabel("Vote to skip").setStyle(ButtonStyle.Success);
        const cancelButton = new ButtonBuilder().setCustomId(ButtonId.Cancel).setLabel("Cancel").setStyle(ButtonStyle.Danger);
        const row = new ActionRowBuilder<ButtonBuilder>().setComponents(voteButton, cancelButton);

        const msg = isAnyInteraction(messageOrInteraction)
            ? await messageOrInteraction.followUp({ embeds: [embed], components: [row] })
            : await send(messageOrInteraction, { embeds: [embed], components: [row] });

        const collector = msg.createMessageComponentCollector({
            filter: (i) => {
                if (i.customId === ButtonId.Cancel) {
                    const embed = new EmbedBuilder()
                        .setDescription(`Only ${msg.author} can use this button`)
                        .setColor(KoosColor.Error);
                    if (i.user.id !== member.id) i.reply({ embeds: [embed], ephemeral: true });
                    return i.user.id === member.id && i.message.id === msg.id;
                } else {
                    const embed = new EmbedBuilder()
                        .setDescription(`Only the listeners can use this button`)
                        .setColor(KoosColor.Error);
                    if (!listeners.has(i.user.id)) i.reply({ embeds: [embed], ephemeral: true });
                    return listeners.has(i.user.id) && i.message.id === msg.id;
                }
            },
            time: mins(25),
        });

        player.voting = true;

        collector.on("collect", async (interaction) => {
            if (!interaction.isButton()) return;
            if (![ButtonId.Votes, ButtonId.Cancel].includes(interaction.customId as ButtonId)) return;

            const userId = interaction.user.id;

            await interaction.deferUpdate();

            if (interaction.customId === ButtonId.Cancel) return collector.stop("cancelled");
            if (listeners.size > 2) {
                const votes = player.votes;

                if (votes.has(userId)) {
                    interaction.followUp({
                        embeds: [new EmbedBuilder().setDescription(`You have already voted`).setColor(KoosColor.Error)],
                        ephemeral: true,
                    });
                    return;
                }

                collector.resetTimer();
                votes.add(userId);

                const embed = new EmbedBuilder()
                    .setDescription(
                        oneLine`
                            ${member} requested to skip the current track,
                            ${player.votes.size}/${required} (${required} ${pluralize("vote", required)} required)
                        `
                    )
                    .setColor(KoosColor.Default);
                await interaction.editReply({ embeds: [embed] });

                const voters = channel.members.filter((member) => votes.has(member.id));

                if (voters.size >= required) {
                    votes.clear();
                    player.voting = false;
                    player.skip();

                    const embed = new EmbedBuilder().setDescription(`${title} has been skipped`).setColor(KoosColor.Success);
                    await interaction.channel?.send({ embeds: [embed] });

                    await interaction.deleteReply(interaction.message);
                    return collector.stop("skipped");
                }
            } else {
                player.votes.clear();
                player.voting = false;
                player.skip();

                const embed = new EmbedBuilder().setDescription(`${title} has been skipped`).setColor(KoosColor.Success);
                await interaction.channel?.send({ embeds: [embed] });

                await interaction.deleteReply(interaction.message);
                return collector.stop("skipped");
            }
        });

        collector.on("end", (_, reason) => {
            if (reason === "time") {
                player.voting = false;
                const embed = new EmbedBuilder()
                    .setDescription(`It seem there is no user has clicked the button, cancelling`)
                    .setColor(KoosColor.Error);
                msg.edit({ embeds: [embed], components: [] });
            } else if (reason === "cancelled") {
                player.votes.clear();
                player.voting = false;
                const embed = new EmbedBuilder().setDescription(`Vote skip had been cancelled`).setColor(KoosColor.Default);
                msg.edit({ embeds: [embed], components: [] });
            }
        });
    }
}
