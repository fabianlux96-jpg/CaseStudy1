import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function buildPrompt(caseData, documentType) {
  const sharedContext = `Mandant: ${caseData.client_name}
Mandatsbeginn: ${caseData.matter_start_date}
Gegner: ${caseData.opponent}
Sachverhalt: ${caseData.facts}
Ziel: ${caseData.goal}
Rechtsgebiet: ${caseData.case_type}`;

  if (documentType === "Mahnschreiben an die Gegenseite") {
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

  const { caseData, documentType } = req.body || {};

  if (!caseData || !documentType) {
    return res.status(400).json({ error: "Falldaten und Dokumenttyp sind erforderlich." });
  }

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5",
      input: buildPrompt(caseData, documentType)
    });

    const draft = response.output_text?.trim();

    if (!draft) {
      throw new Error("Die API hat keinen Text zurückgegeben.");
    }

    return res.status(200).json({ draft });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Beim Generieren des Entwurfs ist ein Fehler aufgetreten."
    });
  }
}
