import { useId, useState } from "react";
import classes from "./credentialField.module.css";

export function CredentialField({
  label,
  value,
  onChange,
  placeholder,
  secret = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  secret?: boolean;
}) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);

  return (
    <div className={classes.field}>
      <label htmlFor={id} className={classes.label}>
        {label}
      </label>
      <div className={classes.control}>
        <input
          id={id}
          className={classes.input}
          data-secret={secret || undefined}
          type={secret && !revealed ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          placeholder={placeholder}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        {secret && value && (
          <button
            type="button"
            className={classes.reveal}
            onClick={() => setRevealed((v) => !v)}
            aria-pressed={revealed}
          >
            {revealed ? "Hide" : "Show"}
          </button>
        )}
      </div>
    </div>
  );
}
