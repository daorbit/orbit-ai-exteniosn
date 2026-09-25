import { Text } from "@mantine/core";
import { ArrowDown, ArrowUp } from "lucide-react";
import classes from "./dataDigestTable.module.css";

export type DataDigestRow = { key: string; count: number };
export type DataDigestSite = {
  domain: string;
  visitors: number;
  visitorsChangePct: number | null;
  pageviews: number;
  pageviewsChangePct: number | null;
  sessions: number;
  sessionsChangePct: number | null;
  bounceRate: number;
  bounceRateChangePct: number | null;
  live: number;
  topPages: DataDigestRow[];
  topReferrers: DataDigestRow[];
  countries: DataDigestRow[];
  devices: DataDigestRow[];
};
export type DataDigest = { sites: DataDigestSite[]; rangeLabel?: string };

export function isDataDigest(v: unknown): v is DataDigest {
  return Boolean(v) && typeof v === "object" && Array.isArray((v as DataDigest).sites);
}

function changeLine(pct: number | null): string {
  if (pct === null || !Number.isFinite(pct)) return "";
  const rounded = Math.round(pct);
  return ` (${rounded >= 0 ? "+" : ""}${rounded}% vs previous period)`;
}

function rowsLine(label: string, rows: DataDigestRow[]): string {
  if (!rows.length) return "";
  return `${label}: ${rows.map((r) => `${r.key} (${r.count})`).join(", ")}`;
}

export function formatDigestAsText(digest: DataDigest): string {
  const range = digest.rangeLabel ?? "the last 7 days";
  return digest.sites
    .map((site) =>
      [
        `${site.domain} — ${range}`,
        `Visitors: ${site.visitors}${changeLine(site.visitorsChangePct)}`,
        `Pageviews: ${site.pageviews}${changeLine(site.pageviewsChangePct)}`,
        `Sessions: ${site.sessions}${changeLine(site.sessionsChangePct)}`,
        `Bounce rate: ${site.bounceRate}%${changeLine(site.bounceRateChangePct)}`,
        `Visitors online now: ${site.live}`,
        rowsLine("Top pages", site.topPages),
        rowsLine("Top referrers", site.topReferrers),
        rowsLine("Countries", site.countries),
        rowsLine("Devices", site.devices),
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRows(label: string, domain: string, rows: DataDigestRow[]): string[] {
  return rows.map((r) => [domain, label, r.key, r.count].map(csvCell).join(","));
}

export function csvFromDigest(digest: DataDigest): string {
  const range = digest.rangeLabel ?? "last 7 days";
  const header = "site,metric,label,value";
  const lines: string[] = [header];

  for (const site of digest.sites) {
    lines.push(
      [site.domain, "range", "", range].map(csvCell).join(","),
      [site.domain, "visitors", "", site.visitors].map(csvCell).join(","),
      [site.domain, "pageviews", "", site.pageviews].map(csvCell).join(","),
      [site.domain, "sessions", "", site.sessions].map(csvCell).join(","),
      [site.domain, "bounce_rate", "", site.bounceRate].map(csvCell).join(","),
      [site.domain, "online_now", "", site.live].map(csvCell).join(","),
      ...csvRows("top_page", site.domain, site.topPages),
      ...csvRows("top_referrer", site.domain, site.topReferrers),
      ...csvRows("country", site.domain, site.countries),
      ...csvRows("device", site.domain, site.devices),
    );
  }

  return lines.join("\n");
}

function Delta({ pct }: { pct: number | null }) {
  if (pct === null || !Number.isFinite(pct)) return null;
  const up = pct >= 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className={classes.delta} data-tone={up ? "up" : "down"}>
      <Icon size={11} />
      {Math.abs(Math.round(pct))}%
    </span>
  );
}

function Stat({ label, value, pct }: { label: string; value: string | number; pct: number | null }) {
  return (
    <div className={classes.stat}>
      <Text size="10px" c="dimmed" tt="uppercase" fw={600} lh={1.2}>
        {label}
      </Text>
      <Text size="sm" fw={650} lh={1.3}>
        {value}
      </Text>
      <Delta pct={pct} />
    </div>
  );
}

function TopRows({ label, rows }: { label: string; rows: DataDigestRow[] }) {
  if (!rows.length) return null;
  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div className={classes.breakdown}>
      <Text size="10px" c="dimmed" tt="uppercase" fw={600} mb={6}>
        {label}
      </Text>
      <div className={classes.barList}>
        {rows.map((r) => (
          <div key={r.key} className={classes.barRow}>
            <Text size="11px" className={classes.barKey} lh={1.3}>
              {r.key}
            </Text>
            <div className={classes.barTrack}>
              <div className={classes.barFill} style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
            <Text size="11px" fw={600} c="dimmed" className={classes.barCount}>
              {r.count}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}

function takenAt(iso?: string): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  if (Date.now() - at.getTime() < 5 * 60_000) return null;

  return `as of ${at.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: at.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  })}`;
}

export function DataDigestTable({
  digest,
  takenAtIso,
}: {
  digest: unknown;
  takenAtIso?: string;
}) {
  if (!isDataDigest(digest) || !digest.sites.length) return null;

  const stamp = takenAt(takenAtIso);
  const range = digest.rangeLabel ?? "the last 7 days";

  return (
    <div className={classes.wrap}>
      {digest.sites.map((site) => (
        <div key={site.domain} className={classes.card}>
          <Text size="xs" fw={600} c="dimmed" mb={8}>
            {site.domain} · {range}
            {stamp ? <Text span c="dimmed" fw={400}> · {stamp}</Text> : null}
          </Text>
          <div className={classes.statRow}>
            <Stat label="Visitors" value={site.visitors} pct={site.visitorsChangePct} />
            <Stat label="Pageviews" value={site.pageviews} pct={site.pageviewsChangePct} />
            <Stat label="Sessions" value={site.sessions} pct={site.sessionsChangePct} />
            <Stat label="Bounce" value={`${site.bounceRate}%`} pct={site.bounceRateChangePct} />
            <Stat label="Online now" value={site.live} pct={null} />
          </div>
          {(site.topPages.length > 0 ||
            site.topReferrers.length > 0 ||
            site.countries.length > 0 ||
            site.devices.length > 0) && (
            <div className={classes.breakdowns}>
              <TopRows label="Top pages" rows={site.topPages} />
              <TopRows label="Top referrers" rows={site.topReferrers} />
              <TopRows label="Countries" rows={site.countries} />
              <TopRows label="Devices" rows={site.devices} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
