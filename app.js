/* =========================
   INDEXEDDB
========================== */

const DB_NAME =
  "BaseSegretaNoziDB";

const DB_VERSION =
  1;

const STORE_DOCUMENTS =
  "documents";

const STORE_PROJECTS =
  "projects";


function apriDatabase() {

  return new Promise((resolve, reject) => {

    const request =
      indexedDB.open(
        DB_NAME,
        DB_VERSION
      );


    request.onupgradeneeded = () => {

      const db =
        request.result;


      if (
        !db.objectStoreNames.contains(
          STORE_DOCUMENTS
        )
      ) {

        db.createObjectStore(
          STORE_DOCUMENTS,
          {
            keyPath: "id",
            autoIncrement: true
          }
        );

      }


      if (
        !db.objectStoreNames.contains(
          STORE_PROJECTS
        )
      ) {

        db.createObjectStore(
          STORE_PROJECTS,
          {
            keyPath: "id",
            autoIncrement: true
          }
        );

      }

    };


    request.onsuccess = () => {
      resolve(request.result);
    };


    request.onerror = () => {
      reject(request.error);
    };

  });

}


async function salvaFile(
  storeName,
  file
) {

  const db =
    await apriDatabase();


  return new Promise((resolve, reject) => {

    const transaction =
      db.transaction(
        storeName,
        "readwrite"
      );

    const store =
      transaction.objectStore(
        storeName
      );


    const record = {

      name: file.name,
      type: file.type,
      blob: file,
      createdAt: Date.now()

    };


    const request =
      store.add(record);


    request.onsuccess = () => {
      resolve(request.result);
    };


    request.onerror = () => {
      reject(request.error);
    };

  });

}


async function leggiTutti(
  storeName
) {

  const db =
    await apriDatabase();


  return new Promise((resolve, reject) => {

    const transaction =
      db.transaction(
        storeName,
        "readonly"
      );

    const store =
      transaction.objectStore(
        storeName
      );


    const request =
      store.getAll();


    request.onsuccess = () => {
      resolve(request.result);
    };


    request.onerror = () => {
      reject(request.error);
    };

  });

}


async function eliminaFile(
  storeName,
  id
) {

  const db =
    await apriDatabase();


  return new Promise((resolve, reject) => {

    const transaction =
      db.transaction(
        storeName,
        "readwrite"
      );

    const store =
      transaction.objectStore(
        storeName
      );


    const request =
      store.delete(id);


    request.onsuccess = () => {
      resolve();
    };


    request.onerror = () => {
      reject(request.error);
    };

  });

}


/* =========================
   BASE
========================== */

const hotspots =
  document.querySelectorAll(
    ".hotspot"
  );

const overlays =
  document.querySelectorAll(
    ".overlay"
  );

const closeButtons =
  document.querySelectorAll(
    ".close-button"
  );


hotspots.forEach((hotspot) => {

  hotspot.addEventListener(
    "click",
    () => {

      const url =
        hotspot.dataset.url;


      if (url) {

        window.open(
          url,
          "_blank",
          "noopener,noreferrer"
        );

        return;

      }


      const archiveId =
        hotspot.dataset.archive;


      if (archiveId) {

        document
          .getElementById(
            archiveId
          )
          .classList
          .add("aperto");

        return;

      }


      const targetId =
        hotspot.dataset.target;


      const targetOverlay =
        document.getElementById(
          targetId
        );


      if (targetOverlay) {

        targetOverlay
          .classList
          .add("aperto");

      }

    }
  );

});


/* =========================
   PANNELLI TEST
========================== */

closeButtons.forEach((button) => {

  button.addEventListener(
    "click",
    () => {

      button
        .closest(".overlay")
        .classList
        .remove("aperto");

    }
  );

});


overlays.forEach((overlay) => {

  overlay.addEventListener(
    "click",
    (event) => {

      if (
        event.target === overlay
      ) {

        overlay
          .classList
          .remove("aperto");

      }

    }
  );

});


/* =========================
   ARCHIVI
========================== */

const archiveBackButtons =
  document.querySelectorAll(
    "[data-close-archive]"
  );


archiveBackButtons.forEach(
  (button) => {

    button.addEventListener(
      "click",
      () => {

        button
          .closest(".archive-screen")
          .classList
          .remove("aperto");

      }
    );

  }
);


const addButtons =
  document.querySelectorAll(
    "[data-file-picker]"
  );


addButtons.forEach((button) => {

  button.addEventListener(
    "click",
    () => {

      document
        .getElementById(
          button.dataset.filePicker
        )
        .click();

    }
  );

});


/* =========================
   CARD
========================== */

function creaCard(
  record,
  storeName,
  refreshFunction
) {

  const card =
    document.createElement("article");

  card.className =
    "archive-card";


  const openButton =
    document.createElement("button");

  openButton.className =
    "archive-open";


  const preview =
    document.createElement("div");

  preview.className =
    "archive-preview";


  const name =
    document.createElement("span");

  name.className =
    "archive-name";

  name.textContent =
    record.name;


  const objectUrl =
    URL.createObjectURL(
      record.blob
    );


  if (
    record.type &&
    record.type.startsWith("image/")
  ) {

    const image =
      document.createElement("img");

    image.src =
      objectUrl;

    image.alt = "";

    preview.appendChild(image);

  } else {

    preview.textContent = "📄";

  }


  openButton.appendChild(
    preview
  );

  openButton.appendChild(
    name
  );


  openButton.addEventListener(
    "click",
    () => {

      window.open(
        objectUrl,
        "_blank"
      );

    }
  );


  const menuButton =
    document.createElement("button");

  menuButton.className =
    "card-menu-button";

  menuButton.textContent =
    "⋯";

  menuButton.setAttribute(
    "aria-label",
    "Azioni"
  );


  const menu =
    document.createElement("div");

  menu.className =
    "card-menu";


  const deleteButton =
    document.createElement("button");

  deleteButton.className =
    "delete-button";

  deleteButton.textContent =
    "Elimina";


  menu.appendChild(
    deleteButton
  );


  menuButton.addEventListener(
    "click",
    (event) => {

      event.stopPropagation();

      document
        .querySelectorAll(
          ".card-menu.aperto"
        )
        .forEach(
          (otherMenu) => {

            if (
              otherMenu !== menu
            ) {

              otherMenu
                .classList
                .remove("aperto");

            }

          }
        );


      menu
        .classList
        .toggle("aperto");

    }
  );


  deleteButton.addEventListener(
    "click",
    async (event) => {

      event.stopPropagation();


      const conferma =
        window.confirm(
          `Eliminare "${record.name}"?`
        );


      if (!conferma) {
        return;
      }


      await eliminaFile(
        storeName,
        record.id
      );


      await refreshFunction();

    }
  );


  card.appendChild(
    openButton
  );

  card.appendChild(
    menuButton
  );

  card.appendChild(
    menu
  );


  return card;

}


/* =========================
   MOTORE ARCHIVIO
========================== */

function collegaArchivio(
  options
) {

  const {
    storeName,
    inputId,
    gridId,
    emptyId
  } = options;


  const input =
    document.getElementById(
      inputId
    );

  const grid =
    document.getElementById(
      gridId
    );

  const empty =
    document.getElementById(
      emptyId
    );


  async function refresh() {

    const records =
      await leggiTutti(
        storeName
      );


    grid.innerHTML = "";


    if (
      records.length === 0
    ) {

      empty.style.display =
        "flex";

      return;

    }


    empty.style.display =
      "none";


    records
      .sort(
        (a, b) =>
          b.createdAt -
          a.createdAt
      )
      .forEach(
        (record) => {

          const card =
            creaCard(
              record,
              storeName,
              refresh
            );

          grid.appendChild(
            card
          );

        }
      );

  }


  input.addEventListener(
    "change",
    async () => {

      const files =
        Array.from(
          input.files
        );


      for (
        const file of files
      ) {

        await salvaFile(
          storeName,
          file
        );

      }


      input.value = "";


      await refresh();

    }
  );


  refresh();

}


collegaArchivio({

  storeName:
    STORE_DOCUMENTS,

  inputId:
    "documentsInput",

  gridId:
    "documentsGrid",

  emptyId:
    "documentsEmpty"

});


collegaArchivio({

  storeName:
    STORE_PROJECTS,

  inputId:
    "projectsInput",

  gridId:
    "projectsGrid",

  emptyId:
    "projectsEmpty"

});


/* Chiudi menu ⋯ cliccando altrove */

document.addEventListener(
  "click",
  () => {

    document
      .querySelectorAll(
        ".card-menu.aperto"
      )
      .forEach(
        (menu) => {

          menu
            .classList
            .remove("aperto");

        }
      );

  }
);
