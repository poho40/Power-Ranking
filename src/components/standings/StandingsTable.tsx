"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { League, PowerRanking } from "@/lib/domain";
import { buildStandingsRows, sortStandingsRows, type StandingsSortKey } from "@/lib/standings";

const headers: [StandingsSortKey, string][] = [["name", "Team"], ["wins", "Record"], ["pct", "Win %"], ["pointsFor", "PF"], ["pointsAgainst", "PA"], ["diff", "+/−"], ["expectedWins", "Expected W"], ["luck", "Luck"], ["regularSeasonPowerRank", "Power"]];
const decimal = (value: number | null) => value == null ? "—" : value.toFixed(1);
const signedDecimal = (value: number | null) => value == null ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(1)}`;

export function StandingsTable({ league, rankings }: { league: League; rankings: PowerRanking[] }) {
  const [key, setKey] = useState<StandingsSortKey>("wins"), [descending, setDescending] = useState(true);
  const rows = useMemo(() => sortStandingsRows(buildStandingsRows(league, rankings), key, descending), [league, rankings, key, descending]);
  const sort = (nextKey: StandingsSortKey) => { if (nextKey === key) setDescending((value) => !value); else { setKey(nextKey); setDescending(true); } };
  return <div className="panel table-wrap"><table className="data-table"><thead><tr>{headers.map(([headerKey, label]) => <th key={headerKey}><button onClick={() => sort(headerKey)} aria-label={`Sort by ${label}`} style={{ all: "unset", cursor: "pointer" }}>{label} {key === headerKey ? (descending ? "↓" : "↑") : ""}</button></th>)}</tr></thead><tbody>{rows.map((team) => <tr key={team.id}><td><Link className="link" href={`/teams/${team.id}`}><strong>{team.name}</strong></Link></td><td>{team.wins}–{team.losses}{team.ties ? `–${team.ties}` : ""}</td><td>{(team.pct * 100).toFixed(1)}%</td><td>{team.pointsFor.toFixed(1)}</td><td>{team.pointsAgainst.toFixed(1)}</td><td>{team.diff > 0 ? "+" : ""}{team.diff.toFixed(1)}</td><td>{decimal(team.expectedWins)}</td><td style={{ color: team.luck == null ? undefined : team.luck > 0 ? "var(--amber)" : "var(--accent)" }}>{signedDecimal(team.luck)}</td><td>{team.regularSeasonPowerRank == null ? "—" : `#${team.regularSeasonPowerRank}`}</td></tr>)}</tbody></table></div>;
}
