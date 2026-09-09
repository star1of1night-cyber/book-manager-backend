// ============================================
// منطق تطبيق "مكتبتي"
// ============================================

// ---------- إعداد عام ----------
const STORAGE_KEYS = {
  API_BASE: "bm_api_base_url",
  USER_ID: "bm_user_id",
};

// معرّف مستخدم ثابت يُنشأ تلقائيًا أول مرة (تطبيق شخصي، بلا تسجيل دخول)
function getUserId() {
  let id = localStorage.getItem(STORAGE_KEYS.USER_ID);
  if (!id) {
    id = "user-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(STORAGE_KEYS.USER_ID, id);
  }
  return id;
}

function getApiBase() {
  return localStorage.getItem(STORAGE_KEYS.API_BASE) || "";
}

function setApiBase(url) {
  localStorage.setItem(STORAGE_KEYS.API_BASE, url.trim().replace(/\/$/, ""));
}

const USER_ID = getUserId();
let selectedFiles = []; // ملفات الصور المختارة بالترتيب

// ---------- أدوات مساعدة للواجهة ----------
function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden", "error");
  if (isError) toast.classList.add("error");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("hidden"), 3500);
}

function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === tabName)
  );
  document.querySelectorAll(".tab-panel").forEach((p) =>
    p.classList.toggle("active", p.id === `tab-${tabName}`)
  );
  if (tabName === "library") loadLibrary();
  if (tabName === "ask") loadBookOptionsForAsk();
}

document.querySelectorAll("[data-tab]").forEach((el) => {
  el.addEventListener("click", () => switchTab(el.dataset.tab));
});

// ---------- التحقق من إعداد الخادم ----------
function checkSetup() {
  const base = getApiBase();
  const banner = document.getElementById("setupBanner");
  const bannerText = document.getElementById("setupBannerText");
  if (!base) {
    bannerText.textContent =
      "⚠️ لم يتم ربط التطبيق بالخادم الخلفي بعد. اذهب للإعدادات وأدخل رابط الخادم بعد نشره.";
    banner.classList.remove("hidden");
    return false;
  }
  banner.classList.add("hidden");
  return true;
}

async function apiFetch(path, options = {}) {
  const base = getApiBase();
  if (!base) {
    throw new Error("لم يتم ضبط رابط الخادم الخلفي بعد. اذهب لتبويب الإعدادات.");
  }
  const res = await fetch(base + path, options);
  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) {
    throw new Error(data.error || `خطأ في الخادم (${res.status})`);
  }
  return data;
}

// ============================================
// تبويب: المكتبة
// ============================================
async function loadLibrary() {
  const grid = document.getElementById("libraryGrid");
  const empty = document.getElementById("libraryEmpty");
  if (!checkSetup()) {
    grid.innerHTML = "";
    empty.classList.add("hidden");
    return;
  }

  const search = document.getElementById("searchInput").value.trim();
  const subject = document.getElementById("subjectFilter").value;

  try {
    const params = new URLSearchParams({ userId: USER_ID });
    if (search) params.set("search", search);
    if (subject) params.set("subject", subject);

    const data = await apiFetch(`/api/books?${params.toString()}`);
    renderLibrary(data.books || []);
    updateSubjectFilter(data.books || []);
  } catch (err) {
    showToast(err.message, true);
    grid.innerHTML = "";
  }
}

function renderLibrary(books) {
  const grid = document.getElementById("libraryGrid");
  const empty = document.getElementById("libraryEmpty");

  if (books.length === 0) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  const base = getApiBase();
  grid.innerHTML = books
    .map(
      (b) => `
    <div class="book-card">
      <div class="book-spine"></div>
      <h3>${escapeHtml(b.title)}</h3>
      <div class="book-meta">
        <span class="badge">${escapeHtml(b.subject || "غير مصنف")}</span>
        ${b.grade ? `<span class="badge">${escapeHtml(b.grade)}</span>` : ""}
        <span class="badge">${b.pageCount || 0} صفحة</span>
      </div>
      <div class="book-actions">
        <a href="${base}${b.pdfPath}" target="_blank" class="action-open">فتح PDF</a>
        <button class="action-ask" onclick="goAskAbout('${b._id}')">اسأل عنه</button>
        <button class="action-delete" onclick="deleteBook('${b._id}')" title="حذف">🗑</button>
      </div>
    </div>
  `
    )
    .join("");
}

function updateSubjectFilter(books) {
  const select = document.getElementById("subjectFilter");
  const current = select.value;
  const subjects = [...new Set(books.map((b) => b.subject).filter(Boolean))];
  select.innerHTML =
    `<option value="">كل المواد</option>` +
    subjects.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  select.value = current;

  // تحديث اقتراحات المواد في نموذج الرفع أيضًا
  const datalist = document.getElementById("subjectSuggestions");
  datalist.innerHTML = subjects.map((s) => `<option value="${escapeHtml(s)}">`).join("");
}

async function deleteBook(id) {
  if (!confirm("هل تريد حذف هذا الكتاب نهائيًا؟")) return;
  try {
    await apiFetch(`/api/books/${id}`, { method: "DELETE" });
    showToast("تم حذف الكتاب");
    loadLibrary();
  } catch (err) {
    showToast(err.message, true);
  }
}

function goAskAbout(bookId) {
  switchTab("ask");
  setTimeout(() => {
    const select = document.getElementById("askBookSelect");
    select.value = bookId;
    select.dispatchEvent(new Event("change"));
  }, 200);
}

document.getElementById("searchInput").addEventListener(
  "input",
  debounce(() => loadLibrary(), 400)
);
document.getElementById("subjectFilter").addEventListener("change", loadLibrary);
document.getElementById("refreshBtn").addEventListener("click", loadLibrary);

// ============================================
// تبويب: إضافة كتاب
// ============================================
const dropzone = document.getElementById("dropzone");
const pagesInput = document.getElementById("pagesInput");
const previewGrid = document.getElementById("previewGrid");

dropzone.addEventListener("click", () => pagesInput.click());

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("drag-over");
});
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag-over"));
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("drag-over");
  addFiles(Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/")));
});

pagesInput.addEventListener("change", (e) => {
  addFiles(Array.from(e.target.files));
  pagesInput.value = "";
});

function addFiles(files) {
  selectedFiles = selectedFiles.concat(files);
  renderPreview();
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderPreview();
}

function renderPreview() {
  previewGrid.innerHTML = "";
  selectedFiles.forEach((file, idx) => {
    const url = URL.createObjectURL(file);
    const div = document.createElement("div");
    div.className = "preview-thumb";
    div.innerHTML = `
      <img src="${url}" alt="صفحة ${idx + 1}" />
      <span class="page-num">${idx + 1}</span>
      <button type="button" class="remove-thumb" onclick="removeFile(${idx})">×</button>
    `;
    previewGrid.appendChild(div);
  });
}

document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!checkSetup()) return;

  const title = document.getElementById("bookTitle").value.trim();
  const subject = document.getElementById("bookSubject").value.trim();
  const grade = document.getElementById("bookGrade").value.trim();

  if (selectedFiles.length === 0) {
    showToast("الرجاء إضافة صورة واحدة على الأقل", true);
    return;
  }

  const progressBox = document.getElementById("uploadProgress");
  const resultBox = document.getElementById("uploadResult");
  const submitBtn = document.getElementById("uploadSubmitBtn");

  resultBox.innerHTML = "";
  progressBox.classList.remove("hidden");
  submitBtn.disabled = true;

  try {
    const formData = new FormData();
    formData.append("userId", USER_ID);
    formData.append("title", title);
    formData.append("subject", subject);
    formData.append("grade", grade);
    selectedFiles.forEach((file) => formData.append("pages", file));

    const data = await apiFetch("/api/books/upload", {
      method: "POST",
      body: formData,
    });

    resultBox.innerHTML = `<div class="result-success">✅ تم إضافة "${escapeHtml(
      data.book.title
    )}" بنجاح (${data.book.pageCount} صفحة). يمكنك مراجعته من تبويب المكتبة.</div>`;
    showToast("تم رفع الكتاب بنجاح");

    // إعادة تعيين النموذج
    document.getElementById("uploadForm").reset();
    selectedFiles = [];
    renderPreview();
  } catch (err) {
    resultBox.innerHTML = `<div class="result-error">❌ ${escapeHtml(err.message)}</div>`;
  } finally {
    progressBox.classList.add("hidden");
    submitBtn.disabled = false;
  }
});

// ============================================
// تبويب: اسأل عن كتاب
// ============================================
let currentAskBook = null;

async function loadBookOptionsForAsk() {
  const select = document.getElementById("askBookSelect");
  if (!checkSetup()) return;

  try {
    const data = await apiFetch(`/api/books?userId=${encodeURIComponent(USER_ID)}`);
    const books = data.books || [];
    const currentVal = select.value;
    select.innerHTML =
      `<option value="">— اختر كتابًا —</option>` +
      books.map((b) => `<option value="${b._id}">${escapeHtml(b.title)}</option>`).join("");
    select.value = currentVal;
  } catch (err) {
    showToast(err.message, true);
  }
}

document.getElementById("askBookSelect").addEventListener("change", (e) => {
  currentAskBook = e.target.value || null;
  const chatWindow = document.getElementById("chatWindow");
  const input = document.getElementById("questionInput");
  const btn = document.getElementById("askSubmitBtn");

  chatWindow.innerHTML = currentAskBook
    ? `<div class="chat-placeholder">اطرح سؤالك عن محتوى هذا الكتاب 📖</div>`
    : `<div class="chat-placeholder">اختر كتابًا ثم اكتب سؤالك بالأسفل ✨</div>`;

  input.disabled = !currentAskBook;
  btn.disabled = !currentAskBook;
});

document.getElementById("askForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("questionInput");
  const question = input.value.trim();
  if (!question || !currentAskBook) return;

  const chatWindow = document.getElementById("chatWindow");
  chatWindow.querySelector(".chat-placeholder")?.remove();

  appendChatMsg(question, "user");
  input.value = "";

  const loadingId = "loading-" + Date.now();
  appendChatMsg("يفكّر…", "bot", loadingId);

  try {
    const data = await apiFetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId: currentAskBook, question }),
    });
    document.getElementById(loadingId).outerHTML = "";
    appendChatMsg(data.answer, "bot");
  } catch (err) {
    document.getElementById(loadingId).outerHTML = "";
    appendChatMsg(err.message, "bot", null, true);
  }
});

function appendChatMsg(text, role, id = null, isError = false) {
  const chatWindow = document.getElementById("chatWindow");
  const div = document.createElement("div");
  div.className = `chat-msg ${role}${isError ? " error" : ""}`;
  if (id) div.id = id;
  div.textContent = text;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// ============================================
// تبويب: الإعدادات
// ============================================
document.getElementById("apiBaseUrl").value = getApiBase();

document.getElementById("saveSettingsBtn").addEventListener("click", async () => {
  const val = document.getElementById("apiBaseUrl").value.trim();
  if (!val) {
    showToast("الرجاء إدخال رابط صحيح", true);
    return;
  }
  setApiBase(val);
  showToast("تم الحفظ، جارٍ فحص الاتصال…");
  await checkConnectionStatus();
  checkSetup();
});

async function checkConnectionStatus() {
  const statusBox = document.getElementById("connectionStatus");
  statusBox.textContent = "جارٍ الفحص…";
  try {
    const res = await fetch(getApiBase() + "/api/health");
    if (res.ok) {
      statusBox.innerHTML = `<span style="color:var(--success)">✅ الاتصال بالخادم يعمل بنجاح</span>`;
    } else {
      statusBox.innerHTML = `<span style="color:var(--danger)">❌ الخادم لا يستجيب بشكل صحيح</span>`;
    }
  } catch {
    statusBox.innerHTML = `<span style="color:var(--danger)">❌ تعذّر الوصول للخادم. تحقق من الرابط.</span>`;
  }
}

// ---------- أدوات عامة ----------
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// ---------- تسجيل Service Worker (PWA) ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

// ---------- بدء التشغيل ----------
checkSetup();
if (getApiBase()) {
  checkConnectionStatus();
  loadLibrary();
}
