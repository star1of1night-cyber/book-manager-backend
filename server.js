// ============================================
// الملف الرئيسي لتشغيل الخادم
// ============================================
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const connectDB = require("./config/db");
const booksRoutes = require("./routes/books");
const askRoutes = require("./routes/ask");

const app = express();
const PORT = process.env.PORT || 5000;

// إنشاء مجلدات الرفع إن لم تكن موجودة
["uploads/temp", "uploads/pdfs"].forEach((dir) => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// الاتصال بقاعدة البيانات
connectDB();

// المسارات
app.use("/api/books", booksRoutes);
app.use("/api/ask", askRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "الخادم يعمل بنجاح" });
});

app.listen(PORT, () => {
  console.log(`\n🚀 الخادم يعمل على المنفذ ${PORT}`);
  console.log(`   افتح: http://localhost:${PORT}/api/health\n`);
});
