import type { KoosCommand } from "#lib/extensions";
import type { PaginatorOptions, PaginatorRunOptions } from "#types/Paginator";
import { ButtonId, TextInputId } from "#utils/constants";
import { mins, sec } from "#utils/functions";
import { container } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
import { DiscordSnowflake } from "@sapphire/snowflake";
import { isNumber } from "@sapphire/utilities";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    EmbedBuilder,
    Message,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    type GuildMember,
    type ModalActionRowComponentBuilder,
} from "discord.js";

export class Paginator {
    private readonly pages: EmbedBuilder[];
    private member: GuildMember;
    private message: KoosCommand.Message | KoosCommand.ChatInputCommandInteraction;
    private jumpTimeout: number;
    private collectorTimeout: number;

    private buttons: Record<string, { id: string; style: ButtonStyle; label: string }> = {
        [ButtonId.First]: { id: ButtonId.First, style: ButtonStyle.Secondary, label: "<<" },
        [ButtonId.Back]: { id: ButtonId.Back, style: ButtonStyle.Secondary, label: "<" },
        [ButtonId.Jump]: { id: ButtonId.Jump, style: ButtonStyle.Secondary, label: "{{currentPage}}" },
        [ButtonId.Next]: { id: ButtonId.Next, style: ButtonStyle.Secondary, label: ">" },
        [ButtonId.Last]: { id: ButtonId.Last, style: ButtonStyle.Secondary, label: ">>" },
        [ButtonId.Close]: { id: ButtonId.Close, style: ButtonStyle.Danger, label: "Close" },
    };

    #currentPage: number = 0;

    constructor(options: PaginatorOptions) {
        this.member = options.member;
        this.message = options.message;
        this.pages = options.pages;
        this.jumpTimeout = options.jumpTimeout ?? sec(30);
        this.collectorTimeout = options.collectorTimeout ?? mins(2);
    }

    public async run(options?: PaginatorRunOptions) {
        if (options?.currentPage && isNumber(options.currentPage)) this.#currentPage = options.currentPage - 1;
        const anonymous = options?.anonymous ?? false;

        let initialMessage: Message;
        if (this.message instanceof ChatInputCommandInteraction) {
            if (!this.message.replied && !this.message.deferred) await this.message.deferReply({ ephemeral: anonymous });

            initialMessage = await this.message.editReply({
                embeds: [this.updateFooter()],
                components: this.createComponents(),
            });
        } else {
            initialMessage = await send(this.message, {
                embeds: [this.updateFooter()],
                components: this.createComponents(),
            });
        }

        const collector = initialMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: this.collectorTimeout,
            filter: (i) => i.user.id === this.member.id && i.message.id === initialMessage.id,
        });

        collector.on("collect", async (interaction) => {
            try {
                const id = interaction.customId;

                if (id !== ButtonId.Jump) await interaction.deferUpdate();
                if (id === ButtonId.Close) return collector.stop("stop");

                if (id === ButtonId.First) this.#currentPage = 0;
                if (id === ButtonId.Back) this.#currentPage--;
                if (id === ButtonId.Jump) await this.jumpAction(interaction);
                if (id === ButtonId.Next) this.#currentPage++;
                if (id === ButtonId.Last) this.#currentPage = this.pages.length - 1;

                collector.resetTimer();
                await interaction.editReply({ embeds: [this.updateFooter()], components: this.createComponents() });
            } catch (error) {
                collector.stop("error");
            }
        });

        collector.on("end", async (_, reason) => {
            try {
                if (["error", "stop", "time"].includes(reason) && initialMessage.editable)
                    await initialMessage.edit({ components: this.createComponents(true) });
            } catch (error) {}
        });
    }

    private async jumpAction(interaction: ButtonInteraction) {
        const id = DiscordSnowflake.generate();
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
            time: 15000,
            idle: this.jumpTimeout,
        });
        await response.deferUpdate();

        const newPage = Number(response.fields.getTextInputValue(TextInputId.PageInput));
        if (isNumber(newPage) && newPage > 0 && newPage <= this.pages.length) {
            this.#currentPage = newPage - 1;
        }
        return;
    }

    private updateFooter() {
        const page = this.pages[this.#currentPage];
        const newPage = EmbedBuilder.from(page);
        if (page.data.footer?.text) {
            return newPage.setFooter({
                text: `Page ${this.#currentPage + 1}/${this.pages.length} • ${page.data.footer.text}`,
                iconURL: page.data.footer.icon_url,
            });
        }
        return newPage.setFooter({ text: `Page ${this.#currentPage + 1}/${this.pages.length}`, iconURL: page.data.footer?.icon_url });
    }

    private createButtons(state: boolean) {
        const checkState = (name: ButtonId) => {
            if (this.pages.length === 1) return true;
            if ([ButtonId.First, ButtonId.Back].includes(name) && this.#currentPage === 0) return true;
            if ([ButtonId.Next, ButtonId.Last].includes(name) && this.#currentPage === this.pages.length - 1) return true;
            return false;
        };
        const closeButton = this.buttons[ButtonId.Close];

        const names = [ButtonId.First, ButtonId.Back, ButtonId.Jump, ButtonId.Next, ButtonId.Last];
        const firstRowButtons = names.reduce((buttons, name) => {
            const currentButton = this.buttons[name];
            let label = "";
            if (currentButton.id === ButtonId.Jump)
                label = currentButton.label.replace("{{currentPage}}", `${this.#currentPage + 1} of ${this.pages.length}`);
            else label = currentButton.label;

            buttons.push(
                new ButtonBuilder()
                    .setCustomId(currentButton.id)
                    .setStyle(currentButton.style)
                    .setLabel(label)
                    .setDisabled(state || checkState(name))
            );
            return buttons;
        }, [] as ButtonBuilder[]);
        const secondRowButtons = [
            new ButtonBuilder().setCustomId(closeButton.id).setLabel(closeButton.label).setStyle(closeButton.style).setDisabled(state),
        ];

        return [firstRowButtons, secondRowButtons];
    }

    private createComponents(disabled = false) {
        const buttons = this.createButtons(disabled);
        return [
            new ActionRowBuilder<ButtonBuilder>().setComponents(buttons[0]),
            new ActionRowBuilder<ButtonBuilder>().setComponents(buttons[1]),
        ];
    }
}
