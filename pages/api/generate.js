import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

  const prompt = `Du bist ein erfahrener deutscher Rechtsanwalt.

Erstelle ein juristisch pr\u00e4zises Forderungsschreiben basierend auf:

Mandant: ${caseData.client_name}
Gegner: ${caseData.opponent}
Sachverhalt: ${caseData.facts}
Ziel: ${caseData.goal}
Rechtsgebiet: ${caseData.case_type}

Struktur:
1. Einleitung
2. Sachverhalt
3. Rechtliche W\u00fcrdigung
4. Forderung
5. Schlussformel

Verwende formellen juristischen Stil.

Dokumenttyp: ${documentType}

Antworte ausschlie\u00dflich mit dem fertigen deutschen Schreiben ohne Vorbemerkung.`;

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5",
      input: prompt
    });

    const draft = response.output_text?.trim();

    if (!draft) {
      throw new Error("Die API hat keinen Text zuruckgegeben.");
    }

    return res.status(200).json({ draft });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Beim Generieren des Entwurfs ist ein Fehler aufgetreten."
    });
  }
}
