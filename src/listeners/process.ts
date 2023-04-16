import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";

@ApplyOptions<Listener.Options>({ name: "SIGINT", emitter: process })
export class ProcessListener extends Listener {
    public async run() {
        this.destroyPlayers();

        process.exitCode = 1;
    }

    public destroyPlayers() {
        const { kazagumo } = this.container;

        for (let [id, player] of kazagumo.players) {
            player.destroy();
        }
    }
}
