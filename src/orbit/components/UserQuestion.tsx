import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { UnstyledButton } from "@mantine/core";
import { questionParagraphs } from "@/orbit/formatQuestion";
import classes from "./userQuestion.module.css";

export function UserQuestion({ text }: { text: string }) {
  const paragraphs = useMemo(() => questionParagraphs(text), [text]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => setOverflowing(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [paragraphs]);

  const clamped = !expanded;

  return (
    <div className={classes.bubble}>
      <div
        ref={bodyRef}
        className={classes.body}
        data-clamped={clamped || undefined}
        data-fade={(clamped && overflowing) || undefined}
      >
        {paragraphs.map((p, i) => (
          <p key={i} className={classes.paragraph}>
            {p}
          </p>
        ))}
      </div>
      {(overflowing || expanded) && (
        <UnstyledButton className={classes.toggle} onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less" : "Show more"}
        </UnstyledButton>
      )}
    </div>
  );
}
