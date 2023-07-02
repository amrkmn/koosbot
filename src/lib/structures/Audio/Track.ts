import { SupportedSources, type ResolveOptions, SearchEngine } from "#lib/types";
import { filterNullishAndEmpty, isNullish, isNullishOrEmpty, type Nullish } from "@sapphire/utilities";
import type { User } from "discord.js";
import type { Track as ShoukakuTrack } from "shoukaku";
import type { Manager } from "#lib/audio";
import { Events } from "kazagumo";
import { escapeRegExp } from "#utils/functions";

export class Track {
    #raw: ShoukakuTrack;

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

    public resolvedBySource: boolean = false;

    constructor(raw: ShoukakuTrack, requester: User | Nullish) {
        this.manager = null;

        this.#raw = raw;

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
        return this.#raw;
    }

    get readyToPlay(): boolean {
        return (
            !isNullish(this.manager) &&
            !!this.track &&
            !!this.sourceName &&
            !!this.identifier &&
            !!this.author &&
            !!this.length &&
            !!this.title &&
            !!this.uri &&
            !!this.realUri
        );
    }

    public setManager(manager: Manager) {
        this.manager = manager;
    }

    public async resolve(options?: ResolveOptions) {
        if (isNullish(this.manager)) throw new Error("Manager is not set");
        const { forceResolve, overwrite } = isNullish(options) ? { forceResolve: false, overwrite: false } : options;
        const resolveSource = this.manager.options?.sourceForceResolve?.includes(this.sourceName);

        if (!forceResolve && this.readyToPlay) return this;
        if (resolveSource && this.resolvedBySource) return this;
        if (resolveSource) {
            this.resolvedBySource = true;
            return this;
        }

        this.manager.emit(Events.Debug, `Resolving ${this.sourceName} track ${this.title}; Source: ${this.sourceName}`);

        const result = await this.getTrack();
        if (!result) throw new Error("No results found");

        this.#raw = result;
        this.track = result.track;
        this.realUri = result.info.uri;
        this.length = result.info.length;

        if (overwrite || resolveSource) {
            this.title = result.info.title;
            this.identifier = result.info.identifier;
            this.isSeekable = result.info.isSeekable;
            this.author = result.info.author;
            this.length = result.info.length;
            this.isStream = result.info.isStream;
            this.uri = result.info.uri;
        }

        return this;
    }

    private async getTrack() {
        if (isNullish(this.manager)) throw new Error("Manager is not set");

        const source = this.manager.options.defaultSearchEngine ?? SearchEngine.Youtube;
        const query = [this.author, this.title].filter(filterNullishAndEmpty).join(" - ");
        const node = this.manager.getLeastUsedNode();

        if (isNullish(node)) throw new Error("No node available");

        const result = await node.rest.resolve(`${source}:${query}`);
        if (isNullish(result) || isNullishOrEmpty(result.tracks)) throw new Error("No result found");

        if (this.author) {
            const author = [this.author, `${this.author} - Topic`];
            const officialTrack = result.tracks.find(
                (track) =>
                    author.some((name) => new RegExp(`^${escapeRegExp(name)}$`, "i").test(track.info.author)) ||
                    new RegExp(`^${escapeRegExp(this.title)}$`, "i").test(track.info.title)
            );
            if (officialTrack) return officialTrack;
        }
        if (this.length) {
            const sameDuration = result.tracks.find(
                (track) => track.info.length >= this.length - 2000 && track.info.length <= this.length + 2000
            );
            if (sameDuration) return sameDuration;
        }

        return result.tracks[0];
    }
}
