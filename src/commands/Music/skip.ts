import { embedColor } from "#utils/constants";
import { guild } from "@prisma/client";
import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { reply, send } from "@sapphire/plugin-editable-commands";
import { GuildMember, Message, MessageEmbed } from "discord.js";
import { KazagumoPlayer } from "kazagumo";
import pluralize from "pluralize";

@ApplyOptions<Command.Options>({
    description: "Skip to the next track.",
    preconditions: ["GuildOnly", "VoiceOnly"],
    aliases: ["next", "s", "n"],
})
export class UserCommand extends Command {
    public votes = new Set<string>();

    public override registerApplicationCommands(registery: Command.Registry) {
        registery.registerChatInputCommand(
            (builder) =>
                builder //
                    .setName(this.name)
                    .setDescription(this.description),
            { idHints: ["1047804848273375252", "1048159944635072623"] }
        );
    }

    public async chatInputRun(interaction: Command.ChatInputInteraction) {
        const { db, kazagumo } = this.container;
        const player = kazagumo.getPlayer(interaction.guildId!)!;
        const data = await db.guild.findUnique({ where: { id: interaction.guildId! } });

        if (player) await interaction.deferReply();
        if (!player || (player && !player.queue.current)) {
            return interaction.reply({
                embeds: [{ description: "There's nothing playing in this server", color: embedColor.default }],
                ephemeral: true,
            });
        }

        interaction.followUp({ embeds: [await this.skip(data, interaction, player)] });
    }

    public async messageRun(message: Message) {
        const { db, kazagumo } = this.container;
        const player = kazagumo.getPlayer(message.guildId!)!;
        const data = await db.guild.findUnique({ where: { id: message.guildId! } });

        if (!player || (player && !player.queue.current)) {
            return reply(message, {
                embeds: [{ description: "There's nothing playing in this server", color: embedColor.default }],
            });
        }

        send(message, { embeds: [await this.skip(data, message, player)] });
    }

    private async skip(data: guild | null, messageOrInteraction: Message | Command.ChatInputInteraction, player: KazagumoPlayer) {
        const member = messageOrInteraction.member as GuildMember;
        const channel = member.voice.channel!;

        const listeners = channel.members.filter((member) => !member.user.bot);
        const current = player.queue.current!;
        const title =
            current.sourceName === "youtube"
                ? `[${current.title}](${current.uri})`
                : `[${current.title} by ${current.author ?? "Unknown artist"}](${current.uri})`;

        const embed = new MessageEmbed() //
            .setDescription(`${title} has been skipped`)
            .setColor(embedColor.green);

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
                color = embedColor.red;
                voted = true;
            } else {
                msg = `Skipping`;
                color = embedColor.green;
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
                color = embedColor.green;
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
