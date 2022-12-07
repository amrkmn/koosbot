import { ApplyOptions } from "@sapphire/decorators";
import { Listener, container } from "@sapphire/framework";
import { cyan } from "colorette";

@ApplyOptions<Listener.Options>({
    emitter: container.shoukaku,
    name: "shoukaku:ready",
    event: "ready",
})
export class ClientListener extends Listener {
    async run(node: string) {
        this.container.logger.info(`Node ${cyan(node)} connected.`);
    }
}
