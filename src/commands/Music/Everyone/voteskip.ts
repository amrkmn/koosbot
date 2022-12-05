import { KoosCommand } from "#lib/extensions";
import { guild } from "@prisma/client";
import { ApplyOptions } from "@sapphire/decorators";
import { KazagumoPlayer } from "kazagumo";
import { Message, GuildMember, MessageEmbed } from "discord.js";
import { embedColor } from "#utils/constants";
import pluralize from "pluralize";
import { reply, send } from "@sapphire/plugin-editable-commands";

@ApplyOptions<KoosCommand.Options>({
    description: "Lets you vote for skipping the current track.",
    preconditions: ["GuildOnly", "VoiceOnly"],
})
export class UserCommand extends KoosCommand {
    public votes = new Set<string>();

    public override registerApplicationCommands(registery: KoosCommand.Registry) {
        registery.registerChatInputCommand(
            (builder) =>
                builder //
                    .setName(this.name)
                    .setDescription(this.description),
            { idHints: ["1049316212124946442", "1049325909859127326"] }
        );
    }

    public async chatInputRun(interaction: KoosCommand.ChatInputInteraction) {
        const { db, kazagumo } = this.container;
        const player = kazagumo.getPlayer(interaction.guildId!)!;
        const data = await db.guild.findUnique({ where: { id: interaction.guildId! } });

        if (player) await interaction.deferReply();
        if (!player || (player && !player.queue.current)) {
            return interaction.reply({
                embeds: [{ description: "There's nothing playing in this server", color: embedColor.warn }],
                ephemeral: true,
            });
        }

        interaction.followUp({ embeds: [await this.voteskip(data, interaction, player)] });
    }

    public async messageRun(message: Message) {
        const { db, kazagumo } = this.container;
        const player = kazagumo.getPlayer(message.guildId!)!;
        const data = await db.guild.findUnique({ where: { id: message.guildId! } });

        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [{ description: "There's nothing playing in this server", color: embedColor.warn }],
            });
        }

        send(message, { embeds: [await this.voteskip(data, message, player)] });
    }

    private async voteskip(
        data: guild | null,
        messageOrInteraction: Message | KoosCommand.ChatInputInteraction,
        player: KazagumoPlayer
    ) {
        const member = messageOrInteraction.member as GuildMember;
        const channel = member.voice.channel!;

        const listeners = channel.members.filter((member) => !member.user.bot);
        const current = player.queue.current!;
        const title =
            current.sourceName === "youtube"
                ? `[${current.title}](${current.uri})`
                : `[${current.title} by ${current.author ?? "Unknown artist"}](${current.uri})`;
        const embed = new MessageEmbed() //
            .setDescription(`${title} has been skip`)
            .setColor(embedColor.success);

        if (data && member.roles.cache.has(data.dj)) {
            player.skip();
            return embed;
        } else if (data && listeners.size > 1) {
            let votes = this.getVotes(player);
            let msg = "",
                color = 0,
                voted = false;

            if (votes.has(member.id)) {
                msg = `You have already voted`;
                color = embedColor.error;
                voted = true;
            } else {
                msg = `Skipping`;
                color = embedColor.success;
                voted = false;
                votes.add(member.id);
            }

            const voters = channel.members.filter((voter) => votes.has(voter.id)).size;
            const required = listeners.size;

            msg += voted ? "" : `, ${voters}/${required} (${required} ${pluralize("vote", required)} required)`;

            if (voters >= required) {
                for (let [voterId] of channel.members.filter((voter) => votes.has(voter.id))) {
                    votes.delete(voterId);
                }
                msg = `${title} has been skipped`;
                color = embedColor.success;
                player.skip();
                return new MessageEmbed({ description: msg, color });
            }

            return new MessageEmbed({ description: msg, color });
        } else {
            player.skip();
            return embed;
        }
    }

    private getVotes(player: KazagumoPlayer) {
        return player.skipVotes;
    }
}
