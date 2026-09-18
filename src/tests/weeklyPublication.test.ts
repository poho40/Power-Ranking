import {publishLatestNews} from "@/lib/news/publication";
import {describe,expect,it,vi} from "vitest";import {mockLeague} from "@/data/mockLeague";import {publishLatestCompletedWeek} from "@/lib/supabase/publication";import type {GeneratedArticleStore} from "@/lib/news/generated";import type {GeneratedNewsArticle} from "@/lib/news";import type {PublishedSnapshot,SnapshotStore,SnapshotType} from "@/lib/supabase/types";
class Snapshots implements SnapshotStore{rows:PublishedSnapshot[]=[];async publish(payload:Record<string,unknown>){const existing=await this.byWeek(String(payload.league_id),Number(payload.season),Number(payload.week),payload.snapshot_type as SnapshotType);if(existing)return{snapshotId:existing.id,created:false};const row:PublishedSnapshot={id:this.rows.length+1,leagueId:String(payload.league_id),leagueName:String(payload.league_name),season:Number(payload.season),week:Number(payload.week),snapshotType:payload.snapshot_type as SnapshotType,label:String(payload.label),publishedAt:String(payload.published_at),league:structuredClone(payload.league_data) as typeof mockLeague,result:structuredClone(payload.result_data) as PublishedSnapshot["result"]};this.rows.push(row);return{snapshotId:row.id,created:true}}async latest(id:string,season:number,type?:SnapshotType){return this.rows.filter(row=>row.leagueId===id&&row.season===season&&(!type||row.snapshotType===type)).at(-1)??null}async byWeek(id:string,season:number,week:number,type:SnapshotType){return this.rows.find(row=>row.leagueId===id&&row.season===season&&row.week===week&&row.snapshotType===type)??null}async all(id:string,season:number){return this.rows.filter(row=>row.leagueId===id&&row.season===season)}}
class Articles implements GeneratedArticleStore{rows:GeneratedNewsArticle[]=[];async publish(article:Omit<GeneratedNewsArticle,"id">){const existing=await this.bySnapshot(article.snapshotId);if(existing)return{article:existing,created:false};const saved={...structuredClone(article),id:this.rows.length+1};this.rows.push(saved);return{article:saved,created:true}}async bySnapshot(id:number){return this.rows.find(row=>row.snapshotId===id)??null}async bySlug(slug:string){return this.rows.find(row=>row.slug===slug)??null}async allPublished(){return this.rows}}
const completed={...mockLeague,currentWeek:2,matchups:mockLeague.matchups.map(match=>({...match,completed:match.week===1}))};
describe("separate weekly publication jobs",()=>{
  it("saves rankings on Tuesday and publishes news independently on Wednesday",async()=>{
    const snapshots=new Snapshots(),articles=new Articles();
    await publishLatestCompletedWeek(snapshots,completed);
    expect(articles.rows).toHaveLength(0);
    const before=structuredClone(snapshots.rows);
    const first=await publishLatestNews(snapshots,articles,completed.id,completed.season);
    const second=await publishLatestNews(snapshots,articles,completed.id,completed.season);
    expect(first).toMatchObject({status:"published",week:1,articleSlug:"week-1-power-rankings"});
    expect(second).toMatchObject({status:"already_published",snapshotId:first.snapshotId});
    expect(snapshots.rows).toEqual(before);
    expect(articles.rows).toHaveLength(1);
  });
  it("skips when no regular snapshot exists",async()=>{
    const snapshots=new Snapshots(),articles=new Articles();
    expect(await publishLatestNews(snapshots,articles,completed.id,completed.season)).toEqual({status:"no-published-snapshot"});
    expect(articles.rows).toHaveLength(0);
  });
  it("recovers from an article storage failure without changing rankings",async()=>{
    const snapshots=new Snapshots(),articles=new Articles();
    await publishLatestCompletedWeek(snapshots,completed);
    const before=structuredClone(snapshots.rows);
    vi.spyOn(articles,"publish").mockRejectedValueOnce(new Error("storage unavailable"));
    await expect(publishLatestNews(snapshots,articles,completed.id,completed.season)).rejects.toThrow("storage unavailable");
    expect(snapshots.rows).toEqual(before);
    expect(await publishLatestNews(snapshots,articles,completed.id,completed.season)).toMatchObject({status:"published"});
    expect(articles.rows).toHaveLength(1);
  });
  it("selects the latest saved week and scopes it to the configured league and season",async()=>{
    const snapshots=new Snapshots(),articles=new Articles();
    await publishLatestCompletedWeek(snapshots,completed);
    await publishLatestCompletedWeek(snapshots,{...completed,currentWeek:3,matchups:completed.matchups.map(m=>({...m,completed:m.week<=2}))});
    expect(await publishLatestNews(snapshots,articles,"another-league",completed.season)).toEqual({status:"no-published-snapshot"});
    expect(await publishLatestNews(snapshots,articles,completed.id,completed.season+1)).toEqual({status:"no-published-snapshot"});
    expect(await publishLatestNews(snapshots,articles,completed.id,completed.season)).toMatchObject({status:"published",week:2});
  });
});
