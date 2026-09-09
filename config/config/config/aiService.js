// ============================================
// خدمة الذكاء الاصطناعي - الإجابة عن أسئلة المستخدم
// تدعم: Google Gemini، DeepSeek، Anthropic Claude، أو OpenAI (حسب الإعداد في .env)
// ============================================
const axios = require("axios");

async function askAI(question, contextText, bookTitle) {
  const provider = process.env.AI_PROVIDER || "gemini";

  // نقتصر على جزء من النص حتى لا يتجاوز الحد المسموح لكل طلب
  const trimmedContext = (contextText || "").slice(0, 12000);

  const systemPrompt =
    `أنت مساعد تعليمي يجيب عن أسئلة الطالب بالاعتماد فقط على محتوى الكتاب المرفق أدناه. ` +
    `إن لم تجد الإجابة داخل النص، وضّح ذلك بصراحة بدل التخمين. أجب بالعربية دائمًا.\n\n` +
    `عنوان الكتاب: ${bookTitle}\n\n--- محتوى الكتاب ---\n${trimmedContext}`;

  if (provider === "anthropic") {
    return askAnthropic(systemPrompt, question);
  } else if (provider === "openai") {
    return askOpenAI(systemPrompt, question);
  } else if (provider === "deepseek") {
    return askDeepSeek(systemPrompt, question);
  } else if (provider === "gemini") {
    return askGemini(systemPrompt, question);
  }

  throw new Error("مزوّد الذكاء الاصطناعي غير معروف. تحقق من AI_PROVIDER في .env");
}

// -------- Google Gemini (طبقة مجانية حقيقية بدون شحن رصيد) --------
async function askGemini(systemPrompt, question) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("ضع_مفتاحك")) {
    throw new Error(
      "لم يتم إعداد مفتاح GEMINI_API_KEY في ملف .env. " +
      "احصل على مفتاح مجاني من https://aistudio.google.com/apikey"
    );
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: question }] }],
    },
    { headers: { "Content-Type": "application/json" } }
  );

  const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
  return text || "لم أتمكن من توليد إجابة.";
}

// -------- DeepSeek (رخيص جدًا، متوافق مع صيغة OpenAI) --------
async function askDeepSeek(systemPrompt, question) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey.includes("ضع_مفتاحك")) {
    throw new Error(
      "لم يتم إعداد مفتاح DEEPSEEK_API_KEY في ملف .env. " +
      "احصل على مفتاح من https://platform.deepseek.com/"
    );
  }

  const response = await axios.post(
    "https://api.deepseek.com/chat/completions",
    {
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.choices?.[0]?.message?.content || "لم أتمكن من توليد إجابة.";
}

// -------- Anthropic Claude --------
async function askAnthropic(systemPrompt, question) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes("ضع_مفتاحك")) {
    throw new Error(
      "لم يتم إعداد مفتاح ANTHROPIC_API_KEY في ملف .env. " +
      "احصل على مفتاح من https://console.anthropic.com/"
    );
  }

  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: question }],
    },
    {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
    }
  );

  const textBlock = response.data.content?.find((b) => b.type === "text");
  return textBlock?.text || "لم أتمكن من توليد إجابة.";
}

// -------- OpenAI --------
async function askOpenAI(systemPrompt, question) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes("ضع_مفتاحك")) {
    throw new Error("لم يتم إعداد مفتاح OPENAI_API_KEY في ملف .env");
  }

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.choices?.[0]?.message?.content || "لم أتمكن من توليد إجابة.";
}

module.exports = { askAI };
