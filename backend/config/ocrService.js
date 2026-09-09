// ============================================
// خدمة تحويل الصور إلى نص (OCR)
// تدعم: OCR.space أو Google Vision (حسب الإعداد في .env)
// ============================================
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

async function extractTextFromImage(imagePath) {
  const provider = process.env.OCR_PROVIDER || "ocrspace";

  if (provider === "ocrspace") {
    return extractWithOcrSpace(imagePath);
  } else if (provider === "google") {
    return extractWithGoogleVision(imagePath);
  }

  throw new Error("مزوّد OCR غير معروف. تحقق من قيمة OCR_PROVIDER في .env");
}

// -------- الخيار أ: OCR.space --------
async function extractWithOcrSpace(imagePath) {
  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey || apiKey.includes("ضع_مفتاحك")) {
    throw new Error(
      "لم يتم إعداد مفتاح OCR_SPACE_API_KEY في ملف .env. " +
      "احصل على مفتاح مجاني من https://ocr.space/ocrapi/freekey"
    );
  }

  const form = new FormData();
  form.append("file", fs.createReadStream(imagePath));
  form.append("apikey", apiKey);
  form.append("language", "ara"); // العربية
  form.append("OCREngine", "2"); // محرك أدق يدعم العربية جيدًا
  form.append("scale", "true");
  form.append("isTable", "false");

  const response = await axios.post(
    "https://apipro1.ocr.space/parse/image",
    form,
    { headers: form.getHeaders(), maxBodyLength: Infinity }
  );

  const result = response.data;
  if (result.IsErroredOnProcessing) {
    throw new Error("فشل OCR: " + (result.ErrorMessage || "خطأ غير معروف"));
  }

  const text = result.ParsedResults?.map((r) => r.ParsedText).join("\n") || "";
  return text.trim();
}

// -------- الخيار ب: Google Cloud Vision --------
async function extractWithGoogleVision(imagePath) {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey || apiKey.includes("ضع_مفتاحك")) {
    throw new Error(
      "لم يتم إعداد مفتاح GOOGLE_VISION_API_KEY في ملف .env"
    );
  }

  const imageBase64 = fs.readFileSync(imagePath, { encoding: "base64" });

  const response = await axios.post(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      requests: [
        {
          image: { content: imageBase64 },
          features: [{ type: "TEXT_DETECTION" }],
          imageContext: { languageHints: ["ar", "en"] },
        },
      ],
    }
  );

  const annotations = response.data.responses?.[0]?.textAnnotations;
  return annotations?.[0]?.description?.trim() || "";
}

module.exports = { extractTextFromImage };
