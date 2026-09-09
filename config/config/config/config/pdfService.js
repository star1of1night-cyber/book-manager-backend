// ============================================
// خدمة تحويل مجموعة صور إلى ملف PDF واحد
// ============================================
const PDFDocument = require("pdfkit");
const fs = require("fs");

function createPdfFromImages(imagePaths, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: false });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    try {
      imagePaths.forEach((imgPath) => {
        const img = doc.openImage(imgPath);
        doc.addPage({ size: [img.width, img.height] });
        doc.image(img, 0, 0);
      });
      doc.end();
    } catch (err) {
      reject(err);
      return;
    }

    stream.on("finish", () => resolve(outputPath));
    stream.on("error", reject);
  });
}

module.exports = { createPdfFromImages };
