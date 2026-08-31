import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { ScoreBar } from "@/components/ui/ScoreBar";

export const metadata: Metadata = { title: "Methodology" };

const metrics = [
  { name: "Scoring Strength", weight: 30, text: "Points per game relative to every team in the league. It is the largest component because sustained scoring is the clearest signal of team quality." },
  { name: "Recent Form", weight: 20, text: "The latest three completed scoring weeks, weighted 50%, 30%, and 20% from newest to oldest. This captures momentum without overreacting to one game." },
  { name: "Record Strength", weight: 15, text: "Winning percentage, with ties worth half a win, normalized against the league." },
  { name: "Expected Wins", weight: 15, text: "Each week is treated as an all-play round. Beating an opponent earns one comparison win; tying earns half." },
  { name: "Roster Strength", weight: 10, text: "Available player projections or production, with starters weighted 80% and bench depth 20%. Missing player data degrades safely to neutral comparisons." },
  { name: "Schedule Strength", weight: 10, text: "The average points per game of completed opponents. A harder schedule receives a higher score without feeding the power ranking back into itself." },
];

const preseasonMethods = [
  { name: "Full-season projections", text: "Only ESPN's full-season projected fantasy-point total is used. Weekly projections and actual results never enter preseason valuation." },
  { name: "Replacement level and VOR", text: "For each position, replacement is the next player beyond league-wide optimized starter demand. Demand comes from league size, required slots, FLEX, and SUPERFLEX. Raw VOR is season projection minus that position's replacement projection; usable VOR is raw VOR clamped at zero." },
  { name: "Optimized starters", text: "Required non-FLEX slots are filled first, then FLEX/SUPERFLEX slots from the remaining eligible players. Every selected starter receives 100% of usable VOR, and one player can occupy only one slot." },
  { name: "Position-room depth", text: "Unassigned players at the position contribute diminishing usable VOR: 50% for the first reserve, 25% for the second, 12.5% for the third, 6.25% for the fourth, then the rate continues halving." },
  { name: "FLEX", text: "The FLEX view contains only players actually assigned to FLEX-like slots after required starters are removed. They receive full usable VOR and are excluded from their base-position room contribution, preventing double counting." },
  { name: "Bench", text: "Only players outside the optimized lineup count. Ordered by usable VOR, reserves receive 50%, 35%, 25%, 15%, and 10%; later useful reserves receive 5%. Below-replacement players add zero." },
  { name: "Position scores", text: "Each raw position total is min–max normalized to 0–100 across this league. Equal totals become 50. Ties use top starter, all starters, first reserve, total useful depth, then team name." },
  { name: "Overall roster score", text: "Overall raw value is the sum of full usable VOR from every unique optimized starter plus the discounted bench contributions. It is independently normalized to 0–100. Position scores and display weights explain roster construction but do not feed Overall." },
];

export default function Methodology() {
  return <>
    <PageHeader eyebrow="Transparent by design" title="How the rankings work" description="Every score is deterministic, every input is inspectable, and preseason roster quality stays separate from regular-season performance." />
    <section id="preseason">
      <div className="eyebrow">Before week one</div>
      <h2>Preseason roster methodology</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
        {preseasonMethods.map((method) => <Card key={method.name}><div style={{ padding: 20 }}><h3>{method.name}</h3><p className="muted" style={{ lineHeight: 1.65 }}>{method.text}</p></div></Card>)}
      </div>
      <Card><div style={{ padding: 24, marginTop: 20 }}>
        <div className="eyebrow">Worked example</div>
        <h3>One RB room, from VOR to raw strength</h3>
        <p className="muted" style={{ lineHeight: 1.7 }}>Suppose RB1 and RB2 are required starters with usable VOR of 120 and 70. RB3 and RB4 are reserves with usable VOR of 40 and 20.</p>
        <p className="metric" style={{ fontSize: 18 }}>120 + 70 + (40 × 50%) + (20 × 25%) = 215 raw RB strength</p>
        <p className="muted">That 215 is normalized against every other team&apos;s raw RB strength. Negative VOR remains available for diagnosis but contributes zero.</p>
      </div></Card>
    </section>
    <section style={{ marginTop: 50 }}>
      <div className="eyebrow">After games begin</div><h2>Regular-season power methodology</h2>
      <Card><div style={{ padding: 24 }}><div className="eyebrow">Power score formula</div><h3>Six signals, one 0–100 score</h3><div style={{ display: "grid", gap: 14, marginTop: 20 }}>{metrics.map((metric) => <ScoreBar key={metric.name} label={metric.name.replace(" Strength", "")} value={metric.weight / 30 * 100} />)}</div><p className="muted">Weights: 30% scoring · 20% recent form · 15% record · 15% expected wins · 10% roster · 10% schedule.</p></div></Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16, marginTop: 20 }}>{metrics.map((metric) => <Card key={metric.name}><div style={{ padding: 20 }}><div className="eyebrow">{metric.weight}% weight</div><h3>{metric.name}</h3><p className="muted" style={{ lineHeight: 1.65 }}>{metric.text}</p></div></Card>)}</div>
    </section>
    <section style={{ marginTop: 40, maxWidth: 800 }}><div className="eyebrow">Reading the numbers</div><h2>Normalization, luck, and ties</h2><p className="muted" style={{ lineHeight: 1.7 }}>Each raw component is min–max normalized across the current league. When every team has the same value, all receive a neutral 50. Scores are clamped so missing or unusual data can never produce NaN or Infinity.</p><p className="muted" style={{ lineHeight: 1.7 }}>Luck is actual wins (plus half of ties) minus expected wins. Positive luck means the schedule produced more wins than all-play performance predicts; negative luck means a team has performed better than its record.</p></section>
  </>;
}
