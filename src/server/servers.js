require("dotenv").config();
console.log("------>>>>", process.env.HF_TOKEN);
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const Tesseract = require("tesseract.js");

// const { fromPath } = require("pdf2pic");

const path = require("path");

const { createCanvas } = require("canvas");     
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");        

const outputDir = path.join(__dirname, "temp");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
// Normalize pdf-parse import: package may export a function (v1) or a named class (v2).
// const _pdfParseImport = require("pdf-parse");
// Log the import shape to help debug runtime issues.
// try {
//   console.log(
//     "pdf-parse import type:",
//     typeof _pdfParseImport,
//     " keys:",
//     Object.keys(_pdfParseImport || {}),
//   );
// } catch (e) {
//   console.log("pdf-parse import logging failed", e && e.stack ? e.stack : e);
// }

// // Resolve to a constructor/class or function. Priority:
// // 1. named PDFParse export (v2)
// // 2. default export (.default)
// // 3. the import itself (may be a function in v1)
// const PDFParse =
//   _pdfParseImport.PDFParse || _pdfParseImport.default || _pdfParseImport;

// const { InferenceClient } = require("@huggingface/inference");
const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({
  dest: "uploads/",
});

// const client = new InferenceClient(process.env.HF_TOKEN);

if (!process.env.HF_TOKEN) {
  console.warn(
    "Warning: HF_TOKEN is not set. Hugging Face inference calls will fail without a valid token.",
  );
}

// async function extractTextFromScannedPDF(pdfPath) {
//   const outputDir = path.join(__dirname, "temp").replace(/\//g, "\\");
  
//   console.log("PDF path exists?", fs.existsSync(pdfPath), pdfPath);

//   const convert = fromPath(pdfPath, {
//     density: 100,
//     saveFilename: "page",
//     savePath: outputDir,
//     format: "png",
//     width: 1200,
//     height: 1600,
//   });

//   // Convert first page
//   const page = await convert(1);

//   console.log("Converted page:", page);
//   console.log("Image exists?", page?.path && fs.existsSync(page.path));

  
//   console.log("IMAGE PATH:", page.path);

//   // OCR
//   const result = await Tesseract.recognize(page.path, "eng");

//   return result.data.text;
// }

function extractFields(text) {
  const extracted = {};

  // Email
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

  if (email) {
    extracted.email = email[0];
  }

  // Phone
  const phone = text.match(/\b\d{10}\b/);

  if (phone) {
    extracted.phone = phone[0];
  }

  // Salary
  const salary = text.match(/salary[:\s]*₹?\s?([\d,]+)/i);

  if (salary) {
    extracted.salary = salary[1];
  }

  // Employee Name
  const name = text.match(/name[:\s]*([A-Za-z ]+)/i);

  if (name) {
    extracted.name = name[1].trim();
  }

  // Company
  const company = text.match(/company[:\s]*([A-Za-z ]+)/i);

  if (company) {
    extracted.company = company[1].trim();
  }

  return extracted;
}

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    // Read PDF
    // const dataBuffer = fs.readFileSync(req.file.path);

    // Extract text using pdf-parse v2 API
    // const parser = new PDFParse({ data: dataBuffer });
    // const pdfData = await parser.getText();
    // const text = pdfData.text;
    // free parser resources
    const text = await extractTextFromScannedPDF(req.file.path);

    console.log("OCR TEXT:");
    console.log(text);

    console.log("TEXT LENGTH:", text.length);

    console.log("PDF TEXT START:");
    console.log(text.substring(0, 1000));

    const extractedData = extractFields(text);

    console.log(extractedData);

    res.json(extractedData);

    // try {
    //   await parser.destroy();
    // } catch (e) {
    //   console.error(
    //     "Failed to destroy PDF parser:",
    //     e && e.stack ? e.stack : e,
    //   );
    // }

    // AI Prompt
    // const prompt = `
    //   You are a JSON extraction API.

    //   Extract all fields and values
    //   from this document.

    //   Return ONLY valid JSON.

    //   Example:
    //   {
    //     "name": "John",
    //     "salary": "50000"
    //   }

    //   Document:
    //   ${text}
    //   `;

    // // Hugging Face AI Call
    // // Let the InferenceClient resolve the provider/model mapping.
    // // Avoid forcing an explicit provider string which may not map for community models.
    // // const response = await client.textGeneration({
    // //   model: "google/flan-t5-large",
    // //   inputs: prompt,
    // //   messages: [
    // //     {
    // //       role: "user",
    // //       content: prompt,
    // //     },
    // //   ],
    // //   max_tokens: 500,
    // // });

    // const response = await axios.post(
    //   "https://router.huggingface.co/hf-inference/models/gpt2",

    //   {
    //     inputs: prompt,
    //   },

    //   {
    //     headers: {
    //       Authorization: `Bearer ${process.env.HF_TOKEN}`,
    //     },
    //   },
    // );

    // const aiText = response.data[0].generated_text;

    // console.log("AI TEXT:", aiText);
    // // const aiText = response.choices[0].message.content;

    // console.log(aiText);

    // // Clean markdown json
    // const jsonMatch = aiText.match(/\{[\s\S]*\}/);

    // const cleanJson = jsonMatch?.[0];

    // // Send JSON
    // console.log("AI TEXT:", aiText);
    // try {
    //   const parsed = JSON.parse(cleanJson);

    //   res.json(parsed);
    // } catch {
    //   res.json({
    //     rawResponse: aiText,
    //   });
    // }

    // Remove uploaded file after successful processing to avoid disk growth
    try {
      if (req?.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (e) {
      console.error(
        "Failed to remove uploaded file after success:",
        e && e.stack ? e.stack : e,
      );
    }
  } catch (error) {
    // Log full error on the server for diagnosis (stack may contain helpful trace).
    console.error(
      "Upload processing error:",
      error && error.stack ? error.stack : error,
    );

    // If this looks like a provider/client error, try to surface HTTP details to help debug.
    try {
      if (error && error.name) {
        console.error("Error name:", error.name);
      }
      if (error && error.status) {
        console.error("Error status:", error.status);
      }
      // Many provider errors include `cause` or `response` with more info
      if (error && error.cause) {
        console.error("Error cause:", error.cause);
      }
      if (error && error.response) {
        try {
          console.error("Error response status:", error.response.status);
          // response body may be a stream or object
          if (error.response.data)
            console.error("Error response data:", error.response.data);
          if (error.response.body)
            console.error("Error response body:", error.response.body);
        } catch (e) {
          console.error(
            "Failed to log error.response details:",
            e && e.stack ? e.stack : e,
          );
        }
      }
    } catch (e) {
      console.error(
        "Failed to extract provider error details:",
        e && e.stack ? e.stack : e,
      );
    }

    // Attempt to remove uploaded file to avoid filling disk on repeated failures.
    try {
      if (req?.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (e) {
      console.error(
        "Failed to remove uploaded file:",
        e && e.stack ? e.stack : e,
      );
    }

    if (!res.headersSent) {
      res.status(500).json({
        error: "Processing failed",
        details: error?.message ?? "Unknown error",
      });
    }

    // // Prepare a helpful client message with safe guidance.
    // let clientMessage = "AI extraction failed";
    // if (error && error.message) clientMessage = error.message;
    // // Add suggestions for common causes without leaking internals
    // const suggestions = [];
    // suggestions.push(
    //   "Ensure your HF_TOKEN environment variable is set and valid.",
    // );
    // suggestions.push(
    //   "Verify the requested model supports the Hugging Face Inference API or that your account has access.",
    // );
    // suggestions.push(
    //   "Check network connectivity and provider availability (rate limits, outages).",
    // );

    // res.status(500).json({
    //   error: "AI extraction failed",
    //   details: clientMessage,
    //   suggestions,
    // });
  }
});

const server = app.listen(5000, () => {
  console.log("Server running on port 5000");
  try {
    console.log("server.address():", server.address());
  } catch (e) {
    console.error("Failed to read server.address():", e);
  }
});

// Diagnostic handlers to help understand unexpected process termination.
process.on("exit", (code) => {
  console.log("process exit event, code =", code);
});
process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("unhandledRejection at:", promise, "reason:", reason);
});

// Keep a no-op interval in place only during debugging to ensure the event loop remains active
// if something unexpected is closing the server. Remove or disable in production.
if (process.env.DEBUG_KEEP_ALIVE === "true") {
  setInterval(() => {}, 1e6);
}

// Dump active handles and requests after 1s to help debug unexpected exit
setTimeout(() => {
  try {
    if (process._getActiveHandles) {
      const handles = process._getActiveHandles();
      console.log("Active handles count:", handles.length);
      handles.forEach((h, i) => {
        try {
          console.log(
            `handle[${i}] type:`,
            h && h.constructor && h.constructor.name,
          );
        } catch (e) {
          console.log(`handle[${i}] <error reading type>`);
        }
      });
    }
    if (process._getActiveRequests) {
      const reqs = process._getActiveRequests();
      console.log("Active requests count:", reqs.length);
    }
  } catch (e) {
    console.error("Error dumping active handles:", e);
  }
}, 1000);

async function extractTextFromScannedPDF(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdfDoc = await pdfjsLib.getDocument({ data }).promise;
  const page = await pdfDoc.getPage(1);

  // Try native text extraction first (fast)
  const textContent = await page.getTextContent();
  const text = textContent.items.map((i) => i.str).join(" ");

  if (text.trim().length > 50) {
    console.log("Native text extracted, no OCR needed");
    return text;
  }

  // Scanned PDF fallback — render to canvas then OCR
  console.log("Scanned PDF detected, running OCR...");
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d");

  await page.render({ canvasContext: context, viewport }).promise;

  const result = await Tesseract.recognize(canvas.toBuffer("image/png"), "eng");
  return result.data.text;
}
