import { KoosCommand } from "#lib/extensions";
import { embedColor } from "#utils/constants";
import { ApplyOptions } from "@sapphire/decorators";
import { MessageEmbed, Message } from "discord.js";
// import { isNullishOrEmpty } from "@sapphire/utilities";
import { Args } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";

@ApplyOptions<KoosCommand.Options>({
    description: "Add/Remove a DJ role.",
    preconditions: ["GuildOnly", "Administrator"],
    enabled: false,
    hidden: true,
})
export class AdminCommand extends KoosCommand {
    public async messageRun(message: Message, args: Args) {
        const role = await args.pick("role").catch(() => undefined);
        if (!role && args.finished) return console.log(await this.setdj(message.guildId!, undefined));
        if (!role) return send(message, { embeds: [{ description: `Role not found`, color: embedColor.error }] });

        console.log(await this.setdj(message.guildId!, role.id));
    }

    private async setdj(guildId: string, roleId?: string) {
        const { db } = this.container;
        const data = await db.guild.findUnique({ where: { id: guildId } });
        if (!data) return new MessageEmbed().setDescription(`There is no DJ role set.`).setColor(embedColor.warn);

        const dj = data.dj.map((id) => `<@&${id}>`);
        if (!roleId) return new MessageEmbed().setDescription(`Configured DJ role is ${dj.join(", ")}`).setColor(embedColor.default);

        const roles = data.dj.includes(roleId) ? [...data.dj] : [...data.dj, roleId];

        return await db.guild.update({
            where: { id: guildId },
            data: { dj: { set: roles } },
            select: { dj: true },
        });
    }
}
