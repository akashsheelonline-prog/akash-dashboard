/* Image Resize + Crop */
let imageResizeFiles = [];
let resizedImageFiles = [];
const imageResizeInput = document.getElementById("imageResizeInput");
const imageResizeList = document.getElementById("imageResizeList");
const imageResizeStatus = document.getElementById("imageResizeStatus");
const resizeWidth = document.getElementById("resizeWidth");
const resizeHeight = document.getElementById("resizeHeight");
const resizeUnit = document.getElementById("resizeUnit");
const resizeDpi = document.getElementById("resizeDpi");
const resizeKeepAspect = document.getElementById("resizeKeepAspect");
const resizeFormat = document.getElementById("resizeFormat");
const resizeMaxKB = document.getElementById("resizeMaxKB");
const resizeQuality = document.getElementById("resizeQuality");
const resizeQualityValue = document.getElementById("resizeQualityValue");
const resizeAutoScale = document.getElementById("resizeAutoScale");
const resizeImagesBtn = document.getElementById("resizeImagesBtn");
const downloadResizedBtn = document.getElementById("downloadResizedBtn");
const imageResizeProgress = document.getElementById("imageResizeProgress");
const imageResizeProgressFill = document.getElementById("imageResizeProgressFill");
const imageResizeProgressText = document.getElementById("imageResizeProgressText");
const imageResizeResult = document.getElementById("imageResizeResult");
const imageResizeResultList = document.getElementById("imageResizeResultList");

imageResizeInput.addEventListener("change", e => {
  imageResizeFiles = dedupeFiles(imageResizeFiles, acceptImageFiles(e.target.files));
  renderImageFileList(imageResizeFiles, imageResizeList, imageResizeStatus, "resize");
  imageResizeInput.value = "";
});

addDropZone(document.querySelector('label[for="imageResizeInput"]'), "resize");
resizeQuality.oninput = () => resizeQualityValue.textContent = resizeQuality.value + "%";

cropIndex = -1;
let cropImage = null;
let cropState = null;
let cropPointer = null;
const cropCanvas = document.getElementById("cropCanvas");
const cropFileName = document.getElementById("cropFileName");
const cropCanvasWrap = document.getElementById("cropCanvasWrap");
const cropEmpty = document.getElementById("cropEmpty");
const cropHint = document.getElementById("cropHint");
const cropActions = document.getElementById("cropActions");
const cropInfo = document.getElementById("cropInfo");
const cropResetBtn = document.getElementById("cropResetBtn");
const cropApplyBtn = document.getElementById("cropApplyBtn");
const cropDownloadBtn = document.getElementById("cropDownloadBtn");
const cropResizeBtn = document.getElementById("cropResizeBtn");

function showCropWorkspace(show){
  cropEmpty.classList.toggle("hidden",show);
  cropCanvasWrap.classList.toggle("hidden",!show);
  cropHint.classList.toggle("hidden",!show);
  cropActions.classList.toggle("hidden",!show);
  cropInfo.classList.toggle("hidden",!show);
  cropResetBtn.disabled=!show;
}

async function openCropEditor(index){
  const file=imageResizeFiles[index]; if(!file)return;
  cropIndex=index; cropFileName.textContent=file.name;
  const url=URL.createObjectURL(file); const img=new Image(); img.src=url;
  try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;});}
  finally{URL.revokeObjectURL(url);}
  cropImage=img;
  cropState={x:0,y:0,w:img.naturalWidth||img.width,h:img.naturalHeight||img.height};
  showCropWorkspace(true); drawCropPreview();
  document.getElementById("cropCanvasWrap").scrollIntoView({behavior:"smooth",block:"nearest"});
}

function cropScale(){
  if(!cropImage)return 1;
  const maxW=Math.max(320,Math.min(760,cropCanvas.parentElement?.clientWidth-24||760));
  const maxH=Math.max(280,Math.min(620,window.innerHeight*.58));
  return Math.min(maxW/(cropImage.naturalWidth||cropImage.width),maxH/(cropImage.naturalHeight||cropImage.height),1);
}
function clampCrop(){
  if(!cropImage||!cropState)return;
  const iw=cropImage.naturalWidth||cropImage.width, ih=cropImage.naturalHeight||cropImage.height;
  cropState.x=Math.max(0,Math.min(iw-1,cropState.x)); cropState.y=Math.max(0,Math.min(ih-1,cropState.y));
  cropState.w=Math.max(1,Math.min(iw-cropState.x,cropState.w)); cropState.h=Math.max(1,Math.min(ih-cropState.y,cropState.h));
}
function drawCropPreview(){
  if(!cropImage||!cropState)return;
  clampCrop(); const scale=cropScale();
  const iw=cropImage.naturalWidth||cropImage.width, ih=cropImage.naturalHeight||cropImage.height;
  cropCanvas.width=Math.max(1,Math.round(iw*scale)); cropCanvas.height=Math.max(1,Math.round(ih*scale));
  const ctx=cropCanvas.getContext("2d"); ctx.clearRect(0,0,cropCanvas.width,cropCanvas.height); ctx.drawImage(cropImage,0,0,cropCanvas.width,cropCanvas.height);
  const x=cropState.x*scale,y=cropState.y*scale,w=cropState.w*scale,h=cropState.h*scale;
  ctx.save(); ctx.fillStyle="rgba(0,0,0,.52)"; ctx.fillRect(0,0,cropCanvas.width,cropCanvas.height); ctx.clearRect(x,y,w,h); ctx.drawImage(cropImage,cropState.x,cropState.y,cropState.w,cropState.h,x,y,w,h);
  ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);
  ctx.strokeStyle="rgba(255,255,255,.55)";ctx.lineWidth=1;
  for(let i=1;i<3;i++){ctx.beginPath();ctx.moveTo(x+w*i/3,y);ctx.lineTo(x+w*i/3,y+h);ctx.stroke();ctx.beginPath();ctx.moveTo(x,y+h*i/3);ctx.lineTo(x+w,y+h*i/3);ctx.stroke();}
  const hs=Math.max(7,Math.min(12,10*scale)); ctx.fillStyle="#fff";
  [[x,y],[x+w/2,y],[x+w,y],[x+w,y+h/2],[x+w,y+h],[x+w/2,y+h],[x,y+h],[x,y+h/2]].forEach(([hx,hy])=>{ctx.fillRect(hx-hs/2,hy-hs/2,hs,hs);});
  ctx.restore();
  cropInfo.textContent=`Crop: ${Math.round(cropState.w)} × ${Math.round(cropState.h)} px`;
}
function cropPointerPoint(e){const r=cropCanvas.getBoundingClientRect();const sx=cropCanvas.width/(cropImage.naturalWidth||cropImage.width);const sy=cropCanvas.height/(cropImage.naturalHeight||cropImage.height);return {x:(e.clientX-r.left)/sx,y:(e.clientY-r.top)/sy};}
function cropHandleAt(p){if(!cropState)return null;const t=Math.max(10,(cropImage.naturalWidth||cropImage.width)*.018);const pts={nw:[cropState.x,cropState.y],n:[cropState.x+cropState.w/2,cropState.y],ne:[cropState.x+cropState.w,cropState.y],e:[cropState.x+cropState.w,cropState.y+cropState.h/2],se:[cropState.x+cropState.w,cropState.y+cropState.h],s:[cropState.x+cropState.w/2,cropState.y+cropState.h],sw:[cropState.x,cropState.y+cropState.h],w:[cropState.x,cropState.y+cropState.h/2]};for(const [k,[x,y]] of Object.entries(pts)){if(Math.hypot(p.x-x,p.y-y)<=t)return k;}if(p.x>=cropState.x&&p.x<=cropState.x+cropState.w&&p.y>=cropState.y&&p.y<=cropState.y+cropState.h)return "move";return null;}
function cursorForHandle(h){return ({nw:"nwse-resize",se:"nwse-resize",ne:"nesw-resize",sw:"nesw-resize",n:"ns-resize",s:"ns-resize",e:"ew-resize",w:"ew-resize",move:"move"})[h]||"crosshair";}
cropCanvas.addEventListener("pointerdown",e=>{if(!cropImage)return;const p=cropPointerPoint(e);const h=cropHandleAt(p);if(!h)return;cropCanvas.setPointerCapture(e.pointerId);cropPointer={handle:h,startX:p.x,startY:p.y,orig:{...cropState}};cropCanvas.style.cursor=cursorForHandle(h);});
cropCanvas.addEventListener("pointermove",e=>{if(!cropImage||!cropPointer){if(cropImage){cropCanvas.style.cursor=cursorForHandle(cropHandleAt(cropPointerPoint(e)));}return;}const p=cropPointerPoint(e),dX=p.x-cropPointer.startX,dY=p.y-cropPointer.startY,o=cropPointer.orig;let x=o.x,y=o.y,w=o.w,h=o.h;const min=20,iw=cropImage.naturalWidth||cropImage.width,ih=cropImage.naturalHeight||cropImage.height;switch(cropPointer.handle){case"move":x=Math.max(0,Math.min(iw-w,o.x+dX));y=Math.max(0,Math.min(ih-h,o.y+dY));break;case"w":x=Math.max(0,Math.min(o.x+o.w-min,o.x+dX));w=o.w-(x-o.x);break;case"e":w=Math.max(min,Math.min(iw-o.x,o.w+dX));break;case"n":y=Math.max(0,Math.min(o.y+o.h-min,o.y+dY));h=o.h-(y-o.y);break;case"s":h=Math.max(min,Math.min(ih-o.y,o.h+dY));break;case"nw":x=Math.max(0,Math.min(o.x+o.w-min,o.x+dX));y=Math.max(0,Math.min(o.y+o.h-min,o.y+dY));w=o.w-(x-o.x);h=o.h-(y-o.y);break;case"ne":y=Math.max(0,Math.min(o.y+o.h-min,o.y+dY));w=Math.max(min,Math.min(iw-o.x,o.w+dX));h=o.h-(y-o.y);break;case"sw":x=Math.max(0,Math.min(o.x+o.w-min,o.x+dX));w=o.w-(x-o.x);h=Math.max(min,Math.min(ih-o.y,o.h+dY));break;case"se":w=Math.max(min,Math.min(iw-o.x,o.w+dX));h=Math.max(min,Math.min(ih-o.y,o.h+dY));break;}cropState={x,y,w,h};drawCropPreview();});
cropCanvas.addEventListener("pointerup",()=>{cropPointer=null;cropCanvas.style.cursor="crosshair";});
cropCanvas.addEventListener("pointercancel",()=>{cropPointer=null;cropCanvas.style.cursor="crosshair";});
cropResetBtn.onclick=()=>{if(!cropImage)return;cropState={x:0,y:0,w:cropImage.naturalWidth||cropImage.width,h:cropImage.naturalHeight||cropImage.height};drawCropPreview();};
async function getCroppedBlob(){if(!cropImage||!cropState)return null;const c=document.createElement("canvas");c.width=Math.round(cropState.w);c.height=Math.round(cropState.h);const ctx=c.getContext("2d");ctx.drawImage(cropImage,cropState.x,cropState.y,cropState.w,cropState.h,0,0,c.width,c.height);return await canvasBlob(c,"image/png",1);}
cropDownloadBtn.onclick=async()=>{const blob=await getCroppedBlob();if(!blob)return;const old=imageResizeFiles[cropIndex];const name=baseName(old?.name||"cropped")+"_cropped.png";const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);};
cropApplyBtn.onclick=async()=>{const blob=await getCroppedBlob();if(!blob||cropIndex<0)return;const old=imageResizeFiles[cropIndex];imageResizeFiles[cropIndex]=new File([blob],baseName(old.name)+"_cropped.png",{type:"image/png",lastModified:Date.now()});renderImageFileList(imageResizeFiles,imageResizeList,imageResizeStatus,"resize");resizedImageFiles=[];downloadResizedBtn.disabled=true;imageResizeResult.classList.remove("show");openCropEditor(cropIndex);};
cropResizeBtn.onclick=async()=>{const blob=await getCroppedBlob();if(!blob||cropIndex<0)return;const old=imageResizeFiles[cropIndex];const cropped=new File([blob],baseName(old.name)+"_cropped.png",{type:"image/png",lastModified:Date.now()});imageResizeFiles[cropIndex]=cropped;renderImageFileList(imageResizeFiles,imageResizeList,imageResizeStatus,"resize");resizedImageFiles=[];downloadResizedBtn.disabled=true;imageResizeResult.classList.remove("show");document.querySelector("#imageResizeView .resize-control-column")?.scrollIntoView({behavior:"smooth",block:"start"});setTimeout(()=>document.getElementById("resizeWidth")?.focus(),500);};
window.addEventListener("resize",()=>{if(cropImage)drawCropPreview();});


function unitToPx(value, unit, dpi) {
  if (!Number.isFinite(value) || value <= 0) return null;
  if (unit === "px") return value;
  if (unit === "in") return value * dpi;
  if (unit === "cm") return value * dpi / 2.54;
  if (unit === "mm") return value * dpi / 25.4;
  return value;
}

function getResizeDimensions(img) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const dpi = Math.max(1, Number(resizeDpi.value) || 96);
  const wVal = Number(resizeWidth.value), hVal = Number(resizeHeight.value);
  let w = unitToPx(wVal, resizeUnit.value, dpi);
  let h = unitToPx(hVal, resizeUnit.value, dpi);
  if (!w && !h) return { width: iw, height: ih };
  if (resizeKeepAspect.checked) {
    if (w && h) { const scale = Math.min(w / iw, h / ih); w = iw * scale; h = ih * scale; }
    else if (w) { h = iw ? ih * (w / iw) : ih; }
    else { w = ih ? iw * (h / ih) : iw; }
  } else {
    w = w || iw; h = h || ih;
  }
  return { width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) };
}

async function encodeWithinTarget(img, width, height, mime, initialQuality, background, maxKB, allowScale) {
  let w = Math.max(1, Math.round(width)), h = Math.max(1, Math.round(height));
  const target = maxKB > 0 ? maxKB * 1024 : 0;
  let quality = Math.max(0.1, Math.min(1, initialQuality));
  let result = await renderImageBlob(img, w, h, mime, quality, background);
  if (!target || result.blob.size <= target) return result;

  // For JPEG/WEBP, first reduce quality without changing the requested dimensions.
  if (mime !== "image/png") {
    let lo = 0.05, hi = quality, best = null;
    for (let i = 0; i < 7; i++) {
      const q = (lo + hi) / 2;
      const trial = await renderImageBlob(img, w, h, mime, q, background);
      if (trial.blob.size <= target) { best = trial; lo = q; }
      else hi = q;
    }
    if (best) return best;
  }

  if (!allowScale) return result;

  // If quality alone is not enough, scale dimensions down gradually.
  for (let pass = 0; pass < 9; pass++) {
    const ratio = Math.max(0.25, Math.min(0.92, Math.sqrt(target / Math.max(1, result.blob.size)) * 0.96));
    const nw = Math.max(1, Math.floor(w * ratio));
    const nh = Math.max(1, Math.floor(h * ratio));
    if (nw === w && nh === h) break;
    w = nw; h = nh;
    if (mime !== "image/png") {
      let lo = 0.05, hi = quality, best = null;
      for (let i = 0; i < 7; i++) {
        const q = (lo + hi) / 2;
        const trial = await renderImageBlob(img, w, h, mime, q, background);
        if (trial.blob.size <= target) { best = trial; lo = q; } else hi = q;
      }
      result = best || await renderImageBlob(img, w, h, mime, 0.05, background);
    } else {
      result = await renderImageBlob(img, w, h, mime, quality, background);
    }
    if (result.blob.size <= target) return result;
    await nextFrame();
  }
  return result;
}

async function resizeOneImage(file) {
  const img = await loadImageFile(file);
  const dims = getResizeDimensions(img);
  let mime = resizeFormat.value === "original" ? mimeFromOriginal(file) : resizeFormat.value;
  if (mime === "image/gif") mime = "image/png";
  const maxKB = Number(resizeMaxKB.value) > 0 ? Number(resizeMaxKB.value) : 0;
  const result = await encodeWithinTarget(img, dims.width, dims.height, mime, Number(resizeQuality.value)/100, "#ffffff", maxKB, resizeAutoScale.checked);
  return { file, blob: result.blob, width: result.width, height: result.height, name: baseName(file.name) + imageExtForMime(mime), mime };
}

resizeImagesBtn.onclick = async () => {
  if (!imageResizeFiles.length) { alert("Please select at least 1 image."); return; }
  const w = Number(resizeWidth.value), h = Number(resizeHeight.value);
  if ((!w || w <= 0) && (!h || h <= 0)) {
    alert("Please enter a width or height.");
    return;
  }
  resizedImageFiles = []; downloadResizedBtn.disabled = true; imageResizeResult.classList.remove("show"); imageResizeProgress.classList.add("show"); resizeImagesBtn.disabled = true;
  try {
    for (let i = 0; i < imageResizeFiles.length; i++) {
      const file = imageResizeFiles[i];
      imageResizeProgressText.textContent = `Resizing ${i + 1} of ${imageResizeFiles.length}: ${file.name}`;
      imageResizeProgressFill.style.width = `${Math.round(i / imageResizeFiles.length * 100)}%`;
      await nextFrame();
      resizedImageFiles.push(await resizeOneImage(file));
      await nextFrame();
    }
    imageResizeProgressFill.style.width = "100%";
    imageResizeProgressText.textContent = `Completed ${resizedImageFiles.length} image${resizedImageFiles.length === 1 ? "" : "s"}.`;
    imageResizeResultList.innerHTML = resizedImageFiles.map(item => `<div class="image-result-row"><div><b>${escapeHtml(item.name)}</b><br><small>${item.width} × ${item.height} px · ${formatBytes(item.blob.size)}</small></div><span class="image-badge">${outputLabel(item.mime)}</span></div>`).join("");
    imageResizeResult.classList.add("show"); downloadResizedBtn.disabled = !resizedImageFiles.length;
  } catch (error) {
    console.error(error); alert("Image resize stopped:\n" + (error?.message || error)); imageResizeProgressText.textContent = "Resize stopped.";
  } finally { resizeImagesBtn.disabled = false; }
};

downloadResizedBtn.onclick = async () => {
  if (!resizedImageFiles.length) return;
  downloadResizedBtn.disabled = true;
  try {
    const zip = new JSZip(); resizedImageFiles.forEach(item => zip.file(item.name, item.blob));
    const blob = await zip.generateAsync({ type:"blob", compression:"DEFLATE", compressionOptions:{level:6} });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download="Resized_Images.zip"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),5000);
  } catch(e) { alert("Unable to create ZIP file:\n" + (e?.message || e)); }
  finally { downloadResizedBtn.disabled = false; }
};


document.getElementById("cleanResizeBtn").onclick=()=>{imageResizeFiles=[];resizedImageFiles=[];imageResizeInput.value="";cropIndex=-1;cropImage=null;cropState=null;cropFileName.textContent="Select “Crop” on an uploaded image.";showCropWorkspace(false);renderImageFileList(imageResizeFiles,imageResizeList,imageResizeStatus,"resize");imageResizeResult.classList.remove("show");imageResizeResultList.innerHTML="";downloadResizedBtn.disabled=true;imageResizeProgress.classList.remove("show");imageResizeProgressFill.style.width="0%";};
