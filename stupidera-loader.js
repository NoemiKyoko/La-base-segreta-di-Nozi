(() => {
  "use strict";

  const STUPIDERA_PAGES_KEY = "BaseSegretaNoziStupideraPagine";
  const STUPIDERA_INDEX_KEY = "BaseSegretaNoziStupideraPagina";
  const STICKER_STORAGE_KEY = "BaseSegretaNoziStickerInseriti";

  const MEDIA_DB_NAME = "BaseSegretaNoziStupideraMediaDB";
  const MEDIA_DB_VERSION = 1;
  const MEDIA_STORE = "media";

  const ASSETS = [
    { src: "assets/stupidera-copertina.png", alt: "Copertina della Stupidera", kind: "cover" },
    { src: "assets/stupidera-intro.png", alt: "Introduzione della Stupidera", kind: "intro" },
    { src: "assets/stupidera-pagine.png", alt: "Pagine della Stupidera", kind: "editor" }
  ];

  const uid = () =>
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const limita = (n, min, max) =>
    Math.min(max, Math.max(min, n));

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
      const raw = localStorage.getItem(STICKER_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function salvaSticker(items) {
    localStorage.setItem(STICKER_STORAGE_KEY, JSON.stringify(items));
  }

  function migraStickerQuadernoSenzaPagina() {
    const items = leggiSticker();
    let cambiato = false;
    let count = 0;
    const page = pagine[indicePagina];
    if (!page) return;

    items.forEach((item) => {
      if (item.destination !== "quaderno") return;

      if (!item.pageId) {
        item.pageId = page.id;
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
        item.y = 58 - Math.floor(count / 2) * 18;
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
    salvaSticker(leggiSticker().filter((x) => x.id !== id));
  }

  function eliminaStickerPagina(pageId) {
    salvaSticker(
      leggiSticker().filter(
        (x) => !(x.destination === "quaderno" && x.pageId === pageId)
      )
    );
  }

  function apriMediaDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(MEDIA_DB_NAME, MEDIA_DB_VERSION);

      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(MEDIA_STORE)) {
          db.createObjectStore(MEDIA_STORE, { keyPath: "id" });
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function salvaMedia(record) {
    const db = await apriMediaDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MEDIA_STORE, "readwrite");
      const store = tx.objectStore(MEDIA_STORE);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function leggiMediaPagina(pageId) {
    const db = await apriMediaDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MEDIA_STORE, "readonly");
      const store = tx.objectStore(MEDIA_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        resolve(
          req.result.filter(
            (x) => x.pageId === pageId
          )
        );
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function aggiornaMedia(id, patch) {
    const db = await apriMediaDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MEDIA_STORE, "readwrite");
      const store = tx.objectStore(MEDIA_STORE);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const item = getReq.result;
        if (!item) {
          resolve();
          return;
        }
        Object.assign(item, patch);
        const putReq = store.put(item);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };

      getReq.onerror = () => reject(getReq.error);
    });
  }

  async function eliminaMedia(id) {
    const db = await apriMediaDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MEDIA_STORE, "readwrite");
      const store = tx.objectStore(MEDIA_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function eliminaMediaPagina(pageId) {
    const items = await leggiMediaPagina(pageId);
    for (const item of items) {
      await eliminaMedia(item.id);
    }
  }

  function avviaStupidera() {
    if (document.getElementById("stupideraScreen")) return;

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

      .stupidera-screen.aperto { display: flex; }

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

      .stupidera-clickable { cursor: pointer; }

      .stupidera-back {
        position: fixed;
        top: max(18px, env(safe-area-inset-top));
        left: max(18px, env(safe-area-inset-left));
        appearance: none;
        border: 0;
        width: 50px;
        height: 50px;
        border-radius: 16px;
        background: rgba(255,255,255,.90);
        color: #4c4274;
        box-shadow: 0 5px 16px rgba(65,55,90,.14);
        font-size: 30px;
        cursor: pointer;
        z-index: 30;
      }

      .stupidera-toolbar {
        position: fixed;
        top: max(18px, env(safe-area-inset-top));
        right: max(18px, env(safe-area-inset-right));
        display: none;
        align-items: center;
        gap: 8px;
        z-index: 30;
      }

      .stupidera-screen.editor-mode .stupidera-toolbar {
        display: flex;
      }

      .stupidera-tool {
        appearance: none;
        border: 0;
        min-height: 46px;
        padding: 0 15px;
        border-radius: 15px;
        background: rgba(255,255,255,.92);
        color: #4c4274;
        box-shadow: 0 5px 16px rgba(65,55,90,.12);
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }

      .stupidera-tool.square {
        width: 46px;
        padding: 0;
        font-size: 25px;
      }

      .stupidera-tool.delete {
        color: #8f3d4d;
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
        z-index: 5;
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
        bottom: 2.4%;
        transform: translateX(-50%);
        display: none;
        align-items: center;
        gap: 12px;
        z-index: 20;
      }

      .stupidera-screen.editor-mode .stupidera-nav {
        display: flex;
      }

      .stupidera-nav button {
        appearance: none;
        border: 0;
        width: 42px;
        height: 42px;
        border-radius: 13px;
        background: rgba(255,255,255,.92);
        color: #4c4274;
        font-size: 26px;
        box-shadow: 0 3px 10px rgba(65,55,90,.12);
        cursor: pointer;
      }

      .stupidera-nav button:disabled {
        opacity: .30;
        cursor: default;
      }

      .stupidera-counter {
        min-width: 72px;
        padding: 9px 12px;
        border-radius: 12px;
        background: rgba(255,255,255,.92);
        color: #4c4274;
        font-size: 14px;
        font-weight: 700;
        text-align: center;
        box-shadow: 0 3px 10px rgba(65,55,90,.10);
      }

      .stupidera-object-layer {
        position: absolute;
        inset: 0;
        z-index: 8;
        pointer-events: none;
      }

      .stupidera-object {
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

      .stupidera-object.selected {
        border-color: rgba(76,66,116,.60);
        background: rgba(255,255,255,.18);
      }

      .stupidera-object img {
        display: block;
        width: 100%;
        height: auto;
        pointer-events: none;
        object-fit: contain;
        filter: drop-shadow(0 4px 5px rgba(60,50,80,.12));
        user-select: none;
        -webkit-user-select: none;
        -webkit-user-drag: none;
      }

      .stupidera-object-remove,
      .stupidera-object-resize {
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

      .stupidera-object.selected .stupidera-object-remove,
      .stupidera-object.selected .stupidera-object-resize {
        display: flex;
      }

      .stupidera-object-remove {
        top: -14px;
        right: -14px;
        background: #9f5964;
      }

      .stupidera-object-resize {
        right: -14px;
        bottom: -14px;
        background: #66568c;
        font-size: 16px;
      }

      .stupidera-file-input { display: none; }

      @media (max-width: 800px) {
        .stupidera-toolbar {
          gap: 5px;
        }

        .stupidera-tool {
          min-height: 42px;
          padding: 0 11px;
          font-size: 12px;
        }

        .stupidera-tool.square {
          width: 42px;
          font-size: 23px;
        }
      }
    `;
    document.head.appendChild(style);

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

    const objectLayer = document.createElement("div");
    objectLayer.className = "stupidera-object-layer";

    editor.appendChild(dateInput);
    editor.appendChild(leftText);
    editor.appendChild(rightText);
    editor.appendChild(objectLayer);

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

    const toolbar = document.createElement("div");
    toolbar.className = "stupidera-toolbar";

    const stickerBtn = document.createElement("button");
    stickerBtn.className = "stupidera-tool";
    stickerBtn.type = "button";
    stickerBtn.textContent = "Sticker";

    const imageBtn = document.createElement("button");
    imageBtn.className = "stupidera-tool";
    imageBtn.type = "button";
    imageBtn.textContent = "Immagine";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "stupidera-tool square delete";
    deleteBtn.type = "button";
    deleteBtn.textContent = "⌫";
    deleteBtn.setAttribute("aria-label", "Elimina pagina");

    const addBtn = document.createElement("button");
    addBtn.className = "stupidera-tool square";
    addBtn.type = "button";
    addBtn.textContent = "+";
    addBtn.setAttribute("aria-label", "Nuova pagina");

    toolbar.appendChild(stickerBtn);
    toolbar.appendChild(imageBtn);
    toolbar.appendChild(deleteBtn);
    toolbar.appendChild(addBtn);

    const fileInput = document.createElement("input");
    fileInput.className = "stupidera-file-input";
    fileInput.type = "file";
    fileInput.accept = "image/*";

    stage.appendChild(image);
    stage.appendChild(editor);
    stage.appendChild(nav);

    screen.appendChild(stage);
    screen.appendChild(back);
    screen.appendChild(toolbar);
    screen.appendChild(fileInput);

    document.body.appendChild(screen);

    let schermata = 0;
    let selectedId = null;

    function salvaPaginaCorrente() {
      if (!pagine[indicePagina]) return;

      pagine[indicePagina].date = dateInput.value;
      pagine[indicePagina].leftText = leftText.value;
      pagine[indicePagina].rightText = rightText.value;
      pagine[indicePagina].updatedAt = Date.now();
      salvaPagine();
    }

    function deselezionaOggetti() {
      selectedId = null;
      objectLayer
        .querySelectorAll(".stupidera-object.selected")
        .forEach((el) => el.classList.remove("selected"));
    }

    function selezionaOggetto(el, id) {
      deselezionaOggetti();
      el.classList.add("selected");
      selectedId = id;
    }

    function attivaDragResize({
      obj,
      item,
      remove,
      resize,
      onUpdate,
      onRemove
    }) {
      obj.addEventListener("pointerdown", (event) => {
        if (event.target === remove || event.target === resize) return;

        event.preventDefault();
        event.stopPropagation();

        selezionaOggetto(obj, item.id);

        const pageRect = stage.getBoundingClientRect();
        const objectRect = obj.getBoundingClientRect();
        const offsetX = event.clientX - objectRect.left;
        const offsetY = event.clientY - objectRect.top;

        obj.setPointerCapture(event.pointerId);

        function muovi(moveEvent) {
          let leftPx = moveEvent.clientX - pageRect.left - offsetX;
          let topPx = moveEvent.clientY - pageRect.top - offsetY;

          leftPx = limita(
            leftPx,
            0,
            Math.max(0, pageRect.width - obj.offsetWidth)
          );

          topPx = limita(
            topPx,
            0,
            Math.max(0, pageRect.height - obj.offsetHeight)
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

          onUpdate({
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

        selezionaOggetto(obj, item.id);

        const pageRect = stage.getBoundingClientRect();
        const objectRect = obj.getBoundingClientRect();
        const left = objectRect.left - pageRect.left;

        resize.setPointerCapture(event.pointerId);

        function ridimensiona(moveEvent) {
          let w =
            moveEvent.clientX - pageRect.left - left;

          w = limita(
            w,
            pageRect.width * 0.07,
            pageRect.width * 0.42
          );

          item.width = (w / pageRect.width) * 100;

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

          onUpdate({
            x: item.x,
            y: item.y,
            width: item.width
          });
        }

        resize.addEventListener("pointermove", ridimensiona);
        resize.addEventListener("pointerup", fineResize);
        resize.addEventListener("pointercancel", fineResize);
      });

      remove.addEventListener("pointerdown", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await onRemove();
        await renderOggetti();
      });
    }

    function creaOggettoVisuale(item, src, type) {
      const obj = document.createElement("div");
      obj.className = "stupidera-object";
      obj.dataset.id = item.id;
      obj.dataset.type = type;
      obj.style.left = `${item.x}%`;
      obj.style.top = `${item.y}%`;
      obj.style.width = `${item.width}%`;

      const img = document.createElement("img");
      img.src = src;
      img.alt = item.label || item.name || "";

      const remove = document.createElement("button");
      remove.className = "stupidera-object-remove";
      remove.type = "button";
      remove.textContent = "×";

      const resize = document.createElement("button");
      resize.className = "stupidera-object-resize";
      resize.type = "button";
      resize.textContent = "↘";

      obj.appendChild(img);
      obj.appendChild(remove);
      obj.appendChild(resize);

      return { obj, remove, resize };
    }

    async function renderOggetti() {
      objectLayer.innerHTML = "";
      selectedId = null;

      const page = pagine[indicePagina];
      if (!page) return;

      migraStickerQuadernoSenzaPagina();

      const stickers = leggiSticker().filter(
        (x) => x.destination === "quaderno" && x.pageId === page.id
      );

      stickers.forEach((item, index) => {
        if (typeof item.width !== "number") item.width = 15;
        if (typeof item.x !== "number") item.x = 62 + (index % 2) * 17;
        if (typeof item.y !== "number") item.y = 58 - Math.floor(index / 2) * 18;

        const ui = creaOggettoVisuale(
          item,
          `assets/${item.file}`,
          "sticker"
        );

        attivaDragResize({
          obj: ui.obj,
          item,
          remove: ui.remove,
          resize: ui.resize,
          onUpdate: (patch) => aggiornaSticker(item.id, patch),
          onRemove: async () => eliminaSticker(item.id)
        });

        objectLayer.appendChild(ui.obj);
      });

      try {
        const media = await leggiMediaPagina(page.id);

        media.forEach((item, index) => {
          if (typeof item.width !== "number") item.width = 22;
          if (typeof item.x !== "number") item.x = 58 + (index % 2) * 18;
          if (typeof item.y !== "number") item.y = 48 + Math.floor(index / 2) * 16;

          const url = URL.createObjectURL(item.blob);

          const ui = creaOggettoVisuale(
            item,
            url,
            "image"
          );

          ui.obj.querySelector("img").addEventListener(
            "load",
            () => URL.revokeObjectURL(url),
            { once: true }
          );

          attivaDragResize({
            obj: ui.obj,
            item,
            remove: ui.remove,
            resize: ui.resize,
            onUpdate: (patch) => aggiornaMedia(item.id, patch),
            onRemove: async () => eliminaMedia(item.id)
          });

          objectLayer.appendChild(ui.obj);
        });
      } catch (e) {
        console.error("Stupidera: errore render immagini", e);
      }
    }

    async function renderPagina() {
      if (!pagine.length) {
        pagine = [nuovaPagina()];
        indicePagina = 0;
      }

      indicePagina = limita(indicePagina, 0, pagine.length - 1);

      const pagina = pagine[indicePagina];

      dateInput.value = pagina.date || "";
      leftText.value = pagina.leftText || "";
      rightText.value = pagina.rightText || "";

      counter.textContent = `${indicePagina + 1} / ${pagine.length}`;
      prev.disabled = indicePagina === 0;
      next.disabled = indicePagina === pagine.length - 1;

      await renderOggetti();
      salvaPagine();
    }

    function mostraSchermata(indice) {
      schermata = limita(indice, 0, ASSETS.length - 1);

      image.src = ASSETS[schermata].src;
      image.alt = ASSETS[schermata].alt;

      const editorMode = ASSETS[schermata].kind === "editor";

      screen.classList.toggle("editor-mode", editorMode);
      image.classList.toggle("stupidera-clickable", !editorMode);

      if (editorMode) {
        renderPagina();
      } else {
        deselezionaOggetti();
      }
    }

    function apriDaCopertina() {
      mostraSchermata(0);
      screen.classList.add("aperto");
    }

    function apriDirettamentePagine() {
      mostraSchermata(2);
      screen.classList.add("aperto");
    }

    function chiudi() {
      salvaPaginaCorrente();
      deselezionaOggetti();
      screen.classList.remove("aperto");
      schermata = 0;
    }

    image.addEventListener("click", () => {
      if (ASSETS[schermata].kind !== "editor") {
        mostraSchermata(schermata + 1);
      }
    });

    back.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (schermata === 2) salvaPaginaCorrente();

      if (schermata > 0) {
        mostraSchermata(schermata - 1);
      } else {
        chiudi();
      }
    });

    leftText.addEventListener("input", salvaPaginaCorrente);
    rightText.addEventListener("input", salvaPaginaCorrente);
    dateInput.addEventListener("change", salvaPaginaCorrente);

    [leftText, rightText, dateInput].forEach((el) => {
      el.addEventListener("pointerdown", deselezionaOggetti);
    });

    prev.addEventListener("click", async () => {
      salvaPaginaCorrente();
      if (indicePagina > 0) {
        indicePagina--;
        await renderPagina();
      }
    });

    next.addEventListener("click", async () => {
      salvaPaginaCorrente();
      if (indicePagina < pagine.length - 1) {
        indicePagina++;
        await renderPagina();
      }
    });

    addBtn.addEventListener("click", async () => {
      salvaPaginaCorrente();
      pagine.push(nuovaPagina());
      indicePagina = pagine.length - 1;
      salvaPagine();
      await renderPagina();
      setTimeout(() => leftText.focus(), 100);
    });

    deleteBtn.addEventListener("click", async () => {
      const numero = indicePagina + 1;

      if (!window.confirm(`Eliminare la pagina ${numero} della Stupidera?`)) {
        return;
      }

      const pageId = pagine[indicePagina].id;

      eliminaStickerPagina(pageId);
      await eliminaMediaPagina(pageId);

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
      await renderPagina();
    });

    stickerBtn.addEventListener("click", () => {
      salvaPaginaCorrente();

      const stickersScreen = document.getElementById("stickersScreen");

      if (!stickersScreen) {
        window.alert("La galleria Sticker di Nozi non è disponibile.");
        return;
      }

      screen.classList.remove("aperto");
      stickersScreen.classList.add("aperto");
    });

    imageBtn.addEventListener("click", () => {
      fileInput.click();
    });

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files && fileInput.files[0];

      if (!file) return;

      if (!file.type.startsWith("image/")) {
        window.alert("Scegli un'immagine.");
        fileInput.value = "";
        return;
      }

      const page = pagine[indicePagina];

      const existing = await leggiMediaPagina(page.id);
      const n = existing.length;

      await salvaMedia({
        id: uid(),
        pageId: page.id,
        name: file.name,
        type: file.type,
        blob: file,
        x: 58 + (n % 2) * 18,
        y: 48 + Math.floor(n / 2) * 16,
        width: 22,
        createdAt: Date.now()
      });

      fileInput.value = "";
      await renderOggetti();
    });

    window.addEventListener("pagehide", salvaPaginaCorrente);

    window.addEventListener("resize", () => {
      if (
        screen.classList.contains("aperto") &&
        screen.classList.contains("editor-mode")
      ) {
        renderOggetti();
      }
    });

    const notebookHotspot =
      document.querySelector('.hotspot[data-target="overlayNotebook"]') ||
      document.querySelector('.hotspot[data-stupidera="true"]');

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
    }

    const quadernoDestinationButton =
      document.querySelector(
        '.destination-button[data-destination="quaderno"]'
      );

    if (quadernoDestinationButton) {
      quadernoDestinationButton.addEventListener("click", () => {
        setTimeout(() => {
          migraStickerQuadernoSenzaPagina();

          const stickersScreen = document.getElementById("stickersScreen");
          const viewer = document.getElementById("stickerViewer");
          const destinationOverlay = document.getElementById("destinationOverlay");

          if (stickersScreen) stickersScreen.classList.remove("aperto");
          if (viewer) viewer.classList.remove("aperto");
          if (destinationOverlay) destinationOverlay.classList.remove("aperto");

          apriDirettamentePagine();
        }, 0);
      });
    }

    ASSETS.forEach((item) => {
      const preload = new Image();
      preload.src = item.src;
    });

    salvaPagine();
    console.log("Stupidera v2 pronta.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", avviaStupidera, { once: true });
  } else {
    avviaStupidera();
  }
})();
