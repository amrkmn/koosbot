import { Manager, Queue, Track } from "#lib/audio";
import { PlayerState, type PlayerOptions, Events } from "#lib/types";
import { isNullish, type Nullish } from "@sapphire/utilities";
import { Player as ShoukakuPlayer } from "shoukaku";

export class Player {
    public readonly guildId: string;
    public readonly queue: Queue = new Queue<Track>();
    public readonly options: PlayerOptions;
    public readonly current: Track | Nullish;
    // public readonly history:Que

    public textChannel: string;
    public voiceChannel: string;
    public paused: boolean = false;
    public loop: "off" | "track" | "queue" = "off";
    public playing: boolean = false;

    public state: PlayerState = PlayerState.CONNECTING;
    public shoukaku: ShoukakuPlayer;
    public manager: Manager;

    constructor(manager: Manager, shoukaku: ShoukakuPlayer, options: PlayerOptions) {
        this.options = options;
        this.shoukaku = shoukaku;
        this.manager = manager;

        this.guildId = options.guildId;
        this.textChannel = options.textChannel;
        this.voiceChannel = options.voiceChannel;
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

    public async play(_track: Track | Nullish) {}

    public skip() {
        this.shoukaku.stopTrack();
        return this;
    }

    private emit(event: string, ...args: any): void {
        this.manager.emit(event, ...args);
    }
}
