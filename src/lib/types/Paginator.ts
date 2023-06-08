import type { KoosCommand } from "#lib/extensions";
import type { EmbedBuilder, GuildMember } from "discord.js";

export interface PaginatorOptions {
    message: KoosCommand.Message | KoosCommand.ChatInputCommandInteraction;
    member: GuildMember;
    pages?: EmbedBuilder[];
    jumpTimeout?: number;
    collectorTimeout?: number;
}

export interface PaginatorRunOptions {
    currentPage?: number;
    anonymous?: boolean;
}
