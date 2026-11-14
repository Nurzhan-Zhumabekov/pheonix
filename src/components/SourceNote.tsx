export function SourceNote({ quote, verified }: { quote: string; verified: boolean }) {
  return (
    <details className="source">
      <summary>
        Source in your document
        {!verified && <span className="chip chip-warn">not found, check the original</span>}
      </summary>
      <blockquote>{quote}</blockquote>
    </details>
  );
}
