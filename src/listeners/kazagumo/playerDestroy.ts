import { ApplyOptions } from "@sapphire/decorators";
import { Listener, container } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";
import { Message } from "discord.js";
import { Events, KazagumoPlayer } from "kazagumo";

@ApplyOptions<Listener.Options>({
    emitter: container.kazagumo,
    name: `kazagumo:${Events.PlayerDestroy}`,
    event: Events.PlayerDestroy,
})
export class ClientListener extends Listener {
    public async run(player: KazagumoPlayer) {
        const msg = player.data.get("nowPlayingMessage");
        if (!isNullish(msg) && msg instanceof Message && msg.deletable) msg.delete();
    }
}
