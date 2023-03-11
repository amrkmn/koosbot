import { Precondition, PreconditionOptions } from "@sapphire/framework";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import { CommandInteraction, GuildMember, Message } from "discord.js";
import { KazagumoPlayer } from "kazagumo";

export class DJPrecondition extends Precondition<PreconditionOptions> {
    public async messageRun(message: Message) {
        if (!message.guild) return this.ok();
        const data = await this.container.db.guild.findUnique({ where: { id: `${message.guildId}` } });
        if (isNullish(data) || (data && isNullishOrEmpty(data.dj))) return this.ok();

        const player = this.container.kazagumo.getPlayer(`${message.guildId}`);
        if (!player || (player && !player.queue.current)) return this.ok();

        return this.checkDJ(message, player, data.dj)
            ? this.ok()
            : this.error({ message: `This command can only run by DJ or the song requester.` });
    }

    public async chatInputRun(interaction: CommandInteraction) {
        if (!interaction.guild) return this.ok();
        const data = await this.container.db.guild.findUnique({ where: { id: `${interaction.guildId}` } });
        if (isNullish(data) || (data && isNullishOrEmpty(data.dj))) return this.ok();

        const player = this.container.kazagumo.getPlayer(`${interaction.guildId}`);
        if (!player || (player && !player.queue.current)) return this.ok();

        return this.checkDJ(interaction, player, data.dj)
            ? this.ok()
            : this.error({ message: `This command can only run by DJ or the song requester.` });
    }

    private checkDJ(message: Message | CommandInteraction, player: KazagumoPlayer, dj: string[]) {
        const member = message.member as GuildMember;

        // const current = player.queue.current!;
        // const requester = current.requester;
        
        const roles = [...member.roles.cache.keys()].filter((id) => dj.includes(id));
        
        // if (requester instanceof GuildMember && requester.user.id === member.user.id) {
        //     return requester.user.id === member.user.id;
        // }

        return !isNullishOrEmpty(roles);
    }
}
