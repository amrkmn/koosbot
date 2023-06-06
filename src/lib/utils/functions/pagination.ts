import { ButtonId } from "#utils/constants";
import {
    User,
    TextChannel,
    CommandInteraction,
    EmbedBuilder,
    ButtonBuilder,
    ActionRowBuilder,
    ButtonInteraction,
    Message,
    ButtonStyle,
    ComponentType,
} from "discord.js";

interface PaginationOptions {
    target: User;
    channel: TextChannel | CommandInteraction;
    embeds: EmbedBuilder[];
    page?: number;
    time?: number;
    max?: number;
    fastSkip?: boolean;
}

export const pagination = async (options: PaginationOptions) => {
    const { target, channel, embeds, time = 2 * 60 * 1000, max = 120000, fastSkip = false, page = undefined } = options;
    const defaultLabels: Record<string, string> = {
        [ButtonId.First]: "<<",
        [ButtonId.Back]: "<",
        [ButtonId.Next]: ">",
        [ButtonId.Last]: ">>",
        [ButtonId.Close]: "\u200b",
    };
    const defaultStyles: Record<string, ButtonStyle> = {
        [ButtonId.First]: ButtonStyle.Secondary,
        [ButtonId.Back]: ButtonStyle.Secondary,
        [ButtonId.Next]: ButtonStyle.Secondary,
        [ButtonId.Last]: ButtonStyle.Secondary,
        [ButtonId.Close]: ButtonStyle.Danger,
    };
    let currentPage = page ? page : 1;

    const generateButtons = (state: boolean) => {
        const checkState = (name: ButtonId) => {
            if (embeds.length === 1) return true;
            if ([ButtonId.First, ButtonId.Back].includes(name) && currentPage === 1) return true;
            if ([ButtonId.Next, ButtonId.Last].includes(name) && currentPage === embeds.length) return true;
            return false;
        };
        let names = [ButtonId.Back, ButtonId.Next];
        if (fastSkip) names = [ButtonId.First, ...names, ButtonId.Last];
        names.push(ButtonId.Close);
        const buttons = names.reduce((accumulator: ButtonBuilder[], name) => {
            accumulator.push(
                new ButtonBuilder()
                    .setCustomId(name)
                    .setDisabled(state || checkState(name))
                    .setLabel(defaultLabels[name])
                    .setStyle(defaultStyles[name])
            );
            return accumulator;
        }, []);
        return buttons;
    };
    const components = (state = false) => [new ActionRowBuilder<ButtonBuilder>().addComponents(generateButtons(state))];
    const changeFooter = () => {
        const embed = embeds[currentPage - 1];
        const newEmbed = new EmbedBuilder(embed.data);
        if (embed?.data.footer?.text) {
            return newEmbed.setFooter({
                text: `Page ${currentPage}/${embeds.length} | ${embed.data.footer?.text}`,
                iconURL: embed.data.footer?.icon_url,
            });
        }
        return newEmbed.setFooter({ text: `Page ${currentPage}/${embeds.length}` });
    };

    const initialMessage =
        channel instanceof ButtonInteraction || channel instanceof CommandInteraction
            ? ((await channel.followUp({ embeds: [changeFooter()], components: components() })) as Message)
            : await channel.send({ embeds: [changeFooter()], components: components() });

    const defaultFilter = (interaction: ButtonInteraction) =>
        interaction.user.id === target.id && interaction.message.id == initialMessage.id;
    const filter = defaultFilter;
    const collector = initialMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter,
        max,
        time,
    });

    collector.on("collect", async (interaction) => {
        try {
            await interaction.deferUpdate();
            const id = interaction.customId;
            if (id === ButtonId.First) currentPage = 1;
            if (id === ButtonId.Back) currentPage--;
            if (id === ButtonId.Next) currentPage++;
            if (id === ButtonId.Last) currentPage = embeds.length;
            if (id === ButtonId.Close) {
                collector.stop("user");
                initialMessage.edit({ embeds: [changeFooter()], components: components(true) });
                return;
            }
            collector.resetTimer();
            await initialMessage.edit({ embeds: [changeFooter()], components: components() });
        } catch (error) {
            collector.stop("error");
        }
    });
    collector.on("end", (_, reason) => {
        try {
            if (["error", "user", "time"].includes(reason)) initialMessage.edit({ components: components(true) });
            else return;
        } catch (error) {}
    });
};
