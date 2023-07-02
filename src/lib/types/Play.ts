import { KoosCommand } from "#lib/extensions";
import { type Guild } from "@prisma/client";
import { Message, type VoiceBasedChannel } from "discord.js";
import { KazagumoPlayer } from "kazagumo";

export interface PlayCommandOptions {
    message: Message | KoosCommand.ChatInputCommandInteraction;
    channel: VoiceBasedChannel;
    data: Guild | null;
    player?: KazagumoPlayer;
}
