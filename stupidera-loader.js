(() => {
  "use strict";

  const STUPIDERA_PAGES_KEY = "BaseSegretaNoziStupideraPagine";
  const STUPIDERA_INDEX_KEY = "BaseSegretaNoziStupideraPagina";
  const STICKER_STORAGE_KEY_STUPIDERA = "BaseSegretaNoziStickerInseriti";

  const ASSETS = [
    {
      src: "assets/stupidera-copertina.png",
      alt: "Copertina della Stupidera",
      kind: "cover"
    },
    {
      src: "assets/stupidera-intro.png",
      alt: "Introduzione della Stupidera",
      kind: "intro"
    },
    {
      src: "assets/stupidera-pagine.png",
      alt: "Pagine della Stupidera",
      kind: "editor"
    }
  ];

  function uid() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function nuovaPagina() {
    const oggi = new Date();
    const yyyy = oggi.getFullYear();
    const mm = String(oggi.getMonth() + 1).padStart(2, "0");
    const dd = String(oggi.getDate()).padStart(2, "0");

    return {
      id: uid(),
      date: `${yyyy}-${mm}-${dd}`,
      leftText: "",
      rightText: "",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  function leggiPagine() {
    try {
      const raw = localStorage.getItem(STUPIDERA_PAGES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          return parsed.map((p) => ({
            id: p.id || uid(),
            date: p.date || "",
            leftText: p.leftText || "",
            rightText: p.rightText || "",
            createdAt: p.createdAt || Date.now(),
            updatedAt: p.updatedAt || Date.now()
          }));
        }
      }
    } catch (e) {
      console.error("Stupidera: errore lettura pagine", e);
    }

    return [nuovaPagina()];
  }

  let pagine = leggiPagine();

  function leggiIndice() {
    try {
      const n = Number(localStorage.getItem(STUPIDERA_INDEX_KEY));
      if (Number.isInteger(n) && n >= 0) {
        return Math.min(n, pagine.length - 1);
      }
    } catch (e) {}

    return 0;
  }

  let indicePagina = leggiIndice();

  function salvaPagine() {
    try {
      localStorage.setItem(STUPIDERA_PAGES_KEY, JSON.stringify(pagine));
      localStorage.setItem(STUPIDERA_INDEX_KEY, String(indicePagina));
    } catch (e) {
      console.error("Stupidera: errore salvataggio pagine", e);
    }
  }

  function leggiSticker() {
    try {
      const raw = localStorage.getItem(STICKER_STORAGE_KEY_STUPIDERA);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Stupidera: errore lettura sticker", e);
      return [];
    }
  }

  function salvaSticker(items) {
    try {
      localStorage.setItem(
        STICKER_STORAGE_KEY_STUPIDERA,
        JSON.stringify(items)
      );
    } catch (e) {
      console.error("Stupidera: errore salvataggio sticker", e);
    }
  }

  function limita(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function migraStickerQuadernoSenzaPagina() {
    const items = leggiSticker();
    let cambiato = false;
    let count = 0;

    items.forEach((item) => {
      if (item.destination !== "quaderno") return;

      if (!item.pageId) {
        item.pageId = pagine[indicePagina].id;
        cambiato = true;
      }

      if (typeof item.width !== "number") {
        item.width = 15;
        cambiato = true;
      }

      if (typeof item.x !== "number") {
        item.x = 62 + (count % 2) * 17;
        cambiato = true;
      }

      if (typeof item.y !== "number") {
        item.y = 60 - Math.floor(count / 2) * 18;
        cambiato = true;
      }

      count++;
    });

    if (cambiato) salvaSticker(items);
  }

  function aggiornaSticker(id, patch) {
    const items = leggiSticker();
    const item = items.find((x) => x.id === id);
    if (!item) return;
    Object.assign(item, patch);
    salvaSticker(items);
  }

  function eliminaSticker(id) {
    const items = leggiSticker().filter((x) => x.id !== id);
    salvaSticker(items);
  }

  function eliminaStickerPagina(pageId) {
    const items = leggiSticker().filter(
      (x) => !(x.destination === "quaderno" && x.pageId === pageId)
    );
    salvaSticker(items);
  }

  function avviaStupidera() {
    if (document.getElementById("stupideraScreen")) return;

    /* =========================
       CSS
    ========================== */

    const style = document.createElement("style");

    style.textContent = `
      .stupidera-screen {
        position: fixed;
        inset: 0;
        display: none;
        align-items: center;
        justify-content: center;
        padding:
          max(14px, env(safe-area-inset-top))
          max(12px, env(safe-area-inset-right))
          max(14px, env(safe-area-inset-bottom))
          max(12px, env(safe-area-inset-left));
        background: linear-gradient(180deg, #eaf3fb 0%, #f7f2fb 100%);
        z-index: 700;
      }

      .stupidera-screen.aperto {
        display: flex;
      }

      .stupidera-stage {
        position: relative;
        width: min(96vw, 1200px);
        aspect-ratio: 3 / 2;
        max-height: 94vh;
      }

      .stupidera-image {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: contain;
        user-select: none;
        -webkit-user-select: none;
        -webkit-user-drag: none;
        -webkit-tap-highlight-color: transparent;
      }

      .stupidera-clickable {
        cursor: pointer;
      }

      .stupidera-back,
      .stupidera-page-add,
      .stupidera-page-delete {
        position: fixed;
        top: max(18px, env(safe-area-inset-top));
        appearance: none;
        border: 0;
        width: 52px;
        height: 52px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 17px;
        background: rgba(255,255,255,.90);
        color: #4c4274;
        box-shadow: 0 5px 16px rgba(65,55,90,.14);
        font-size: 30px;
        line-height: 1;
        cursor: pointer;
        z-index: 20;
        -webkit-tap-highlight-color: transparent;
      }

      .stupidera-back {
        left: max(18px, env(safe-area-inset-left));
      }

      .stupidera-page-add {
        right: max(18px, env(safe-area-inset-right));
      }

      .stupidera-page-delete {
        right:
          calc(
            max(18px, env(safe-area-inset-right))
            + 64px
          );
        font-size: 22px;
      }

      .stupidera-page-tools {
        display: none;
      }

      .stupidera-screen.editor-mode .stupidera-page-tools {
        display: flex;
      }

      .stupidera-editor {
        position: absolute;
        inset: 0;
        display: none;
        z-index: 4;
      }

      .stupidera-screen.editor-mode .stupidera-editor {
        display: block;
      }

      .stupidera-date {
        position: absolute;
        left: 10.8%;
        top: 12.0%;
        width: 24.5%;
        height: 6.8%;
        border: 0;
        outline: 0;
        background: rgba(255,255,255,.18);
        color: #2e63a3;
        font: 600 clamp(13px, 1.55vw, 22px) / 1.2
          -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
        border-radius: 9px;
        padding: 0 8px;
      }

      .stupidera-text {
        position: absolute;
        resize: none;
        border: 0;
        outline: 0;
        background: transparent;
        color: #34313a;
        font: 500 clamp(13px, 1.55vw, 22px) / 1.75
          -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
        padding: 1.2% 1.5%;
        caret-color: #4f70a3;
        overflow-y: auto;
        z-index: 5;
      }

      .stupidera-text::placeholder {
        color: rgba(70,65,80,.30);
      }

      .stupidera-left-text {
        left: 10.2%;
        top: 20.0%;
        width: 34.5%;
        height: 61.5%;
      }

      .stupidera-right-text {
        left: 55.0%;
        top: 15.0%;
        width: 33.2%;
        height: 66.0%;
      }

      .stupidera-nav {
        position: absolute;
        left: 50%;
        bottom: 3.0%;
        transform: translateX(-50%);
        display: none;
        align-items: center;
        gap: 12px;
        z-index: 12;
      }

      .stupidera-screen.editor-mode .stupidera-nav {
        display: flex;
      }

      .stupidera-nav button {
        appearance: none;
        border: 0;
        width: 40px;
        height: 40px;
        border-radius: 13px;
        background: rgba(255,255,255,.90);
        color: #4c4274;
        font-size: 25px;
        line-height: 1;
        box-shadow: 0 3px 10px rgba(65,55,90,.12);
        cursor: pointer;
      }

      .stupidera-nav button:disabled {
        opacity: .35;
        cursor: default;
      }

      .stupidera-counter {
        min-width: 68px;
        padding: 8px 11px;
        border-radius: 12px;
        background: rgba(255,255,255,.88);
        color: #4c4274;
        font-size: 14px;
        font-weight: 700;
        text-align: center;
        box-shadow: 0 3px 10px rgba(65,55,90,.10);
      }

      .stupidera-sticker-layer {
        position: absolute;
        inset: 0;
        z-index: 8;
        pointer-events: none;
      }

      .stupidera-sticker-object {
        position: absolute;
        pointer-events: auto;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-user-drag: none;
        cursor: grab;
        border: 2px solid transparent;
        border-radius: 14px;
      }

      .stupidera-sticker-object.selected {
        border-color: rgba(76,66,116,.60);
        background: rgba(255,255,255,.18);
      }

      .stupidera-sticker-image {
        display: block;
        width: 100%;
        height: auto;
        pointer-events: none;
        filter: drop-shadow(0 4px 5px rgba(60,50,80,.12));
        user-select: none;
        -webkit-user-select: none;
        -webkit-user-drag: none;
      }

      .stupidera-sticker-remove,
      .stupidera-sticker-resize {
        position: absolute;
        display: none;
        align-items: center;
        justify-content: center;
        appearance: none;
        border: 0;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        color: white;
        font-size: 19px;
        font-weight: 700;
        line-height: 1;
        box-shadow: 0 3px 9px rgba(45,40,60,.22);
        pointer-events: auto;
        touch-action: none;
      }

      .stupidera-sticker-object.selected
      .stupidera-sticker-remove,
      .stupidera-sticker-object.selected
      .stupidera-sticker-resize {
        display: flex;
      }

      .stupidera-sticker-remove {
        top: -14px;
        right: -14px;
        background: #9f5964;
      }

      .stupidera-sticker-resize {
        right: -14px;
        bottom: -14px;
        background: #66568c;
        font-size: 16px;
      }

      @media (max-width: 700px) {
        .stupidera-back,
        .stupidera-page-add,
        .stupidera-page-delete {
          width: 44px;
          height: 44px;
        }

        .stupidera-page-delete {
          right:
            calc(
              max(12px, env(safe-area-inset-right))
              + 54px
            );
        }

        .stupidera-page-add {
          right: max(12px, env(safe-area-inset-right));
        }

        .stupidera-date,
        .stupidera-text {
          font-size: 13px;
        }

        .stupidera-sticker-remove,
        .stupidera-sticker-resize {
          width: 30px;
          height: 30px;
        }
      }
    `;

    document.head.appendChild(style);


    /* =========================
       DOM
    ========================== */

    const screen = document.createElement("section");
    screen.className = "stupidera-screen";
    screen.id = "stupideraScreen";

    const stage = document.createElement("div");
    stage.className = "stupidera-stage";

    const image = document.createElement("img");
    image.className = "stupidera-image stupidera-clickable";
    image.id = "stupideraImage";
    image.draggable = false;

    const editor = document.createElement("div");
    editor.className = "stupidera-editor";

    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.className = "stupidera-date";

    const leftText = document.createElement("textarea");
    leftText.className = "stupidera-text stupidera-left-text";
    leftText.placeholder = "Scrivi qui...";

    const rightText = document.createElement("textarea");
    rightText.className = "stupidera-text stupidera-right-text";
    rightText.placeholder = "Aggiungi un'altra nota...";

    const stickerLayer = document.createElement("div");
    stickerLayer.className = "stupidera-sticker-layer";

    editor.appendChild(dateInput);
    editor.appendChild(leftText);
    editor.appendChild(rightText);
    editor.appendChild(stickerLayer);

    const nav = document.createElement("div");
    nav.className = "stupidera-nav";

    const prev = document.createElement("button");
    prev.type = "button";
    prev.textContent = "‹";
    prev.setAttribute("aria-label", "Pagina precedente");

    const counter = document.createElement("div");
    counter.className = "stupidera-counter";

    const next = document.createElement("button");
    next.type = "button";
    next.textContent = "›";
    next.setAttribute("aria-label", "Pagina successiva");

    nav.appendChild(prev);
    nav.appendChild(counter);
    nav.appendChild(next);

    const back = document.createElement("button");
    back.className = "stupidera-back";
    back.type = "button";
    back.textContent = "‹";
    back.setAttribute("aria-label", "Indietro");

    const pageDelete = document.createElement("button");
    pageDelete.className = "stupidera-page-delete stupidera-page-tools";
    pageDelete.type = "button";
    pageDelete.textContent = "⌫";
    pageDelete.setAttribute("aria-label", "Elimina pagina");

    const pageAdd = document.createElement("button");
    pageAdd.className = "stupidera-page-add stupidera-page-tools";
    pageAdd.type = "button";
    pageAdd.textContent = "+";
    pageAdd.setAttribute("aria-label", "Nuova pagina");

    stage.appendChild(image);
    stage.appendChild(editor);
    stage.appendChild(nav);

    screen.appendChild(stage);
    screen.appendChild(back);
    screen.appendChild(pageDelete);
    screen.appendChild(pageAdd);

    document.body.appendChild(screen);


    /* =========================
       STATO
    ========================== */

    let schermata = 0;
    let stickerSelezionatoId = null;

    function salvaPaginaCorrente() {
      if (!pagine[indicePagina]) return;

      pagine[indicePagina].date = dateInput.value;
      pagine[indicePagina].leftText = leftText.value;
      pagine[indicePagina].rightText = rightText.value;
      pagine[indicePagina].updatedAt = Date.now();

      salvaPagine();
    }

    function deselezionaSticker() {
      stickerSelezionatoId = null;

      stickerLayer
        .querySelectorAll(".stupidera-sticker-object.selected")
        .forEach((el) => el.classList.remove("selected"));
    }

    function selezionaSticker(el, id) {
      deselezionaSticker();
      el.classList.add("selected");
      stickerSelezionatoId = id;
    }

    function renderSticker() {
      stickerLayer.innerHTML = "";
      stickerSelezionatoId = null;

      if (!pagine[indicePagina]) return;

      const currentId = pagine[indicePagina].id;

      const items = leggiSticker().filter(
        (x) => x.destination === "quaderno" && x.pageId === currentId
      );

      items.forEach((item, index) => {
        if (typeof item.width !== "number") item.width = 15;
        if (typeof item.x !== "number") item.x = 62 + (index % 2) * 17;
        if (typeof item.y !== "number") item.y = 60 - Math.floor(index / 2) * 18;

        const obj = document.createElement("div");
        obj.className = "stupidera-sticker-object";
        obj.dataset.id = item.id;
        obj.style.left = `${item.x}%`;
        obj.style.top = `${item.y}%`;
        obj.style.width = `${item.width}%`;

        const img = document.createElement("img");
        img.className = "stupidera-sticker-image";
        img.src = `assets/${item.file}`;
        img.alt = item.label || "";

        const remove = document.createElement("button");
        remove.className = "stupidera-sticker-remove";
        remove.type = "button";
        remove.textContent = "×";
        remove.setAttribute("aria-label", "Rimuovi sticker");

        const resize = document.createElement("button");
        resize.className = "stupidera-sticker-resize";
        resize.type = "button";
        resize.textContent = "↘";
        resize.setAttribute("aria-label", "Ridimensiona sticker");

        obj.appendChild(img);
        obj.appendChild(remove);
        obj.appendChild(resize);

        obj.addEventListener("pointerdown", (event) => {
          if (event.target === remove || event.target === resize) return;

          event.preventDefault();
          event.stopPropagation();

          selezionaSticker(obj, item.id);

          const pageRect = stage.getBoundingClientRect();
          const objectRect = obj.getBoundingClientRect();

          const offsetX = event.clientX - objectRect.left;
          const offsetY = event.clientY - objectRect.top;

          obj.setPointerCapture(event.pointerId);

          function muovi(moveEvent) {
            let leftPx = moveEvent.clientX - pageRect.left - offsetX;
            let topPx = moveEvent.clientY - pageRect.top - offsetY;

            const widthPx = obj.offsetWidth;
            const heightPx = obj.offsetHeight;

            leftPx = limita(
              leftPx,
              0,
              Math.max(0, pageRect.width - widthPx)
            );

            topPx = limita(
              topPx,
              0,
              Math.max(0, pageRect.height - heightPx)
            );

            item.x = (leftPx / pageRect.width) * 100;
            item.y = (topPx / pageRect.height) * 100;

            obj.style.left = `${item.x}%`;
            obj.style.top = `${item.y}%`;
          }

          function fine(endEvent) {
            try {
              obj.releasePointerCapture(endEvent.pointerId);
            } catch (e) {}

            obj.removeEventListener("pointermove", muovi);
            obj.removeEventListener("pointerup", fine);
            obj.removeEventListener("pointercancel", fine);

            aggiornaSticker(item.id, {
              x: item.x,
              y: item.y
            });
          }

          obj.addEventListener("pointermove", muovi);
          obj.addEventListener("pointerup", fine);
          obj.addEventListener("pointercancel", fine);
        });

        resize.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          event.stopPropagation();

          selezionaSticker(obj, item.id);

          const pageRect = stage.getBoundingClientRect();
          const objectRect = obj.getBoundingClientRect();
          const left = objectRect.left - pageRect.left;

          resize.setPointerCapture(event.pointerId);

          function ridimensiona(moveEvent) {
            let newWidthPx =
              moveEvent.clientX - pageRect.left - left;

            newWidthPx = limita(
              newWidthPx,
              pageRect.width * 0.07,
              pageRect.width * 0.40
            );

            item.width = (newWidthPx / pageRect.width) * 100;

            if (item.x + item.width > 100) {
              item.x = Math.max(0, 100 - item.width);
              obj.style.left = `${item.x}%`;
            }

            obj.style.width = `${item.width}%`;
          }

          function fineResize(endEvent) {
            try {
              resize.releasePointerCapture(endEvent.pointerId);
            } catch (e) {}

            resize.removeEventListener("pointermove", ridimensiona);
            resize.removeEventListener("pointerup", fineResize);
            resize.removeEventListener("pointercancel", fineResize);

            aggiornaSticker(item.id, {
              x: item.x,
              y: item.y,
              width: item.width
            });
          }

          resize.addEventListener("pointermove", ridimensiona);
          resize.addEventListener("pointerup", fineResize);
          resize.addEventListener("pointercancel", fineResize);
        });

        remove.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          event.stopPropagation();

          eliminaSticker(item.id);
          renderSticker();
        });

        stickerLayer.appendChild(obj);
      });
    }

    function renderPagina() {
      if (!pagine.length) {
        pagine = [nuovaPagina()];
        indicePagina = 0;
      }

      indicePagina = limita(
        indicePagina,
        0,
        pagine.length - 1
      );

      const pagina = pagine[indicePagina];

      dateInput.value = pagina.date || "";
      leftText.value = pagina.leftText || "";
      rightText.value = pagina.rightText || "";

      counter.textContent =
        `${indicePagina + 1} / ${pagine.length}`;

      prev.disabled = indicePagina === 0;
      next.disabled = indicePagina === pagine.length - 1;

      migraStickerQuadernoSenzaPagina();
      renderSticker();
      salvaPagine();
    }

    function mostraSchermata(indice) {
      schermata = limita(indice, 0, ASSETS.length - 1);

      image.src = ASSETS[schermata].src;
      image.alt = ASSETS[schermata].alt;

      const editorMode =
        ASSETS[schermata].kind === "editor";

      screen.classList.toggle(
        "editor-mode",
        editorMode
      );

      image.classList.toggle(
        "stupidera-clickable",
        !editorMode
      );

      if (editorMode) {
        renderPagina();
      } else {
        deselezionaSticker();
      }
    }

    function apriDaCopertina() {
      schermata = 0;
      mostraSchermata(0);
      screen.classList.add("aperto");
    }

    function apriDirettamentePagine() {
      schermata = 2;
      mostraSchermata(2);
      screen.classList.add("aperto");
    }

    function chiudi() {
      salvaPaginaCorrente();
      deselezionaSticker();
      screen.classList.remove("aperto");
      schermata = 0;
    }


    /* =========================
       EVENTI
    ========================== */

    image.addEventListener("click", () => {
      if (ASSETS[schermata].kind !== "editor") {
        mostraSchermata(schermata + 1);
      }
    });

    back.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (schermata === 2) {
        salvaPaginaCorrente();
      }

      if (schermata > 0) {
        mostraSchermata(schermata - 1);
      } else {
        chiudi();
      }
    });

    leftText.addEventListener("input", salvaPaginaCorrente);
    rightText.addEventListener("input", salvaPaginaCorrente);
    dateInput.addEventListener("change", salvaPaginaCorrente);

    leftText.addEventListener("pointerdown", deselezionaSticker);
    rightText.addEventListener("pointerdown", deselezionaSticker);
    dateInput.addEventListener("pointerdown", deselezionaSticker);

    prev.addEventListener("click", () => {
      salvaPaginaCorrente();

      if (indicePagina > 0) {
        indicePagina--;
        renderPagina();
      }
    });

    next.addEventListener("click", () => {
      salvaPaginaCorrente();

      if (indicePagina < pagine.length - 1) {
        indicePagina++;
        renderPagina();
      }
    });

    pageAdd.addEventListener("click", () => {
      salvaPaginaCorrente();

      pagine.push(nuovaPagina());
      indicePagina = pagine.length - 1;

      salvaPagine();
      renderPagina();

      setTimeout(() => leftText.focus(), 100);
    });

    pageDelete.addEventListener("click", () => {
      const numero = indicePagina + 1;

      if (!window.confirm(`Eliminare la pagina ${numero} della Stupidera?`)) {
        return;
      }

      const idEliminata = pagine[indicePagina].id;
      eliminaStickerPagina(idEliminata);

      if (pagine.length === 1) {
        pagine[0] = nuovaPagina();
        indicePagina = 0;
      } else {
        pagine.splice(indicePagina, 1);

        if (indicePagina > pagine.length - 1) {
          indicePagina = pagine.length - 1;
        }
      }

      salvaPagine();
      renderPagina();
    });

    window.addEventListener("pagehide", salvaPaginaCorrente);

    window.addEventListener("resize", () => {
      if (
        screen.classList.contains("aperto") &&
        screen.classList.contains("editor-mode")
      ) {
        renderSticker();
      }
    });


    /* =========================
       HOTSPOT QUADERNO
    ========================== */

    const notebookHotspot =
      document.querySelector(
        '.hotspot[data-target="overlayNotebook"]'
      ) ||
      document.querySelector(
        '.hotspot[data-stupidera="true"]'
      );

    if (notebookHotspot) {
      notebookHotspot.removeAttribute("data-target");
      notebookHotspot.setAttribute("data-stupidera", "true");

      notebookHotspot.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          apriDaCopertina();
        },
        true
      );
    } else {
      console.error(
        "Stupidera: hotspot del Quaderno delle cose buffe non trovato."
      );
    }


    /* =========================
       INSERISCI → QUADERNO
       Si aggancia al pulsante già esistente.
    ========================== */

    const quadernoDestinationButton =
      document.querySelector(
        '.destination-button[data-destination="quaderno"]'
      );

    if (quadernoDestinationButton) {
      quadernoDestinationButton.addEventListener(
        "click",
        () => {
          /*
            Il listener originale salva lo sticker.
            Dopo che ha finito, assegniamo alla pagina
            corrente gli eventuali sticker appena
            salvati senza pageId e apriamo la Stupidera.
          */
          setTimeout(() => {
            migraStickerQuadernoSenzaPagina();

            const stickersScreen =
              document.getElementById("stickersScreen");

            const viewer =
              document.getElementById("stickerViewer");

            const destinationOverlay =
              document.getElementById("destinationOverlay");

            if (stickersScreen) {
              stickersScreen.classList.remove("aperto");
            }

            if (viewer) {
              viewer.classList.remove("aperto");
            }

            if (destinationOverlay) {
              destinationOverlay.classList.remove("aperto");
            }

            apriDirettamentePagine();
          }, 0);
        }
      );
    }


    /* =========================
       PRELOAD
    ========================== */

    ASSETS.forEach((item) => {
      const preload = new Image();
      preload.src = item.src;
    });

    salvaPagine();

    console.log(
      "La Stupidera completa è pronta."
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      avviaStupidera,
      { once: true }
    );
  } else {
    avviaStupidera();
  }
})();
