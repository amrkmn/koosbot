import { ApplyOptions } from "@sapphire/decorators";
import { Listener, container } from "@sapphire/framework";
import { cyan } from "colorette";
import { Player } from "shoukaku";

@ApplyOptions<Listener.Options>({
    emitter: container.shoukaku,
    name: "shoukaku:disconnect",
    event: "disconnect",
})
export class ClientListener extends Listener {
    async run(node: string, players: Array<Player>, moved: boolean) {
        if (moved) return;
        players.map((player) => player.destroy());
        this.container.logger.warn(`Node ${cyan(node)} disconnected.`);
    }
}
