import { benchMultiplier } from "./contributions";
export function diminishingBenchValue(values:number[]){return values.filter(Number.isFinite).map(v=>Math.max(0,v)).sort((a,b)=>b-a).reduce((sum,value,index)=>sum+value*benchMultiplier(index),0);}
