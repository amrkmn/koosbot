import { KoosPlayer } from "#lib/extensions/KoosPlayer";
import { embedColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { GuildMember, Message, MessageEmbed } from "discord.js";
import pluralize from "pluralize";

@ApplyOptions<Command.Options>({
    description: "Skip to the next track.",
    preconditions: ["GuildOnly", "VoiceOnly"],
})
export class UserCommand extends Command {
    public votes = new Set<string>();

    public async messageRun(message: Message) {
        const { db, kazagumo } = this.container;
        const player = kazagumo.getPlayer(message.guildId!)!;
        const member = message.member as GuildMember;
        const channel = member.voice.channel;
        const data = await db.guild.findUnique({ where: { id: message.guildId! } });

        if (!channel)
            return reply(message, { embeds: [{ description: "You aren't connected to a voice channel", color: embedColor.red }] });

        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [{ description: "There's nothing playing in this server", color: embedColor.default }],
            });
        }

        const listeners = channel.members.filter((member) => !member.user.bot);
        const current = player.queue.current!;
        const title = `[${current.title}](<${current.uri}>)`;

        const embed = new MessageEmbed() //
            .setDescription(`${title} has been skipped`)
            .setColor(embedColor.green);

        if (data && member.roles.cache.has(data.dj)) {
            return reply(message, { embeds: [embed] }).then(() => {
                player.skip();
            });
        } else if (data && listeners.size > 1) {
            let votes = this.getVotes(player);
            let msg = "",
                color = 0;
            if (votes.has(member.id)) {
                msg = `You have already voted`;
                color = embedColor.red;
            } else {
                msg = `Skipping`;
                color = embedColor.green;
                votes.add(member.id);
            }

            const voters = member.voice.channel.members.filter((voter) => votes.has(voter.id)).size;
            const required = listeners.size;

            msg += `, ${voters}/${required} (${required} ${pluralize("vote", required)} required)`;

            if (voters >= required) {
                for (let [voter] of member.voice.channel.members.filter((voter) => votes.has(voter.id))) {
                    votes.delete(voter);
                }
                msg = `${title} has been skipped`;
                color = embedColor.green;
                player.skip();
            }

            return send(message, { embeds: [{ description: msg, color }] });
        } else {
            send(message, { embeds: [embed] }).then(() => {
                player.skip();
            });
        }
    }

    getVotes(player: KoosPlayer) {
        return player.votes;
    }
}
