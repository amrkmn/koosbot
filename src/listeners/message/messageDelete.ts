import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";
import { Message } from "discord.js";

@ApplyOptions<Listener.Options>({
    event: Events.MessageDelete,
})
export class ClientListener extends Listener {
    public async run(message: Message) {
        const { kazagumo, db } = this.container;

        const player = kazagumo.getPlayer(message.guildId!);
        const data = await db.guild.findUnique({ where: { id: message.guildId! } });
        if (isNullish(player) || isNullish(data)) return;

        await player.newDashboard(player.queue.current!);
    }
}
