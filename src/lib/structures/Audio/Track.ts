import { SupportedSources } from "#lib/types";
import type { Nullish } from "@sapphire/utilities";
import type { User } from "discord.js";
import type { Track as ShoukakuTrack } from "shoukaku";
import type { Manager } from "#lib/audio";

export class Track {
    private __raw: ShoukakuTrack;

    public manager: Manager | Nullish;
    public requester: User | Nullish;

    public track: string;
    public sourceName: string;
    public title: string;
    public uri: string;
    public identifier: string;
    public isSeekable: boolean;
    public isStream: boolean;
    public author: string;
    public length: number;
    public position: number;
    public realUri: string | Nullish;

    constructor(raw: ShoukakuTrack, requester: User | Nullish) {
        this.manager = null;

        this.__raw = raw;

        this.track = raw.track;
        this.sourceName = raw.info.sourceName;
        this.title = raw.info.title;
        this.uri = raw.info.uri;
        this.identifier = raw.info.identifier;
        this.isSeekable = raw.info.isSeekable;
        this.isStream = raw.info.isStream;
        this.author = raw.info.author;
        this.length = raw.info.length;
        this.position = raw.info.position;
        this.realUri = SupportedSources.includes(this.sourceName) ? this.uri : null;
        this.requester = requester;
    }

    public get raw() {
        return this.__raw;
    }
}
