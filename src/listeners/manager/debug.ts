import { Events } from "#lib/types";
import { ApplyOptions } from "@sapphire/decorators";
import { Listener, container } from "@sapphire/framework";

@ApplyOptions<Listener.Options>({
    emitter: container.manager,
    name: `manager:${Events.Debug}`,
    event: Events.Debug,
    enabled: process.env.NODE_ENV !== "production",
})
export class ClientListener extends Listener {
    public async run(message: string) {
        this.container.logger.debug(`${message}`);
    }
}
