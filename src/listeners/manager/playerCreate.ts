import type { Player } from "#lib/audio";
import { Events } from "#lib/types";
import { ApplyOptions } from "@sapphire/decorators";
import { Listener, container } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";
import { cyan } from "colorette";
import { oneLine } from "common-tags";

@ApplyOptions<Listener.Options>({
    emitter: container.manager,
    name: `manager:${Events.PlayerCreate}`,
    event: Events.PlayerCreate,
})
export class ClientListener extends Listener {
    public async run(player: Player) {
        const { client, logger } = this.container;

        const guild = client.guilds.cache.get(player.guildId) ?? (await client.guilds.fetch(player.guildId).catch(() => null));
        if (isNullish(guild)) return;

        logger.info(
            oneLine`
                [${cyan(guild.shardId || 0)}] 
                - Player has been created in ${guild.name}[${cyan(guild.id)}] on ${cyan(player.shoukaku.node.name)} node
            `
        );
    }
}
