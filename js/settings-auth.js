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
   SINGLE-SESSION AUTHENTICATION
   Only one active dashboard session per user.
   A new login replaces the previous session token.
===================================================== */

const SESSION_POLL_MS = 5000;
const SESSION_ACTIVE_WINDOW_MS = 15000;
const SESSION_TOKEN_KEY = "akash_dashboard_session_token";

let currentSessionToken = null;
let sessionCheckTimer = null;
let sessionCheckRunning = false;
let sessionInvalidated = false;
let sessionVisibilityHandlerAdded = false;
let loginInProgress = false;
let sessionHeartbeatRunning = false;

function createSessionToken(){
  if(window.crypto && typeof window.crypto.randomUUID === "function"){
    return window.crypto.randomUUID();
  }

  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return Array.from(
    bytes,
    b => b.toString(16).padStart(2, "0")
  ).join("");
}

async function registerCurrentSession(userId){
  const token = createSessionToken();

  const { error } = await sb
    .from("user_sessions")
    .upsert({
      user_id: userId,
      session_token: token,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });

  if(error){
    console.error("Session registration failed:", error);
    return false;
  }

  currentSessionToken = token;
  sessionInvalidated = false;

  sessionStorage.setItem(SESSION_TOKEN_KEY, token);

  return true;
}

async function heartbeatCurrentSession(){
  if(
    sessionInvalidated ||
    !currentSessionToken ||
    sessionHeartbeatRunning
  ){
    return;
  }

  sessionHeartbeatRunning = true;

  try{
    const {
      data: { user },
      error: userError
    } = await sb.auth.getUser();

    if(userError || !user){
      return;
    }

    const { error } = await sb
      .from("user_sessions")
      .update({
        updated_at: new Date().toISOString()
      })
      .eq("user_id", user.id)
      .eq("session_token", currentSessionToken);

    if(error){
      console.warn("Session heartbeat failed:", error);
    }
  }catch(error){
    console.warn("Session heartbeat failed:", error);
  }finally{
    sessionHeartbeatRunning = false;
  }
}

async function checkCurrentSession(){
  if(
    sessionInvalidated ||
    sessionCheckRunning ||
    !currentSessionToken
  ){
    return;
  }

  sessionCheckRunning = true;

  try{
    const {
      data: { user },
      error: userError
    } = await sb.auth.getUser();

    if(userError || !user){
      return;
    }

    const { data, error } = await sb
      .from("user_sessions")
      .select("session_token, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if(error){
      console.warn("Session control check failed:", error);
      return;
    }

    if(
      !data ||
      data.session_token !== currentSessionToken
    ){
      await invalidateOldSession();
      return;
    }

    await heartbeatCurrentSession();
  }catch(error){
    console.warn("Session control check failed:", error);
  }finally{
    sessionCheckRunning = false;
  }
}

async function invalidateOldSession(){
  if(sessionInvalidated) return;

  sessionInvalidated = true;

  if(sessionCheckTimer){
    clearInterval(sessionCheckTimer);
    sessionCheckTimer = null;
  }

  currentSessionToken = null;
  sessionStorage.removeItem(SESSION_TOKEN_KEY);

  try{
    await sb.auth.signOut({ scope: "local" });
  }catch(error){
    console.warn("Local sign-out failed:", error);
  }

  tasks = [];
  selected.clear();
  showLogin();

  msg(
    "You were signed out because this account was logged in on another device or browser."
  );
}

function startSessionMonitor(){
  if(sessionCheckTimer){
    clearInterval(sessionCheckTimer);
  }

  sessionCheckTimer = setInterval(
    checkCurrentSession,
    SESSION_POLL_MS
  );

  if(!sessionVisibilityHandlerAdded){
    document.addEventListener(
      "visibilitychange",
      function(){
        if(document.visibilityState === "visible"){
          checkCurrentSession();
        }
      }
    );

    sessionVisibilityHandlerAdded = true;
  }
}

async function getExistingActiveSession(userId){
  const {
    data,
    error
  } = await sb
    .from("user_sessions")
    .select("session_token, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if(error){
    return {
      error,
      active: false,
      data: null
    };
  }

  if(!data || !data.session_token){
    return {
      error: null,
      active: false,
      data: null
    };
  }

  const updatedAt = Date.parse(data.updated_at || "");
  const active =
    Number.isFinite(updatedAt) &&
    (Date.now() - updatedAt) <= SESSION_ACTIVE_WINDOW_MS;

  return {
    error: null,
    active,
    data
  };
}

async function activateSession(session){
  if(!session || !session.user){
    showLogin();
    return false;
  }

  const registered = await registerCurrentSession(
    session.user.id
  );

  if(!registered){
    await sb.auth.signOut({ scope: "local" });

    tasks = [];
    selected.clear();
    showLogin();

    msg(
      "Login could not be completed. Please try again."
    );

    return false;
  }

  msg("");
  showApp();
  await loadTasks();
  startSessionMonitor();

  return true;
}


/* =====================================================
   LOGOUT
===================================================== */

logoutBtn.onclick = async function(){
  if(sessionCheckTimer){
    clearInterval(sessionCheckTimer);
    sessionCheckTimer = null;
  }

  currentSessionToken = null;
  sessionInvalidated = true;
  sessionStorage.removeItem(SESSION_TOKEN_KEY);

  const { error } = await sb.auth.signOut({
    scope: "local"
  });

  if(error){
    alert("Logout failed:\n" + error.message);
    return;
  }

  tasks = [];
  selected.clear();
  showLogin();
  msg("");
};


/* =====================================================
   LOGIN
===================================================== */

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
  loginInProgress = true;
  msg("Checking login...");

  try{
    /*
      Authenticate this tab first, but DO NOT claim the dashboard
      session yet. This lets us check the database lock before
      replacing any existing active device.
    */
    const { data, error } = await sb.auth.signInWithPassword({
      email: userEmail,
      password: userPassword
    });

    if(error){
      msg("Login failed: " + error.message);
      return;
    }

    if(!data || !data.session || !data.session.user){
      msg("Login failed. No session created.");
      return;
    }

    const userId = data.session.user.id;

    const existing = await getExistingActiveSession(userId);

    if(existing.error){
      console.error(
        "Existing session check failed:",
        existing.error
      );

      await sb.auth.signOut({ scope: "local" });

      msg(
        "Unable to check the existing login. Please try again."
      );

      return;
    }

    if(existing.active){
      const replaceExisting = window.confirm(
        "This account is already logged in.\n\n" +
        "Do you want to log out the existing device/browser and continue here?\n\n" +
        "OK = Yes, continue here\n" +
        "Cancel = No, keep the existing login"
      );

      if(!replaceExisting){
        /*
          This tab has its own sessionStorage-backed Supabase session,
          so signing out here does not sign out the existing device/tab.
        */
        await sb.auth.signOut({ scope: "local" });

        currentSessionToken = null;
        sessionStorage.removeItem(SESSION_TOKEN_KEY);

        tasks = [];
        selected.clear();
        showLogin();

        msg(
          "Login cancelled. The existing login is still active."
        );

        return;
      }
    }

    /*
      YES, or no active session:
      claim the account for this tab/device.
      The previous device will detect the changed token on its
      next check and lock out automatically.
    */
    await activateSession(data.session);

  }catch(err){
    console.error("Login error:", err);

    try{
      await sb.auth.signOut({ scope: "local" });
    }catch(_){
      // Keep the original login error visible.
    }

    msg(
      "Login failed: " +
      (err?.message || "Unexpected error.")
    );
  }finally{
    loginInProgress = false;
    loginBtn.disabled = false;
  }
};


/* =====================================================
   ENTER KEY LOGIN
===================================================== */

password.addEventListener("keydown", function(e){
  if(e.key === "Enter"){
    loginBtn.click();
  }
});


/* =====================================================
   AUTH STATE LISTENER
===================================================== */

sb.auth.onAuthStateChange(async function(event, session){
  /*
    signInWithPassword() triggers this event before the login
    handler finishes its confirmation check. Never claim a new
    dashboard session from this callback while login is in progress.
  */
  if(loginInProgress){
    return;
  }

  if(session){
    if(currentSessionToken){
      showApp();
      await loadTasks();
      startSessionMonitor();
    }else{
      /*
        A session without our per-tab dashboard token means this
        is a new tab/session. Do not silently take over an existing
        device. Show the login screen and require an explicit login.
      */
      showLogin();
    }
  }else{
    if(sessionCheckTimer){
      clearInterval(sessionCheckTimer);
      sessionCheckTimer = null;
    }

    currentSessionToken = null;
    sessionStorage.removeItem(SESSION_TOKEN_KEY);

    tasks = [];
    selected.clear();
    showLogin();
  }
});


/* =====================================================
   INITIAL AUTH CHECK
===================================================== */

async function initializeApp(){
  try{
    const {
      data,
      error
    } = await sb.auth.getSession();

    if(error){
      console.error("Session check failed:", error);
      showLogin();
      return;
    }

    if(data && data.session){
      const savedToken =
        sessionStorage.getItem(SESSION_TOKEN_KEY);

      if(savedToken){
        currentSessionToken = savedToken;

        /*
          Verify this tab's token before showing the dashboard.
        */
        await checkCurrentSession();

        if(!sessionInvalidated && currentSessionToken){
          showApp();
          await loadTasks();
          startSessionMonitor();
        }
      }else{
        /*
          New tab/browser context: do not silently take over
          the existing account. User must press Login, which
          will show the confirmation if another session is active.
        */
        showLogin();
      }
    }else{
      showLogin();
    }
  }catch(err){
    console.error("Initialization failed:", err);
    showLogin();
  }
}

initializeApp();
