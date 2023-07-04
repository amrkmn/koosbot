import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";
import { Events as PlayerEvents } from "#lib/types";
import type { VoiceState } from "discord.js";

@ApplyOptions<Listener.Options>({
    name: `playerMoved:${Events.VoiceStateUpdate}`,
    event: Events.VoiceStateUpdate,
})
export class ClientListener extends Listener {
    public async run(old: VoiceState, state: VoiceState) {
        const { manager } = this.container;

        const newChannelId = state.channelId;
        const oldChannelId = old.channelId;
        const guildId = state.guild.id;

        const player = manager.players.get(guildId);
        if (isNullish(player)) return;

        let type = "UNKNOWN";
        if (!oldChannelId && newChannelId) type = "JOINED";
        else if (oldChannelId && !newChannelId) type = "LEFT";
        else if (oldChannelId && newChannelId && oldChannelId !== newChannelId) type = "MOVED";

        if (type === "UNKNOWN") return;

        manager.emit(PlayerEvents.PlayerMoved, player, type, { oldChannelId, newChannelId });
    }
}
