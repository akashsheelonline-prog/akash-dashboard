/* Image Converter */



const imageConverterInput = document.getElementById("imageConverterInput");
const imageConverterList = document.getElementById("imageConverterList");
const imageConverterStatus = document.getElementById("imageConverterStatus");
const imageConvertFormat = document.getElementById("imageConvertFormat");
const imageConvertQuality = document.getElementById("imageConvertQuality");
const imageConvertQualityValue = document.getElementById("imageConvertQualityValue");
const imageConvertBackground = document.getElementById("imageConvertBackground");
const convertImagesBtn = document.getElementById("convertImagesBtn");
const downloadConvertedBtn = document.getElementById("downloadConvertedBtn");
const imageConverterProgress = document.getElementById("imageConverterProgress");
const imageConverterProgressFill = document.getElementById("imageConverterProgressFill");
const imageConverterProgressText = document.getElementById("imageConverterProgressText");
const imageConverterResult = document.getElementById("imageConverterResult");
const imageConverterResultList = document.getElementById("imageConverterResultList");




imageConverterInput.addEventListener("change", e => {
  imageConverterFiles = dedupeFiles(imageConverterFiles, acceptImageFiles(e.target.files));
  renderImageFileList(imageConverterFiles, imageConverterList, imageConverterStatus, "converter");
  imageConverterInput.value = "";
});

addDropZone(document.querySelector('label[for="imageConverterInput"]'), "converter");
imageConvertQuality.oninput = () => imageConvertQualityValue.textContent = imageConvertQuality.value + "%";
function mimeFromOriginal(file) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "png") return "image/png";
  return "image/png";
}

async function convertOneImage(file, mime, quality, background) {
  const img = await loadImageFile(file);
  const result = await renderImageBlob(img, img.naturalWidth || img.width, img.naturalHeight || img.height, mime, quality, background);
  const ext = imageExtForMime(mime);
  return { file, blob: result.blob, width: result.width, height: result.height, name: baseName(file.name) + ext };
}

convertImagesBtn.onclick = async () => {
  if (!imageConverterFiles.length) { alert("Please select at least 1 image."); return; }
  convertedImageFiles = [];
  downloadConvertedBtn.disabled = true;
  imageConverterResult.classList.remove("show");
  imageConverterProgress.classList.add("show");
  convertImagesBtn.disabled = true;
  const mime = imageConvertFormat.value;
  const quality = Number(imageConvertQuality.value) / 100;
  try {
    for (let i = 0; i < imageConverterFiles.length; i++) {
      const file = imageConverterFiles[i];
      imageConverterProgressText.textContent = `Converting ${i + 1} of ${imageConverterFiles.length}: ${file.name}`;
      imageConverterProgressFill.style.width = `${Math.round(i / imageConverterFiles.length * 100)}%`;
      await nextFrame();
      const item = await convertOneImage(file, mime, quality, imageConvertBackground.value);
      convertedImageFiles.push(item);
      await nextFrame();
    }
    imageConverterProgressFill.style.width = "100%";
    imageConverterProgressText.textContent = `Completed ${convertedImageFiles.length} image${convertedImageFiles.length === 1 ? "" : "s"}.`;
    imageConverterResultList.innerHTML = convertedImageFiles.map(item => `<div class="image-result-row"><div><b>${escapeHtml(item.name)}</b><br><small>${item.width} × ${item.height} px · ${formatBytes(item.blob.size)}</small></div><span class="image-badge">${outputLabel(mime)}</span></div>`).join("");
    imageConverterResult.classList.add("show");
    downloadConvertedBtn.disabled = !convertedImageFiles.length;
  } catch (error) {
    console.error(error);
    alert("Image conversion stopped:\n" + (error?.message || error));
    imageConverterProgressText.textContent = "Conversion stopped.";
  } finally { convertImagesBtn.disabled = false; }
};

downloadConvertedBtn.onclick = async () => {
  if (!convertedImageFiles.length) return;
  downloadConvertedBtn.disabled = true;
  try {
    const zip = new JSZip();
    convertedImageFiles.forEach(item => zip.file(item.name, item.blob));
    const blob = await zip.generateAsync({ type:"blob", compression:"DEFLATE", compressionOptions:{level:6} });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "Converted_Images.zip"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (e) { alert("Unable to create ZIP file:\n" + (e?.message || e)); }
  finally { downloadConvertedBtn.disabled = false; }
};


document.getElementById("cleanConverterBtn").onclick=()=>{imageConverterFiles=[];convertedImageFiles=[];imageConverterInput.value="";renderImageFileList(imageConverterFiles,imageConverterList,imageConverterStatus,"converter");imageConverterResult.classList.remove("show");imageConverterResultList.innerHTML="";downloadConvertedBtn.disabled=true;imageConverterProgress.classList.remove("show");imageConverterProgressFill.style.width="0%";};
