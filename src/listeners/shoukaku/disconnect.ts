import { ApplyOptions } from "@sapphire/decorators";
import { Listener, container } from "@sapphire/framework";
import { cyan } from "colorette";

@ApplyOptions<Listener.Options>({
    emitter: container.shoukaku,
    name: "shoukaku:disconnect",
    event: "disconnect",
})
export class ClientListener extends Listener {
    async run(node: string, _count: number) {
        this.container.logger.warn(`Node ${cyan(node)} disconnected.`);
    }
}
