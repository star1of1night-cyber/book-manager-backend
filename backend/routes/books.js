// ============================================
// مسارات API الخاصة بالكتب
// ============================================
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const Book = require("../models/Book");
const { extractTextFromImage } = require("../config/ocrService");
const { createPdfFromImages } = require("../config/pdfService");

// إعداد رفع الصور مؤقتًا على القرص
const upload = multer({
  dest: path.join(__dirname, "..", "uploads", "temp"),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB لكل صورة
});

const PDFS_DIR = path.join(__dirname, "..", "uploads", "pdfs");
if (!fs.existsSync(PDFS_DIR)) fs.mkdirSync(PDFS_DIR, { recursive: true });

// -------------------------------------------
// POST /api/books/upload
// رفع مجموعة صور لكتاب واحد -> OCR -> PDF -> حفظ في القاعدة
// -------------------------------------------
router.post("/upload", upload.array("pages", 100), async (req, res) => {
  try {
    const { userId, title, subject, grade } = req.body;
    const files = req.files;

    if (!userId) {
      return res.status(400).json({ error: "معرّف المستخدم (userId) مطلوب" });
    }
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "يجب رفع صورة واحدة على الأقل" });
    }

    // ترتيب الصفحات كما رفعها المستخدم
    const imagePaths = files.map((f) => f.path);

    // 1) استخراج النص من كل صورة عبر OCR
    let fullText = "";
    for (const imgPath of imagePaths) {
      try {
        const pageText = await extractTextFromImage(imgPath);
        fullText += pageText + "\n\n";
      } catch (ocrErr) {
        // نكمل حتى لو صفحة واحدة فشلت، ونسجل الخطأ
        console.error("خطأ OCR لصفحة:", ocrErr.message);
        fullText += "[تعذّرت قراءة هذه الصفحة]\n\n";
      }
    }

    // 2) تحويل الصور إلى ملف PDF واحد
    const pdfFileName = `${uuidv4()}.pdf`;
    const pdfFullPath = path.join(PDFS_DIR, pdfFileName);
    await createPdfFromImages(imagePaths, pdfFullPath);

    // 3) حفظ سجل الكتاب في قاعدة البيانات
    const book = await Book.create({
      userId,
      title: title || "كتاب بدون عنوان",
      subject: subject || "غير مصنف",
      grade: grade || "",
      pdfPath: `/uploads/pdfs/${pdfFileName}`,
      extractedText: fullText.trim(),
      pageCount: files.length,
      coverImage: "", // يمكن تطويره لاحقًا لحفظ مصغّرة الغلاف
    });

    // 4) تنظيف الصور المؤقتة
    imagePaths.forEach((p) => fs.unlink(p, () => {}));

    res.status(201).json({ message: "تم رفع الكتاب وتحليله بنجاح", book });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "فشل رفع الكتاب: " + err.message });
  }
});

// -------------------------------------------
// GET /api/books?userId=xxx&search=&subject=
// عرض كتب المستخدم مع فلترة اختيارية
// -------------------------------------------
router.get("/", async (req, res) => {
  try {
    const { userId, search, subject } = req.query;
    if (!userId) return res.status(400).json({ error: "userId مطلوب" });

    const query = { userId };
    if (subject) query.subject = subject;
    if (search) query.$text = { $search: search };

    const books = await Book.find(query).sort({ createdAt: -1 });
    res.json({ books });
  } catch (err) {
    res.status(500).json({ error: "فشل جلب الكتب: " + err.message });
  }
});

// -------------------------------------------
// GET /api/books/:id
// -------------------------------------------
router.get("/:id", async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: "الكتاب غير موجود" });
    res.json({ book });
  } catch (err) {
    res.status(500).json({ error: "خطأ: " + err.message });
  }
});

// -------------------------------------------
// DELETE /api/books/:id
// -------------------------------------------
router.delete("/:id", async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ error: "الكتاب غير موجود" });

    // حذف ملف PDF من القرص أيضًا
    const filePath = path.join(__dirname, "..", book.pdfPath);
    fs.unlink(filePath, () => {});

    res.json({ message: "تم حذف الكتاب بنجاح" });
  } catch (err) {
    res.status(500).json({ error: "فشل الحذف: " + err.message });
  }
});

module.exports = router;
