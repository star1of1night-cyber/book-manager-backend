// ============================================
// مسار API: طرح سؤال عن كتاب معيّن
// ============================================
const express = require("express");
const router = express.Router();
const Book = require("../models/Book");
const { askAI } = require("../config/aiService");

// -------------------------------------------
// POST /api/ask
// body: { bookId, question }
// -------------------------------------------
router.post("/", async (req, res) => {
  try {
    const { bookId, question } = req.body;

    if (!bookId || !question) {
      return res.status(400).json({ error: "bookId و question مطلوبان" });
    }

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ error: "الكتاب غير موجود" });

    if (!book.extractedText || book.extractedText.trim().length === 0) {
      return res.status(400).json({
        error: "لا يوجد نص مستخرج من هذا الكتاب بعد. تأكد من نجاح عملية OCR.",
      });
    }

    const answer = await askAI(question, book.extractedText, book.title);
    res.json({ answer, bookTitle: book.title });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "فشل الحصول على إجابة: " + err.message });
  }
});

module.exports = router;
