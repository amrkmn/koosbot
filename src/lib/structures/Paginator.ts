import type { KoosCommand } from "#lib/extensions";
import type { PaginatorOptions, PaginatorRunOptions } from "#lib/types";
import { ButtonId, KoosColor, TextInputId } from "#utils/constants";
import { mins, sec } from "#utils/functions";
import { generateId } from "#utils/snowflake";
import { isAnyInteraction } from "@sapphire/discord.js-utilities";
import { container } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import { DiscordSnowflake } from "@sapphire/snowflake";
import { isNumber } from "@sapphire/utilities";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
    Message,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    type GuildMember,
    type ModalActionRowComponentBuilder,
} from "discord.js";

type PaginatorId = ButtonId.First | ButtonId.Back | ButtonId.Jump | ButtonId.Next | ButtonId.Last | ButtonId.Close;

export class Paginator {
    private readonly pages: EmbedBuilder[] = [];
    private member: GuildMember;
    private message: KoosCommand.Message | KoosCommand.ChatInputCommandInteraction;
    private jumpTimeout: number;
    private collectorTimeout: number;

    private buttons: Record<PaginatorId, { id: PaginatorId; style: ButtonStyle; label: string }> = {
        [ButtonId.First]: { id: ButtonId.First, style: ButtonStyle.Secondary, label: "<<" },
        [ButtonId.Back]: { id: ButtonId.Back, style: ButtonStyle.Secondary, label: "<" },
        [ButtonId.Jump]: { id: ButtonId.Jump, style: ButtonStyle.Secondary, label: "{{currentPage}}" },
        [ButtonId.Next]: { id: ButtonId.Next, style: ButtonStyle.Secondary, label: ">" },
        [ButtonId.Last]: { id: ButtonId.Last, style: ButtonStyle.Secondary, label: ">>" },
        [ButtonId.Close]: { id: ButtonId.Close, style: ButtonStyle.Danger, label: "Close" },
    };

    #currentPage: number = 0;

    constructor({ message, member, pages, collectorTimeout, jumpTimeout }: PaginatorOptions) {
        if (pages) this.addPages(pages);

        this.member = member;
        this.message = message;
        this.jumpTimeout = jumpTimeout ?? sec(30);
        this.collectorTimeout = collectorTimeout ?? mins(2);
    }

    public async run(options?: PaginatorRunOptions) {
        if (options?.currentPage && isNumber(options.currentPage)) this.#currentPage = options.currentPage - 1;
        const anonymous = options?.anonymous ?? false;

        let initialMessage: Message;
        if (isAnyInteraction(this.message)) {
            if (!this.message.replied && !this.message.deferred) await this.message.deferReply({ ephemeral: anonymous });

            initialMessage = await this.message.editReply({ embeds: [this.getPage()], components: [...this.createComponents()] });
        } else {
            initialMessage = await send(this.message, { embeds: [this.getPage()], components: [...this.createComponents()] });
        }

        const collector = initialMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: this.collectorTimeout,
            filter: (i) => {
                const embed = new EmbedBuilder()
                    .setDescription(`This buttons can only be used by ${this.member}`)
                    .setColor(KoosColor.Error);
                if (i.user.id !== this.member.id) i.reply({ embeds: [embed], ephemeral: true });
                return i.user.id === this.member.id && i.message.id === initialMessage.id;
            },
        });

        collector.on("collect", async (interaction) => {
            try {
                const id = interaction.customId;

                // Exclude jump because modal must be run before `deferUpdate`
                if (id !== ButtonId.Jump) await interaction.deferUpdate();
                if (id === ButtonId.Close) return collector.stop("stop");

                if (id === ButtonId.First) this.#currentPage = 0;
                else if (id === ButtonId.Back) this.#currentPage--;
                else if (id === ButtonId.Jump) await this.jumpAction(interaction);
                else if (id === ButtonId.Next) this.#currentPage++;
                else if (id === ButtonId.Last) this.#currentPage = this.pages.length - 1;
                else return;

                collector.resetTimer();
                await interaction.editReply({ embeds: [this.getPage()], components: [...this.createComponents()] });
            } catch (error) {
                container.logger.error("[Paginator Error]");
                container.logger.error(error);
                collector.stop("error");
            }
        });

        collector.once("end", async (_, reason) => {
            try {
                if (["error", "stop", "time"].includes(reason) && initialMessage.editable)
                    await initialMessage.edit({ components: [] });
            } catch (error) {
                container.logger.error("[Paginator Error]");
                container.logger.error(error);
            }
        });
    }

    public addPages(pages: EmbedBuilder[]) {
        for (let page of pages) this.addPage(page);
        return this;
    }

    public addPage(page: EmbedBuilder) {
        this.pages.push(page);
        return this;
    }

    private async jumpAction(interaction: ButtonInteraction) {
        const id = generateId();
        const modal = new ModalBuilder().setCustomId(`${id}`).setTitle(container.client.user!.username);
        const pageInput = new TextInputBuilder()
            .setCustomId(TextInputId.PageInput)
            .setLabel("Which page would you like to jump to?")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        const actionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(pageInput);

        modal.setComponents(actionRow);
        await interaction.showModal(modal);

        const response = await interaction.awaitModalSubmit({
            filter: (i) => i.user.id === this.member.id,
            time: this.jumpTimeout,
        });
        await response.deferUpdate();

        const newPage = Number(response.fields.getTextInputValue(TextInputId.PageInput));
        if (isNumber(newPage) && newPage > 0 && newPage <= this.pages.length) {
            this.#currentPage = newPage - 1;
        }
    }

    private getPage() {
        const page = this.pages[this.#currentPage];
        return page;
    }

    private createButtons(state: boolean): [ButtonBuilder[], ButtonBuilder[]] {
        const checkState = (name: PaginatorId) => {
            if (this.pages.length === 1) return true;
            if ([ButtonId.First, ButtonId.Back].includes(name) && this.#currentPage === 0) return true;
            if ([ButtonId.Next, ButtonId.Last].includes(name) && this.#currentPage === this.pages.length - 1) return true;
            return false;
        };
        const closeButton = this.buttons[ButtonId.Close];

        const names: PaginatorId[] = [ButtonId.First, ButtonId.Back, ButtonId.Jump, ButtonId.Next, ButtonId.Last];
        const firstRowButtons = names.reduce((buttons, name: PaginatorId) => {
            const currentButton = this.buttons[name];
            let label = currentButton.label.replace("{{currentPage}}", `${this.#currentPage + 1} of ${this.pages.length}`);

            buttons.push(
                new ButtonBuilder()
                    .setCustomId(currentButton.id)
                    .setStyle(currentButton.style)
                    .setLabel(label)
                    .setDisabled(checkState(name) || state)
            );
            return buttons;
        }, [] as ButtonBuilder[]);
        const secondRowButtons = [
            new ButtonBuilder()
                .setCustomId(closeButton.id)
                .setLabel(closeButton.label)
                .setStyle(closeButton.style)
                .setDisabled(checkState(closeButton.id) || state),
        ];

        return [firstRowButtons, secondRowButtons];
    }

    private createComponents(disabled = false) {
        const [first, second] = this.createButtons(disabled);
        return [
            new ActionRowBuilder<ButtonBuilder>().setComponents(first),
            new ActionRowBuilder<ButtonBuilder>().setComponents(second),
        ];
    }
}
