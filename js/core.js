/* =====================================================
   SUPABASE
===================================================== */

/*
   IMPORTANT:
   Keep the SAME Supabase URL and public/publishable key
   that you already had in your working code.

   NEVER put the service_role/secret key here.
*/

const SUPABASE_URL =
  "https://dadnspgmkymdrpzyvhch.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_tBHn0H5ThLff8mApenKTCw_pAfZAiwW";


const sb =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );


/* =====================================================
   VARIABLES
===================================================== */

let tasks = [];

let selected =
  new Set();

let view =
  "dashboard";

let quickTaskFilter = "all";

let editingId =
  null;


/* =====================================================
   ELEMENTS
===================================================== */

const login =
  document.getElementById("login");

const dashboardCards = document.getElementById("dashboardCards");
const taskArea = document.getElementById("taskArea");

// Defensive initial state: never render task counters or task table before authentication.
dashboardCards?.classList.add("hidden");
taskArea?.classList.add("hidden");

const app =
  document.getElementById("app");

const email =
  document.getElementById("email");

const password =
  document.getElementById("password");

const loginBtn =
  document.getElementById("loginBtn");

const loginMsg =
  document.getElementById("loginMsg");

const logoutBtn =
  document.getElementById("logoutBtn");

const menuSearch =
  document.getElementById("menuSearch");

const menuEmpty =
  document.getElementById("menuEmpty");

const sideNav =
  document.getElementById("sideNav");

const createBtn =
  document.getElementById("createBtn");

const editBtn =
  document.getElementById("editBtn");

const removeBtn =
  document.getElementById("removeBtn");

const completeBtn =
  document.getElementById("completeBtn");

const cancelBtn =
  document.getElementById("cancelBtn");

const modal =
  document.getElementById("modal");

const closeModalBtn =
  document.getElementById("closeModal");

const taskForm =
  document.getElementById("taskForm");

const modalTitle =
  document.getElementById("modalTitle");

const saveBtn =
  document.getElementById("saveBtn");

const date =
  document.getElementById("date");

const title =
  document.getElementById("title");

const details =
  document.getElementById("details");

const type =
  document.getElementById("type");

const related =
  document.getElementById("related");

const dueDate =
  document.getElementById("dueDate");

const tbody =
  document.getElementById("tbody");

const selectAll =
  document.getElementById("selectAll");

const search =
  document.getElementById("search");

const typeFilter =
  document.getElementById("typeFilter");

const relatedFilter =
  document.getElementById("relatedFilter");

const statusFilter =
  document.getElementById("statusFilter");

const pageTitle =
  document.getElementById("pageTitle");

const todayLabel =
  document.getElementById("todayLabel");

const singleLoginModal =
  document.getElementById("singleLoginModal");

const singleLoginYes =
  document.getElementById("singleLoginYes");

const singleLoginNo =
  document.getElementById("singleLoginNo");


/* =====================================================
   DATE
===================================================== */

function todayISO() {

  const d =
    new Date();

  const local =
    new Date(
      d.getTime()
      -
      d.getTimezoneOffset() * 60000
    );

  return local
    .toISOString()
    .slice(0, 10);
}


/* =====================================================
   ESCAPE HTML
===================================================== */

function esc(value) {

  return String(
    value ?? ""
  ).replace(
    /[&<>"']/g,
    m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m])
  );

}


/* =====================================================
   DUE STATE
===================================================== */

function dueState(task) {

  if (
    task.status !== "New"
  ) {

    return "";

  }


  if (
    task.due_date <
    todayISO()
  ) {

    return "overdue";

  }


  if (
    task.due_date ===
    todayISO()
  ) {

    return "due";

  }


  return "";

}


/* =====================================================
   LOGIN MESSAGE
===================================================== */

function msg(text) {

  loginMsg.textContent =
    text;

}


/* =====================================================
   SHOW LOGIN
===================================================== */

function showLogin() {

  /* Never expose authenticated dashboard/task content on the login screen. */
  app.classList.remove("authenticated");
  app.classList.add("hidden");
  login.classList.remove("hidden");

  if (dashboardCards) dashboardCards.classList.add("hidden");
  if (taskArea) taskArea.classList.add("hidden");

  password.value = "";

}


/* =====================================================
   SHOW APP
===================================================== */

function showApp() {

  login.classList.add(
    "hidden"
  );

  app.classList.remove(
    "hidden"
  );
  app.classList.add("authenticated");

  todayLabel.textContent =
    new Date().toLocaleDateString(
      undefined,
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      }
    );

}


/* =====================================================
   LOAD TASKS
===================================================== */

async function loadTasks() {

  const {
    data: {
      user
    }
  } =
    await sb.auth.getUser();


  if (!user) {

    showLogin();

    return;

  }


  /*
    IMPORTANT:
    Only load tasks belonging to
    the currently logged-in user.
  */

  const {
    data,
    error
  } =
    await sb
      .from("tasks")
      .select("*")
      .eq(
        "user_id",
        user.id
      )
      .order(
        "due_date",
        {
          ascending: true
        }
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      error
    );

    alert(
      "Unable to load tasks:\n"
      +
      error.message
    );

    return;

  }


  tasks =
    data || [];

  selected.clear();

  render();

}


/* =====================================================
   FILTER
===================================================== */

function filtered() {

  let a =
    [...tasks];

  const q =
    search.value
      .trim()
      .toLowerCase();

  const ty =
    typeFilter.value;

  const re =
    relatedFilter.value;

  const st =
    statusFilter.value;

  if (view === "tasks" && quickTaskFilter !== "all") {
    if (quickTaskFilter === "due") a = a.filter(t => dueState(t) === "due");
    else if (quickTaskFilter === "overdue") a = a.filter(t => dueState(t) === "overdue");
    else if (quickTaskFilter === "upcoming") a = a.filter(t => t.status === "New" && t.due_date > todayISO());
    else a = a.filter(t => t.status === quickTaskFilter);
  }

  if (
    view === "new"
  ) {

    a =
      a.filter(
        t =>
          t.status === "New"
      );

  }


  if (
    view === "due"
  ) {

    a =
      a.filter(
        t =>
          dueState(t) === "due"
      );

  }


  if (
    view === "overdue"
  ) {

    a =
      a.filter(
        t =>
          dueState(t) ===
          "overdue"
      );

  }


  if (
    view === "upcoming"
  ) {

    a =
      a.filter(
        t =>
          t.status === "New"
          &&
          t.due_date >
          todayISO()
      );

  }


  if (
    view === "completed"
  ) {

    a =
      a.filter(
        t =>
          t.status ===
          "Completed"
      );

  }


  if (
    view === "cancelled"
  ) {

    a =
      a.filter(
        t =>
          t.status ===
          "Cancelled"
      );

  }


  if (q) {

    a =
      a.filter(
        t =>
          (
            String(
              t.title || ""
            )
            +
            " "
            +
            String(
              t.details || ""
            )
          )
          .toLowerCase()
          .includes(q)
      );

  }


  if (ty) {

    a =
      a.filter(
        t =>
          t.type === ty
      );

  }


  if (re) {

    a =
      a.filter(
        t =>
          t.related === re
      );

  }


  if (st) {
    if (st === "due") a = a.filter(t => dueState(t) === "due");
    else if (st === "overdue") a = a.filter(t => dueState(t) === "overdue");
    else if (st === "upcoming") a = a.filter(t => t.status === "New" && t.due_date > todayISO());
    else a = a.filter(t => t.status === st);
  }


  return a;

}


/* =====================================================
   RENDER
===================================================== */

function render() {

  document.getElementById(
    "cTotal"
  ).textContent =
    tasks.length;


  document.getElementById(
    "cNew"
  ).textContent =
    tasks.filter(
      t =>
        t.status === "New"
    ).length;


  document.getElementById(
    "cDue"
  ).textContent =
    tasks.filter(
      t =>
        dueState(t) === "due"
    ).length;


  document.getElementById(
    "cOverdue"
  ).textContent =
    tasks.filter(
      t =>
        dueState(t) ===
        "overdue"
    ).length;


  document.getElementById(
    "cCompleted"
  ).textContent =
    tasks.filter(
      t =>
        t.status ===
        "Completed"
    ).length;


  document.getElementById(
    "cCancelled"
  ).textContent =
    tasks.filter(
      t =>
        t.status ===
        "Cancelled"
    ).length;

  const qCount = id => { const el=document.getElementById(id); if(el) el.textContent=String(0); };
  qCount("taskCountAll");
  const qAll=document.getElementById("taskCountAll"); if(qAll) qAll.textContent=tasks.length;
  const qNew=document.getElementById("taskCountNew"); if(qNew) qNew.textContent=tasks.filter(t=>t.status==="New").length;
  const qDue=document.getElementById("taskCountDue"); if(qDue) qDue.textContent=tasks.filter(t=>dueState(t)==="due").length;
  const qOver=document.getElementById("taskCountOverdue"); if(qOver) qOver.textContent=tasks.filter(t=>dueState(t)==="overdue").length;
  const qUp=document.getElementById("taskCountUpcoming"); if(qUp) qUp.textContent=tasks.filter(t=>t.status==="New"&&t.due_date>todayISO()).length;
  const qComp=document.getElementById("taskCountCompleted"); if(qComp) qComp.textContent=tasks.filter(t=>t.status==="Completed").length;
  const qCan=document.getElementById("taskCountCancelled"); if(qCan) qCan.textContent=tasks.filter(t=>t.status==="Cancelled").length;


  const a =
    filtered();

  const visibleCount = document.getElementById("taskVisibleCount");
  if (visibleCount) visibleCount.textContent = String(a.length);

  if (!a.length) {

    tbody.innerHTML =
      `
      <tr>
        <td
          colspan="8"
          class="empty">
          No tasks found.
        </td>
      </tr>
      `;

    updateButtons();

    return;

  }


  tbody.innerHTML =
    a.map(
      t => {

        const selectedClass =
          selected.has(
            String(t.id)
          )
            ?
            "selected"
            :
            "";


        const checked =
          selected.has(
            String(t.id)
          )
            ?
            "checked"
            :
            "";


        let typeClass =
          "low";


        if (
          t.type ===
          "Important"
        ) {

          typeClass =
            "imp";

        }
        else if (
          t.type ===
          "Medium"
        ) {

          typeClass =
            "med";

        }


        let statusClass =
          "new";


        if (
          t.status ===
          "Completed"
        ) {

          statusClass =
            "completed";

        }
        else if (
          t.status ===
          "Cancelled"
        ) {

          statusClass =
            "cancelled";

        }


        let dueBadge =
          "";


        if (
          dueState(t) ===
          "overdue"
        ) {

          dueBadge =
            `
            <span class="pill overdue">
              Overdue
            </span>
            `;

        }
        else if (
          dueState(t) ===
          "due"
        ) {

          dueBadge =
            `
            <span class="pill due">
              Due
            </span>
            `;

        }


        return `
          <tr
            class="${selectedClass}"
            data-id="${esc(t.id)}">

            <td>
              <input
                class="rowCheck"
                type="checkbox"
                ${checked}>
            </td>

            <td>
              ${esc(t.task_date)}
            </td>

            <td>
              <b>
                ${esc(t.title)}
              </b>
            </td>

            <td>
              ${esc(t.details)}
            </td>

            <td>
              <span
                class="pill ${typeClass}">
                ${esc(t.type)}
              </span>
            </td>

            <td>
              ${esc(t.related)}
            </td>

            <td>
              ${esc(t.due_date)}
              ${dueBadge}
            </td>

            <td>
              <span
                class="pill ${statusClass}">
                ${esc(t.status)}
              </span>
            </td>

          </tr>
        `;

      }
    ).join("");


  document
    .querySelectorAll(
      ".rowCheck"
    )
    .forEach(
      checkbox => {

        checkbox.onchange =
          function() {

            const tr =
              this.closest(
                "tr"
              );

            const id =
              String(
                tr.dataset.id
              );


            if (
              this.checked
            ) {

              selected.add(
                id
              );

            }
            else {

              selected.delete(
                id
              );

            }


            render();

          };

      }
    );


  updateButtons();

}


/* =====================================================
   BUTTON STATE
===================================================== */

function updateButtons() {

  const n =
    selected.size;


  editBtn.disabled =
    n !== 1;


  removeBtn.disabled =
    n === 0;


  completeBtn.disabled =
    n !== 1;


  cancelBtn.disabled =
    n !== 1;


  const visible =
    filtered();


  selectAll.checked =
    visible.length > 0
    &&
    visible.every(
      t =>
        selected.has(
          String(t.id)
        )
    );

}


/* =====================================================
   OPEN CREATE MODAL
===================================================== */

function openCreateModal() {

  editingId =
    null;


  modalTitle.textContent =
    "Create New Task";


  saveBtn.textContent =
    "Create Task";


  taskForm.reset();


  date.value =
    todayISO();


  dueDate.value =
    todayISO();


  type.value =
    "Medium";


  related.value =
    "Work";


  modal.classList.add(
    "show"
  );

}


/* =====================================================
   OPEN EDIT MODAL
===================================================== */

function openEditModal(task) {

  if (!task) {

    return;

  }


  editingId =
    task.id;


  modalTitle.textContent =
    "Edit Task";


  saveBtn.textContent =
    "Save Changes";


  date.value =
    task.task_date ||
    todayISO();


  title.value =
    task.title ||
    "";


  details.value =
    task.details ||
    "";


  type.value =
    task.type ||
    "Medium";


  related.value =
    task.related ||
    "Work";


  dueDate.value =
    task.due_date ||
    todayISO();


  modal.classList.add(
    "show"
  );

}


/* =====================================================
   CLOSE MODAL
===================================================== */

function closeTaskModal() {

  editingId =
    null;

  taskForm.reset();

  modal.classList.remove(
    "show"
  );

}


/* =====================================================
   CREATE BUTTON
===================================================== */

createBtn.onclick = function() {
  if(view !== "tasks") return;
  openCreateModal();
};


/* =====================================================
   CANCEL BUTTON
===================================================== */

closeModalBtn.onclick =
  function(e) {

    e.preventDefault();

    closeTaskModal();

  };


/* =====================================================
   CLICK OUTSIDE MODAL
===================================================== */

modal.onclick =
  function(e) {

    if (
      e.target === modal
    ) {

      closeTaskModal();

    }

  };


/* =====================================================
   ESCAPE KEY
===================================================== */

document.addEventListener(
  "keydown",
  function(e) {

    if (
      e.key === "Escape"
      &&
      modal.classList.contains(
        "show"
      )
    ) {

      closeTaskModal();

    }

  }
);


/* =====================================================
   SAVE TASK
===================================================== */

taskForm.onsubmit =
  async function(e) {

    e.preventDefault();


    const {
      data: {
        user
      }
    } =
      await sb.auth.getUser();


    if (!user) {

      showLogin();

      return;

    }


    const payload = {

      task_date:
        date.value,

      title:
        title.value.trim(),

      details:
        details.value.trim(),

      type:
        type.value,

      related:
        related.value,

      due_date:
        dueDate.value

    };


    if (
      !payload.title
    ) {

      alert(
        "Please enter task title."
      );

      return;

    }


    if (
      !payload.due_date
    ) {

      alert(
        "Please select due date."
      );

      return;

    }


    saveBtn.disabled =
      true;


    saveBtn.textContent =
      "Saving...";


    let result;


    if (editingId) {

      /*
        User ID is included in the update condition
        so another user's task cannot be edited.
      */

      result =
        await sb
          .from("tasks")
          .update(payload)
          .eq(
            "id",
            editingId
          )
          .eq(
            "user_id",
            user.id
          );

    }
    else {

      result =
        await sb
          .from("tasks")
          .insert({

            ...payload,

            user_id:
              user.id,

            status:
              "New"

          });

    }


    saveBtn.disabled =
      false;


    saveBtn.textContent =
      editingId
        ?
        "Save Changes"
        :
        "Create Task";


    if (
      result.error
    ) {

      alert(
        "Unable to save task:\n"
        +
        result.error.message
      );

      return;

    }


    closeTaskModal();

    selected.clear();

    await loadTasks();

  };


/* =====================================================
   EDIT BUTTON
===================================================== */

editBtn.onclick =
  function() {

    if (
      selected.size !== 1
    ) {

      return;

    }


    const id =
      [...selected][0];


    const task =
      tasks.find(
        t =>
          String(t.id) ===
          String(id)
      );


    openEditModal(
      task
    );

  };


/* =====================================================
   REMOVE SELECTED
===================================================== */

removeBtn.onclick =
  async function() {

    if (
      selected.size === 0
    ) {

      return;

    }


    const ok =
      confirm(
        `Remove ${selected.size} selected task(s)?`
      );


    if (!ok) {

      return;

    }


    const {
      data: {
        user
      }
    } =
      await sb.auth.getUser();


    if (!user) {

      showLogin();

      return;

    }


    const ids =
      [...selected];


    const {
      error
    } =
      await sb
        .from("tasks")
        .delete()
        .in(
          "id",
          ids
        )
        .eq(
          "user_id",
          user.id
        );


    if (error) {

      alert(
        "Remove failed:\n"
        +
        error.message
      );

      return;

    }


    selected.clear();

    await loadTasks();

  };


/* =====================================================
   COMPLETE
===================================================== */

completeBtn.onclick =
  async function() {

    if (
      selected.size !== 1
    ) {

      return;

    }


    const id =
      [...selected][0];


    const {
      data: {
        user
      }
    } =
      await sb.auth.getUser();


    if (!user) {

      showLogin();

      return;

    }


    const {
      error
    } =
      await sb
        .from("tasks")
        .update({

          status:
            "Completed",

          completed_at:
            new Date()
              .toISOString()

        })
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          user.id
        );


    if (error) {

      alert(
        "Unable to complete task:\n"
        +
        error.message
      );

      return;

    }


    selected.clear();

    await loadTasks();

  };


/* =====================================================
   CANCEL TASK
===================================================== */

cancelBtn.onclick =
  async function() {

    if (
      selected.size !== 1
    ) {

      return;

    }


    const id =
      [...selected][0];


    const ok =
      confirm(
        "Cancel the selected task?"
      );


    if (!ok) {

      return;

    }


    const {
      data: {
        user
      }
    } =
      await sb.auth.getUser();


    if (!user) {

      showLogin();

      return;

    }


    const {
      error
    } =
      await sb
        .from("tasks")
        .update({

          status:
            "Cancelled",

          cancelled_at:
            new Date()
              .toISOString()

        })
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          user.id
        );


    if (error) {

      alert(
        "Unable to cancel task:\n"
        +
        error.message
      );

      return;

    }


    selected.clear();

    await loadTasks();

  };


/* =====================================================
   SELECT ALL
===================================================== */

selectAll.onchange =
  function() {

    const visible =
      filtered();


    visible.forEach(
      task => {

        const id =
          String(
            task.id
          );


        if (
          selectAll.checked
        ) {

          selected.add(
            id
          );

        }
        else {

          selected.delete(
            id
          );

        }

      }
    );


    render();

  };


/* =====================================================
   SEARCH / FILTER
===================================================== */

[
  search,
  typeFilter,
  relatedFilter,
  statusFilter
]
.forEach(
  element => {

    element.oninput =
      function() {

        selected.clear();

        render();

      };

  }
);


/* =====================================================
   TASK QUICK FILTERS
===================================================== */
document.querySelectorAll("[data-task-filter]").forEach(btn=>btn.addEventListener("click",()=>{
  quickTaskFilter=btn.dataset.taskFilter;
  document.querySelectorAll("[data-task-filter]").forEach(b=>b.classList.toggle("active",b===btn));
  selected.clear(); render();
}));

/* =====================================================
   

/* Shared HTML escaping helper */
function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
}
