import { convertTime, createTitle } from "#utils/functions";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import { oneLine } from "common-tags";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Message } from "discord.js";
import { Kazagumo, KazagumoPlayer, KazagumoPlayerOptions, KazagumoTrack } from "kazagumo";
import { container } from "@sapphire/framework";
import { Player } from "shoukaku";
import { ButtonId, KoosColor } from "#utils/constants";
import { Signal } from "#lib/structures";

export class KoosPlayer extends KazagumoPlayer {
    #previous: KazagumoTrack[];
    #nowPlaying: Message | undefined;
    public skipVotes: Set<string>;
    public skipped = new Signal<KazagumoTrack[]>();

    constructor(kazagumo: Kazagumo, player: Player, options: KazagumoPlayerOptions, customData: unknown) {
        super(kazagumo, player, options, customData);

        this.skipVotes = new Set<string>();
        this.#previous = [];
        this.#nowPlaying = undefined;
    }

    public skipTo(amount: number) {
        // TODO
    }

    public nowPlaying(): Message;
    public nowPlaying(message: Message): undefined;
    public nowPlaying(message?: Message) {
        const savedNp = this.#nowPlaying;
        if (isNullish(message)) return savedNp;

        this.#nowPlaying = message;
    }

    public async newNowPlaying(track: KazagumoTrack) {
        const { client } = container;
        const data = await container.db.guild.findUnique({ where: { id: this.guildId } });
        const channel = client.channels.cache.get(this.textId) ?? (await client.channels.fetch(this.textId).catch(() => null));
        if (isNullish(channel)) return;

        const title = createTitle(track);
        const previousTracks = this.previous();

        const embed = new EmbedBuilder() //
            .setDescription(
                oneLine`
                    ${title} [${track.isStream ? `Live` : convertTime(Number(track.length))}]
                    ${data?.requester ? ` ~ ${track.requester}` : ""}
                `
            )
            .setColor(KoosColor.Default);
        const playerButtons = [
            new ButtonBuilder().setLabel("Pause").setCustomId(ButtonId.PauseOrResume).setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setLabel("Previous")
                .setCustomId(ButtonId.Previous)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(isNullishOrEmpty(previousTracks)),
            new ButtonBuilder().setLabel("Skip").setCustomId(ButtonId.Skip).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setLabel("Stop").setCustomId(ButtonId.Stop).setStyle(ButtonStyle.Danger),
        ];
        const row = new ActionRowBuilder<ButtonBuilder>().setComponents(playerButtons);

        if (channel.isTextBased()) {
            const nowPlaying = await channel.send({ embeds: [embed], components: [row] });
            this.#nowPlaying = nowPlaying;
        }
    }

    public resetNowPlaying() {
        this.#nowPlaying = undefined;
    }

    public previous(): KazagumoTrack[];
    public previous(track: KazagumoTrack): undefined;
    public previous(track?: KazagumoTrack) {
        const previousTracks = this.#previous;
        if (isNullish(track)) return previousTracks;

        let array: KazagumoTrack[] = [];

        if (isNullishOrEmpty(previousTracks)) this.#previous = array.concat(track);
        else this.#previous = array.concat(previousTracks, track);
    }

    public previousTrack() {
        const previousTracks = this.#previous;
        if (isNullishOrEmpty(previousTracks)) return undefined;

        const track = previousTracks.pop();

        return track;
    }

    public resetPrevious() {
        this.#previous = [];
    }
}

declare module "kazagumo" {
    interface KazagumoPlayer {
        skipVotes: Set<string>;
        skipped: Signal<KazagumoTrack[]>;
        nowPlaying(): Message;
        nowPlaying(message: Message): undefined;
        nowPlaying(message?: Message): Message | undefined;
        resetNowPlaying(): void;
        previous(): KazagumoTrack[];
        previous(track: KazagumoTrack): undefined;
        previous(track?: KazagumoTrack): KazagumoTrack[] | undefined;
        previousTrack(): KazagumoTrack | undefined;
        resetPrevious(): void;
    }
}
