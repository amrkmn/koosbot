import { cutText } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { isNullishOrEmpty } from "@sapphire/utilities";
import { AutocompleteInteraction } from "discord.js";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Autocomplete,
    enabled: false,
})
export class AutocompleteHandler extends InteractionHandler {
    public override async run(interaction: AutocompleteInteraction, result: InteractionHandler.ParseResult<this>) {
        if (isNullishOrEmpty(result)) return;
        return interaction.respond(result);
    }

    public override async parse(interaction: AutocompleteInteraction) {
        const { genius } = this.container;
        if (interaction.commandName !== "lyrics") return this.none();

        const query = interaction.options.getFocused(true);

        if (isNullishOrEmpty(query.value)) return this.none();
        switch (interaction.commandName) {
            case "lyrics":
                let songs = await genius.songs.search(query.value);
                songs = songs.slice(0, 10);

                const options = songs.map((song) => ({ name: cutText(song.fullTitle, 100), value: `${song.id}` }));
                return this.some(options);
            default:
                return this.none();
        }
    }
}
