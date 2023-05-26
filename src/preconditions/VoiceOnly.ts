import { Precondition } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";
import { Message, type Interaction, GuildMember, Guild } from "discord.js";

export class UserPrecondition extends Precondition {
    public async messageRun(message: Message) {
        const { guild, member } = message;
        return this.checkMember(guild, member as GuildMember);
    }

    public async chatInputRun(interaction: Interaction) {
        const { guild, member } = interaction;
        return this.checkMember(guild, member as GuildMember);
    }

    private checkMember(guild: Guild | null, member: GuildMember) {
        if (!guild) return this.error({ message: "You cannot run this message command in DMs." });
        if (
            !isNullish(guild.members.me) &&
            !isNullish(member.voice.channel) && //
            !isNullish(guild.members.me.voice.channel) &&
            member.voice.channelId !== guild.members.me!.voice.channelId
        )
            return this.error({
                message: `You aren't connected to the same voice channel as I am. I'm currently connected to ${guild.members.me.voice.channel}.`,
                context: { channel: guild.members.me!.voice.channel },
            });

        return member.voice.channel !== null //
            ? this.ok()
            : this.error({ message: "You aren't connected to a voice channel." });
    }
}

declare module "@sapphire/framework" {
    interface Preconditions {
        VoiceOnly: never;
    }
}
