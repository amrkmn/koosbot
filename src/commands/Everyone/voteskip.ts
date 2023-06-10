import { KoosCommand } from "#lib/extensions";
import { ApplyOptions } from "@sapphire/decorators";
import { KazagumoPlayer } from "kazagumo";
import { Message, GuildMember, EmbedBuilder } from "discord.js";
import { KoosColor } from "#utils/constants";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { createTitle } from "#utils/functions";
import pluralize from "pluralize";

@ApplyOptions<KoosCommand.Options>({
    description: "Lets you vote for skipping the current track.",
    aliases: ["vs"],
    preconditions: ["VoiceOnly"],
})
export class VoteSkipCommand extends KoosCommand {
    public votes = new Set<string>();

    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand((builder) =>
            builder //
                .setName(this.name)
                .setDescription(this.description)
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputCommandInteraction) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(interaction.guildId!)!;

        if (player) await interaction.deferReply();
        if (!player || !player.queue.current) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
                ephemeral: true,
            });
        }

        interaction.followUp({ embeds: [await this.voteSkip(interaction, player)] });
    }

    public async messageRun(message: Message) {
        const { kazagumo } = this.container;
        const player = kazagumo.getPlayer(message.guildId!)!;

        if (!player || !player.queue.current) {
            return reply(message, {
                embeds: [new EmbedBuilder().setDescription(`There's nothing playing in this server`).setColor(KoosColor.Warn)],
            });
        }

        send(message, { embeds: [await this.voteSkip(message, player)] });
    }

    private async voteSkip(messageOrInteraction: Message | KoosCommand.ChatInputCommandInteraction, player: KazagumoPlayer) {
        const member = messageOrInteraction.member as GuildMember;
        const channel = member.voice.channel!;

        const listeners = channel.members.filter((member) => !member.user.bot);
        const current = player.queue.current!;
        const title = createTitle(current);

        if (listeners.size > 1) {
            let votes = this.getVotes(player);
            let msg = "",
                color = 0,
                voted = false;

            if (votes.has(member.id)) {
                msg = `You have already voted so I removed your's`;
                color = KoosColor.Default;
                voted = true;
                votes.delete(member.id);
            } else {
                msg = `Skipping`;
                color = KoosColor.Default;
                voted = false;
                votes.add(member.id);
            }

            const voters = channel.members.filter((member) => votes.has(member.id));
            const required = listeners.size;

            msg += voted ? "" : `, ${voters.size}/${required} (${required} ${pluralize("vote", required)} required)`;

            if (voters.size >= required) {
                votes.clear();
                msg = `${title} has been skipped`;
                color = KoosColor.Success;
                player.skip();
                return new EmbedBuilder().setDescription(msg).setColor(color);
            }

            return new EmbedBuilder().setDescription(msg).setColor(color);
        } else {
            player.skip();
            return new EmbedBuilder() //
                .setDescription(`${title} has been skip`)
                .setColor(KoosColor.Success);
        }
    }

    private getVotes(player: KazagumoPlayer) {
        return player.skipVotes;
    }
}
