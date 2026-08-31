import type { Player } from "@/lib/domain";
export function projectedValue(player:Player){const value=player.projectedPoints??player.fantasyPoints??0;return Number.isFinite(value)?Math.max(0,value):0;}
export function valueOverReplacement(player:Player,replacement:number){return projectedValue(player)-(Number.isFinite(replacement)?replacement:0);}
