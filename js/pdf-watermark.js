/* PDF Watermark */

let watermarkFiles = [];
let watermarkedFiles = [];
let compressedFiles = [];
let compressInputFiles = [];

const watermarkView = document.getElementById("watermarkView");
const compressView = document.getElementById("compressView");
const wmFiles = document.getElementById("wmFiles");
const wmFileList = document.getElementById("wmFileList");
const wmStatus = document.getElementById("wmStatus");

const wmText = document.getElementById("wmText");
const wmFont = document.getElementById("wmFont");
const wmFontSize = document.getElementById("wmFontSize");
const wmColor = document.getElementById("wmColor");
const wmColorValue = document.getElementById("wmColorValue");
const wmOpacity = document.getElementById("wmOpacity");
const wmOpacityRange = document.getElementById("wmOpacityRange");
const wmOpacityValue = document.getElementById("wmOpacityValue");
const wmAngle = document.getElementById("wmAngle");
const wmAngleRange = document.getElementById("wmAngleRange");
const wmAngleValue = document.getElementById("wmAngleValue");
const wmPosition = document.getElementById("wmPosition");
const wmPageSize = document.getElementById("wmPageSize");
const wmOrientation = document.getElementById("wmOrientation");
const wmPreviewPage = document.getElementById("wmPreviewPage");
const wmPreviewText = document.getElementById("wmPreviewText");

const applyWm = document.getElementById("applyWm");
const wmProgress = document.getElementById("wmProgress");
const wmProgressFill = document.getElementById("wmProgressFill");
const wmProgressText = document.getElementById("wmProgressText");
const wmResult = document.getElementById("wmResult");
const wmResultList = document.getElementById("wmResultList");
const downloadAllWm = document.getElementById("downloadAllWm");

const compressFilesInput = document.getElementById("compressFilesInput");
const compressFileList = document.getElementById("compressFileList");
const pdfCompressLevel = document.getElementById("pdfCompressLevel");
const pdfCompressMode = document.getElementById("pdfCompressMode");
const compressPdfBtn = document.getElementById("compressPdfBtn");
const downloadCompressed = document.getElementById("downloadCompressed");
const compressStatus = document.getElementById("compressStatus");
const compressProgress = document.getElementById("compressProgress");
const compressProgressFill = document.getElementById("compressProgressFill");
const compressProgressText = document.getElementById("compressProgressText");
const compressResult = document.getElementById("compressResult");
const compressResultList = document.getElementById("compressResultList");

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}

function safeNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

/* ---------- Shared PDF selection ---------- */

function renderWatermarkFiles() {
  if (!watermarkFiles.length) {
    wmFileList.innerHTML = "";
    wmStatus.textContent = "No PDF selected.";
    return;
  }

  wmFileList.innerHTML = watermarkFiles.map((file, index) => `
    <div class="wm-file">
      <div class="wm-file-name" title="${esc(file.name)}">
        <span class="safe-inline-icon">PDF</span> ${esc(file.name)}
        <span class="wm-file-size">${formatBytes(file.size)}</span>
      </div>
      <button type="button" class="wm-remove" data-wm-index="${index}">Remove</button>
    </div>
  `).join("");

  wmStatus.textContent =
    `${watermarkFiles.length} PDF file${watermarkFiles.length === 1 ? "" : "s"} selected.`;
}

function resetPdfResults() {
  watermarkedFiles = [];
  compressedFiles = [];

  wmResult.classList.remove("show");
  wmResultList.innerHTML = "";
  downloadAllWm.disabled = true;

  compressResult.classList.remove("show");
  compressResultList.innerHTML = "";
  downloadCompressed.disabled = true;
}

function addPdfFiles(incoming) {
  const files = [...incoming];

  if (watermarkFiles.length + files.length > 10) {
    alert("Maximum 10 PDF files are allowed.");
    return;
  }

  const valid = files.filter(file =>
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );

  if (valid.length !== files.length) {
    alert("Only PDF files are allowed.");
  }

  const existing = new Set(
    watermarkFiles.map(file => `${file.name}|${file.size}|${file.lastModified}`)
  );

  valid.forEach(file => {
    const key = `${file.name}|${file.size}|${file.lastModified}`;
    if (!existing.has(key)) {
      watermarkFiles.push(file);
      existing.add(key);
    }
  });

  resetPdfResults();
  renderWatermarkFiles();
  compressStatus.textContent = watermarkFiles.length
    ? `${watermarkFiles.length} PDF file${watermarkFiles.length === 1 ? "" : "s"} ready for compression.`
    : "No PDF selected.";
}

wmFiles.addEventListener("change", function () {
  addPdfFiles(this.files || []);
  this.value = "";
});

const wmUpload = document.querySelector(".wm-upload");

["dragenter", "dragover"].forEach(eventName => {
  wmUpload.addEventListener(eventName, e => {
    e.preventDefault();
    e.stopPropagation();
    wmUpload.classList.add("wm-dragover");
  });
});

["dragleave", "drop"].forEach(eventName => {
  wmUpload.addEventListener(eventName, e => {
    e.preventDefault();
    e.stopPropagation();
    wmUpload.classList.remove("wm-dragover");
  });
});

wmUpload.addEventListener("drop", e => {
  addPdfFiles(e.dataTransfer?.files || []);
});

wmFileList.addEventListener("click", function(e) {
  const button = e.target.closest("[data-wm-index]");
  if (!button) return;

  watermarkFiles.splice(Number(button.dataset.wmIndex), 1);
  resetPdfResults();
  renderWatermarkFiles();
  compressStatus.textContent = watermarkFiles.length
    ? `${watermarkFiles.length} PDF file${watermarkFiles.length === 1 ? "" : "s"} ready for compression.`
    : "No PDF selected.";
});

/* ---------- Watermark controls ---------- */

function getWatermarkOpacity() {
  return safeNumber(wmOpacity.value, 1, 100, 35);
}

function getWatermarkAngle() {
  return safeNumber(wmAngle.value, -360, 360, 45);
}

function syncOpacityFromRange() {
  const value = safeNumber(wmOpacityRange.value, 1, 100, 35);
  wmOpacity.value = value;
  wmOpacityRange.value = value;
  wmOpacityValue.textContent = `${value}%`;
}

function syncOpacityFromInput() {
  const raw = String(wmOpacity.value ?? "").trim();
  if (raw === "") return;
  const value = safeNumber(raw, 1, 100, 35);
  wmOpacity.value = value;
  wmOpacityRange.value = value;
  wmOpacityValue.textContent = `${value}%`;
}

function syncAngleFromRange() {
  const value = safeNumber(wmAngleRange.value, -360, 360, 45);
  wmAngle.value = value;
  wmAngleRange.value = value;
  wmAngleValue.textContent = `${value}°`;
}

function syncAngleFromInput() {
  const raw = String(wmAngle.value ?? "").trim();
  if (raw === "" || raw === "-" || raw === "+") return;
  const value = safeNumber(raw, -360, 360, 45);
  wmAngle.value = value;
  wmAngleRange.value = value;
  wmAngleValue.textContent = `${value}°`;
}

function getPreviewDimensions() {
  const sizes = {
    A4: [210, 297],
    A5: [148, 210],
    A3: [297, 420],
    Letter: [215.9, 279.4],
    Legal: [215.9, 355.6]
  };

  let [w, h] = sizes[wmPageSize.value] || sizes.A4;
  if (wmOrientation.value === "landscape") [w, h] = [h, w];
  return { w, h };
}

function updatePagePreview() {
  const { w, h } = getPreviewDimensions();
  wmPreviewPage.style.aspectRatio = `${w} / ${h}`;
  wmPreviewPage.classList.toggle("landscape", wmOrientation.value === "landscape");

  const text = wmText.value.trim() || "CONFIDENTIAL";
  const size = safeNumber(wmFontSize.value, 6, 200, 40);
  const angle = getWatermarkAngle();
  const opacity = getWatermarkOpacity() / 100;

  wmPreviewText.textContent = text;
  wmPreviewText.style.opacity = opacity;
  wmPreviewText.style.fontSize = `${Math.max(12, Math.min(64, size * 0.75))}px`;
  wmPreviewText.style.color = wmColor.value;

  if (wmFont.value === "ArialBlack") {
    wmPreviewText.style.fontFamily = '"Arial Black Custom", Arial, sans-serif';
    wmPreviewText.style.fontWeight = "900";
  } else {
    wmPreviewText.style.fontFamily =
      wmFont.value.includes("Times") ? "Times New Roman, serif" :
      wmFont.value.includes("Courier") ? "Courier New, monospace" :
      "Arial, sans-serif";
    wmPreviewText.style.fontWeight = wmFont.value.includes("Bold") ? "800" : "600";
  }

  // CSS and PDF-lib use the same visual direction here.
  wmPreviewText.style.transform = `rotate(${angle}deg)`;
  wmPreviewText.style.transformOrigin = "center center";

  const positions = {
    "top-left": ["flex-start", "flex-start"],
    "top-center": ["center", "flex-start"],
    "top-right": ["flex-end", "flex-start"],
    "center-left": ["flex-start", "center"],
    "center": ["center", "center"],
    "center-right": ["flex-end", "center"],
    "bottom-left": ["flex-start", "flex-end"],
    "bottom-center": ["center", "flex-end"],
    "bottom-right": ["flex-end", "flex-end"]
  };

  const [justify, align] = positions[wmPosition.value] || positions.center;
  wmPreviewPage.style.justifyContent = justify;
  wmPreviewPage.style.alignItems = align;

  wmColorValue.textContent = wmColor.value.toUpperCase();
  wmOpacityValue.textContent = `${getWatermarkOpacity()}%`;
  wmAngleValue.textContent = `${angle}°`;
}

wmOpacityRange.addEventListener("input", () => {
  syncOpacityFromRange();
  updatePagePreview();
});

wmOpacity.addEventListener("input", () => {
  syncOpacityFromInput();
  updatePagePreview();
});

wmOpacity.addEventListener("change", () => {
  syncOpacityFromInput();
  updatePagePreview();
});

wmAngleRange.addEventListener("input", () => {
  syncAngleFromRange();
  updatePagePreview();
});

wmAngle.addEventListener("input", () => {
  syncAngleFromInput();
  updatePagePreview();
});

wmAngle.addEventListener("change", () => {
  syncAngleFromInput();
  updatePagePreview();
});

[wmText, wmFont, wmFontSize, wmColor, wmPosition, wmPageSize, wmOrientation]
.forEach(el => {
  el.addEventListener("input", updatePagePreview);
  el.addEventListener("change", updatePagePreview);
});

/* ---------- Watermark PDF ---------- */

function hexToRgb(hex) {
  const clean = String(hex || "").replace("#", "");
  const full = clean.length === 3
    ? clean.split("").map(x => x + x).join("")
    : clean;

  return {
    r: parseInt(full.slice(0, 2), 16) / 255,
    g: parseInt(full.slice(2, 4), 16) / 255,
    b: parseInt(full.slice(4, 6), 16) / 255
  };
}

function getPdfFont(fontName) {
  const { StandardFonts } = PDFLib;
  return {
    Helvetica: StandardFonts.Helvetica,
    HelveticaBold: StandardFonts.HelveticaBold,
    TimesRoman: StandardFonts.TimesRoman,
    TimesRomanBold: StandardFonts.TimesRomanBold,
    Courier: StandardFonts.Courier,
    CourierBold: StandardFonts.CourierBold
  }[fontName] || StandardFonts.Helvetica;
}

async function applyWatermarkToPdf(file) {
  const { PDFDocument, rgb, degrees } = PDFLib;
  const pdfDoc = await PDFDocument.load(await file.arrayBuffer(), {
    ignoreEncryption: false
  });

  pdfDoc.registerFontkit(fontkit);

  let font;

  if (wmFont.value === "ArialBlack") {
    const fontResponse = await fetch("./ariblk.ttf");
    if (!fontResponse.ok) {
      throw new Error("Arial Black font file could not be loaded.");
    }
    font = await pdfDoc.embedFont(await fontResponse.arrayBuffer());
  } else {
    font = await pdfDoc.embedFont(getPdfFont(wmFont.value));
  }

  const text = wmText.value.trim() || "CONFIDENTIAL";
  const fontSize = safeNumber(wmFontSize.value, 6, 200, 40);
  const opacity = getWatermarkOpacity() / 100;
  const color = hexToRgb(wmColor.value);
  const angle = getWatermarkAngle();

  pdfDoc.getPages().forEach(page => {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    const radians = Math.abs(angle) * Math.PI / 180;
    const rotatedWidth =
      Math.abs(textWidth * Math.cos(radians)) +
      Math.abs(textHeight * Math.sin(radians));
    const rotatedHeight =
      Math.abs(textWidth * Math.sin(radians)) +
      Math.abs(textHeight * Math.cos(radians));

    const margin = Math.max(20, Math.min(50, Math.min(width, height) * 0.05));
    let centerX = width / 2;
    let centerY = height / 2;
    const pos = wmPosition.value;

    if (pos.includes("left")) centerX = margin + rotatedWidth / 2;
    if (pos.includes("right")) centerX = width - margin - rotatedWidth / 2;
    if (pos.includes("top")) centerY = height - margin - rotatedHeight / 2;
    if (pos.includes("bottom")) centerY = margin + rotatedHeight / 2;

    centerX = Math.max(rotatedWidth / 2, Math.min(width - rotatedWidth / 2, centerX));
    centerY = Math.max(rotatedHeight / 2, Math.min(height - rotatedHeight / 2, centerY));

    page.drawText(text, {
      x: centerX - textWidth / 2,
      y: centerY - textHeight / 2,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
      opacity,
      rotate: degrees(angle)
    });
  });

  return new Blob([await pdfDoc.save({ useObjectStreams: true })], { type: "application/pdf" });
}

applyWm.addEventListener("click", async function () {
  if (!watermarkFiles.length) {
    alert("Please select at least 1 PDF file.");
    return;
  }

  if (!wmText.value.trim()) {
    alert("Please enter watermark text.");
    wmText.focus();
    return;
  }

  if (!window.PDFLib) {
    alert("PDF library could not be loaded. Please refresh the page and try again.");
    return;
  }

  applyWm.disabled = true;
  wmFiles.disabled = true;
  wmProgress.classList.add("show");
  wmResult.classList.remove("show");
  wmResultList.innerHTML = "";
  wmProgressFill.style.width = "0%";
  watermarkedFiles = [];

  try {
    for (let i = 0; i < watermarkFiles.length; i++) {
      const file = watermarkFiles[i];
      wmProgressText.textContent =
        `Applying watermark ${i + 1} of ${watermarkFiles.length}: ${file.name}`;

      const blob = await applyWatermarkToPdf(file);
      watermarkedFiles.push({ name: file.name, blob });

      wmProgressFill.style.width =
        `${((i + 1) / watermarkFiles.length) * 100}%`;

      await new Promise(resolve => setTimeout(resolve, 20));
    }

    wmProgressText.textContent =
      `Completed ${watermarkedFiles.length} of ${watermarkFiles.length} PDF files.`;

    wmResultList.innerHTML = watermarkedFiles.map(item => `
      <div class="wm-result-item">
        <span title="${esc(item.name)}">✓ ${esc(item.name)}</span>
      </div>
    `).join("");

    wmResult.classList.add("show");
    downloadAllWm.disabled = false;
  } catch (error) {
    console.error(error);
    alert("Unable to apply watermark:\n" + (error?.message || error));
    wmProgressText.textContent = "Processing failed.";
  } finally {
    applyWm.disabled = false;
    wmFiles.disabled = false;
  }
});

downloadAllWm.addEventListener("click", async function () {
  if (!watermarkedFiles.length) return;

  if (!window.JSZip) {
    watermarkedFiles.forEach((item, index) => {
      const url = URL.createObjectURL(item.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500 + index * 100);
    });
    return;
  }

  downloadAllWm.disabled = true;
  downloadAllWm.textContent = "Creating ZIP...";

  try {
    const zip = new JSZip();
    watermarkedFiles.forEach(item => zip.file(item.name, item.blob));
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Watermarked_PDFs.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  } catch (error) {
    console.error(error);
    alert("Unable to create ZIP file:\n" + (error?.message || error));
  } finally {
    downloadAllWm.disabled = false;
    downloadAllWm.textContent = "Download All PDFs";
  }
});

/* ---------- 

/* Watermark cleanup */
function cleanWatermarkTool(){
  watermarkFiles=[];watermarkedFiles=[];wmFiles.value="";wmFileList.innerHTML="";wmStatus.textContent="No PDF selected.";wmResult.classList.remove("show");wmResultList.innerHTML="";downloadAllWm.disabled=true;wmProgress.classList.remove("show");wmProgressFill.style.width="0%";
}
document.getElementById("cleanWatermarkBtn").onclick=cleanWatermarkTool;
