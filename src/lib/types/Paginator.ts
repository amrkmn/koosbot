import type { KoosCommand } from "#lib/extensions";
import type { EmbedBuilder, GuildMember } from "discord.js";

export interface PaginatorOptions {
    pages: EmbedBuilder[];
    message: KoosCommand.Message | KoosCommand.ChatInputCommandInteraction;
    member: GuildMember;
    jumpTimeout?: number;
    collectorTimeout?: number;
}

export interface PaginatorRunOptions {
    currentPage?: number;
    anonymous?: boolean;
}
