import type { Player, Track } from "#lib/audio";
import { Events } from "#lib/types";
import { ApplyOptions } from "@sapphire/decorators";
import { Listener, container } from "@sapphire/framework";

@ApplyOptions<Listener.Options>({
    emitter: container.manager,
    name: `manager:${Events.PlayerStart}`,
    event: Events.PlayerStart,
})
export class ClientListener extends Listener {
    public async run(_player: Player, _current: Track) {
        // console.log(current);
    }
}
