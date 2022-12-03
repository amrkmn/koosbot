import { Precondition, PreconditionOptions } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";
import type { CommandInteraction, GuildMember, Message } from "discord.js";

export class DJPrecondition extends Precondition<PreconditionOptions> {
    public async messageRun(message: Message) {
        if (!message.guild) return this.ok();
        const data = await this.container.db.guild.findUnique({ where: { id: `${message.guildId}` } });
        if (isNullish(data)) return this.ok();

        return this.checkDJ(message.member!, data.dj) ? this.ok() : this.error({ message: `This command can only run by DJ.` });
    }

    public async chatInputRun(interaction: CommandInteraction) {
        if (!interaction.guild) return this.ok();
        const data = await this.container.db.guild.findUnique({ where: { id: `${interaction.guildId}` } });
        if (isNullish(data)) return this.ok();

        return this.checkDJ(interaction.member as GuildMember, data.dj)
            ? this.ok()
            : this.error({ message: `This command can only run by DJ.` });
    }

    private checkDJ(member: GuildMember, dj: string) {
        return member.roles.cache.has(dj) || member.roles.cache.some((role) => role.name.toLowerCase() === "dj");
    }
}
