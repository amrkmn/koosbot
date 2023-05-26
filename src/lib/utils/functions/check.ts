import { KoosColor } from "#utils/constants";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import { EmbedBuilder, Guild, GuildMember } from "discord.js";

export function checkMember(guild: Guild | null, member: GuildMember) {
    if (!guild) return new EmbedBuilder().setDescription("You cannot run this message command in DMs.").setColor(KoosColor.Error);
    if (
        !isNullish(guild.members.me) &&
        !isNullish(member.voice.channel) && //
        !isNullish(guild.members.me.voice.channel) &&
        member.voice.channelId !== guild.members.me!.voice.channelId
    )
        return new EmbedBuilder()
            .setDescription(
                `You aren't connected to the same voice channel as I am. I'm currently connected to ${guild.members.me.voice.channel}.`
            )
            .setColor(KoosColor.Error);

    return !isNullish(member.voice.channel) //
        ? undefined
        : new EmbedBuilder().setDescription("You aren't connected to a voice channel.").setColor(KoosColor.Error);
}

export function checkDJ(member: GuildMember, dj: string[]) {
    const voiceChannel = member.voice.channel;
    if (isNullish(voiceChannel)) return true;

    const listeners = voiceChannel.members.filter((x) => !x.user.bot);
    if (listeners.size <= 1) return true;

    const noDJ = [...listeners.values()].every((member) =>
        isNullishOrEmpty([...member.roles.cache.keys()].filter((id) => dj.includes(id)))
    );
    const roles = [...member.roles.cache.keys()].filter((id) => dj.includes(id));

    if (noDJ) return true;
    else return !isNullishOrEmpty(roles);
}
