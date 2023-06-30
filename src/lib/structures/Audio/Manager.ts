import type { ManagerOptions } from "#lib/types";
import { EventEmitter } from "events";
import type { CreatePlayerOptions } from "kazagumo";
import { Shoukaku, type Player as ShoukakuPlayer } from "shoukaku";

export class Manager extends EventEmitter {
    public shoukaku: Shoukaku;
    public readonly players = new Map<string, ShoukakuPlayer>();

    constructor(public options: ManagerOptions) {
        super();

        this.shoukaku = new Shoukaku(options.connector, options.nodes, options.shoukaku);
    }

    public async createPlayer(_options: CreatePlayerOptions) {}
}
