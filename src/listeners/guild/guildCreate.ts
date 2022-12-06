import { envParseString } from "#env";
import { ApplyOptions } from "@sapphire/decorators";
import { Listener, Events } from "@sapphire/framework";
import { Guild } from "discord.js";

@ApplyOptions<Listener.Options>({
    event: Events.GuildCreate,
})
export class ClientListener extends Listener<typeof Events.GuildCreate> {
    public async run(guild: Guild) {
        if (!guild) return;
        const { db } = this.container;

        try {
            await db.guild.upsert({
                where: { id: guild.id },
                update: {},
                create: { id: guild.id, prefix: envParseString("CLIENT_PREFIX") },
            });
        } catch (error) {
            this.container.logger.error(`Error when trying to insert guild to db.`, error);
        }
    }
}
