// ============================================
// نموذج بيانات "الكتاب" داخل قاعدة البيانات
// ============================================
const mongoose = require("mongoose");

const BookSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true, // كل مستخدم يرى كتبه فقط
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      // التصنيف: رياضيات، علوم، لغة عربية...
      type: String,
      default: "غير مصنف",
      trim: true,
    },
    grade: {
      // الصف الدراسي (اختياري)
      type: String,
      default: "",
    },
    pdfPath: {
      // مسار ملف PDF الناتج
      type: String,
      required: true,
    },
    extractedText: {
      // النص المستخرج بواسطة OCR - يُستخدم في البحث والأسئلة
      type: String,
      default: "",
    },
    pageCount: {
      type: Number,
      default: 0,
    },
    coverImage: {
      // مسار صورة الغلاف (أول صفحة)
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// فهرسة نصية للبحث السريع داخل محتوى الكتاب
BookSchema.index({ title: "text", extractedText: "text", subject: "text" });

module.exports = mongoose.model("Book", BookSchema);
