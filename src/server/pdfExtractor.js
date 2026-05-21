const fs = require("fs");
const { createCanvas } = require("canvas");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
const Tesseract = require("tesseract.js");
const sharp = require("sharp");

// 1. PDF → IMAGE
async function pdfToImage(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));

  const pdf = await pdfjsLib.getDocument({ data }).promise;

  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 4 });

  const canvas = createCanvas(viewport.width, viewport.height);

  const context = canvas.getContext("2d");

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  const buffer = canvas.toBuffer("image/png");

  const processed = await sharp(buffer)
    .grayscale()
    .normalize()
    .sharpen()
    .threshold(150)
    .toBuffer();

  return processed;
}

// 2. OCR USING TESSERACT
async function extractTextFromImage(imageBuffer) {
  const result = await Tesseract.recognize(imageBuffer, "eng", {
    logger: (m) => console.log(m),
    tessedit_pageseg_mode: 6,
    tessedit_char_whitelist:
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@.-:/ ",
  });
  return result.data.text;
}

// 3. NORMALIZE TEXT
function normalizeText(text) {
  return text.replace(/\s+/g, " ").replace(/\n/g, " ").trim();
}

// 4. EXTRACT FIELDS
function extractFields(text) {
  const fields = {};

  // OCR cleanup
  const cleanedText = text
    .replace(/\r/g, "")
    .replace(/[|[\]{}]/g, " ")
    .replace(/\s+/g, " ");

  console.log("CLEANED:", cleanedText);

  // =========================
  // EMAIL
  // =========================

  let emailText = cleanedText
    .replace(/aail/gi, "@gmail")
    .replace(/ail dow/gi, ".com")
    .replace(/gmaileom/gi, "gmail.com")
    .replace(/gmailcom/gi, "gmail.com");

  const emailMatch = emailText.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/
  );

  if (emailMatch) {
    fields.email = emailMatch[0];
  }

  // =========================
  // PAN NUMBER
  // =========================

  const panMatch = cleanedText.match(
    /\b[A-Z]{5}[0-9]{4}[A-Z]\b/
  );

  if (panMatch) {
    fields.pan_number = panMatch[0];
  }

  // =========================
  // DOB
  // =========================

  const dobMatch = cleanedText.match(
    /\b\d{2}[\/-]\d{2}[\/-]\d{4}\b/
  );

  if (dobMatch) {
    fields.dob = dobMatch[0];
  } else {
    // OCR broken DOB recovery
    const brokenDob = cleanedText.match(
      /(\d{2}).?(\d{2}).?(\d{4})/
    );

    if (brokenDob) {
      fields.dob =
        `${brokenDob[1]}/${brokenDob[2]}/${brokenDob[3]}`;
    }
  }

  // =========================
  // NAME EXTRACTION
  // =========================

  const nameMatch = cleanedText.match(
    /FistName\s+([A-Za-z ]{2,30})/i
  );

  if (nameMatch) {
    let name = nameMatch[1]
      .replace(/Middle Name/gi, "")
      .replace(/LastName/gi, "")
      .replace(/[^A-Za-z ]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // remove OCR junk
    const junkWords = [
      "rrrr",
      "PPP",
      "JJ",
      "Name",
      "Middle",
    ];

    junkWords.forEach((word) => {
      name = name.replace(
        new RegExp(word, "gi"),
        ""
      );
    });

    name = name.trim();

    if (name.length > 2 && name.length < 30) {
      fields.name = name;
    }
  }

  return fields;
}

// 5. CLEAN FIELD NAMES
function normalizeKey(key) {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

// 6. MAIN PIPELINE
async function parsePdf(filePath) {
  // PDF → IMAGE
  const imageBuffer = await pdfToImage(filePath);

  // IMAGE → OCR TEXT
  const rawText = await extractTextFromImage(imageBuffer);

  // CLEAN TEXT
  const normalizedText = normalizeText(rawText);

  // TEXT → FIELDS
  const extractedFields = extractFields(normalizedText);

  return {
    rawText,
    extractedFields,
  };
}

module.exports = {
  parsePdf,
};
