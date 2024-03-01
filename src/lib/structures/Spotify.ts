// https://github.com/Takiyo0/kazagumo-spotify

import { Track } from "#lib/audio";
import {
    type AlbumResult,
    type PlaylistResult,
    type PlaylistTracks,
    type Result,
    type SearchResult,
    type SpotifyOptions,
    type Track as SpotifyTrack,
    type TrackResult,
} from "#lib/types";
import { request } from "@aytea/request";
import { filterNullish, type Nullish } from "@sapphire/utilities";
import type { GuildMember } from "discord.js";
import { LoadType } from "shoukaku";

export class Spotify {
    /**
     * The options of the plugin.
     */
    public options: SpotifyOptions;

    private requestManager: RequestManager;

    constructor(spotifyOptions: SpotifyOptions) {
        this.options = spotifyOptions;
        this.requestManager = new RequestManager(spotifyOptions);
    }

    public async searchTrack(query: string, requester: GuildMember | Nullish): Promise<Result> {
        const limit =
            this.options.searchLimit && this.options.searchLimit > 0 && this.options.searchLimit < 50 ? this.options.searchLimit : 10;
        const tracks = await this.requestManager.makeRequest<SearchResult>(
            `/search?q=${decodeURIComponent(query)}&type=track&limit=${limit}&market=${this.options.searchMarket ?? "US"}`
        );
        return {
            tracks: tracks.tracks.items.map((track) => this.buildTrack(track, requester)),
            loadType: LoadType.SEARCH,
        };
    }

    public async getTrack(id: string, requester: GuildMember | Nullish): Promise<Result> {
        const track = await this.requestManager.makeRequest<TrackResult>(`/tracks/${id}`);
        return {
            tracks: [this.buildTrack(track, requester)],
            loadType: LoadType.TRACK,
        };
    }

    public async getAlbum(id: string, requester: GuildMember | Nullish): Promise<Result> {
        const album = await this.requestManager.makeRequest<AlbumResult>(`/albums/${id}?market=${this.options.searchMarket ?? "US"}`);
        const tracks = album.tracks.items
            .filter(filterNullish)
            .map((track) => this.buildTrack(track, requester, album.images[0]?.url));

        if (album && tracks.length) {
            let next = album.tracks.next;
            let page = 1;

            while (next && (!this.options.playlistPageLimit ? true : page < this.options.playlistPageLimit ?? 1)) {
                const nextTracks = await this.requestManager.makeRequest<PlaylistTracks>(next ?? "", true);
                page++;
                if (nextTracks.items.length) {
                    next = nextTracks.next;
                    tracks.push(
                        ...nextTracks.items
                            .filter(filterNullish)
                            .filter((a) => a.track)
                            .map((track) => this.buildTrack(track.track!, requester, album.images[0]?.url))
                    );
                }
            }
        }

        return {
            tracks,
            loadType: LoadType.PLAYLIST,
            playlistName: album.name,
        };
    }

    public async getPlaylist(id: string, requester: GuildMember | Nullish): Promise<Result> {
        const playlist = await this.requestManager.makeRequest<PlaylistResult>(
            `/playlists/${id}?market=${this.options.searchMarket ?? "US"}`
        );

        const tracks = playlist.tracks.items
            .filter(filterNullish)
            .map((track) => this.buildTrack(track.track, requester, playlist.images[0]?.url));

        if (playlist && tracks.length) {
            let next = playlist.tracks.next;
            let page = 1;
            while (next && (!this.options.playlistPageLimit ? true : page < this.options.playlistPageLimit ?? 1)) {
                const nextTracks = await this.requestManager.makeRequest<PlaylistTracks>(next ?? "", true);
                page++;
                if (nextTracks.items.length) {
                    next = nextTracks.next;
                    tracks.push(
                        ...nextTracks.items
                            .filter(filterNullish)
                            .filter((a) => a.track)
                            .map((track) => this.buildTrack(track.track!, requester, playlist.images[0]?.url))
                    );
                }
            }
        }
        return {
            tracks,
            loadType: LoadType.PLAYLIST,
            playlistName: playlist.name,
        };
    }

    private buildTrack(spotifyTrack: SpotifyTrack, requester: GuildMember | Nullish, thumbnail?: string) {
        return new Track(
            {
                encoded: "",
                info: {
                    sourceName: "spotify",
                    identifier: spotifyTrack.id,
                    isSeekable: true,
                    author: spotifyTrack.artists[0] ? spotifyTrack.artists[0].name : "Unknown artist",
                    length: spotifyTrack.duration_ms,
                    isStream: false,
                    position: 0,
                    title: spotifyTrack.name,
                    uri: `https://open.spotify.com/track/${spotifyTrack.id}`,
                    artworkUrl: thumbnail ? thumbnail : spotifyTrack.album?.images[0]?.url,
                    isrc: "",
                },
                pluginInfo: {},
            },
            requester
        );
    }
}

const BASE_URL = "https://api.spotify.com/v1";
class RequestManager {
    private token: string = "";
    private authorization: string = "";
    private nextRenew: number = 0;

    constructor(private options: SpotifyOptions) {
        this.authorization = `${Buffer.from(`${this.options.clientId}:${this.options.clientSecret}`).toString("base64")}`;
    }

    public async makeRequest<T>(endpoint: string, disableBaseUri: boolean = false): Promise<T> {
        await this.renew();

        const data = await request(disableBaseUri ? endpoint : `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`)
            .auth(this.token, "Bearer")
            .json<T>();

        return data;
    }

    private async renewToken(): Promise<void> {
        const data = await request("https://accounts.spotify.com/api/token?grant_type=client_credentials")
            .post()
            .auth(this.authorization, "Basic")
            .header("Content-Type", "application/x-www-form-urlencoded")
            .json<{ access_token?: string; expires_in: number }>();

        const { access_token, expires_in } = data;

        if (!access_token) throw new Error("Failed to get access token due to invalid spotify client");

        this.token = `${access_token}`;
        this.nextRenew = Date.now() + expires_in * 1000;
    }

    private async renew(): Promise<void> {
        if (Date.now() >= this.nextRenew) {
            await this.renewToken();
        }
    }
}
