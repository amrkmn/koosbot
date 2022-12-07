import { ApplyOptions } from "@sapphire/decorators";
import { Listener, container } from "@sapphire/framework";
import { cyan } from "colorette";

@ApplyOptions<Listener.Options>({
    emitter: container.shoukaku,
    name: "shoukaku:close",
    event: "close",
})
export class ClientListener extends Listener {
    async run(node: string, code: number, _reason: string) {
        this.container.logger.warn(`Node ${cyan(node)} closed, code: ${code || "Unknown code"}`);
    }
}
