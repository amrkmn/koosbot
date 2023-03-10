import { KoosCommand } from "#lib/extensions";
import { Guilds } from "@prisma/client";
import { Message, VoiceBasedChannel } from "discord.js";
import { KazagumoPlayer } from "kazagumo";

export interface PlayOptions {
    message: Message | KoosCommand.ChatInputInteraction;
    channel: VoiceBasedChannel;
    data: Guilds | null;
    player?: KazagumoPlayer;
}
