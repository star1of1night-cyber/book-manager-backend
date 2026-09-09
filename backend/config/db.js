// ============================================
// إعداد الاتصال بقاعدة البيانات (MongoDB Atlas)
// ============================================
const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.includes("USERNAME:PASSWORD")) {
    console.warn(
      "\n⚠️  تحذير: لم يتم ضبط رابط قاعدة البيانات (MONGODB_URI) في ملف .env\n" +
      "   التطبيق سيعمل لكن حفظ الكتب لن يعمل حتى تضيف رابط MongoDB Atlas.\n" +
      "   راجع ملف .env.example للتعليمات.\n"
    );
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log("✅ تم الاتصال بقاعدة البيانات بنجاح");
  } catch (err) {
    console.error("❌ فشل الاتصال بقاعدة البيانات:", err.message);
  }
}

module.exports = connectDB;
