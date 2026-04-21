import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE = {
  width: 595.28,
  height: 841.89,
  marginLeft: 56,
  marginRight: 56,
  marginTop: 56,
  marginBottom: 56
};

function sanitizePdfText(value = "") {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, "-")
    .replace(/[\u2018\u2019\u201a]/g, "'")
    .replace(/[\u201c\u201d\u201e]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "-")
    .replace(/\u200b/g, "");
}

function wrapText(text, font, fontSize, maxWidth) {
  const words = sanitizePdfText(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(nextLine, fontSize);

    if (width <= maxWidth) {
      currentLine = nextLine;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = word;
      continue;
    }

    lines.push(word);
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length ? lines : [""];
}

function drawLine(page, text, x, y, options) {
  page.drawText(text, {
    x,
    y,
    size: options.size,
    font: options.font,
    color: options.color || rgb(0.1, 0.1, 0.1)
  });
}

function ensurePage(state, requiredHeight = 20) {
  if (state.cursorY - requiredHeight >= PAGE.marginBottom) {
    return;
  }

  state.page = state.pdf.addPage([PAGE.width, PAGE.height]);
  state.cursorY = PAGE.height - PAGE.marginTop;
}

function drawWrappedParagraph(state, text, options = {}) {
  const size = options.size || 12;
  const lineHeight = options.lineHeight || size * 1.45;
  const x = options.x || PAGE.marginLeft;
  const width = options.width || PAGE.width - PAGE.marginLeft - PAGE.marginRight;
  const lines = wrapText(text, options.font, size, width);

  for (const line of lines) {
    ensurePage(state, lineHeight);
    drawLine(state.page, line, x, state.cursorY, options);
    state.cursorY -= lineHeight;
  }

  state.cursorY -= options.afterSpacing || 6;
}

function drawDraftVerbatim(state, draft, options = {}) {
  const size = options.size || 12;
  const lineHeight = options.lineHeight || size * 1.45;
  const width = options.width || PAGE.width - PAGE.marginLeft - PAGE.marginRight;
  const lines = sanitizePdfText(draft).split("\n");

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r/g, "");

    if (!line.trim()) {
      ensurePage(state, lineHeight);
      state.cursorY -= lineHeight;
      continue;
    }

    const wrappedLines = wrapText(line, options.font, size, width);

    for (const wrappedLine of wrappedLines) {
      ensurePage(state, lineHeight);
      drawLine(state.page, wrappedLine, PAGE.marginLeft, state.cursorY, options);
      state.cursorY -= lineHeight;
    }
  }
}

function getDocumentSubject(documentType, clientName) {
  if (documentType === "Mahnschreiben an die Gegenseite") {
    return `Mahnschreiben in Sachen ${clientName}`;
  }

  return `Forderungsschreiben in Sachen ${clientName}`;
}

function getDownloadFilename(documentType) {
  if (documentType === "Mahnschreiben an die Gegenseite") {
    return "mahnschreiben.pdf";
  }

  return "forderungsschreiben.pdf";
}

async function createPdf(caseData, draft, documentType) {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([PAGE.width, PAGE.height]);

  const timesRoman = await pdf.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdf.embedFont(StandardFonts.TimesRomanBold);

  const state = {
    pdf,
    page,
    cursorY: PAGE.height - PAGE.marginTop
  };

  const bodyOptions = {
    font: timesRoman,
    size: 12,
    lineHeight: 17
  };

  const today = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date());

  const safeCaseData = {
    client_name: sanitizePdfText(caseData.client_name),
    opponent: sanitizePdfText(caseData.opponent)
  };
  const subject = getDocumentSubject(documentType, safeCaseData.client_name);
  const recipientLines = [
    safeCaseData.opponent,
    "z. Hd. Rechtsabteilung",
    "Musterweg 5",
    "10117 Berlin"
  ];

  const headerLines = [
    "Kanzlei Legalhero",
    "Musterstrasse 12",
    "10115 Berlin",
    "kontakt@legalhero.de"
  ];

  const rightColumnX = 360;
  for (const [index, line] of headerLines.entries()) {
    drawLine(state.page, line, rightColumnX, state.cursorY - index * 15, {
      font: index === 0 ? timesBold : timesRoman,
      size: index === 0 ? 13 : 11
    });
  }

  state.cursorY -= 84;

  for (const [index, line] of recipientLines.entries()) {
    drawLine(state.page, line, PAGE.marginLeft, state.cursorY - index * 15, {
      font: timesRoman,
      size: 11
    });
  }

  drawLine(state.page, `Berlin, den ${today}`, rightColumnX, state.cursorY, {
    font: timesRoman,
    size: 11
  });

  state.cursorY -= 88;

  drawLine(state.page, subject, PAGE.marginLeft, state.cursorY, {
    font: timesBold,
    size: 12
  });

  const subjectWidth = timesBold.widthOfTextAtSize(subject, 12);
  state.page.drawLine({
    start: { x: PAGE.marginLeft, y: state.cursorY - 2 },
    end: { x: PAGE.marginLeft + subjectWidth, y: state.cursorY - 2 },
    thickness: 1,
    color: rgb(0.1, 0.1, 0.1)
  });

  state.cursorY -= 32;

  drawDraftVerbatim(state, draft, bodyOptions);

  return pdf.save();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { caseData, draft, documentType } = req.body || {};

  if (!caseData || !draft || !documentType) {
    return res
      .status(400)
      .json({ error: "Falldaten, Dokumenttyp und Entwurf sind erforderlich." });
  }

  try {
    const pdfBytes = await createPdf(caseData, draft, documentType);
    const filename = getDownloadFilename(documentType);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(Buffer.from(pdfBytes));
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Beim Erstellen des PDFs ist ein Fehler aufgetreten."
    });
  }
}
