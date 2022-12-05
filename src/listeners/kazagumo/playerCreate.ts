import { ApplyOptions } from "@sapphire/decorators";
import { Listener, container } from "@sapphire/framework";
import { cyan } from "colorette";
import { Events, KazagumoPlayer } from "kazagumo";

@ApplyOptions<Listener.Options>({
    emitter: container.kazagumo,
    name: `kazagumo:${Events.PlayerCreate}`,
    event: Events.PlayerCreate,
})
export class ClientListener extends Listener {
    public async run(player: KazagumoPlayer) {
        const guild =
            this.container.client.guilds.cache.get(player.guildId) ?? (await this.container.client.guilds.fetch(player.guildId));
        if (!guild) return;

        this.container.logger.info(
            `[${cyan(guild.shardId || 0)}] - Player has been created in ${guild.name}[${cyan(guild.id)}] on ${cyan(
                player.shoukaku.node.name
            )} node`
        );
    }
}
