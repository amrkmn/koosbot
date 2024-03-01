import type { Manager } from "#lib/audio";
import { SearchEngine, SupportedSources, type RawTrack, type ResolveOptions, Events } from "#lib/types";
import { escapeRegExp, transform } from "#utils/functions";
import { filterNullishAndEmpty, isNullish, isNullishOrEmpty, type Nullish } from "@sapphire/utilities";
import type { GuildMember } from "discord.js";
import { container } from "@sapphire/framework";

export class Track {
    #raw: RawTrack;
    #sources = ["youtube", "bandcamp", "souncloud", "twitch", "vimeo", "http"];

    public manager: Manager | Nullish;
    public requester: GuildMember | Nullish;

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
    public thumbnail: string | Nullish;

    public resolvedBySource: boolean = false;

    constructor(raw: RawTrack, requester: GuildMember | Nullish) {
        this.manager = null;

        this.#raw = raw;

        this.track = raw.encoded;
        this.sourceName = raw.info.sourceName;
        this.title = raw.info.title;
        this.uri = raw.info.uri ?? "";
        this.identifier = raw.info.identifier;
        this.isSeekable = raw.info.isSeekable;
        this.isStream = raw.info.isStream;
        this.author = raw.info.author;
        this.length = raw.info.length;
        this.position = raw.info.position;
        this.thumbnail = raw.info.artworkUrl;
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
        return this;
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

        if (this.#sources.includes(this.sourceName)) return this;

        this.manager.emit(Events.Debug, `Resolving ${this.sourceName} track ${this.title}; Source: ${this.sourceName}`);

        const result = await this.getTrack();
        if (!result) throw new Error("No results found");

        this.#raw = result.#raw;
        this.track = result.#raw.encoded;
        this.realUri = result.#raw.info.uri;
        this.length = result.#raw.info.length;

        if (overwrite || resolveSource) {
            this.title = result.#raw.info.title;
            this.identifier = result.#raw.info.identifier;
            this.isSeekable = result.#raw.info.isSeekable;
            this.author = result.#raw.info.author;
            this.length = result.#raw.info.length;
            this.isStream = result.#raw.info.isStream;
            this.uri = result.#raw.info.uri ?? "";
        }

        return this;
    }

    private async getTrack() {
        if (isNullish(this.manager)) throw new Error("Manager is not set");

        const source = this.manager.options.defaultSearchEngine ?? SearchEngine.Youtube;
        const query = [this.author, this.title].filter(filterNullishAndEmpty).join(" - ");
        const node = container.shoukaku.options.nodeResolver(container.shoukaku.nodes);

        if (isNullish(node)) throw new Error("No node available");

        const result = await node.rest.resolve(`${source}:${query}`);
        if (isNullish(result) || isNullishOrEmpty(result.data)) throw new Error("No result found");

        const transformed = transform(result);
        if (this.author) {
            const author = [this.author, `${this.author} - Topic`];
            const officialTrack = transformed.tracks.find(
                (track) =>
                    author.some((name) => new RegExp(`^${escapeRegExp(name)}$`, "i").test(track.author)) ||
                    new RegExp(`^${escapeRegExp(this.title)}$`, "i").test(track.title)
            );
            if (officialTrack) return officialTrack;
        }
        if (this.length) {
            const sameDuration = transformed.tracks.find(
                (track) => track.length >= this.length - 2000 && track.length <= this.length + 2000
            );
            if (sameDuration) return sameDuration;
        }

        return transformed.tracks[0];
    }
}
