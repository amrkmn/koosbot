import { Precondition, type PreconditionResult } from "@sapphire/framework";
import { CommandInteraction, Message, PermissionFlagsBits } from "discord.js";

export class AdministratorPrecondition extends Precondition {
    public messageRun(message: Message): PreconditionResult {
        if (!message.guild) {
            return this.error({ message: "This cannot be run in dms" });
        }
        const member = message.member!;
        return member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageGuild)
            ? this.ok()
            : this.error({ message: "This command can only run by Administrators!" });
    }

    public chatInputRun(interaction: CommandInteraction) {
        if (!interaction.guild) {
            return this.error({ message: "This cannot be run in dms" });
        }
        const memberPermissions = interaction.memberPermissions!;
        return memberPermissions.has(PermissionFlagsBits.Administrator) || memberPermissions.has(PermissionFlagsBits.ManageGuild)
            ? this.ok()
            : this.error({ message: "This command can only run by Administrators!" });
    }
}
