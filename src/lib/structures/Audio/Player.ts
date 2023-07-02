import { Manager, Queue, QueueHistory, Track } from "#lib/audio";
import { PlayerState, type PlayerOptions, Events, type PlayOptions, type Result, type SearchOptions } from "#lib/types";
import { isNullish, isNullishOrEmpty, type Nullish } from "@sapphire/utilities";
import {
    Player as ShoukakuPlayer,
    type PlayerUpdate,
    type TrackExceptionEvent,
    type WebSocketClosedEvent,
    type TrackStuckEvent,
} from "shoukaku";

export class Player {
    public readonly guildId: string;
    public readonly options: PlayerOptions;
    public readonly queue = new Queue<Track>();
    public readonly history = new QueueHistory(this);

    public textChannel: string;
    public voiceChannel: string;
    public paused: boolean = false;
    public loop: "off" | "track" | "queue" = "off";
    public playing: boolean = false;

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

                if (this.loop === "track" && !isNullish(this.current)) this.queue.store.unshift(this.current);
                if (this.loop === "queue" && !isNullish(this.current)) this.queue.store.push(this.current);

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
                this.emit(Events.PlayerException, this, data);
            })
            .on("update", (data: PlayerUpdate) => this.emit(Events.PlayerUpdate, this, data))
            .on("stuck", (data: TrackStuckEvent) => this.emit(Events.PlayerStuck, this, data))
            .on("resumed", () => this.emit(Events.PlayerResumed, this));
    }

    get exists() {
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

    // private send(...args: any) {
    //     this.node.queue.add(...args);
    // }

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
            if (!options.replaceCurrent && !isNullish(this.current)) this.queue.store.unshift(this.current);
            this.current = track;
        } else if (isNullish(this.current)) this.current = this.queue.store.shift();

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

    public skip() {
        this.shoukaku.stopTrack();
        return this;
    }

    private emit(event: string, ...args: any): void {
        this.manager.emit(event, ...args);
    }
}
