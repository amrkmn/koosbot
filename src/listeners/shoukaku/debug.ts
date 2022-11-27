import { ApplyOptions } from "@sapphire/decorators";
import { Listener, container } from "@sapphire/framework";

@ApplyOptions<Listener.Options>({
    emitter: container.shoukaku,
    name: "shoukaku:debug",
    event: "debug",
})
export class ClientListener extends Listener {
    async run(_node: string, info: string) {
        this.container.logger.debug(`${info}`);
    }
}
