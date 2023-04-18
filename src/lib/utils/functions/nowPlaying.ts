import { Message } from "discord.js";
import { KazagumoPlayer } from "kazagumo";

export const getNp = (player: KazagumoPlayer): Message => player.data.get("nowPlaying");
export const setNp = (player: KazagumoPlayer, message: Message) => player.data.set("nowPlaying", message);
export const deleteNp = (player: KazagumoPlayer) => player.data.delete("nowPlaying");
