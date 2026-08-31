import type { League } from "@/lib/domain";
import type { PreseasonGroup } from "./types";
export const FLEX_SLOTS=new Set(["FLEX","RB/WR","WR/TE","SUPERFLEX"]);
export const INACTIVE_SLOTS=new Set(["BE","IR"]);
export function rosterConfig(league:League){return league.rosterSlotCounts??{QB:1,RB:2,WR:2,TE:1,FLEX:1,"D/ST":1,K:1,BE:Math.max(0,(league.teams[0]?.roster.length??9)-9)}}
export function starterSlots(league:League){return Object.entries(rosterConfig(league)).flatMap(([slot,count])=>INACTIVE_SLOTS.has(slot)?[]:Array.from({length:count},()=>slot));}
export function applicableGroups(league:League):PreseasonGroup[]{const c=rosterConfig(league),groups:PreseasonGroup[]=[];for(const p of ["QB","RB","WR","TE"] as const)if((c[p]??0)>0||Object.keys(c).some(s=>FLEX_SLOTS.has(s)))groups.push(p);if(Object.keys(c).some(s=>FLEX_SLOTS.has(s)&&(c[s]??0)>0))groups.push("FLEX");groups.push("Bench");if((c.K??0)>0)groups.push("K");if((c["D/ST"]??0)>0)groups.push("D/ST");return groups;}
