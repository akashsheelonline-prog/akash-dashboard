/* =====================================================
   PROFILE / THEME / SETTINGS
===================================================== */
const profileModal=document.getElementById("profileModal");
const settingsModal=document.getElementById("settingsModal");
const profileNameInput=document.getElementById("profileNameInput");
const profileEmailInput=document.getElementById("profileEmailInput");
const profilePasswordInput=document.getElementById("profilePasswordInput");
const profileSaveBtn=document.getElementById("profileSaveBtn");
const profileCancelBtn=document.getElementById("profileCancelBtn");
const themePopover=document.getElementById("themePopover");
const settingsCloseBtn=document.getElementById("settingsCloseBtn");
const settingsSaveBtn=document.getElementById("settingsSaveBtn");
const settingNotifications=document.getElementById("settingNotifications");
const settingConfirmRemove=document.getElementById("settingConfirmRemove");
const settingAutoRefresh=document.getElementById("settingAutoRefresh");
const settingCompact=document.getElementById("settingCompact");
const settingDateFormat=document.getElementById("settingDateFormat");

function applyTheme(theme){
  document.body.classList.remove("theme-ocean","theme-green","theme-purple","theme-orange","theme-red","theme-dark");
  document.body.classList.add("theme-"+(theme||"ocean"));
  localStorage.setItem("akash_theme",theme||"ocean");
  document.querySelectorAll(".theme-swatch").forEach(x=>x.classList.toggle("active",x.dataset.theme===(theme||"ocean")));
}
applyTheme(localStorage.getItem("akash_theme")||"ocean");

function loadLocalSettings(){
  settingNotifications.checked=localStorage.getItem("akash_notifications")==="1";
  settingConfirmRemove.checked=localStorage.getItem("akash_confirm_remove")!=="0";
  settingAutoRefresh.checked=localStorage.getItem("akash_auto_refresh")==="1";
  settingCompact.checked=localStorage.getItem("akash_compact")==="1";
  settingDateFormat.value=localStorage.getItem("akash_date_format")||"yyyy-mm-dd";
  document.body.classList.toggle("compact-tasks",settingCompact.checked);
}
loadLocalSettings();

async function openProfile(){
  themePopover.classList.add("hidden");
  const {data:{user}}=await sb.auth.getUser();
  if(!user)return;
  profileEmailInput.value=user.email||"";
  let name=user.user_metadata?.display_name||user.user_metadata?.full_name||"";
  try{const {data}=await sb.from("profiles").select("full_name").eq("id",user.id).maybeSingle();if(data?.full_name)name=data.full_name;}catch(e){}
  profileNameInput.value=name;
  profilePasswordInput.value="";
  profileModal.classList.add("show");
}

document.getElementById("profileTopBtn").onclick=openProfile;
document.getElementById("themeTopBtn").onclick=()=>{settingsModal.classList.remove("show");themePopover.classList.toggle("hidden");};
document.getElementById("settingsTopBtn").onclick=()=>{themePopover.classList.add("hidden");loadLocalSettings();settingsModal.classList.add("show");};

document.querySelectorAll(".theme-swatch").forEach(btn=>btn.onclick=async()=>{
  applyTheme(btn.dataset.theme);
  themePopover.classList.add("hidden");
  try{const {data:{user}}=await sb.auth.getUser();if(user)await sb.from("profiles").upsert({id:user.id,email:user.email,theme:btn.dataset.theme,updated_at:new Date().toISOString()},{onConflict:"id"});}catch(e){console.warn("Theme preference could not be saved:",e);}
});

profileCancelBtn.onclick=()=>profileModal.classList.remove("show");
settingsCloseBtn.onclick=()=>settingsModal.classList.remove("show");
profileSaveBtn.onclick=async()=>{
  const {data:{user}}=await sb.auth.getUser();
  if(!user)return;
  const name=profileNameInput.value.trim();
  const password=profilePasswordInput.value;
  if(!name){alert("Please enter your name.");return;}
  profileSaveBtn.disabled=true;
  try{
    await sb.from("profiles").upsert({id:user.id,email:user.email,full_name:name,updated_at:new Date().toISOString()},{onConflict:"id"});
    await sb.auth.updateUser({data:{display_name:name,full_name:name}});
    if(password){if(password.length<6)throw new Error("Password must be at least 6 characters.");const {error}=await sb.auth.updateUser({password});if(error)throw error;}
    alert("Profile updated successfully.");
    profileModal.classList.remove("show");
    if(typeof loadTasks==='function')loadTasks();
  }catch(e){alert(e.message||"Unable to update profile.");}
  finally{profileSaveBtn.disabled=false;}
};

settingsSaveBtn.onclick=()=>{
  localStorage.setItem("akash_notifications",settingNotifications.checked?"1":"0");
  localStorage.setItem("akash_confirm_remove",settingConfirmRemove.checked?"1":"0");
  localStorage.setItem("akash_auto_refresh",settingAutoRefresh.checked?"1":"0");
  localStorage.setItem("akash_compact",settingCompact.checked?"1":"0");
  localStorage.setItem("akash_date_format",settingDateFormat.value);
  document.body.classList.toggle("compact-tasks",settingCompact.checked);
  settingsModal.classList.remove("show");
};

window.addEventListener("click",e=>{
  if(!e.target.closest(".top-account-actions"))themePopover.classList.add("hidden");
  if(e.target===profileModal)profileModal.classList.remove("show");
  if(e.target===settingsModal)settingsModal.classList.remove("show");
});


/* =====================================================
   AUTHENTICATION — restored without changing dashboard UI
===================================================== */

logoutBtn.onclick = async function(){
  const { error } = await sb.auth.signOut();
  if(error){
    alert("Logout failed:\n" + error.message);
    return;
  }
  tasks = [];
  selected.clear();
  showLogin();
  msg("");
};

loginBtn.onclick = async function(){
  const userEmail = email.value.trim();
  const userPassword = password.value;

  if(!userEmail){
    msg("Please enter your email.");
    return;
  }
  if(!userPassword){
    msg("Please enter your password.");
    return;
  }

  loginBtn.disabled = true;
  msg("Signing in...");

  try{
    const { data, error } = await sb.auth.signInWithPassword({
      email: userEmail,
      password: userPassword
    });

    if(error){
      msg("Login failed: " + error.message);
      return;
    }

    if(!data || !data.session){
      msg("Login failed. No session created.");
      return;
    }

    msg("");
    showApp();
    await loadTasks();
  }catch(err){
    console.error("Login error:", err);
    msg("Login failed: " + (err?.message || "Unexpected error."));
  }finally{
    loginBtn.disabled = false;
  }
};

password.addEventListener("keydown", function(e){
  if(e.key === "Enter") loginBtn.click();
});

sb.auth.onAuthStateChange(async function(event, session){
  if(session){
    showApp();
    await loadTasks();
  }else{
    tasks = [];
    selected.clear();
    showLogin();
  }
});

async function initializeApp(){
  try{
    const { data, error } = await sb.auth.getSession();
    if(error){
      console.error("Session check failed:", error);
      showLogin();
      return;
    }
    if(data && data.session){
      showApp();
      await loadTasks();
    }else{
      showLogin();
    }
  }catch(err){
    console.error("Initialization failed:", err);
    showLogin();
  }
}

initializeApp();