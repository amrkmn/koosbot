import type { Player } from "#lib/audio";
import { KoosCommand } from "#lib/extensions";
import { type Guild } from "@prisma/client";
import { Message, type VoiceBasedChannel } from "discord.js";

export interface PlayCommandOptions {
    message: Message | KoosCommand.ChatInputCommandInteraction;
    channel: VoiceBasedChannel;
    data: Guild | null;
    player?: Player;
}
