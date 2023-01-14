import { envParseString } from "@skyra/env-utilities";
import { cutText } from "#utils/functions";
import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { isNullishOrEmpty } from "@sapphire/utilities";
import { AutocompleteInteraction } from "discord.js";
import { Client as GeniusClient } from "genius-lyrics";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Autocomplete,
})
export class AutocompleteHandler extends InteractionHandler {
    genius = new GeniusClient(envParseString("GENIUS_TOKEN"));

    public override async run(interaction: AutocompleteInteraction, result: InteractionHandler.ParseResult<this>) {
        if (isNullishOrEmpty(result)) return;
        return interaction.respond(result);
    }

    public override async parse(interaction: AutocompleteInteraction) {
        if (interaction.commandName !== "lyrics") return this.none();

        const query = interaction.options.getFocused(true);

        if (isNullishOrEmpty(query.value)) return this.none();
        switch (interaction.commandName) {
            case "lyrics":
                let songs = await this.genius.songs.search(query.value);
                songs = songs.slice(0, 10);

                const options = songs.map((song) => ({ name: cutText(song.fullTitle, 100), value: `${song.id}` }));
                return this.some(options);
            default:
                return this.none();
        }
    }
}
