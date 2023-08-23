import { Manager, Queue, QueueHistory, Track } from "#lib/audio";
import {
    PlayerState,
    type PlayerOptions,
    Events,
    type PlayOptions,
    type Result,
    type SearchOptions,
    type PlayerProgressbarOptions,
} from "#lib/types";
import { ButtonId, KoosColor } from "#utils/constants";
import { convertTime, createTitle } from "#utils/functions";
import { container } from "@sapphire/framework";
import { isNullish, isNullishOrEmpty, isNumber, type Nullish } from "@sapphire/utilities";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Message } from "discord.js";
import prettyMs from "pretty-ms";
import {
    Player as ShoukakuPlayer,
    type PlayerUpdate,
    type TrackExceptionEvent,
    type WebSocketClosedEvent,
    type TrackStuckEvent,
} from "shoukaku";

export class Player {
    #dashboard: Message | Nullish;
    #voting: boolean = false;

    public readonly guildId: string;
    public readonly options: PlayerOptions;
    public readonly queue: Queue;
    public readonly history: QueueHistory;

    public textChannel: string;
    public voiceChannel: string | Nullish;
    public paused: boolean = false;
    public loop: "off" | "track" | "queue" = "off";
    public playing: boolean = false;
    public exeption: boolean = false;

    public votes: Set<string>;
    public current: Track | Nullish;
    public state: PlayerState = PlayerState.CONNECTING;
    public shoukaku: ShoukakuPlayer;
    public manager: Manager;

    public search: (query: string, options: SearchOptions) => Promise<Result>;

    constructor(manager: Manager, shoukaku: ShoukakuPlayer, options: PlayerOptions) {
        this.options = options;
        this.shoukaku = shoukaku;
        this.manager = manager;

        this.guildId = options.guildId;
        this.textChannel = options.textChannel;
        this.voiceChannel = options.voiceChannel;

        this.queue = new Queue();
        this.history = new QueueHistory(this);
        this.votes = new Set<string>();

        this.search = this.manager.search.bind(this.manager);

        this.shoukaku
            .on("start", () => {
                this.playing = true;
                this.emit(Events.PlayerStart, this, this.current);
            })
            .on("end", (data) => {
                if (this.state === PlayerState.DESTROYING || this.state === PlayerState.DESTROYED)
                    return this.emit(Events.Debug, `Player ${this.guildId} destroyed from end event`);

                if (data.reason === "REPLACED") return this.emit(Events.PlayerEnd, this);
                if (["LOAD_FAILED", "CLEAN_UP"].includes(data.reason)) {
                    if (!isNullish(this.current)) this.history.push(this.current);
                    this.playing = false;
                    if (isNullishOrEmpty(this.queue.store)) return this.emit(Events.PlayerEmpty, this);
                    this.emit(Events.PlayerEnd, this, this.current);
                    this.current = null;
                    return this.play();
                }

                if (this.loop === "track" && !isNullish(this.current)) this.queue.unshift(this.current);
                if (this.loop === "queue" && !isNullish(this.current)) this.queue.add(this.current);

                if (!isNullish(this.current)) this.history.push(this.current);

                const current = this.current;
                this.current = null;

                if (isNullishOrEmpty(this.queue.store)) {
                    this.playing = false;
                    return this.emit(Events.PlayerEmpty, this);
                }

                this.emit(Events.PlayerEnd, this, current);
                return this.play();
            })
            .on("closed", (data: WebSocketClosedEvent) => {
                this.playing = false;
                this.emit(Events.PlayerClosed, this, data);
            })
            .on("exception", (data: TrackExceptionEvent) => {
                this.playing = false;
                this.exeption = true;
                this.emit(Events.PlayerException, this, data);
            })
            .on("update", (data: PlayerUpdate) => this.emit(Events.PlayerUpdate, this, data))
            .on("stuck", (data: TrackStuckEvent) => this.emit(Events.PlayerStuck, this, data))
            .on("resumed", () => this.emit(Events.PlayerResumed, this));
    }

    public get voting() {
        return this.#voting;
    }
    public set voting(value: boolean) {
        this.#voting = value;
    }
    public get queueTotal() {
        return this.queue.size + (!isNullish(this.current) ? 1 : 0);
    }
    public get exists() {
        return this.manager.players.has(this.guildId);
    }
    public get volume() {
        return this.shoukaku.filters.volume;
    }
    public get position() {
        return this.shoukaku.position;
    }
    public get filters() {
        return this.shoukaku.filters;
    }
    public get node() {
        return this.shoukaku.node;
    }

    private send(...args: any) {
        this.node.queue.add(...args);
    }

    public setPause(input: boolean) {
        if (this.paused === input || !this.queue.size) return this;

        this.paused = input;
        this.playing = !input;
        this.shoukaku.setPaused(input);

        return this;
    }

    public setTextChannel(id: string) {
        this.textChannel = id;
        return this;
    }

    public setVoiceChannel(id: string) {
        this.state = PlayerState.CONNECTING;

        this.voiceChannel = id;
        this.manager.options.send(this.guildId, {
            op: 4,
            d: {
                guild_id: this.guildId,
                channel_id: this.voiceChannel,
                self_mute: false,
                self_deaf: this.options.selfDeafen,
            },
        });

        this.emit(Events.Debug, `Player ${this.guildId} moved to voice channel ${id}`);

        return this;
    }

    public setLoop(loop?: "off" | "track" | "queue") {
        if (isNullish(loop)) {
            if (this.loop === "off") this.loop = "track";
            else if (this.loop === "track") this.loop = "queue";
            else if (this.loop === "queue") this.loop = "off";

            return this;
        }

        if (["off", "track", "queue"].includes(loop)) {
            this.loop = loop;
            return this;
        }

        return this;
    }

    public async play(track?: Track | Nullish, options?: PlayOptions) {
        if (!this.exists || (isNullishOrEmpty(this.queue.store) && isNullish(this.current))) return;

        if (isNullish(options) || typeof options.replaceCurrent !== "boolean") options = { ...options, replaceCurrent: false };
        if (track) {
            if (!options.replaceCurrent && !isNullish(this.current)) this.queue.unshift(this.current);
            this.current = track;
        } else if (isNullish(this.current)) this.current = this.queue.shift();

        if (isNullish(this.current)) throw new Error("No track is available to play");

        const current = this.current;
        current.setManager(this.manager);

        let errorMessage: string | undefined;

        const resolveResult = await current.resolve({ player: this }).catch((e) => {
            errorMessage = e.message;
            return null;
        });

        if (isNullish(resolveResult)) {
            this.emit(Events.PlayerResolveError, this, current, errorMessage);
            this.emit(Events.Debug, `Player ${this.guildId} resolve error: ${errorMessage}`);
            this.current = null;
            this.queue.size ? await this.play() : this.emit(Events.PlayerEmpty, this);
            return this;
        }

        const playOptions = { track: current.track, options: {} };
        if (options) playOptions.options = { ...options, noReplace: false };
        else playOptions.options = { noReplace: false };

        this.shoukaku.playTrack(playOptions);
        return this;
    }

    public pause(pause: boolean) {
        if (typeof pause !== "boolean") throw new Error("pause must be a boolean");

        if (this.paused === pause) return this;
        this.paused = pause;
        this.playing = !pause;
        this.shoukaku.setPaused(pause);

        return this;
    }

    public skip() {
        if (this.state === PlayerState.DESTROYED) throw new Error("Player is already destroyed");

        this.shoukaku.stopTrack();
        return this;
    }

    public seek(position: number) {
        if (isNullish(this.current)) throw new Error("Player has no current track in it's queue");
        if (!this.current.isSeekable) throw new Error("The current track isn't seekable");

        if (!isNumber(position)) throw new Error("'position' must be a number");
        if (position < 0 || position > this.current.length) position = Math.max(Math.min(position, this.current.length), 0);

        this.current.position = position;
        this.send({
            op: "seek",
            guildId: this.guildId,
            position,
        });

        return this;
    }

    public setVolume(volume: number) {
        if (!isNumber(volume)) return;

        this.shoukaku.filters.volume = volume / 100;

        this.send({
            op: "volume",
            guildId: this.guildId,
            volume: this.shoukaku.filters.volume * 100,
        });

        return this;
    }

    public connect() {
        if (this.state === PlayerState.DESTROYED) throw new Error("Player is already destroyed");
        if (this.state === PlayerState.CONNECTED || isNullish(this.voiceChannel)) throw new Error("Player is already connected");
        this.state = PlayerState.CONNECTING;

        this.manager.options.send(this.guildId, {
            op: 4,
            d: {
                guild_id: this.guildId,
                channel_id: this.voiceChannel,
                self_mute: false,
                self_deaf: this.options.selfDeafen,
            },
        });

        this.state = PlayerState.CONNECTED;

        this.emit(Events.Debug, `Player ${this.guildId} connected`);

        return this;
    }

    public disconnect() {
        if (this.state === PlayerState.DISCONNECTED || isNullish(this.voiceChannel)) throw new Error("Player is already disconnected");
        this.state = PlayerState.DISCONNECTING;

        this.pause(true);
        this.manager.options.send(this.guildId, {
            op: 4,
            d: {
                guild_id: this.guildId,
                channel_id: null,
                self_mute: false,
                self_deaf: false,
            },
        });

        this.voiceChannel = null;
        this.state = PlayerState.DISCONNECTED;

        this.emit(Events.Debug, `Player disconnected; Guild id: ${this.guildId}`);

        return this;
    }

    public destroy() {
        if (this.state === PlayerState.DESTROYING || this.state === PlayerState.DESTROYED)
            throw new Error("Player is already destroyed");

        this.disconnect();
        this.state = PlayerState.DESTROYING;
        this.shoukaku.connection.disconnect();
        this.shoukaku.removeAllListeners();
        this.manager.players.delete(this.guildId);
        this.state = PlayerState.DESTROYED;

        this.emit(Events.PlayerDestroy, this);
        this.emit(Events.Debug, `Player destroyed; Guild id: ${this.guildId}`);

        return this;
    }

    public dashboard(): Message;
    public dashboard(message: Message): undefined;
    public dashboard(message?: Message) {
        const dashboard = this.#dashboard;
        if (isNullish(message)) return dashboard;

        this.#dashboard = message;
    }

    public async newDashboard() {
        const { client } = container;
        const data = await container.db.guild.findUnique({ where: { id: this.guildId } });
        const channel =
            client.channels.cache.get(this.textChannel) ?? (await client.channels.fetch(this.textChannel).catch(() => null));
        if (isNullish(channel)) return;

        const track = this.current!;
        if (isNullish(track)) return;

        const title = createTitle(track);
        const duration = track.isStream ? `Live` : convertTime(Number(track.length));
        const requester = data?.requester ? `~ ${track.requester}` : "";

        const embed = new EmbedBuilder() //
            .setDescription(`${title} [${duration}] ${requester}`)
            .setColor(KoosColor.Default);
        const row = this.createPlayerComponents();

        if (channel.isTextBased()) {
            const newDashboard = await channel.send({ embeds: [embed], components: [row] });
            this.#dashboard = newDashboard;
        }
    }

    public resetDashboard() {
        this.#dashboard = undefined;
    }

    public createProgressBar(options?: PlayerProgressbarOptions) {
        const current = this.current;
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

    public createPlayerComponents() {
        const hasPrevious = isNullish(this.history.previousTrack);
        const row = new ActionRowBuilder<ButtonBuilder>();

        return row.setComponents([
            new ButtonBuilder() //
                .setLabel(this.paused ? "Resume" : "Pause")
                .setCustomId(ButtonId.PauseOrResume)
                .setStyle(this.paused ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder() //
                .setDisabled(hasPrevious)
                .setLabel("Previous")
                .setCustomId(ButtonId.Previous)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder() //
                .setLabel("Skip")
                .setCustomId(ButtonId.Skip)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder() //
                .setLabel("Stop")
                .setCustomId(ButtonId.Stop)
                .setStyle(ButtonStyle.Danger),
        ]);
    }

    private emit(event: string, ...args: any): void {
        this.manager.emit(event, ...args);
    }
}
