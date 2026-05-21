require("dotenv").config();

const { parsePdf } = require("./pdfExtractor");

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const Tesseract = require("tesseract.js");
const fs = require("fs");
const path = require("path");
// const fetch = require("node-fetch");
const { createCanvas } = require("canvas");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
// Ensure temp directory exists
const outputDir = path.join(__dirname, "temp");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const app = express();
app.use(cors());

const upload = multer({ dest: "uploads/" });
const { GoogleGenAI } = require("@google/genai");
app.use(express.json({ limit: "50mb" }));

// ==========================
// GEMINI CLIENT
// ==========================

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ==========================
// EXTRACT FORM FIELDS
// ==========================

async function extractFormFields(base64Image) {
  // Read image as base64
  //   const base64Image = fs.readFileSync(imagePath, {
  //     encoding: "base64",
  //   });
  // Gemini request
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    config: {
      responseMimeType: "application/json",
    },

    contents: [
      {
        inlineData: {
          mimeType: "image/png",
          data: base64Image,
        },
      },

      {
        text: `
Analyze this form image carefully.

Extract ALL visible form fields.

Return ONLY valid JSON.

{
  "fields": [
    {
      "id": "",
      "label": "",
      "type": "",
      "value": "",
      "required": false,
      "section": "",
      "validation": "",
      "bbox": {
        "top": 0.0,
        "left": 0.0,
        "width": 0.0,
        "height": 0.0
      }
    }
  ]
}
          `,
      },
    ],
  });
  console.log("RAW GEMINI:", response.text);

  // Clean markdown
  const clean = response.text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(clean);
  } catch (err) {
    console.error("JSON Parse Error:", err);

    return {
      fields: [],
    };
  }
}

// ==========================
// ROUTE
// ==========================
async function pdfToBase64Image(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));

  const pdfDoc = await pdfjsLib.getDocument({
    data,
  }).promise;

  const page = await pdfDoc.getPage(1);

  const viewport = page.getViewport({
    scale: 2.0,
  });

  const canvas = createCanvas(viewport.width, viewport.height);

  const context = canvas.getContext("2d");

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  // PNG BUFFER
  const imageBuffer = canvas.toBuffer("image/png");

  // RETURN BASE64 IMAGE
  return imageBuffer.toString("base64");
}
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const base64Image = await pdfToBase64Image(req.file.path);
    const result = await extractFormFields(base64Image);

    res.json({
      image: base64Image,
      fields: result,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});

// ----------------------------------------  Claude ai

// async function extractScannedPdf(filePath) {
//   const data = new Uint8Array(fs.readFileSync(filePath));
//   const pdf = await pdfjsLib.getDocument({ data }).promise;

//   const page = await pdf.getPage(1);

//   const viewport = page.getViewport({ scale: 2 });

//   const canvas = createCanvas(viewport.width, viewport.height);
//   const ctx = canvas.getContext("2d");

//   await page.render({ canvasContext: ctx, viewport }).promise;

//   const imageBuffer = canvas.toBuffer("image/png");

//   const result = await Tesseract.recognize(imageBuffer, "eng");

//   return result.data.text;
// }

// // Step 1: Render PDF page to base64 image
// async function pdfToBase64Image(pdfPath) {
//   const data = new Uint8Array(fs.readFileSync(pdfPath));
//   const pdfDoc = await pdfjsLib.getDocument({ data }).promise;
//   const page = await pdfDoc.getPage(1);

//   const viewport = page.getViewport({ scale: 2.0 });
//   const canvas = createCanvas(viewport.width, viewport.height);
//   const context = canvas.getContext("2d");

//   await page.render({ canvasContext: context, viewport }).promise;

//   //   return canvas.toBuffer("image/jpeg", { quality: 0.9 }).toString("base64");
//   const imageBuffer = canvas.toBuffer("image/png");

//   const result = await Tesseract.recognize(imageBuffer, "eng");

//   return result.data.text;
// }

// // Step 2: Send image to Claude and extract fields
// async function extractFieldsWithClaude(imageB64) {
//   const prompt = `Extract all filled-in fields from this form image. Return ONLY a valid JSON object where: - keys are the field labels from the form - values are exactly what was written or filled in - skip any empty or blank fields - no explanation, no markdown, just raw JSON,`;
//   const res = await fetch("https://api.anthropic.com/v1/messages", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       //   "x-api-key": process.env,
//       "anthropic-version": "2023-06-01",
//     },
//     body: JSON.stringify({
//       model: "claude-sonnet-4-20250514",
//       max_tokens: 1000,
//       messages: [
//         {
//           role: "user",
//           content: [
//             {
//               type: "image",
//               source: {
//                 type: "base64",
//                 media_type: "image/png",
//                 data: imageB64,
//               },
//             },
//             {
//               type: "text",
//               text: prompt,
//             },
//           ],
//         },
//       ],
//     }),
//   });

//   const data = await res.json();

//   if (!res.ok) {
//     throw new Error(data?.error?.message || "Claude API request failed");
//   }

//   const text = data.content?.find((b) => b.type === "text")?.text || "{}";

//   const clean = text.replace(/```json|```/g, "").trim();

//   return JSON.parse(clean);
// }

// app.use(
//   cors({
//     origin: "http://localhost:5173",
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type"],
//   }),
// );

// app.options(/.*/, cors());

// Upload route

// app.post("/upload", upload.single("file"), async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: "No file uploaded" });
//     }
//     const base64Image = await pdfToBase64Image(req.file.path);
//     async function extractFormFields(imageB64) {
//       const res = await fetch("https://api.anthropic.com/v1/messages", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "x-api-key": process.env,
//           "anthropic-version": "2023-06-01",
//           "anthropic-dangerous-direct-browser-access": "true",
//         },
//         body: JSON.stringify({
//           model: "claude-sonnet-4-20250514",
//           max_tokens: 2000,
//           messages: [
//             {
//               role: "user",
//               content: [
//                 {
//                   type: "image",
//                   source: {
//                     type: "base64",
//                     media_type: "image/jpeg",
//                     data: imageB64,
//                   },
//                 },
//                 {
//                   type: "text",
//                   text: `Analyze this form image carefully. For EVERY input field, checkbox, and fillable area you can see:

//               1. Identify the field label and its current filled value (if any)
//               2. Determine the field type: "text", "tel", "email", "number", "checkbox", or "date"
//               3. Determine a group/section name for organizing related fields
//               4. Estimate the bounding box as normalized fractions (0.0 to 1.0) of the total image dimensions:
//                 - top: distance from top edge
//                 - left: distance from left edge
//                 - width: width of the field
//                 - height: height of the field
//               5. Identify if the field appears to be required (has asterisk or is clearly mandatory)

//               Return ONLY a valid JSON object with this exact structure, no markdown fences:
//               {
//                 "fields": [
//                   {
//                     "id": "unique_snake_case_id",
//                     "label": "Human readable label",
//                     "type": "text|tel|email|number|checkbox|date",
//                     "value": "current filled value or empty string or true/false for checkbox",
//                     "required": true or false,
//                     "section": "section name",
//                     "validation": "mobile|pan|email|date|null",
//                     "bbox": { "top": 0.0, "left": 0.0, "width": 0.0, "height": 0.0 }
//                   }
//                 ]
//               }

//               Be precise with bounding boxes. Scan the entire form top to bottom, left to right. Include ALL visible fields.`,
//                 },
//               ],
//             },
//           ],
//         }),
//       });
//       const data = await res.json();
//       const text = data.content?.find((b) => b.type === "text")?.text || "{}";
//       const clean = text.replace(/```json|```/g, "").trim();
//       console.log("FULL CLAUDE RESPONSE:", JSON.stringify(data, null, 2));
//       return JSON.parse(clean);
//     }
//     const val = await extractFormFields(base64Image);
//     console.log("Extracted fields:", val);

//     console.log("Extracted fields:", JSON.stringify(val, null, 2));

//     // const result = await parsePdf(req.file.path);

//     // res.json(result);
//   } catch (error) {
//     console.error(error);

//     res.status(500).json({
//       error: "PDF processing failed",
//       details: error.message,
//     });
//   } finally {
//     if (req.file?.path && fs.existsSync(req.file.path)) {
//       fs.unlinkSync(req.file.path);
//     }
//   }
// });

// app.post("/upload", upload.single("file"), async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: "No file uploaded" });
//     }

//     const result = await parsePdf(req.file.path);

//     res.json(result);

//     console.log("Processing file:", req.file.path);

//     const base64Image = await pdfToBase64Image(req.file.path);
//     console.log("PDF rendered to image");

//     const extractedFields = await extractFieldsWithClaude(base64Image);
//     console.log("Extracted fields:", extractedFields);

//     res.json(extractedFields);
//   } catch (error) {
//     console.error("Error:", error?.stack ?? error);
//     if (!res.headersSent) {
//       res.status(500).json({
//         error: "Processing failed",
//         details: error?.message ?? "Unknown error",
//       });
//     }
//   } finally {
//     // Always clean up uploaded file
//     try {
//       if (req?.file?.path && fs.existsSync(req.file.path)) {
//         fs.unlinkSync(req.file.path);
//       }
//     } catch (e) {
//       console.error("Cleanup error:", e);
//     }
//   }
// });

// app.listen(5000, () => {
//   console.log("Server running on port 5000");
// });
