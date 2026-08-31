import { NextResponse } from "next/server";
import { getDashboard } from "@/lib/data/getDashboard";
export async function GET(){const result=await getDashboard();return NextResponse.json(result,{status:result.error?503:200,headers:{"Cache-Control":"public, s-maxage=600, stale-while-revalidate=60"}})}
