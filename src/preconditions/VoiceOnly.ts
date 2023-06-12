import type { AnyInteraction } from "@sapphire/discord.js-utilities";
import { Precondition } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";
import { Message, type Interaction, GuildMember } from "discord.js";

export class UserPrecondition extends Precondition {
    public async messageRun(message: Message) {
        return this.checkMember(message);
    }

    public async chatInputRun(interaction: Interaction) {
        return this.checkMember(interaction);
    }

    private checkMember(messageOrInteraction: Message | AnyInteraction) {
        const guild = messageOrInteraction.guild;
        const member = messageOrInteraction.member as GuildMember;

        if (!guild) return this.error({ message: "You cannot run this message command in DMs.", identifier: "preconditionVoiceOnly" });
        if (
            !isNullish(guild.members.me) &&
            !isNullish(member.voice.channel) && //
            !isNullish(guild.members.me.voice.channel) &&
            member.voice.channelId !== guild.members.me!.voice.channelId
        )
            return this.error({
                message: `You are not connected to the same voice channel as I am. I'm currently connected to ${guild.members.me.voice.channel}.`,
                context: { channel: guild.members.me!.voice.channel },
                identifier: "preconditionVoiceOnly",
            });

        return member.voice.channel !== null //
            ? this.ok()
            : this.error({ message: "You are not connected to a voice channel.", identifier: "preconditionVoiceOnly" });
    }
}

declare module "@sapphire/framework" {
    interface Preconditions {
        VoiceOnly: never;
    }
}
