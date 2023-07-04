import { KoosCommand } from "#lib/extensions";
import { KoosColor } from "#utils/constants";
import { canJoinVoiceChannel } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import type { Args } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import { isNullish } from "@sapphire/utilities";
import { ChannelType, EmbedBuilder, type Message, type VoiceBasedChannel } from "discord.js";

@ApplyOptions<KoosCommand.Options>({
    preconditions: ["OwnerOnly", "VoiceOnly"],
    hidden: true,
})
export class TestCommand extends KoosCommand {
    public async messageRun(message: Message, args: Args) {
        const { manager } = this.container;

        const attachment = message.attachments.first();
        const query = attachment ? attachment.proxyURL : await args.rest("string").catch(() => undefined);
        if (!query)
            return await send(message, {
                embeds: [new EmbedBuilder().setDescription("Please provide a URL or search query").setColor(KoosColor.Error)],
            });

        const channel = message.member?.voice.channel as VoiceBasedChannel;
        let player = manager.players.get(message.guildId!);

        if (isNullish(player)) {
            if (!canJoinVoiceChannel(channel))
                return new EmbedBuilder()
                    .setDescription(`I cannot join your voice channel. It seem like I don't have the right permissions.`)
                    .setColor(KoosColor.Error);
            player ??= await manager.createPlayer({
                guildId: message.guildId!,
                textChannel: message.channelId,
                voiceChannel: channel.id,
                selfDeafen: true,
                volume: 100,
            });

            if (channel.type === ChannelType.GuildStageVoice) {
                message.guild?.members.me?.voice.setSuppressed(false);
            }
        }

        const result = await player.search(query, { requester: message.member });

        player.queue.add(result.tracks);
        player.play();
    }
}
