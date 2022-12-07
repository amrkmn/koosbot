import { ApplyOptions } from "@sapphire/decorators";
import { Listener, container } from "@sapphire/framework";
import { cyan } from "colorette";

@ApplyOptions<Listener.Options>({
    emitter: container.shoukaku,
    name: "shoukaku:debug",
    event: "debug",
    enabled: process.env.NODE_ENV !== "production" ? true : false,
})
export class ClientListener extends Listener {
    async run(_node: string, info: string) {
        info = info.replace(/\[+([^\][]+)]+/g, `[${cyan(`$1`)}]`);
        this.container.logger.debug(`${info}`);
    }
}
