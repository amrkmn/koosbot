import type { KoosCommand } from "#lib/extensions";
import type { ButtonId } from "#utils/constants";
import type { AnyInteraction } from "@sapphire/discord.js-utilities";
import type { AutocompleteInteraction, EmbedBuilder, GuildMember } from "discord.js";

export interface PaginatorOptions {
    message: KoosCommand.Message | Exclude<AnyInteraction, AutocompleteInteraction>;
    member: GuildMember;
    pages?: EmbedBuilder[];
    jumpTimeout?: number;
    collectorTimeout?: number;
}

export interface PaginatorRunOptions {
    currentPage?: number;
    anonymous?: boolean;
}

export type PaginatorId = ButtonId.First | ButtonId.Back | ButtonId.Jump | ButtonId.Next | ButtonId.Last | ButtonId.Close;
