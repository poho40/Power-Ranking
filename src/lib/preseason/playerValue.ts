import type { Player } from "@/lib/domain";
export function projectedValue(player:Player){const value=player.seasonProjectedPoints??0;return Number.isFinite(value)?Math.max(0,value):0;}
export function valueOverReplacement(player:Player,replacement:number){return projectedValue(player)-(Number.isFinite(replacement)?replacement:0);}
export function usableValueOverReplacement(player:Player,replacement:number){return Math.max(0,valueOverReplacement(player,replacement));}
