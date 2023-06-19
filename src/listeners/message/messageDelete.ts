import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";
import { Message } from "discord.js";

@ApplyOptions<Listener.Options>({
    event: Events.MessageDelete,
})
export class ClientListener extends Listener {
    public async run(message: Message) {
        const { kazagumo } = this.container;

        const player = kazagumo.getPlayer(message.guildId!);
        if (isNullish(player)) return;

        const dashboard = player.dashboard();
        if (isNullish(dashboard)) return;
        if (dashboard.author.id !== message.author.id || dashboard.id !== message.id) return;

        await player.newDashboard();
    }
}
