/* =====================================================
   SHARED IMAGE TOOL HELPERS
   Used by Image Converter and Image Resize only.
===================================================== */

let imageConverterFiles = [];
let imageResizeFiles = [];
let convertedImageFiles = [];
let resizedImageFiles = [];

const IMAGE_MAX = 30;

function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

function imageExtForMime(mime) {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/webp") return ".webp";
  return ".png";
}

function outputLabel(mime) {
  return mime === "image/jpeg" ? "JPG" : mime === "image/webp" ? "WEBP" : "PNG";
}

function baseName(name) {
  return name.replace(/\\.[^/.]+$/, "");
}

function fileLooksLikeImage(file) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  return file.type.startsWith("image/") || ["jpg","jpeg","png","webp","gif","bmp","svg"].includes(ext);
}

function dedupeFiles(existing, incoming) {
  const map = new Map(existing.map(f => [f.name + "|" + f.size + "|" + f.lastModified, f]));
  incoming.forEach(f => { if (!map.has(f.name + "|" + f.size + "|" + f.lastModified)) map.set(f.name + "|" + f.size + "|" + f.lastModified, f); });
  return Array.from(map.values()).slice(0, IMAGE_MAX);
}

function renderImageFileList(files, listEl, statusEl, setterName) {
  listEl.innerHTML = "";
  files.forEach((file, index) => {
    const row = document.createElement("div");
    row.className = "image-file";
    const img = document.createElement("img");
    img.className = "image-thumb";
    img.alt = "";
    img.src = URL.createObjectURL(file);
    img.onload = () => URL.revokeObjectURL(img.src);
    const main = document.createElement("div");
    main.className = "image-file-main";
    const name = document.createElement("div");
    name.className = "image-file-name";
    name.textContent = file.name;
    const meta = document.createElement("div");
    meta.className = "image-file-meta";
    meta.textContent = formatBytes(file.size);
    main.append(name, meta);
    const actionWrap = document.createElement("div");
    actionWrap.className = "image-file-actions";
    if (setterName === "resize") {
      const crop = document.createElement("button");
      crop.className = "btn secondary";
      crop.type = "button";
      crop.textContent = "✂ Crop";
      crop.onclick = () => openCropEditor(index);
      actionWrap.appendChild(crop);
    }
    const remove = document.createElement("button");
    remove.className = "image-file-remove";
    remove.type = "button";
    remove.textContent = "Remove";
    remove.onclick = () => {
      if (setterName === "converter") imageConverterFiles.splice(index, 1);
      else imageResizeFiles.splice(index, 1);
      renderImageFileList(setterName === "converter" ? imageConverterFiles : imageResizeFiles, listEl, statusEl, setterName);
      if (setterName === "converter") { convertedImageFiles = []; downloadConvertedBtn.disabled = true; }
      else { resizedImageFiles = []; downloadResizedBtn.disabled = true; }
    };
    actionWrap.appendChild(remove);
    row.append(img, main, actionWrap);
    listEl.appendChild(row);
  });
  statusEl.textContent = files.length ? `${files.length} image${files.length === 1 ? "" : "s"} selected.` : "No images selected.";
}function acceptImageFiles(fileList) {
  const incoming = Array.from(fileList || []).filter(fileLooksLikeImage);
  if (!incoming.length) { alert("Please select valid image files."); return []; }
  if (incoming.length > IMAGE_MAX) alert("Maximum 30 images are allowed. Only the first 30 valid images will be used.");
  return incoming;
}

async function loadImageFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error("This image format cannot be decoded by this browser.")); });
    try { await img.decode(); } catch (_) {}
    return img;
  } finally {
    // Keep the object URL alive until Image has decoded.
    URL.revokeObjectURL(url);
  }
}

function createCanvas(width, height, background, mime) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d", { alpha: mime !== "image/jpeg" });
  if (mime === "image/jpeg") { ctx.fillStyle = background || "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { canvas, ctx };
}

function canvasBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Browser could not create the output image.")), mime, quality));
}

async function renderImageBlob(img, width, height, mime, quality, background) {
  const { canvas, ctx } = createCanvas(width, height, background, mime);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await canvasBlob(canvas, mime, quality);
  return { blob, width: canvas.width, height: canvas.height };
}

