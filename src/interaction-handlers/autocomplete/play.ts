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
        const { kazagumo } = this.container;

        if (interaction.commandName !== "play") return this.none();

        const query = interaction.options.getFocused(true);

        if (isNullishOrEmpty(query.value)) return this.none();
        switch (interaction.commandName) {
            case "play":
                const results = await kazagumo.search(query.value, { requester: interaction.member });
                if (results.type === "PLAYLIST") {
                    return this.some([{ name: cutText(`${results.playlistName}`, 100), value: `${query.value}` }]);
                }

                results.tracks = results.tracks.slice(0, 10);
                const tracks = results.tracks.map((track) => {
                    const title =
                        track.sourceName === "youtube" //
                            ? `${track.title}`
                            : `${track.title} by ${track.author}`;
                    return {
                        name: cutText(`${title}`, 100),
                        value: `${track.uri}`,
                    };
                });

                return this.some(tracks);
            default:
                return this.none();
        }
    }
}
