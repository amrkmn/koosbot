import { checkDJ } from "#utils/functions";
import type { AnyInteraction } from "@sapphire/discord.js-utilities";
import { Precondition, type PreconditionOptions } from "@sapphire/framework";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import { ChatInputCommandInteraction, GuildMember, Message } from "discord.js";

export class DJPrecondition extends Precondition<PreconditionOptions> {
    public async messageRun(message: Message) {
        return await this.checkMember(message);
    }

    public async chatInputRun(interaction: ChatInputCommandInteraction) {
        return await this.checkMember(interaction);
    }

    private async checkMember(messageOrInteraction: Message | AnyInteraction) {
        const guild = messageOrInteraction.guild;
        const member = messageOrInteraction.member as GuildMember;

        if (isNullish(guild)) return this.ok();

        const data = await this.container.db.guild.findUnique({ where: { id: guild.id } });
        if (isNullish(data) || isNullishOrEmpty(data.dj)) return this.ok();

        const player = this.container.manager.players.get(guild.id);
        if (isNullish(player) || isNullish(player.current)) return this.ok();

        return checkDJ(member, data.dj)
            ? this.ok()
            : this.error({ message: `This command can only be run by DJ.`, identifier: "preconditionDJ" });
    }
}
