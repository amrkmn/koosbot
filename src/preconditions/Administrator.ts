import type { AnyInteraction } from "@sapphire/discord.js-utilities";
import { Precondition, type PreconditionResult } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";
import { ChatInputCommandInteraction, GuildMember, Message, PermissionFlagsBits } from "discord.js";

export class AdministratorPrecondition extends Precondition {
    public messageRun(message: Message): PreconditionResult {
        return this.checkMember(message);
    }

    public chatInputRun(interaction: ChatInputCommandInteraction) {
        return this.checkMember(interaction);
    }

    private checkMember(messageOrInteraction: Message | AnyInteraction) {
        const guild = messageOrInteraction.guild;
        if (isNullish(guild)) return this.error({ message: "This cannot be run in dms" });

        const member = messageOrInteraction.member as GuildMember;

        const permissions = member.permissions;
        return permissions.has(PermissionFlagsBits.ManageGuild)
            ? this.ok()
            : this.error({ message: "This command can only run by server Administrators!", identifier: "preconditionAdministrator" });
    }
}
