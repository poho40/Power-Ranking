import fs from "node:fs";import path from "node:path";import matter from "gray-matter";import { articleMetaSchema } from "./schema";import type { NewsArticle } from "./types";
export const NEWS_DIRECTORY=path.join(process.cwd(),"content","news");
export function isSafeNewsSlug(slug:string){return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)}
export function parseNewsArticle(source:string,filename="article.md"):NewsArticle{const parsed=matter(source),meta=articleMetaSchema.safeParse(parsed.data);if(!meta.success)throw new Error(`Invalid news metadata in ${filename}: ${meta.error.issues.map(i=>`${i.path.join(".")}: ${i.message}`).join("; ")}`);return{...meta.data,body:parsed.content.trim()};}
export function sortNewsArticles(articles:NewsArticle[]){return [...articles].sort((a,b)=>b.season-a.season||b.week-a.week||b.publishedAt.localeCompare(a.publishedAt)||a.slug.localeCompare(b.slug));}
export function loadNewsArticles(directory=NEWS_DIRECTORY){if(!fs.existsSync(directory))return[];return sortNewsArticles(fs.readdirSync(directory).filter(file=>file.endsWith(".md")).map(file=>parseNewsArticle(fs.readFileSync(path.join(directory,file),"utf8"),file)));}
export function getPublishedArticles(directory=NEWS_DIRECTORY){return loadNewsArticles(directory).filter(article=>article.status==="published")}
export function getLatestPublishedArticle(directory=NEWS_DIRECTORY){return getPublishedArticles(directory)[0]}
export function getNewsArticleBySlug(slug:string,{includeDrafts=false,directory=NEWS_DIRECTORY}:{includeDrafts?:boolean;directory?:string}={}){if(!isSafeNewsSlug(slug))return undefined;const article=loadNewsArticles(directory).find(item=>item.slug===slug);return article&&(article.status==="published"||includeDrafts)?article:undefined;}
