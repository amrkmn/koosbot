import { checkDJ } from "#utils/functions";
import { Precondition, PreconditionOptions } from "@sapphire/framework";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import { ChatInputCommandInteraction, GuildMember, Message } from "discord.js";

export class DJPrecondition extends Precondition<PreconditionOptions> {
    public async messageRun(message: Message) {
        if (!message.guild) return this.ok();
        const data = await this.container.db.guild.findUnique({ where: { id: `${message.guildId}` } });
        if (isNullish(data) || (data && isNullishOrEmpty(data.dj))) return this.ok();

        const player = this.container.kazagumo.getPlayer(`${message.guildId}`);
        if (!player || (player && !player.queue.current)) return this.ok();

        return checkDJ(message.member!, data.dj)
            ? this.ok()
            : this.error({ message: `This command can only be run by DJ.` });
    }

    public async chatInputRun(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return this.ok();
        const data = await this.container.db.guild.findUnique({ where: { id: `${interaction.guildId}` } });
        if (isNullish(data) || (data && isNullishOrEmpty(data.dj))) return this.ok();

        const player = this.container.kazagumo.getPlayer(`${interaction.guildId}`);
        if (!player || (player && !player.queue.current)) return this.ok();

        return checkDJ(interaction.member as GuildMember, data.dj)
            ? this.ok()
            : this.error({ message: `This command can only be run by DJ.` });
    }
}
