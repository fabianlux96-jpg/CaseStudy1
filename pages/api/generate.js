import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function buildSharedContext(caseData, language) {
  if (language === "en") {
    return `Client: ${caseData.client_name}
Matter Start Date: ${caseData.matter_start_date}
Opponent: ${caseData.opponent}
Facts: ${caseData.facts}
Goal: ${caseData.goal}
Practice Area: ${caseData.case_type}`;
  }

  return `Mandant: ${caseData.client_name}
Mandatsbeginn: ${caseData.matter_start_date}
Gegner: ${caseData.opponent}
Sachverhalt: ${caseData.facts}
Ziel: ${caseData.goal}
Rechtsgebiet: ${caseData.case_type}`;
}

function buildPrompt(caseData, documentType, language) {
  const sharedContext = buildSharedContext(caseData, language);

  if (language === "en") {
    if (documentType === "reminder_letter") {
      return `You are an experienced attorney.

Draft a legally precise reminder letter to the opposing party based on:

${sharedContext}

Structure:
1. Subject line
2. Introduction
3. Summary of the matter to date
4. Reminder and deadline
5. Notice of further legal steps
6. Closing

Use a formal legal style with clear professional pressure.

Respond only with the finished English letter and no prefatory note.`;
    }

    return `You are an experienced attorney.

Draft a legally precise demand letter based on:

${sharedContext}

Structure:
1. Introduction
2. Facts
3. Legal assessment
4. Demand
5. Closing

Use a formal legal style.

Respond only with the finished English letter and no prefatory note.`;
  }

  if (documentType === "reminder_letter") {
    return `Du bist ein erfahrener deutscher Rechtsanwalt.

Erstelle ein juristisch präzises Mahnschreiben an die Gegenseite basierend auf:

${sharedContext}

Struktur:
1. Betreff
2. Einleitung
3. Darstellung des bisherigen Verlaufs
4. Mahnung und Fristsetzung
5. Hinweis auf weitere rechtliche Schritte
6. Schlussformel

Verwende formellen juristischen Stil und formuliere mit klarem Nachdruck.

Antworte ausschließlich mit dem fertigen deutschen Schreiben ohne Vorbemerkung.`;
  }

  return `Du bist ein erfahrener deutscher Rechtsanwalt.

Erstelle ein juristisch präzises Forderungsschreiben basierend auf:

${sharedContext}

Struktur:
1. Einleitung
2. Sachverhalt
3. Rechtliche Würdigung
4. Forderung
5. Schlussformel

Verwende formellen juristischen Stil.

Antworte ausschließlich mit dem fertigen deutschen Schreiben ohne Vorbemerkung.`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res
      .status(500)
      .json({ error: "OPENAI_API_KEY ist nicht gesetzt. Bitte .env.local konfigurieren." });
  }

  const { caseData, documentType, language = "de" } = req.body || {};

  if (!caseData || !documentType) {
    return res.status(400).json({ error: "Falldaten und Dokumenttyp sind erforderlich." });
  }

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5",
      input: buildPrompt(caseData, documentType, language)
    });

    const draft = response.output_text?.trim();

    if (!draft) {
      throw new Error(
        language === "en"
          ? "The API did not return any text."
          : "Die API hat keinen Text zurückgegeben."
      );
    }

    return res.status(200).json({ draft });
  } catch (error) {
    return res.status(500).json({
      error:
        error?.message ||
        (language === "en"
          ? "An error occurred while generating the draft."
          : "Beim Generieren des Entwurfs ist ein Fehler aufgetreten.")
    });
  }
}
