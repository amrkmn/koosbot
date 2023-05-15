import { KoosPlayer } from "#lib/extensions";
import { Queue } from "#lib/structures";
import { Nullish } from "@sapphire/utilities";
import { KazagumoTrack } from "kazagumo";

export class QueueHistory {
    public tracks = new Queue<KazagumoTrack>("LIFO");
    public constructor(public player: KoosPlayer) {}

    /**
     * Current track in the queue
     */
    public get currentTrack(): KazagumoTrack | Nullish {
        return this.player.queue.current;
    }

    /**
     * Next track in the queue
     */
    public get nextTrack(): KazagumoTrack | Nullish {
        return this.player.queue.at(0) ?? null;
    }

    /**
     * Previous track in the queue
     */
    public get previousTrack(): KazagumoTrack | Nullish {
        return this.tracks.at(0) ?? null;
    }

    /**
     * Gets the size of the queue
     */
    public get size() {
        return this.tracks.size;
    }

    public getSize() {
        return this.size;
    }

    /**
     * If history is empty
     */
    public isEmpty() {
        return this.tracks.size < 1;
    }

    /**
     * Add track to track history
     * @param track The track to add
     */
    public push(track: KazagumoTrack | KazagumoTrack[]) {
        this.tracks.add(track);
        return true;
    }

    /**
     * Clear history
     */
    public clear() {
        this.tracks.clear();
    }

    /**
     * Play the next track in the queue
     */
    public async next() {
        const track = this.nextTrack;
        if (!track) {
            throw new Error("No next track in the queue");
        }

        this.player.skip();
    }

    /**
     * Play the previous track in the queue
     */
    public async previous(preserveCurrent = true) {
        const track = this.tracks.dispatch();
        if (!track) {
            throw new Error("No previous track in the queue");
        }

        const current = this.currentTrack;

        await this.player.play(track);
        if (current && preserveCurrent) this.player.queue.splice(0, 0, current);
    }

    /**
     * Alias to [QueueHistory].previous()
     */
    public back() {
        return this.previous();
    }
}
