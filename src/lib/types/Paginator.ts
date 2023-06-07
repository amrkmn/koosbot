import type { KoosCommand } from "#lib/extensions";
import type { Nullish } from "@sapphire/utilities";
import type { CollectorFilter, EmbedBuilder, GuildMember, MessageComponentInteraction } from "discord.js";

export interface PaginatorOptions {
    pages: EmbedBuilder[];
    message: KoosCommand.Message | KoosCommand.ChatInputCommandInteraction;
    member: GuildMember;
    jumpTimeout?: number;
    collectorTimeout?: number;
    filter?: CollectorFilter<[MessageComponentInteraction]> | Nullish;
}

export interface PaginatorRunOptions {
    currentPage?: number;
    anonymous?: boolean;
}
