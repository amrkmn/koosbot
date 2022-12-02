import { Kazagumo, KazagumoPlayer, KazagumoPlayerOptions } from "kazagumo";
import { Player } from "shoukaku";

export class KoosPlayer extends KazagumoPlayer {
    public skipVotes: Set<string>;

    constructor(kazagumo: Kazagumo, player: Player, options: KazagumoPlayerOptions, customData: unknown) {
        super(kazagumo, player, options, customData);

        this.skipVotes = new Set<string>();
    }
}

declare module "kazagumo" {
    interface KazagumoPlayer {
        skipVotes: Set<string>;
    }
}
