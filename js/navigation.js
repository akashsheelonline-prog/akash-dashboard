/* =====================================================
   MENU SEARCH
===================================================== */

const originalMenuButtons = Array.from(
  sideNav.querySelectorAll("button")
);

function filterMenu(query) {
  const q = String(query || "").trim().toLowerCase();

  const ranked = originalMenuButtons.map((button, index) => {
    const haystack = (
      (button.textContent || "") + " " +
      (button.dataset.search || "") + " " +
      (button.dataset.view || "")
    ).toLowerCase();

    const match = !q || haystack.includes(q);
    const words = q ? q.split(/\s+/).filter(Boolean) : [];
    const wordMatch = words.length && words.every(word => haystack.includes(word));

    return {
      button,
      index,
      match: match || !!wordMatch
    };
  });

  const matches = ranked.filter(x => x.match);
  const misses = ranked.filter(x => !x.match);

  // Matching menus are physically moved to the top while typing.
  [...matches, ...misses].forEach(x => sideNav.appendChild(x.button));
  originalMenuButtons.forEach(button => {
    const item = ranked.find(x => x.button === button);
    button.classList.toggle("hidden", !!q && !item.match);
  });

  menuEmpty.style.display = q && matches.length === 0 ? "block" : "none";
}

menuSearch.addEventListener("input", () => {
  filterMenu(menuSearch.value);
});

menuSearch.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    menuSearch.value = "";
    filterMenu("");
    menuSearch.blur();
  }
});

/* =====================================================
   NAVIGATION
===================================================== */

document
  .querySelectorAll(
    ".nav button"
  )
  .forEach(
    button => {

      button.onclick =
        function() {

          const newView =
            this.dataset.view;


          /*
            New button opens Create modal.
          */

          const isTasks = newView === "tasks";
          const isDashboard = newView === "dashboard";
          const isWatermark = newView === "watermark";
          const isCompress = newView === "compress";
          const isImageConverter = newView === "image-converter";
          const isImageResize = newView === "image-resize";
          const isPdfTool = isWatermark || isCompress;
          const isImageTool = isImageConverter || isImageResize;
          const isSpecialTool = isPdfTool || isImageTool;
          const taskActionsRow = document.getElementById("taskActionsRow");
          const taskArea = document.getElementById("taskArea");
          const dashboardCards = document.getElementById("dashboardCards");

          document.getElementById("watermarkView")?.classList.toggle("hidden", !isWatermark);
          document.getElementById("compressView")?.classList.toggle("hidden", !isCompress);
          document.getElementById("imageConverterView")?.classList.toggle("hidden", !isImageConverter);
          document.getElementById("imageResizeView")?.classList.toggle("hidden", !isImageResize);
          dashboardCards?.classList.toggle("hidden", !isDashboard);
          taskArea?.classList.toggle("hidden", !isTasks);
          taskActionsRow?.classList.toggle("hidden", !isTasks);


          document
            .querySelectorAll(
              ".nav button"
            )
            .forEach(
              x =>
                x.classList.remove(
                  "active"
                )
            );


          this.classList.add(
            "active"
          );


          view =
            newView;


          selected.clear();


          const titles = {

            dashboard:
              "Akash Dashboard",

            tasks:
              "Tasks",

            watermark:
              "PDF Watermark",

            compress:
              "PDF Compress"

            ,
            "image-converter":
              "Image Converter",

            "image-resize":
              "Image Resize"
          };


          if (!isSpecialTool) {
            watermarkView.classList.add("hidden");
            compressView.classList.add("hidden");
            imageConverterView.classList.add("hidden");
            imageResizeView.classList.add("hidden");
            dashboardCards?.classList.toggle("hidden", !isDashboard);
            taskArea?.classList.toggle("hidden", !isTasks);
            taskActionsRow?.classList.toggle("hidden", !isTasks);
          }

          pageTitle.textContent =
            titles[view]
            ||
            "Akash Dashboard";


          render();

        };

    }
  );


