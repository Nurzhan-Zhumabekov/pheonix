"use client";

import { useEffect, useState } from "react";

type Result = { text: string; characters: number; words: number };

const STORAGE_KEY = "template:last-result";
const EXAMPLE = "Replace this example flow with your product's main scenario.";

/**
 * Guest-mode example: input, server call, loading and error states,
 * and the last result kept on this device only (localStorage).
 */
export function TryFlow() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setResult(JSON.parse(saved) as Result);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  async function submit(text: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/example", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setResult(data as Result);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit(input);
        }}
      >
        <label htmlFor="input">Your input</label>
        <textarea
          id="input"
          rows={4}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type or paste something"
        />
        <div className="actions">
          <button type="submit" className="button" disabled={loading}>
            {loading ? "Working..." : "Run"}
          </button>
          <button
            type="button"
            className="button button-outline"
            disabled={loading}
            onClick={() => {
              setInput(EXAMPLE);
              void submit(EXAMPLE);
            }}
          >
            Try with an example
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      {result && (
        <div className="result" aria-live="polite">
          <h3>Result</h3>
          <p>{result.text}</p>
          <p className="muted">
            {result.words} words, {result.characters} characters
          </p>
        </div>
      )}
    </div>
  );
}
