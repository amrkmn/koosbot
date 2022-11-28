import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Guild } from "discord.js";

@ApplyOptions<Listener.Options>({
    once: true,
})
export class ClientListener extends Listener {
    public async run(guild: Guild) {
        if (!guild) return;
        const { db } = this.container;

        try {
            await db.guild.upsert({
                where: { id: guild.id },
                update: {},
                create: { id: guild.id },
            });
        } catch (error) {
            this.container.logger.error(`Error when trying to insert guild to db.`);
        }
    }
}
