import { Globe } from "lucide-react";
import classes from "./citationsList.module.css";

type Citation = { url: string; title: string };

function safeLink(url: string): { href: string; host: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return { href: parsed.href, host: parsed.hostname.replace(/^www\./, "") };
  } catch {
    return null;
  }
}

export function CitationsList({ citations }: { citations?: Citation[] }) {
  if (!citations?.length) return null;

  return (
    <div className={classes.list}>
      <Globe size={12} className={classes.icon} />
      {citations.map((c, i) => {
        const link = safeLink(c.url);
        const content = (
          <>
            <span className={classes.index}>{i + 1}</span>
            <span className={classes.title}>{c.title || link?.host || c.url}</span>
          </>
        );

        return link ? (
          <a
            key={`${c.url}-${i}`}
            className={classes.chip}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            title={`${c.title} — ${link.host}`}
          >
            {content}
          </a>
        ) : (
          <span key={`${c.url}-${i}`} className={classes.chip}>
            {content}
          </span>
        );
      })}
    </div>
  );
}
