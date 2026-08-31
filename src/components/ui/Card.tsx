import type { ReactNode } from "react";
export function Card({children,className=""}:{children:ReactNode;className?:string}){return <section className={`panel ${className}`}>{children}</section>}
export function StatCard({label,value,detail}:{label:string;value:ReactNode;detail?:ReactNode}){return <Card className="hover-lift" ><div style={{padding:18}}><div className="eyebrow">{label}</div><div className="metric" style={{fontSize:"1.7rem",fontWeight:850,marginTop:8}}>{value}</div>{detail&&<div className="muted" style={{fontSize:13,marginTop:5}}>{detail}</div>}</div></Card>}
