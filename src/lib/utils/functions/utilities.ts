import { isGuildBasedChannel, isVoiceBasedChannel, type ChannelTypes } from "@sapphire/discord.js-utilities";
import { isNullish, type Nullish } from "@sapphire/utilities";
import { PermissionFlagsBits, PermissionsBitField, type VoiceBasedChannel } from "discord.js";

const canJoinVoiceChannelPermissions = new PermissionsBitField([PermissionFlagsBits.Connect]);

export function canJoinVoiceChannel(channel: VoiceBasedChannel | Nullish): boolean {
    if (isNullish(channel)) return false;
    if (!isVoiceBasedChannel(channel)) return false;
    if (channel.userLimit > 0 && channel.members.size >= channel.userLimit) return false;

    return canDoUtility(channel, canJoinVoiceChannelPermissions);
}

export function canDoUtility(channel: ChannelTypes, permissionsToPass: PermissionsBitField) {
    if (!isGuildBasedChannel(channel)) {
        return true;
    }

    const { me } = channel.guild.members;
    if (isNullish(me)) return false;

    const permissionsFor = channel.permissionsFor(me);

    return permissionsFor.has(permissionsToPass);
}
