"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Lock } from "lucide-react";

const STORAGE_KEY = "goa-match-auth";

export function PasswordGate({ children }: { children: ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setAuthed(localStorage.getItem(STORAGE_KEY) === "true");
    setChecked(true);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const expected = process.env.NEXT_PUBLIC_MATCH_PASSWORD;
    if (expected && input === expected) {
      localStorage.setItem(STORAGE_KEY, "true");
      setAuthed(true);
    } else {
      setError(true);
    }
  };

  // Avoid a flash of the gate before localStorage has been checked.
  if (!checked) return null;

  if (authed) return <>{children}</>;

  return (
    <main className="goa-root goa-bg">
      <header className="goa-header">
        <div className="goa-crown">
          <Lock size={28} />
        </div>
        <h1 className="goa-title">Restricted</h1>
        <p className="goa-subtitle">Guards of Atlantis II</p>
      </header>

      <form className="goa-password-gate" onSubmit={handleSubmit}>
        <p className="goa-password-gate-note">
          Enter the password to record a battle.
        </p>
        <input
          type="password"
          className="goa-search"
          placeholder="Password"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError(false);
          }}
          autoFocus
        />
        {error && (
          <p className="goa-password-gate-error">Incorrect password</p>
        )}
        <button type="submit" className="goa-password-gate-btn">
          Unlock
        </button>
      </form>
    </main>
  );
}
