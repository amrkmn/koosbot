import { QueueHistory } from "#lib/structures";
import { ButtonId, KoosColor } from "#utils/constants";
import { convertTime, createTitle } from "#utils/functions";
import { container } from "@sapphire/framework";
import { isNullish, Nullish } from "@sapphire/utilities";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Message } from "discord.js";
import { Kazagumo, KazagumoPlayer, KazagumoPlayerOptions, KazagumoTrack } from "kazagumo";
import prettyMs from "pretty-ms";
import { Player } from "shoukaku";

interface PlayerProgressbarOptions {
    timecodes?: boolean;
    length?: number;
    line?: string;
    indicator?: string;
    queue?: boolean;
}

export class KoosPlayer extends KazagumoPlayer {
    #dashboard: Message | undefined;
    public skipVotes: Set<string>;
    public history: QueueHistory;

    constructor(kazagumo: Kazagumo, player: Player, options: KazagumoPlayerOptions, customData: unknown) {
        super(kazagumo, player, options, customData);

        this.history = new QueueHistory(this);
        this.skipVotes = new Set<string>();
        this.#dashboard = undefined;
    }

    public dashboard(): Message;
    public dashboard(message: Message): undefined;
    public dashboard(message?: Message) {
        const dashboard = this.#dashboard;
        if (isNullish(message)) return dashboard;

        this.#dashboard = message;
    }

    public async newDashboard(track: KazagumoTrack) {
        const { client } = container;
        const data = await container.db.guild.findUnique({ where: { id: this.guildId } });
        const channel = client.channels.cache.get(this.textId) ?? (await client.channels.fetch(this.textId).catch(() => null));
        if (isNullish(channel)) return;

        const title = createTitle(track);
        const duration = track.isStream ? `Live` : convertTime(Number(track.length));
        const requester = data?.requester ? `~ ${track.requester}` : "";
        const previousTrack = this.history.previousTrack;

        const embed = new EmbedBuilder() //
            .setDescription(`${title} [${duration}] ${requester}`)
            .setColor(KoosColor.Default);
        const row = this.createPlayerComponents(previousTrack);

        if (channel.isTextBased()) {
            const nowPlaying = await channel.send({ embeds: [embed], components: [row] });
            this.#dashboard = nowPlaying;
        }
    }

    public resetDashboard() {
        this.#dashboard = undefined;
    }

    public createProgressBar(options?: PlayerProgressbarOptions) {
        const current = this.queue.current;
        const duration = current?.length ?? 0;
        const position = duration > 0 ? this.shoukaku.position : 0;

        const { indicator = "🔵", length = 15, line = "▬", timecodes = true } = options ?? {};

        if (isNaN(length) || length < 0 || !Number.isFinite(length)) throw new Error("Invalid progressbar length");
        const index = Math.round((position / duration) * length);
        const prettyPosition = prettyMs(position, { secondsDecimalDigits: 0 }).replace("ms", "s");
        const prettyDuration = !current?.isStream ? prettyMs(duration, { secondsDecimalDigits: 0 }) : "∞";

        if (index >= 1 && index <= length) {
            const bar = line.repeat(length - 1).split("");
            bar.splice(index, 0, indicator);
            if (timecodes) return `${bar.join("")} ${prettyPosition} / ${prettyDuration}`;
            return `${bar.join("")}`;
        } else {
            if (timecodes) return `${indicator}${line.repeat(length - 1)} ${prettyPosition} / ${prettyDuration}`;
            return `${indicator}${line.repeat(length - 1)}`;
        }
    }

    private createPlayerComponents(previousTracks: KazagumoTrack | Nullish) {
        const hasPrevious = isNullish(previousTracks);
        const row = new ActionRowBuilder<ButtonBuilder>();

        return row.setComponents([
            new ButtonBuilder().setLabel("Pause").setCustomId(ButtonId.PauseOrResume).setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setLabel("Previous")
                .setCustomId(ButtonId.Previous)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(hasPrevious),
            new ButtonBuilder().setLabel("Skip").setCustomId(ButtonId.Skip).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setLabel("Stop").setCustomId(ButtonId.Stop).setStyle(ButtonStyle.Danger),
        ]);
    }
}

declare module "kazagumo" {
    interface KazagumoPlayer {
        history: QueueHistory;
        skipVotes: Set<string>;
        dashboard(): Message;
        dashboard(message: Message): undefined;
        dashboard(message?: Message): Message | undefined;
        newDashboard(track: KazagumoTrack): Promise<void>;
        resetDashboard(): void;
        createProgressBar(options?: PlayerProgressbarOptions): string;
    }
}
