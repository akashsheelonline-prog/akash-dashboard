/* PDF Compress */

/*
  Reliable browser-side PDF compression.
  The previous Ghostscript WASM approach could freeze the browser because
  Ghostscript's callMain() runs synchronously on the main thread. This version
  uses PDF.js + canvas + pdf-lib, yielding between pages so the dashboard stays
  responsive. The result is image-based PDF (text is no longer selectable),
  which is intentional for strong size reduction.
*/

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

function getCompressionSettings() {
  const level = Number(pdfCompressLevel.value || 50);
  const mode = pdfCompressMode.value || "smart";
  let quality, scale;

  if (mode === "aggressive") {
    if (level <= 20) { quality = 0.68; scale = 1.20; }
    else if (level <= 50) { quality = 0.55; scale = 1.00; }
    else if (level <= 70) { quality = 0.45; scale = 0.85; }
    else { quality = 0.35; scale = 0.72; }
  } else {
    if (level <= 20) { quality = 0.82; scale = 1.35; }
    else if (level <= 50) { quality = 0.72; scale = 1.15; }
    else if (level <= 70) { quality = 0.62; scale = 0.98; }
    else { quality = 0.52; scale = 0.82; }
  }
  return { level, mode, quality, scale };
}

function canvasToJpegBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error("Could not create compressed page image."));
    }, "image/jpeg", quality);
  });
}

async function yieldToBrowser() {
  await new Promise(resolve => setTimeout(resolve, 0));
}

async function compressPdfFile(file, onPageProgress) {
  if (!window.pdfjsLib) {
    throw new Error("PDF engine could not be loaded. Please check your internet connection and reopen the dashboard.");
  }
  if (!window.PDFLib) {
    throw new Error("PDF library could not be loaded. Please reopen the dashboard.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const settings = getCompressionSettings();
  const loadingTask = pdfjsLib.getDocument({ data: bytes, disableWorker: true });
  const pdf = await loadingTask.promise;
  const outPdf = await PDFLib.PDFDocument.create();

  // Keep the output within sensible browser memory limits.
  const maxDimension = settings.level >= 70 ? 1800 : (settings.level >= 50 ? 2200 : 2600);

  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const baseViewport = page.getViewport({ scale: 1 });
    let renderScale = settings.scale;
    const naturalMax = Math.max(baseViewport.width, baseViewport.height) * renderScale;
    if (naturalMax > maxDimension) renderScale *= maxDimension / naturalMax;
    renderScale = Math.max(0.5, renderScale);

    const viewport = page.getViewport({ scale: renderScale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Your browser does not support canvas rendering.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;
    await yieldToBrowser();

    const jpegBlob = await canvasToJpegBlob(canvas, settings.quality);
    const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
    const jpg = await outPdf.embedJpg(jpegBytes);
    const outPage = outPdf.addPage([viewport.width, viewport.height]);
    outPage.drawImage(jpg, {
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height
    });

    onPageProgress?.(pageNo, pdf.numPages);
    canvas.width = 1;
    canvas.height = 1;
    await yieldToBrowser();
  }

  const outputBytes = await outPdf.save({ useObjectStreams: true, addDefaultPage: false });
  const recompressed = new Blob([outputBytes], { type: "application/pdf" });
  const reduced = recompressed.size < file.size;

  return {
    name: file.name,
    blob: reduced ? recompressed : file,
    originalSize: file.size,
    compressedSize: reduced ? recompressed.size : file.size,
    reduced,
    pages: pdf.numPages
  };
}

function renderCompressFiles() {
  compressFileList.innerHTML = compressInputFiles.map((file, index) => `
    <div class="wm-file">
      <div class="wm-file-name" title="${esc(file.name)}"><span class="safe-inline-icon">PDF</span> ${esc(file.name)} <span class="wm-file-size">${formatBytes(file.size)}</span></div>
      <button type="button" class="wm-remove" data-compress-index="${index}">Remove</button>
    </div>`).join("");
  compressStatus.textContent = compressInputFiles.length
    ? `${compressInputFiles.length} PDF file${compressInputFiles.length === 1 ? "" : "s"} selected.`
    : "No PDF selected.";
}

function addCompressFiles(files) {
  const incoming = [...(files || [])];
  const valid = incoming.filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
  if (valid.length !== incoming.length) alert("Only PDF files are allowed.");

  const available = Math.max(0, 10 - compressInputFiles.length);
  if (valid.length > available) {
    alert(`Maximum 10 PDF files are allowed. Only ${available} more file${available === 1 ? "" : "s"} can be added.`);
  }

  const existing = new Set(compressInputFiles.map(f => `${f.name}|${f.size}|${f.lastModified}`));
  valid.slice(0, available).forEach(f => {
    const key = `${f.name}|${f.size}|${f.lastModified}`;
    if (!existing.has(key)) {
      compressInputFiles.push(f);
      existing.add(key);
    }
  });

  compressedFiles = [];
  compressResult.classList.remove("show");
  downloadCompressed.disabled = true;
  renderCompressFiles();
}

compressFilesInput.addEventListener("change", function () {
  addCompressFiles(this.files);
  this.value = "";
});

const compressUpload = compressFilesInput.closest(".wm-upload");
["dragenter", "dragover"].forEach(name => compressUpload.addEventListener(name, e => {
  e.preventDefault();
  compressUpload.classList.add("wm-dragover");
}));
["dragleave", "drop"].forEach(name => compressUpload.addEventListener(name, e => {
  e.preventDefault();
  compressUpload.classList.remove("wm-dragover");
}));
compressUpload.addEventListener("drop", e => addCompressFiles(e.dataTransfer?.files));

compressFileList.addEventListener("click", e => {
  const button = e.target.closest("[data-compress-index]");
  if (!button) return;
  compressInputFiles.splice(Number(button.dataset.compressIndex), 1);
  compressedFiles = [];
  downloadCompressed.disabled = true;
  compressResult.classList.remove("show");
  renderCompressFiles();
});

compressPdfBtn.addEventListener("click", async function () {
  if (!compressInputFiles.length) {
    alert("Please select at least 1 PDF file.");
    return;
  }

  compressPdfBtn.disabled = true;
  downloadCompressed.disabled = true;
  compressFilesInput.disabled = true;
  compressProgress.classList.add("show");
  compressResult.classList.remove("show");
  compressResultList.innerHTML = "";
  compressProgressFill.style.width = "0%";
  compressedFiles = [];

  try {
    const totalFiles = compressInputFiles.length;
    for (let i = 0; i < totalFiles; i++) {
      const file = compressInputFiles[i];
      compressProgressText.textContent = `Opening ${i + 1} of ${totalFiles}: ${file.name}`;
      await yieldToBrowser();

      const result = await compressPdfFile(file, (pageNo, pageCount) => {
        const pagePart = pageNo / pageCount;
        const overall = ((i + pagePart) / totalFiles) * 100;
        compressProgressFill.style.width = `${overall}%`;
        compressProgressText.textContent = `Compressing ${i + 1} of ${totalFiles}: ${file.name} — page ${pageNo}/${pageCount}`;
      });

      compressedFiles.push(result);
      compressProgressFill.style.width = `${((i + 1) / totalFiles) * 100}%`;
      await yieldToBrowser();
    }

    const before = compressedFiles.reduce((sum, x) => sum + x.originalSize, 0);
    const after = compressedFiles.reduce((sum, x) => sum + x.compressedSize, 0);
    const saved = before ? Math.max(0, ((before - after) / before) * 100) : 0;

    compressStatus.textContent = `Completed: ${formatBytes(before)} → ${formatBytes(after)} (${saved.toFixed(1)}% actual reduction).`;
    compressResultList.innerHTML = compressedFiles.map((x, index) => {
      const percent = x.originalSize ? Math.max(0, ((x.originalSize - x.compressedSize) / x.originalSize) * 100) : 0;
      const note = x.reduced ? `${percent.toFixed(1)}% smaller` : "already smaller / original kept";
      return `<div class="wm-result-item">
        <span title="${esc(x.name)}">✓ ${esc(x.name)} <span class="muted">(${x.pages} pages)</span></span>
        <span class="muted">${formatBytes(x.originalSize)} → ${formatBytes(x.compressedSize)} (${note})</span>
      </div>`;
    }).join("");

    compressResult.classList.add("show");
    downloadCompressed.disabled = false;
    compressProgressText.textContent = `Completed ${compressedFiles.length} of ${compressedFiles.length} PDF files.`;
  } catch (error) {
    console.error(error);
    compressProgressText.textContent = "Compression failed.";
    alert("Unable to compress PDF:\n" + (error?.message || error));
  } finally {
    compressPdfBtn.disabled = false;
    compressFilesInput.disabled = false;
  }
});

downloadCompressed.addEventListener("click", async function () {
  if (!compressedFiles.length) {
    alert("Please compress at least 1 PDF first.");
    return;
  }

  downloadCompressed.disabled = true;
  downloadCompressed.textContent = "Creating ZIP...";
  try {
    const zip = new JSZip();
    compressedFiles.forEach(item => zip.file(item.name, item.blob));
    const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Compressed_PDFs.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (error) {
    console.error(error);
    alert("Unable to create ZIP file:\n" + (error?.message || error));
  } finally {
    downloadCompressed.disabled = false;
    downloadCompressed.textContent = "Download Compressed PDFs";
  }
});

updatePagePreview();
syncOpacityFromRange();
syncAngleFromRange();

/* =====================================================
   

/* Compress cleanup */
document.getElementById("cleanCompressBtn").onclick=()=>{compressInputFiles=[];compressedFiles=[];compressFilesInput.value="";renderCompressFiles();compressResult.classList.remove("show");compressResultList.innerHTML="";downloadCompressed.disabled=true;compressProgress.classList.remove("show");compressProgressFill.style.width="0%";};
