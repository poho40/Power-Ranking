import { NextResponse } from "next/server";
import { getLeague } from "@/lib/data/getLeague";
export async function GET(){const result=await getLeague();return NextResponse.json(result,{status:result.error?503:200,headers:{"Cache-Control":"public, s-maxage=600, stale-while-revalidate=60"}})}
