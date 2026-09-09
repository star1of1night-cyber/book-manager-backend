// ============================================
// نموذج بيانات "الكتاب" داخل قاعدة البيانات
// ============================================
const mongoose = require("mongoose");

const BookSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      default: "غير مصنف",
      trim: true,
    },
    grade: {
      type: String,
      default: "",
    },
    pdfPath: {
      type: String,
      required: true,
    },
    extractedText: {
      type: String,
      default: "",
    },
    pageCount: {
      type: Number,
      default: 0,
    },
    coverImage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

BookSchema.index({ title: "text", extractedText: "text", subject: "text" });

module.exports = mongoose.model("Book", BookSchema);
