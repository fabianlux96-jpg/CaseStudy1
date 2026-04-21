import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE = {
  width: 595.28,
  height: 841.89,
  marginLeft: 56,
  marginRight: 56,
  marginTop: 56,
  marginBottom: 56
};

function normalizeHeading(line = "") {
  return line
    .toLowerCase()
    .replace(/^[\d.\-\s]+/, "")
    .replace(":", "")
    .trim();
}

function extractSections(draft) {
  const lines = draft
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const sectionMap = {
    sachverhalt: [],
    "rechtliche wurdigung": [],
    forderung: []
  };

  let currentSection = "";

  for (const line of lines) {
    const heading = normalizeHeading(line);

    if (heading.includes("sachverhalt")) {
      currentSection = "sachverhalt";
      continue;
    }

    if (heading.includes("rechtliche")) {
      currentSection = "rechtliche wurdigung";
      continue;
    }

    if (heading.includes("forderung")) {
      currentSection = "forderung";
      continue;
    }

    if (currentSection) {
      sectionMap[currentSection].push(line);
    }
  }

  return {
    sachverhalt: sectionMap.sachverhalt.join("\n\n") || draft,
    rechtlicheWuerdigung:
      sectionMap["rechtliche wurdigung"].join("\n\n") ||
      "Die rechtliche Wurdigung ergibt sich aus dem oben dargestellten Sachverhalt.",
    forderung:
      sectionMap.forderung.join("\n\n") ||
      "Wir fordern Sie auf, die berechtigten Anspruche unverzuglich zu erfullen."
  };
}

function splitParagraphs(value = "") {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function wrapText(text, font, fontSize, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
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

function drawSectionHeading(state, text, options) {
  ensurePage(state, 24);
  drawLine(state.page, text, PAGE.marginLeft, state.cursorY, options);
  state.cursorY -= 18;
}

async function createPdf(caseData, draft) {
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

  const boldOptions = {
    font: timesBold,
    size: 12,
    lineHeight: 17
  };

  const today = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date());

  const sections = extractSections(draft);
  const subject = `Forderungsschreiben in Sachen ${caseData.client_name}`;
  const recipientLines = [
    caseData.opponent,
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

  drawWrappedParagraph(state, "Sehr geehrte Damen und Herren,", bodyOptions);
  drawWrappedParagraph(
    state,
    `wir zeigen an, dass wir die rechtlichen Interessen von ${caseData.client_name} vertreten. Bezugnehmend auf den nachstehenden Sachverhalt nehmen wir wie folgt Stellung.`,
    bodyOptions
  );

  drawSectionHeading(state, "Sachverhalt", boldOptions);
  for (const paragraph of splitParagraphs(sections.sachverhalt)) {
    drawWrappedParagraph(state, paragraph, bodyOptions);
  }

  drawSectionHeading(state, "Rechtliche Wurdigung", boldOptions);
  for (const paragraph of splitParagraphs(sections.rechtlicheWuerdigung)) {
    drawWrappedParagraph(state, paragraph, bodyOptions);
  }

  drawSectionHeading(state, "Forderung", boldOptions);
  for (const paragraph of splitParagraphs(sections.forderung)) {
    drawWrappedParagraph(state, paragraph, bodyOptions);
  }

  drawWrappedParagraph(
    state,
    "Wir bitten um schriftliche Bestatigung und Erfullung der vorstehenden Forderung innerhalb angemessener Frist.",
    bodyOptions
  );

  state.cursorY -= 12;
  drawWrappedParagraph(state, "Mit freundlichen Grussen", bodyOptions);
  drawWrappedParagraph(state, "Kanzlei Legalhero", boldOptions);

  return pdf.save();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { caseData, draft } = req.body || {};

  if (!caseData || !draft) {
    return res.status(400).json({ error: "Falldaten und Entwurf sind erforderlich." });
  }

  try {
    const pdfBytes = await createPdf(caseData, draft);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="forderungsschreiben.pdf"');
    return res.status(200).send(Buffer.from(pdfBytes));
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Beim Erstellen des PDFs ist ein Fehler aufgetreten."
    });
  }
}
