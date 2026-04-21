import { useMemo, useState } from "react";

const LANGUAGE_OPTIONS = [
  { value: "de", label: "Deutsch" },
  { value: "en", label: "English" }
];

const DOCUMENT_TYPE_OPTIONS = {
  de: [
    { value: "demand_letter", label: "Forderungsschreiben" },
    { value: "reminder_letter", label: "Mahnschreiben an die Gegenseite" }
  ],
  en: [
    { value: "demand_letter", label: "Demand Letter" },
    { value: "reminder_letter", label: "Reminder Letter to Opposing Party" }
  ]
};

const CASE_DATA = {
  de: {
    client_name: "Max Mustermann",
    matter_start_date: "25.03.2026",
    case_type: "Kündigungsschutzstreit im Arbeitsrecht",
    opponent: "ABC GmbH",
    facts:
      "Der Mandant war seit fünf Jahren als Projektmanager bei der ABC GmbH beschäftigt. Mit Schreiben vom 12. März 2026 wurde ihm fristlos gekündigt. Eine vorherige Abmahnung erfolgte nicht. Der Mandant bestreitet die vorgeworfenen Pflichtverletzungen und hält die Kündigung für unwirksam.",
    goal: "Weiterbeschäftigung oder angemessene Abfindung"
  },
  en: {
    client_name: "Max Mustermann",
    matter_start_date: "25.03.2026",
    case_type: "Employment dismissal dispute",
    opponent: "ABC GmbH",
    facts:
      "The client had been employed as a project manager at ABC GmbH for five years. By letter dated March 12, 2026, his employment was terminated without notice. No prior warning had been issued. The client disputes the alleged misconduct and considers the termination invalid.",
    goal: "Continued employment or adequate compensation"
  }
};

const COPY = {
  de: {
    eyebrow: "Legalhero Prototype",
    title: "One-Click Drafting",
    hero:
      "Aus strukturierten Falldaten entsteht mit einem Klick ein nahezu fertiges juristisches Schreiben, das direkt bearbeitet und als PDF exportiert werden kann.",
    languageLabel: "Sprache",
    documentTypeLabel: "Dokumenttyp",
    generateIdle: "Entwurf erstellen",
    generateLoading: "Entwurf wird erstellt...",
    overviewTitle: "Fallübersicht",
    overviewSubtitle: "Strukturierte Falldaten aus dem Mandat",
    draftTitle: "Generierter Entwurf",
    draftSubtitle: "Editierbarer Entwurf für die weitere juristische Bearbeitung",
    downloadIdle: "Als PDF herunterladen",
    downloadLoading: "PDF wird erstellt...",
    textareaPlaceholder: "Der generierte Entwurf erscheint hier...",
    missingDraftError: "Bitte zuerst einen Entwurf generieren.",
    invalidJsonError: "Der Server hat keine gültige JSON-Antwort zurückgegeben.",
    generateError: "Entwurf konnte nicht generiert werden.",
    pdfError: "PDF konnte nicht erstellt werden.",
    fields: {
      client_name: "Mandant",
      matter_start_date: "Mandatsbeginn",
      case_type: "Rechtsgebiet",
      opponent: "Gegner",
      facts: "Sachverhalt",
      goal: "Ziel"
    },
    fileNames: {
      demand_letter: "forderungsschreiben.pdf",
      reminder_letter: "mahnschreiben.pdf"
    }
  },
  en: {
    eyebrow: "Legalhero Prototype",
    title: "One-Click Drafting",
    hero:
      "Structured case data becomes a near-complete legal draft in one click, ready to edit and export as a PDF.",
    languageLabel: "Language",
    documentTypeLabel: "Document Type",
    generateIdle: "Generate Draft",
    generateLoading: "Generating Draft...",
    overviewTitle: "Case Overview",
    overviewSubtitle: "Structured case data from the matter",
    draftTitle: "Generated Draft",
    draftSubtitle: "Editable draft for further legal review",
    downloadIdle: "Download as PDF",
    downloadLoading: "Creating PDF...",
    textareaPlaceholder: "The generated draft will appear here...",
    missingDraftError: "Please generate a draft first.",
    invalidJsonError: "The server returned an invalid JSON response.",
    generateError: "The draft could not be generated.",
    pdfError: "The PDF could not be created.",
    fields: {
      client_name: "Client",
      matter_start_date: "Matter Start Date",
      case_type: "Practice Area",
      opponent: "Opponent",
      facts: "Facts",
      goal: "Goal"
    },
    fileNames: {
      demand_letter: "demand-letter.pdf",
      reminder_letter: "reminder-letter.pdf"
    }
  }
};

const CASE_FIELD_ORDER = [
  "client_name",
  "matter_start_date",
  "case_type",
  "opponent",
  "facts",
  "goal"
];

export default function Home() {
  const [language, setLanguage] = useState("de");
  const [documentType, setDocumentType] = useState("demand_letter");
  const [draft, setDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");

  const copy = COPY[language];
  const caseData = CASE_DATA[language];
  const documentTypeOptions = DOCUMENT_TYPE_OPTIONS[language];
  const hasDraft = useMemo(() => draft.trim().length > 0, [draft]);

  async function parseApiResponse(response) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return response.json();
    }

    const text = await response.text();
    const cleaned = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return {
      error: cleaned || copy.invalidJsonError
    };
  }

  function handleLanguageChange(nextLanguage) {
    setLanguage(nextLanguage);
    setDraft("");
    setError("");
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
          language,
          documentType,
          caseData
        })
      });

      const data = await parseApiResponse(response);

      if (!response.ok) {
        throw new Error(data.error || copy.generateError);
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
      setError(copy.missingDraftError);
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
          language,
          documentType,
          caseData,
          draft
        })
      });

      if (!response.ok) {
        const data = await parseApiResponse(response);
        throw new Error(data.error || copy.pdfError);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = copy.fileNames[documentType];
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
        <div className="hero-header">
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
            <p className="hero-copy">{copy.hero}</p>
          </div>

          <label className="field field-compact language-field">
            <span>{copy.languageLabel}</span>
            <select
              value={language}
              onChange={(event) => handleLanguageChange(event.target.value)}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="control-bar">
          <label className="field">
            <span>{copy.documentTypeLabel}</span>
            <select
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
            >
              {documentTypeOptions.map((type) => (
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
            <span>{isGenerating ? copy.generateLoading : copy.generateIdle}</span>
            {isGenerating ? <span className="button-spinner" aria-hidden="true" /> : null}
          </button>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>{copy.overviewTitle}</h2>
            <p>{copy.overviewSubtitle}</p>
          </div>

          <dl className="case-list">
            {CASE_FIELD_ORDER.map((field) => (
              <div key={field}>
                <dt>{copy.fields[field]}</dt>
                <dd>{caseData[field]}</dd>
              </div>
            ))}
          </dl>
        </article>

        <article className="panel">
          <div className="panel-header draft-header">
            <div>
              <h2>{copy.draftTitle}</h2>
              <p>{copy.draftSubtitle}</p>
            </div>

            <button
              className="secondary-button"
              onClick={handleDownloadPdf}
              disabled={isDownloading || !hasDraft}
            >
              {isDownloading ? copy.downloadLoading : copy.downloadIdle}
            </button>
          </div>

          <textarea
            className="draft-textarea"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={copy.textareaPlaceholder}
          />

          {error ? <p className="error-message">{error}</p> : null}
        </article>
      </section>
    </main>
  );
}
