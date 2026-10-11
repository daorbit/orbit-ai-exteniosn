import type { ReactNode } from "react";
import classes from "./stepTile.module.css";

export function StepTile({
  step,
  title,
  body,
  children,
}: {
  step?: number;
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <section className={classes.tile}>
      {step !== undefined && <span className={classes.step}>Step {step}</span>}
      <h2 className={classes.title}>{title}</h2>
      {body && <p className={classes.body}>{body}</p>}
      {children && <div className={classes.content}>{children}</div>}
    </section>
  );
}
