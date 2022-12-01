import {
    User,
    TextChannel,
    CommandInteraction,
    MessageEmbed,
    MessageButton,
    MessageActionRow,
    ButtonInteraction,
    Message,
} from "discord.js";

interface PaginationOptions {
    target: User;
    channel: TextChannel | CommandInteraction;
    embeds: MessageEmbed[];
    page?: number;
    time?: number;
    max?: number;
    fastSkip?: boolean;
}

export const pagination = async (options: PaginationOptions) => {
    const { target, channel, embeds, time = 2 * 60 * 1000, max = 120000, fastSkip = false, page = undefined } = options;
    const defaultLabels: { [key: string]: any } = {
        first: "<<",
        previous: "<",
        next: ">",
        last: ">>",
        stop: "\u200b",
    };
    const defaultStyles: { [key: string]: any } = {
        first: "SECONDARY",
        previous: "SECONDARY",
        next: "SECONDARY",
        last: "SECONDARY",
        stop: "DANGER",
    };
    let currentPage = page ? page : 1;

    const generateButtons = (state: boolean) => {
        const checkState = (name: string) => {
            if (embeds.length === 1) return true;
            if (["first", "previous"].includes(name) && currentPage === 1) return true;
            if (["next", "last"].includes(name) && currentPage === embeds.length) return true;
            return false;
        };
        let names = ["previous", "next"];
        if (fastSkip) names = ["first", ...names, "last"];
        names.push("stop");
        const buttons = names.reduce((accumulator: MessageButton[], name) => {
            accumulator.push(
                new MessageButton()
                    .setCustomId(name)
                    .setDisabled(state || checkState(name))
                    .setLabel(defaultLabels[name])
                    .setStyle(defaultStyles[name])
            );
            return accumulator;
        }, []);
        return buttons;
    };
    const components = (state = false) => [new MessageActionRow().addComponents(generateButtons(state))];
    const changeFooter = () => {
        const embed = embeds[currentPage - 1];
        const newEmbed = new MessageEmbed(embed);
        if (embed?.footer?.text) {
            return newEmbed.setFooter({
                text: `Page ${currentPage}/${embeds.length} | ${embed.footer.text}`,
                iconURL: embed.footer.iconURL,
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
    const collectorOptions = () => {
        const opt: { [key: string]: any } = { filter, componentType: "BUTTON" };
        if (max) opt["max"] = max;
        if (time) opt["time"] = time;
        return opt;
    };
    const collector = initialMessage.createMessageComponentCollector(collectorOptions());

    if (collector) {
        collector.on("collect", async (interaction) => {
            try {
                await interaction.deferUpdate();
                const id = interaction.customId;
                if (id === "first") currentPage = 1;
                if (id === "previous") currentPage--;
                if (id === "next") currentPage++;
                if (id === "last") currentPage = embeds.length;
                if (id === "stop") {
                    collector.stop("user");
                    initialMessage.edit({ embeds: [changeFooter()], components: components(true) });
                    return;
                }
                collector.resetTimer();
                await initialMessage.edit({ embeds: [changeFooter()], components: components() });
            } catch (error) {}
        });
        collector.on("end", (_, reason) => {
            try {
                if (reason == "user" || reason == "time") initialMessage.edit({ components: components(true) });
                else return;
            } catch (error) {}
        });
    } else return;
};
