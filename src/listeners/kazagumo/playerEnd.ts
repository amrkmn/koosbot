import { ApplyOptions } from "@sapphire/decorators";
import { container, Listener } from "@sapphire/framework";
import { Events, KazagumoPlayer } from "kazagumo";

@ApplyOptions<Listener.Options>({
    emitter: container.kazagumo,
    name: `kazagumo:${Events.PlayerEnd}`,
    event: Events.PlayerEnd,
    enabled: false,
})
export class ClientListener extends Listener {
    public async run(_player: KazagumoPlayer) {
        return;
    }
}
