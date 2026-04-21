import { useMemo, useState } from "react";

const CASE_DATA = {
  client_name: "Max Mustermann",
  matter_start_date: "25.03.2026",
  case_type: "Kündigungsschutzstreit im Arbeitsrecht",
  opponent: "ABC GmbH",
  facts:
    "Der Mandant war seit fünf Jahren als Projektmanager bei der ABC GmbH beschäftigt. Mit Schreiben vom 12. März 2026 wurde ihm fristlos gekündigt. Eine vorherige Abmahnung erfolgte nicht. Der Mandant bestreitet die vorgeworfenen Pflichtverletzungen und hält die Kündigung für unwirksam.",
  goal: "Weiterbeschäftigung oder angemessene Abfindung"
};

const DOCUMENT_TYPES = [
  { value: "Forderungsschreiben", label: "Forderungsschreiben" },
  {
    value: "Mahnschreiben an die Gegenseite",
    label: "Mahnschreiben an die Gegenseite"
  }
];

export default function Home() {
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0].value);
  const [draft, setDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");

  const hasDraft = useMemo(() => draft.trim().length > 0, [draft]);

  async function parseApiResponse(response) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return response.json();
    }

    const text = await response.text();
    const cleaned = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return {
      error: cleaned || "Der Server hat keine gültige JSON-Antwort zurückgegeben."
    };
  }

  async function handleGenerateDraft() {
    setIsGenerating(true);
    setError("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          documentType,
          caseData: CASE_DATA
        })
      });

      const data = await parseApiResponse(response);

      if (!response.ok) {
        throw new Error(data.error || "Entwurf konnte nicht generiert werden.");
      }

      setDraft(data.draft);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDownloadPdf() {
    if (!hasDraft) {
      setError("Bitte zuerst einen Entwurf generieren.");
      return;
    }

    setIsDownloading(true);
    setError("");

    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          documentType,
          caseData: CASE_DATA,
          draft
        })
      });

      if (!response.ok) {
        const data = await parseApiResponse(response);
        throw new Error(data.error || "PDF konnte nicht erstellt werden.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        documentType === "Mahnschreiben an die Gegenseite"
          ? "mahnschreiben.pdf"
          : "forderungsschreiben.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Legalhero Prototype</p>
          <h1>One-Click Drafting</h1>
          <p className="hero-copy">
            Aus strukturierten Falldaten entsteht mit einem Klick ein nahezu fertiges
            juristisches Schreiben, das direkt bearbeitet und als PDF exportiert werden
            kann.
          </p>
        </div>

        <div className="control-bar">
          <label className="field">
            <span>Dokumenttyp</span>
            <select
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <button
            className="primary-button"
            onClick={handleGenerateDraft}
            disabled={isGenerating}
          >
            <span>{isGenerating ? "Entwurf wird erstellt..." : "Entwurf erstellen"}</span>
            {isGenerating ? <span className="button-spinner" aria-hidden="true" /> : null}
          </button>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Fallübersicht</h2>
            <p>Strukturierte Falldaten aus dem Mandat</p>
          </div>

          <dl className="case-list">
            <div>
              <dt>Mandant</dt>
              <dd>{CASE_DATA.client_name}</dd>
            </div>
            <div>
              <dt>Mandatsbeginn</dt>
              <dd>{CASE_DATA.matter_start_date}</dd>
            </div>
            <div>
              <dt>Rechtsgebiet</dt>
              <dd>{CASE_DATA.case_type}</dd>
            </div>
            <div>
              <dt>Gegner</dt>
              <dd>{CASE_DATA.opponent}</dd>
            </div>
            <div>
              <dt>Sachverhalt</dt>
              <dd>{CASE_DATA.facts}</dd>
            </div>
            <div>
              <dt>Ziel</dt>
              <dd>{CASE_DATA.goal}</dd>
            </div>
          </dl>
        </article>

        <article className="panel">
          <div className="panel-header draft-header">
            <div>
              <h2>Generierter Entwurf</h2>
              <p>Editierbarer Entwurf für die weitere juristische Bearbeitung</p>
            </div>

            <button
              className="secondary-button"
              onClick={handleDownloadPdf}
              disabled={isDownloading || !hasDraft}
            >
              {isDownloading ? "PDF wird erstellt..." : "Als PDF herunterladen"}
            </button>
          </div>

          <textarea
            className="draft-textarea"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Der generierte Entwurf erscheint hier..."
          />

          {error ? <p className="error-message">{error}</p> : null}
        </article>
      </section>
    </main>
  );
}
