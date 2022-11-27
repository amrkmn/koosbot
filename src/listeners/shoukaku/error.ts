import { ApplyOptions } from "@sapphire/decorators";
import { Listener, container } from "@sapphire/framework";
import { cyan, red } from "colorette";

container.shoukaku.on("error", (node: string, error: any) =>
    container.logger.error(`Node ${cyan(node)} encountered an error: ${red(error)}`)
);
@ApplyOptions<Listener.Options>({
    emitter: container.shoukaku,
    name: "shoukaku:error",
    event: "error",
})
export class ClientListener extends Listener {
    public async run(node: string, error: any) {
        this.container.logger.error(`Node ${cyan(node)} encountered an error: ${red(error)}`);
    }
}
