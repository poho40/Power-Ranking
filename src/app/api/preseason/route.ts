import { NextResponse } from "next/server";import { getPublishedPreseason } from "@/lib/data/getPublishedRankings";
export async function GET(){const result=await getPublishedPreseason();if(!result.league||!result.preseason)return NextResponse.json(result,{status:503});return NextResponse.json(result,{headers:{"Cache-Control":"public, s-maxage=600, stale-while-revalidate=60"}})}
