(() => {
  "use strict";

  const CLASSI = [
    { id: "1", label: "Classe 1ª", color: "#ef8f80", soft: "#fff0ec", dark: "#9d4e45" },
    { id: "2", label: "Classe 2ª", color: "#efad69", soft: "#fff4e7", dark: "#9b6531" },
    { id: "3", label: "Classe 3ª", color: "#e3c555", soft: "#fff9df", dark: "#8c7730" },
    { id: "4", label: "Classe 4ª", color: "#82bf91", soft: "#eef9f0", dark: "#477a53" },
    { id: "5", label: "Classe 5ª", color: "#82bce6", soft: "#edf7ff", dark: "#416f96" }
  ];

  const MATERIE = [
    ["Italiano", "📖"],
    ["Matematica", "🧮"],
    ["Storia", "📅"],
    ["Geografia", "🧭"],
    ["Scienze", "🔬"],
    ["Inglese", "🇬🇧"],
    ["Arte e immagine", "🎨"],
    ["Musica", "🎵"],
    ["Tecnologia", "⚙️"],
    ["Educazione fisica", "🏃🏻‍♀️"]
  ];

  const DB_NAME = "BaseSegretaNoziLezioniMaterialiDB";
  const DB_VERSION = 2;
  const STORE_SCHEDE = "schede";
  const STORE_QUADERNI = "quaderni";

  function apriDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_SCHEDE)) {
          db.createObjectStore(STORE_SCHEDE, { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(STORE_QUADERNI)) {
          db.createObjectStore(STORE_QUADERNI, { keyPath: "key" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function salvaScheda(file, classeId, materia) {
    const db = await apriDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SCHEDE, "readwrite");
      const store = tx.objectStore(STORE_SCHEDE);
      const request = store.add({
        classId: classeId,
        subject: materia,
        name: file.name,
        type: file.type || "",
        blob: file,
        createdAt: Date.now()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function leggiSchede(classeId, materia) {
    const db = await apriDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SCHEDE, "readonly");
      const request = tx.objectStore(STORE_SCHEDE).getAll();
      request.onsuccess = () => {
        const all = Array.isArray(request.result) ? request.result : [];
        resolve(
          all
            .filter(item => item.classId === classeId && item.subject === materia)
            .sort((a, b) => b.createdAt - a.createdAt)
        );
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function eliminaScheda(id) {
    const db = await apriDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SCHEDE, "readwrite");
      const request = tx.objectStore(STORE_SCHEDE).delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function rinominaScheda(id, nuovoNome) {
    const db = await apriDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SCHEDE, "readwrite");
      const store = tx.objectStore(STORE_SCHEDE);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (!record) {
          reject(new Error("Scheda non trovata"));
          return;
        }

        record.name = nuovoNome;
        record.updatedAt = Date.now();

        const putRequest = store.put(record);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }


  function chiaveQuaderno(classeId, materia) {
    return `${classeId}::${materia}`;
  }

  function oggiISO() {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,10);
  }

  function formattaDataEstesa(iso) {
    if (!iso) return "";
    const parti = String(iso).split("-").map(Number);
    if (parti.length !== 3 || !parti[0] || !parti[1] || !parti[2]) return iso;
    const d = new Date(parti[0], parti[1] - 1, parti[2]);
    const partiData = new Intl.DateTimeFormat("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).formatToParts(d);
    const valore = tipo => partiData.find(p => p.type === tipo)?.value || "";
    return `${valore("weekday")}, ${valore("day")} ${valore("month")} ${valore("year")}`;
  }

  function paginaNuova(lessonId = null, startsLesson = false) {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      date: oggiISO(),
      lessonId,
      startsLesson,
      strokes: [],
      objects: []
    };
  }

  function quadernoVuoto(classeId, materia) {
    return {
      key: chiaveQuaderno(classeId, materia),
      classId: classeId,
      subject: materia,
      currentPage: 0,
      pages: [paginaNuova(null, false)],
      lessons: [],
      updatedAt: Date.now()
    };
  }

  async function leggiQuaderno(classeId, materia) {
    const db = await apriDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_QUADERNI, "readonly");
      const req = tx.objectStore(STORE_QUADERNI).get(chiaveQuaderno(classeId, materia));
      req.onsuccess = () => resolve(req.result || quadernoVuoto(classeId, materia));
      req.onerror = () => reject(req.error);
    });
  }

  async function salvaQuaderno(quaderno) {
    quaderno.updatedAt = Date.now();
    const db = await apriDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_QUADERNI, "readwrite");
      const req = tx.objectStore(STORE_QUADERNI).put(quaderno);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  function start() {
    if (document.getElementById("lessonsMaterialsScreen")) return;

    const hotspot = document.querySelector('.hotspot[data-target="overlayLessons"]');
    if (!hotspot) {
      console.error("Lezioni & Materiali: hotspot non trovato.");
      return;
    }

    let classeCorrente = null;
    let materiaCorrente = null;
    let schermata = "classi";
    let objectUrls = [];

    const style = document.createElement("style");
    style.textContent = `
      @import url("https://fonts.googleapis.com/css2?family=Andika:wght@400;700&display=swap");
      @font-face{font-family:"Corsivo Primaria";src:url("assets/CorsivoPrimaria.ttf") format("truetype");font-weight:400;font-style:normal;font-display:swap}
      .lm-screen{position:fixed;inset:0;z-index:238;display:none;flex-direction:column;overflow:hidden;background:linear-gradient(180deg,#eef6ff 0%,#f7f2fb 100%);color:#315d91;--lm-color:#82bce6;--lm-soft:#edf7ff;--lm-dark:#416f96}
      .lm-screen.aperto{display:flex}
      .lm-header{display:flex;align-items:center;gap:14px;padding:max(16px,env(safe-area-inset-top)) max(18px,env(safe-area-inset-right)) 12px max(18px,env(safe-area-inset-left));background:color-mix(in srgb,var(--lm-color) 27%,white);border-bottom:1px solid color-mix(in srgb,var(--lm-color) 28%,transparent)}
      .lm-back,.lm-add{appearance:none;border:0;height:48px;border-radius:16px;background:rgba(255,255,255,.82);color:var(--lm-dark);cursor:pointer;box-shadow:0 5px 14px rgba(50,65,80,.10)}
      .lm-back{width:48px;flex:0 0 48px;font-size:30px;line-height:1}
      .lm-add{display:none;padding:0 16px;font-size:15px;font-weight:800}
      .lm-screen.binder .lm-add{display:block}
      .lm-title{flex:1;margin:0;color:var(--lm-dark);font-size:clamp(24px,3.5vw,38px);font-weight:800}
      .lm-search{appearance:none;border:0;width:48px;height:48px;min-width:48px;padding:0;border-radius:16px;background:rgba(255,255,255,.82);color:var(--lm-dark);cursor:pointer;box-shadow:0 5px 14px rgba(50,65,80,.10);display:grid;place-items:center}.lm-search svg{width:30px;height:30px;display:block;stroke:currentColor;stroke-width:2.8;fill:none;stroke-linecap:round;stroke-linejoin:round}
      .lm-workspace{flex:1;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;padding:clamp(18px,4vw,46px)}
      .lm-panel{width:min(1120px,95vw);margin:0 auto;padding:clamp(20px,3vw,34px);border:8px solid color-mix(in srgb,var(--lm-color) 62%,white);border-radius:32px;background:rgba(255,252,247,.94);box-shadow:0 18px 38px rgba(63,93,125,.12)}
      .lm-intro{margin:0 0 25px;text-align:center;color:var(--lm-dark);font-size:clamp(17px,2vw,22px);font-weight:750}
      .lm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:20px}
      .lm-class-card,.lm-subject-card,.lm-choice-card{appearance:none;border:0;cursor:pointer;min-height:180px;padding:18px;border-radius:26px;background:white;box-shadow:0 10px 24px rgba(60,75,95,.10);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;transition:transform .12s ease,box-shadow .12s ease}
      .lm-class-card:active,.lm-subject-card:active,.lm-choice-card:active{transform:scale(.985)}
      .lm-class-folder{width:120px;height:86px;position:relative;margin-bottom:18px;border-radius:12px 12px 18px 18px;background:var(--folder-color);box-shadow:0 8px 16px color-mix(in srgb,var(--folder-color) 25%,transparent)}
      .lm-class-folder::before{content:"";position:absolute;left:9px;top:-18px;width:54px;height:22px;border-radius:10px 10px 0 0;background:var(--folder-color)}
      .lm-card-label{font-size:20px;font-weight:800;color:#46627f}
      .lm-subject-card{min-height:155px;border:2px solid color-mix(in srgb,var(--lm-color) 50%,white);background:color-mix(in srgb,var(--lm-soft) 62%,white)}
      .lm-subject-icon{font-size:45px;margin-bottom:12px;filter:saturate(.75)}
      .lm-subject-name{font-size:18px;font-weight:800;color:var(--lm-dark)}
      .lm-choice-grid{display:grid;grid-template-columns:repeat(2,minmax(260px,1fr));gap:28px}
      .lm-choice-card{min-height:260px;border:3px solid color-mix(in srgb,var(--lm-color) 55%,white);background:color-mix(in srgb,var(--lm-soft) 70%,white)}
      .lm-choice-icon{font-size:70px;margin-bottom:18px}.lm-choice-title{font-size:clamp(22px,2.4vw,32px);font-weight:850;color:var(--lm-dark)}.lm-choice-sub{margin-top:8px;font-size:15px;color:color-mix(in srgb,var(--lm-dark) 70%,#6b7280)}
      .lm-placeholder{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:55vh;text-align:center;color:var(--lm-dark)}.lm-placeholder-icon{font-size:84px;margin-bottom:18px}.lm-placeholder h2{margin:0 0 10px;font-size:clamp(28px,4vw,46px)}.lm-placeholder p{margin:0;max-width:640px;font-size:18px;line-height:1.5}

      .lm-binder-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:22px}.lm-binder-head h2{margin:0;color:var(--lm-dark);font-size:clamp(22px,3vw,32px)}.lm-binder-head p{margin:6px 0 0;color:color-mix(in srgb,var(--lm-dark) 70%,#6b7280);font-size:15px}.lm-binder-count{flex:0 0 auto;padding:8px 12px;border-radius:12px;background:var(--lm-soft);color:var(--lm-dark);font-weight:800;font-size:14px}
      .lm-binder-empty{min-height:340px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:color-mix(in srgb,var(--lm-dark) 75%,#6b7280)}.lm-binder-empty-icon{font-size:70px;margin-bottom:12px}.lm-binder-empty strong{font-size:21px;color:var(--lm-dark)}.lm-binder-empty span{margin-top:7px;max-width:520px;line-height:1.45}
      .lm-binder-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:20px}.lm-binder-card{position:relative;padding:13px;border-radius:22px;border:2px solid color-mix(in srgb,var(--lm-color) 42%,white);background:color-mix(in srgb,var(--lm-soft) 58%,white);box-shadow:0 8px 20px rgba(58,70,90,.09)}.lm-binder-open{appearance:none;border:0;width:100%;padding:0;background:transparent;text-align:left;cursor:pointer}.lm-binder-preview{width:100%;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;margin-bottom:11px;border-radius:16px;background:white;overflow:hidden;color:var(--lm-dark);font-size:45px}.lm-binder-preview img{width:100%;height:100%;object-fit:cover}.lm-binder-name{display:block;padding-right:38px;color:var(--lm-dark);font-size:15px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lm-binder-meta{display:block;margin-top:3px;padding-right:38px;color:color-mix(in srgb,var(--lm-dark) 65%,#718096);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lm-binder-menu-button{position:absolute;right:8px;bottom:8px;appearance:none;border:0;width:34px;height:34px;border-radius:11px;background:transparent;color:var(--lm-dark);font-size:23px;cursor:pointer}.lm-binder-menu{position:absolute;right:9px;bottom:46px;display:none;min-width:120px;padding:7px;border:1px solid color-mix(in srgb,var(--lm-color) 30%,white);border-radius:14px;background:#fffaf7;box-shadow:0 8px 22px rgba(50,60,75,.17);z-index:5}.lm-binder-menu.aperto{display:block}.lm-binder-rename,.lm-binder-delete{appearance:none;border:0;width:100%;padding:10px 13px;border-radius:10px;background:transparent;font-size:14px;font-weight:800;text-align:left;cursor:pointer}.lm-binder-rename{color:var(--lm-dark)}.lm-binder-delete{color:#8f3d3d}.lm-file-input{display:none}

      /* v3A.4.1 — i pannelli del Quaderno sono overlay, mai contenuto del flusso */
      .lm-modal{position:fixed;inset:0;z-index:940;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(35,45,65,.32);backdrop-filter:blur(4px)}
      .lm-modal.aperto{display:flex}
      .lm-modal-card{position:relative;width:min(620px,92vw);max-height:min(78dvh,760px);overflow:auto;padding:24px;border:1.5px solid color-mix(in srgb,var(--lm-color) 45%,white);border-radius:24px;background:#fffaf7;box-shadow:0 20px 55px rgba(20,30,50,.24);color:var(--lm-dark)}
      .lm-modal-card h2{margin:0 42px 16px 0;color:var(--lm-dark)}
      .lm-modal-close{position:absolute;right:14px;top:12px;appearance:none;border:0;width:36px;height:36px;border-radius:12px;background:var(--lm-soft);color:var(--lm-dark);font-size:22px;cursor:pointer}
      .lm-sheet-picker-grid,.lm-results{display:grid;gap:10px;margin-top:14px}
      .lm-share-now,.lm-results button{appearance:none;border:0;padding:12px 16px;border-radius:12px;background:var(--lm-soft);color:var(--lm-dark);font-weight:800;cursor:pointer}
      .lm-search-pop{position:fixed;inset:0;z-index:950;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(35,45,65,.52);backdrop-filter:blur(5px)}.lm-search-pop.aperto{display:flex}.lm-search-card{width:min(540px,92vw);padding:24px;border-radius:24px;background:#fffaf7;box-shadow:0 20px 55px rgba(20,30,50,.26)}.lm-search-card h2{margin:0 0 12px;color:var(--lm-dark)}.lm-search-card p{margin:0 0 16px;color:#5f7184}.lm-search-card button{appearance:none;border:0;padding:12px 18px;border-radius:13px;background:var(--lm-soft);color:var(--lm-dark);font-weight:800;cursor:pointer}

      .lm-more{display:none;appearance:none;border:0;width:52px;height:52px;min-width:52px;border-radius:18px;background:rgba(255,255,255,.84);color:var(--lm-dark);cursor:pointer;box-shadow:0 5px 14px rgba(50,65,80,.10);font-size:24px;font-weight:900;line-height:1}.lm-screen.notebook .lm-more{display:block}
      .lm-screen.notebook,.lm-screen.notebook *{user-select:none!important;-webkit-user-select:none!important;-webkit-touch-callout:none!important;-webkit-user-drag:none!important;}\n      .lm-screen.notebook{width:100vw;height:100dvh;max-width:none;max-height:none;inset:0;background:linear-gradient(180deg,color-mix(in srgb,var(--lm-soft) 92%,white) 0%,color-mix(in srgb,var(--lm-soft) 62%,#fff7f2) 100%);overflow:hidden}
      .lm-screen.notebook .lm-header{position:relative;min-height:88px;flex:0 0 88px;padding:max(18px,env(safe-area-inset-top)) max(24px,env(safe-area-inset-right)) 10px max(24px,env(safe-area-inset-left));gap:12px;background:transparent;border:0;z-index:20}
      .lm-screen.notebook .lm-title{position:absolute;left:50%;top:50%;transform:translate(-50%,-42%);width:min(62vw,760px);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:clamp(25px,3vw,38px);letter-spacing:.01em}
      .lm-screen.notebook .lm-back{width:52px;height:52px;flex:0 0 52px;border-radius:18px;font-size:31px;z-index:2}
      .lm-screen.notebook .lm-search{margin-left:auto;width:52px;height:52px;min-width:52px;border-radius:18px;z-index:2}.lm-screen.notebook .lm-search svg{width:31px;height:31px}
      .lm-screen.notebook .lm-panel{width:100%;height:100%;max-width:none;margin:0;padding:0;border:0;background:transparent;box-shadow:none}
      .lm-screen.notebook .lm-workspace{position:relative;flex:1;min-height:0;padding:4px 18px 78px;overflow:hidden;background:transparent}
      .lm-notebook-shell{position:absolute;inset:0 0 66px;display:flex;align-items:flex-start;justify-content:center;padding:22px 28px 22px;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;touch-action:none}
      .lm-page{position:relative;width:min(calc(100vw - 56px),calc((100dvh - 190px)*.82));height:auto;max-width:none;max-height:calc(100dvh - 190px);aspect-ratio:.82;background:#fff;box-shadow:0 10px 28px rgba(55,60,70,.17);border-radius:10px;overflow:hidden;touch-action:none;-webkit-touch-callout:none;user-select:none;-webkit-user-select:none}
      .lm-page-paper{position:absolute;inset:0;background-color:#fff;background-image:linear-gradient(to right,rgba(89,130,170,.12) 1px,transparent 1px),linear-gradient(to bottom,rgba(89,130,170,.12) 1px,transparent 1px);background-size:24px 24px}
      .lm-draw-canvas{position:absolute;inset:0;z-index:4;width:100%;height:100%;touch-action:none;-webkit-touch-callout:none;user-select:none;-webkit-user-select:none}
      .lm-object-layer{position:absolute;inset:0;z-index:5;pointer-events:none}
      .lm-lasso-hint{position:fixed;z-index:905;display:none;left:50%;top:88px;transform:translateX(-50%);padding:7px 12px;border-radius:12px;background:rgba(255,255,255,.94);color:var(--lm-dark);font-size:13px;font-weight:800;box-shadow:0 4px 14px rgba(50,60,75,.12)}.lm-lasso-hint.aperto{display:block}
      .lm-page-object{position:absolute;pointer-events:auto;touch-action:none;border:2px solid transparent;min-width:45px;min-height:28px}.lm-page-object.selected{border-color:#2b90d9;background:rgba(255,255,255,.15)}.lm-page-object.text{padding:4px 7px;color:#111;white-space:pre-wrap;line-height:1.2}.lm-page-object.text.andika{font-feature-settings:normal;font-variant-ligatures:normal}.lm-page-object img{display:block;width:100%;height:100%;object-fit:contain;pointer-events:none;-webkit-user-drag:none}.lm-page-object.file{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:10px;background:#fffaf4;color:#444;box-shadow:0 3px 10px rgba(0,0,0,.07)}
      .lm-object-delete,.lm-object-resize{display:none;position:absolute;appearance:none;border:0;width:27px;height:27px;border-radius:50%;background:#fff;color:#5f7184;box-shadow:0 2px 8px rgba(0,0,0,.16);cursor:pointer}.lm-page-object.selected .lm-object-delete,.lm-page-object.selected .lm-object-resize{display:block}.lm-object-delete{right:-12px;top:-12px}.lm-object-resize{right:-12px;bottom:-12px}
      .lm-notebook-tools{position:fixed;left:max(38px,env(safe-area-inset-left));bottom:max(34px,env(safe-area-inset-bottom));z-index:880;display:flex;align-items:center;gap:3px;padding:9px 10px 9px 28px;border:1.5px solid color-mix(in srgb,var(--lm-color) 68%,white);border-radius:24px;background:color-mix(in srgb,var(--lm-soft) 88%,white);box-shadow:0 9px 24px rgba(80,60,45,.14);touch-action:none;user-select:none;-webkit-user-select:none}.lm-tools-grip{position:absolute;left:8px;top:50%;transform:translateY(-50%);width:17px;height:32px;display:grid;place-items:center;color:color-mix(in srgb,var(--lm-dark) 62%,white);font-weight:900;font-size:17px;cursor:grab;touch-action:none}.lm-tools-grip:active{cursor:grabbing}.lm-notebook-tools button{appearance:none;border:0;width:45px;height:45px;border-radius:13px;background:transparent;color:var(--lm-dark);font-size:22px;font-weight:800;cursor:pointer;touch-action:manipulation}.lm-notebook-tools button.active{background:white;box-shadow:0 3px 10px rgba(45,50,60,.10)}.lm-notebook-tools button:disabled{opacity:.28}.lm-tool-eraser,.lm-tool-lasso{display:grid!important;place-items:center}.lm-tool-eraser svg,.lm-tool-lasso svg{width:25px;height:25px;display:block;overflow:visible}.lm-tool-eraser svg{width:26px;height:26px}.lm-tool-lasso svg{width:27px;height:27px}
      .lm-scroll-rail{position:fixed;right:max(12px,env(safe-area-inset-right));top:132px;bottom:92px;width:24px;z-index:870;display:flex;justify-content:center;touch-action:none;user-select:none;-webkit-user-select:none}.lm-scroll-track{position:relative;width:7px;height:100%;border-radius:999px;background:rgba(23,63,122,.12)}.lm-scroll-thumb{position:absolute;left:50%;top:0;transform:translateX(-50%);width:18px;min-height:54px;border-radius:999px;background:color-mix(in srgb,var(--lm-color) 82%,white);box-shadow:0 2px 8px rgba(45,55,70,.16);touch-action:none}.lm-scroll-rail.hidden{display:flex}
      .lm-page-nav{position:fixed;left:50%;bottom:max(28px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:875;display:flex;align-items:center;gap:10px;padding:6px 9px;border:1.5px solid color-mix(in srgb,var(--lm-color) 58%,white);border-radius:18px;background:color-mix(in srgb,var(--lm-soft) 90%,white);box-shadow:0 6px 16px rgba(80,60,45,.11)}.lm-page-nav button{appearance:none;border:0;width:34px;height:32px;background:transparent;color:var(--lm-dark);font-size:27px;cursor:pointer}.lm-page-nav span{min-width:64px;text-align:center;color:var(--lm-dark);font-weight:850;font-size:15px}
      .lm-plus-menu,.lm-more-menu{position:fixed;z-index:910;display:none;min-width:190px;padding:8px;border:1px solid color-mix(in srgb,var(--lm-color) 42%,white);border-radius:17px;background:#fffaf7;box-shadow:0 10px 30px rgba(35,45,60,.20)}.lm-plus-menu{left:max(170px,calc(env(safe-area-inset-left) + 130px));bottom:max(92px,calc(env(safe-area-inset-bottom) + 82px))}.lm-more-menu{right:max(24px,env(safe-area-inset-right));top:max(78px,calc(env(safe-area-inset-top) + 66px))}.lm-plus-menu.aperto,.lm-more-menu.aperto{display:block}.lm-plus-menu button,.lm-more-menu button{appearance:none;border:0;width:100%;padding:11px 13px;border-radius:11px;background:transparent;color:var(--lm-dark);text-align:left;font-size:15px;font-weight:750;cursor:pointer}.lm-plus-menu button:hover,.lm-more-menu button:hover{background:var(--lm-soft)}
      .lm-textbar{position:fixed;left:50%;top:50%;transform:translate(-50%,70px);z-index:900;display:none;align-items:center;overflow:visible;border:1.5px solid color-mix(in srgb,var(--lm-color) 55%,white);border-radius:19px;background:#fffaf7;box-shadow:0 9px 24px rgba(60,50,45,.15)}.lm-textbar.aperto{display:flex}.lm-textbar select,.lm-textbar button,.lm-textbar input,.lm-font-trigger{height:50px;border:0;border-right:1px solid rgba(100,100,100,.09);background:transparent;color:var(--lm-dark);font-size:16px;font-weight:750}.lm-textbar select{padding:0 13px}.lm-font-wrap{position:relative}.lm-font-trigger{appearance:none;border:0;border-right:1px solid rgba(100,100,100,.09);background:transparent;padding:0 14px;min-width:170px;color:var(--lm-dark);font-size:16px;font-weight:600;text-align:left}.lm-font-menu{display:none;position:absolute;left:0;bottom:56px;min-width:220px;padding:7px;background:#fffaf7;border:1.5px solid color-mix(in srgb,var(--lm-color) 45%,white);border-radius:15px;box-shadow:0 9px 24px rgba(60,50,45,.16);z-index:930}.lm-font-menu.aperto{display:grid;gap:3px}.lm-font-choice{appearance:none;border:0!important;border-radius:10px;background:transparent!important;height:46px!important;padding:0 12px;text-align:left;color:#111!important;font-size:18px!important;font-weight:400!important}.lm-font-choice:hover,.lm-font-choice:focus{background:color-mix(in srgb,var(--lm-soft) 75%,white)!important}.lm-font-choice[data-font="andika"]{font-family:Andika,Arial,sans-serif}.lm-font-choice[data-font="corsivo"]{font-family:"Corsivo Primaria",cursive}.lm-font-choice[data-font="arial"]{font-family:Arial,sans-serif}.lm-textbar button{width:49px;font-size:21px;cursor:pointer}.lm-textbar input[type=color]{width:52px;padding:10px;border-right:0}
      .lm-notebook-file{display:none}
      @media(max-width:760px){.lm-header{gap:8px}.lm-workspace{padding:14px 10px}.lm-panel{width:96vw;padding:16px;border-width:6px}.lm-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.lm-class-card,.lm-subject-card{min-height:135px;padding:12px}.lm-class-folder{width:88px;height:62px;margin-bottom:12px}.lm-class-folder::before{width:42px;height:16px;top:-13px}.lm-card-label,.lm-subject-name{font-size:15px}.lm-subject-icon{font-size:34px}.lm-choice-grid{grid-template-columns:1fr;gap:14px}.lm-choice-card{min-height:180px}.lm-choice-icon{font-size:54px}.lm-search{padding:0}.lm-title{font-size:21px}.lm-add{padding:0 10px;font-size:13px}.lm-binder-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.lm-binder-head{align-items:flex-start;flex-direction:column}.lm-binder-card{padding:10px}.lm-screen.notebook .lm-workspace{padding:2px 8px 74px}.lm-screen.notebook .lm-header{min-height:78px;flex-basis:78px;padding-left:12px;padding-right:12px}.lm-screen.notebook .lm-title{font-size:21px;width:58vw}.lm-screen.notebook .lm-back,.lm-screen.notebook .lm-search,.lm-screen.notebook .lm-more{width:46px;height:46px;min-width:46px;flex-basis:46px;border-radius:15px}.lm-notebook-shell{inset:0 0 58px;padding:16px 14px 0}.lm-page{width:min(calc(100vw - 28px),calc((100dvh - 160px)*.82));max-height:calc(100dvh - 160px)}.lm-notebook-tools{left:10px;bottom:10px;transform:scale(.88);transform-origin:left bottom}.lm-page-nav{bottom:10px}}
    `;
    document.head.appendChild(style);

    const screen = document.createElement("section");
    screen.id = "lessonsMaterialsScreen";
    screen.className = "lm-screen";
    screen.innerHTML = `
      <header class="lm-header">
        <button class="lm-back" type="button" aria-label="Indietro">‹</button>
        <h1 class="lm-title">Lezioni & Materiali</h1>
        <button class="lm-add" type="button" aria-label="Aggiungi scheda">＋ Aggiungi</button>
        <button class="lm-search" type="button" aria-label="Cerca" title="Cerca"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="M16 16l5 5"></path></svg></button>
        <button class="lm-more" type="button" aria-label="Altre opzioni">•••</button>
      </header>
      <div class="lm-workspace"><main class="lm-panel"></main></div>
      <input class="lm-file-input" type="file" multiple accept="image/*,application/pdf,.doc,.docx,.odt,.ppt,.pptx">
      <input class="lm-notebook-file lm-notebook-image-input" type="file" accept="image/*">
      <input class="lm-notebook-file lm-notebook-any-input" type="file">
      <div class="lm-plus-menu"><button data-plus="sheet" type="button">Scheda</button><button data-plus="image" type="button">Immagine</button><button data-plus="file" type="button">File</button></div>
      <div class="lm-more-menu"><button data-more="lesson" type="button">Nuova lezione</button><button data-more="share" type="button">Condividi / Esporta</button></div>
      <div class="lm-lasso-hint">Scrittura selezionata: premi T per trasformarla in testo</div><div class="lm-textbar"><div class="lm-font-wrap"><button class="lm-font-trigger" type="button" aria-label="Font">Andika</button><div class="lm-font-menu"><button class="lm-font-choice" data-font="andika" data-value="'Andika', Arial, sans-serif" type="button">Andika</button><button class="lm-font-choice" data-font="corsivo" data-value="'Corsivo Primaria', cursive" type="button">Corsivo Primaria</button><button class="lm-font-choice" data-font="arial" data-value="Arial, sans-serif" type="button">Arial</button></div></div><select class="lm-size"><option>24</option><option selected>32</option><option>40</option><option>48</option><option>56</option></select><button class="lm-align" type="button">☰</button><input class="lm-color" type="color" value="#111111"></div>
      <div class="lm-modal lm-sheet-modal"><div class="lm-modal-card"><button class="lm-modal-close" type="button">×</button><h2>Schede da stampare</h2><div class="lm-sheet-picker-grid"></div></div></div>
      <div class="lm-modal lm-share-modal"><div class="lm-modal-card"><button class="lm-modal-close" type="button">×</button><h2>Condividi lezione</h2><p class="lm-share-info"></p><button class="lm-share-now" type="button">Condividi / stampa</button></div></div>
      <div class="lm-modal lm-search-results"><div class="lm-modal-card"><button class="lm-modal-close" type="button">×</button><h2>Cerca nel quaderno</h2><input class="lm-search-input" type="search" placeholder="Cerca parola o frase..." style="width:100%;height:46px;border:1px solid #ccd8e5;border-radius:12px;padding:0 12px;font-size:16px"><div class="lm-results"></div></div></div>
      <div class="lm-search-pop"><div class="lm-search-card"><h2>Ricerca</h2><p>La ricerca completa per parola, argomento e periodo arriverà insieme al Quaderno. Il raccoglitore intanto conserva qui gli originali delle schede.</p><button type="button">Chiudi</button></div></div>`;
    document.body.appendChild(screen);

    const panel = screen.querySelector(".lm-panel");
    const title = screen.querySelector(".lm-title");
    const back = screen.querySelector(".lm-back");
    const add = screen.querySelector(".lm-add");
    const search = screen.querySelector(".lm-search");
    const more = screen.querySelector(".lm-more");
    const fileInput = screen.querySelector(".lm-file-input");
    const searchPop = screen.querySelector(".lm-search-pop");
    const notebookImageInput = screen.querySelector(".lm-notebook-image-input");
    const notebookAnyInput = screen.querySelector(".lm-notebook-any-input");
    const plusMenu = screen.querySelector(".lm-plus-menu");
    const moreMenu = screen.querySelector(".lm-more-menu");
    const textbar = screen.querySelector(".lm-textbar");
    const sheetModal = screen.querySelector(".lm-sheet-modal");
    const shareModal = screen.querySelector(".lm-share-modal");
    const searchResults = screen.querySelector(".lm-search-results");
    let quadernoCorrente = null;
    let notebookMode = "pencil";
    let selectedObjectId = null;
    let selectedStrokeIndexes = new Set();
    let lassoPoints = [];
    let notebookHistory = [];
    let notebookFuture = [];

    function liberaObjectUrls() {
      objectUrls.forEach(url => URL.revokeObjectURL(url));
      objectUrls = [];
    }

    function temaClasse(classe) {
      if (!classe) {
        screen.style.setProperty("--lm-color", "#82bce6");
        screen.style.setProperty("--lm-soft", "#edf7ff");
        screen.style.setProperty("--lm-dark", "#416f96");
        return;
      }
      screen.style.setProperty("--lm-color", classe.color);
      screen.style.setProperty("--lm-soft", classe.soft);
      screen.style.setProperty("--lm-dark", classe.dark);
    }

    function setBinderMode(active) {
      screen.classList.toggle("binder", active);
    }

    function setNotebookMode(active) {
      screen.classList.toggle("notebook", active);
      if (!active) {
        plusMenu.classList.remove("aperto");
        moreMenu.classList.remove("aperto");
        textbar.classList.remove("aperto");
        selectedObjectId = null;
      }
    }

    function renderClassi() {
      liberaObjectUrls();
      setBinderMode(false);
      setNotebookMode(false);
      schermata = "classi";
      classeCorrente = null;
      materiaCorrente = null;
      temaClasse(null);
      title.textContent = "Lezioni & Materiali";
      panel.innerHTML = `<p class="lm-intro">Scegli la classe</p><div class="lm-grid lm-class-grid"></div>`;
      const grid = panel.querySelector(".lm-class-grid");
      CLASSI.forEach(classe => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "lm-class-card";
        btn.innerHTML = `<div class="lm-class-folder" style="--folder-color:${classe.color}"></div><span class="lm-card-label">${classe.label}</span>`;
        btn.addEventListener("click", () => { classeCorrente = classe; renderMaterie(); });
        grid.appendChild(btn);
      });
    }

    function renderMaterie() {
      liberaObjectUrls();
      setBinderMode(false);
      setNotebookMode(false);
      schermata = "materie";
      temaClasse(classeCorrente);
      title.textContent = classeCorrente.label;
      panel.innerHTML = `<p class="lm-intro">Materie di ${classeCorrente.label}</p><div class="lm-grid lm-subject-grid"></div>`;
      const grid = panel.querySelector(".lm-subject-grid");
      MATERIE.forEach(([nome, icona]) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "lm-subject-card";
        btn.innerHTML = `<span class="lm-subject-icon">${icona}</span><span class="lm-subject-name">${nome}</span>`;
        btn.addEventListener("click", () => { materiaCorrente = nome; renderMateria(); });
        grid.appendChild(btn);
      });
    }

    function renderMateria() {
      liberaObjectUrls();
      setBinderMode(false);
      setNotebookMode(false);
      schermata = "materia";
      temaClasse(classeCorrente);
      title.textContent = `${classeCorrente.label} · ${materiaCorrente}`;
      panel.innerHTML = `
        <p class="lm-intro">${materiaCorrente}</p>
        <div class="lm-choice-grid">
          <button class="lm-choice-card" data-choice="quaderno" type="button"><span class="lm-choice-icon">📓</span><span class="lm-choice-title">Quaderno</span><span class="lm-choice-sub">Il quaderno della lezione da usare in classe</span></button>
          <button class="lm-choice-card" data-choice="schede" type="button"><span class="lm-choice-icon">🗂️</span><span class="lm-choice-title">Schede da stampare</span><span class="lm-choice-sub">Il raccoglitore con le schede originali</span></button>
        </div>`;
      panel.querySelector('[data-choice="quaderno"]').addEventListener("click", renderQuaderno);
      panel.querySelector('[data-choice="schede"]').addEventListener("click", renderRaccoglitore);
    }

    function notebookSnapshot() {
      return structuredClone(quadernoCorrente);
    }

    function pushHistory() {
      if (!quadernoCorrente) return;
      notebookHistory.push(notebookSnapshot());
      if (notebookHistory.length > 30) notebookHistory.shift();
      notebookFuture = [];
    }

    async function persistNotebook() {
      if (quadernoCorrente) await salvaQuaderno(quadernoCorrente);
    }

    function currentNotebookPage() {
      return quadernoCorrente?.pages?.[quadernoCorrente.currentPage] || null;
    }

    function currentLesson() {
      const p = currentNotebookPage();
      if (!p?.lessonId) return null;
      return quadernoCorrente.lessons.find(x => x.id === p.lessonId) || null;
    }


    function ensureDateObject(page) {
      page.objects = Array.isArray(page.objects) ? page.objects : [];
      page.strokes = Array.isArray(page.strokes) ? page.strokes : [];
      if (!page.date) return;
      const existing = page.objects.find(o => o.role === "date");
      if (existing) {
        if (!existing.text) existing.text = formattaDataEstesa(page.date);
        return;
      }
      page.objects.unshift({
        id:`date-${page.id}`,
        type:"text",
        role:"date",
        text:formattaDataEstesa(page.date),
        x:7,
        y:3.2,
        w:58,
        fontFamily:"Arial, sans-serif",
        fontSize:19,
        bold:false,
        italic:false,
        align:"left",
        color:"#111111"
      });
    }

    function resetSelection() {
      selectedObjectId = null;
      selectedStrokeIndexes = new Set();
      lassoPoints = [];
    }

    function pointInPolygon(point, polygon) {
      if (!polygon || polygon.length < 3) return false;
      let inside = false;
      for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
        const xi=polygon[i].x, yi=polygon[i].y, xj=polygon[j].x, yj=polygon[j].y;
        const intersect=((yi>point.y)!=(yj>point.y)) && (point.x < (xj-xi)*(point.y-yi)/((yj-yi)||1e-9)+xi);
        if(intersect) inside=!inside;
      }
      return inside;
    }

    function distanceToSegment(p,a,b) {
      const vx=b.x-a.x, vy=b.y-a.y, wx=p.x-a.x, wy=p.y-a.y;
      const c1=vx*wx+vy*wy;
      if(c1<=0) return Math.hypot(p.x-a.x,p.y-a.y);
      const c2=vx*vx+vy*vy;
      if(c2<=c1) return Math.hypot(p.x-b.x,p.y-b.y);
      const t=c1/c2;
      return Math.hypot(p.x-(a.x+t*vx),p.y-(a.y+t*vy));
    }

    function strokeHit(stroke,p,tolerance=.025) {
      const pts=stroke?.points||[];
      if(!pts.length) return false;
      if(pts.length===1) return Math.hypot(pts[0].x-p.x,pts[0].y-p.y)<=tolerance;
      for(let i=1;i<pts.length;i++) if(distanceToSegment(p,pts[i-1],pts[i])<=tolerance) return true;
      return false;
    }

    function objectContainsPoint(obj,p) {
      const w=(obj.w||20)/100, h=(obj.h||10)/100;
      const x=(obj.x||0)/100, y=(obj.y||0)/100;
      return p.x>=x && p.x<=x+w && p.y>=y && p.y<=y+h;
    }

    function selectionBounds(page) {
      const pts=[];
      selectedStrokeIndexes.forEach(i => (page.strokes?.[i]?.points||[]).forEach(pt=>pts.push(pt)));
      if(!pts.length) return {x:.12,y:.18,w:.45,h:.10};
      const xs=pts.map(p=>p.x), ys=pts.map(p=>p.y);
      const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
      return {x:minX,y:minY,w:Math.max(.16,maxX-minX),h:Math.max(.06,maxY-minY)};
    }

    async function convertSelectionToText() {
      const page=currentNotebookPage();
      if(!page) return;
      if(selectedObjectId) {
        const obj=objectById(selectedObjectId);
        if(obj?.type==="text") { updateTextbar(); return; }
      }
      if(!selectedStrokeIndexes.size) {
        const hint=screen.querySelector(".lm-lasso-hint");
        if(hint){hint.textContent="Prima circonda con il lazo la scrittura da trasformare";hint.classList.add("aperto");setTimeout(()=>hint.classList.remove("aperto"),1800);}
        return;
      }
      const text=window.prompt("Trasforma la scrittura selezionata in testo digitale:","");
      if(text===null || !text.trim()) return;
      const b=selectionBounds(page);
      pushHistory();
      page.strokes=(page.strokes||[]).filter((_,i)=>!selectedStrokeIndexes.has(i));
      const obj={id:`o-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,type:"text",text:text.trim(),x:b.x*100,y:b.y*100,w:Math.min(82,Math.max(24,b.w*100)),fontFamily:"'Andika', Arial, sans-serif",fontSize:32,align:"left",color:"#111111"};
      page.objects.push(obj);selectedObjectId=obj.id;selectedStrokeIndexes=new Set();
      await persistNotebook();renderNotebookPage();
    }

    function renderCanvas(canvas, page) {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,rect.width,rect.height);
      (page.strokes || []).forEach((stroke,idx) => {
        if (!stroke.points?.length) return;
        ctx.beginPath();ctx.lineCap="round";ctx.lineJoin="round";
        ctx.strokeStyle = selectedStrokeIndexes.has(idx) ? "#2b90d9" : (stroke.color || "#111111");
        ctx.lineWidth = selectedStrokeIndexes.has(idx) ? (stroke.width||3)+1.5 : (stroke.width || 3);
        stroke.points.forEach((pt,i)=>{const x=pt.x*rect.width,y=pt.y*rect.height;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();
      });
      if(lassoPoints.length>1){
        ctx.save();ctx.setLineDash([7,6]);ctx.strokeStyle="#2b90d9";ctx.lineWidth=1.7;ctx.beginPath();lassoPoints.forEach((pt,i)=>{const x=pt.x*rect.width,y=pt.y*rect.height;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();ctx.restore();
      }
    }

    function objectById(id) {
      return currentNotebookPage()?.objects?.find(o => o.id === id) || null;
    }

    function updateTextbar() {
      const obj = objectById(selectedObjectId);
      textbar.classList.toggle("aperto", !!obj && obj.type === "text");
      if (!obj || obj.type !== "text") return;
      screen.querySelector(".lm-size").value = String(obj.fontSize || 32);
      const ft=screen.querySelector(".lm-font-trigger");if(ft){const target=(obj.fontFamily||"Arial, sans-serif");ft.textContent=target.includes("Corsivo")?"Corsivo Primaria":target.includes("Andika")?"Andika":"Arial";ft.style.fontFamily=target;}
      screen.querySelector(".lm-color").value = obj.color || "#111111";
    }

    function makePageObjectElement(obj, layer) {
      const el = document.createElement("div");
      el.className = `lm-page-object ${obj.type}`;
      el.dataset.id = obj.id;
      el.style.left = `${obj.x}%`; el.style.top = `${obj.y}%`; el.style.width = `${obj.w}%`; if(!obj.h) obj.h = obj.type === "text" ? 7 : (obj.type === "file" ? 8 : 24);
      if (obj.h) el.style.height = `${obj.h}%`;
      if (obj.type === "text") {
        el.textContent = obj.text || "";
        el.style.fontFamily = obj.fontFamily || "Arial, sans-serif";
        if ((obj.fontFamily || "").includes("Andika")) { el.classList.add("andika"); el.style.fontFeatureSettings="normal"; }
        el.style.fontSize = `${obj.fontSize || 32}px`;
        el.style.fontWeight = "400";
        el.style.fontStyle = "normal";
        el.style.textAlign = obj.align || "left";
        el.style.color = obj.color || "#111111";
        el.addEventListener("dblclick", async () => {
          const t = window.prompt("Modifica testo:", obj.text || "");
          if (t === null) return;
          pushHistory(); obj.text = t; await persistNotebook(); renderNotebookPage();
        });
      } else if (obj.type === "image" || obj.type === "sheet") {
        const img = document.createElement("img");
        const url = URL.createObjectURL(obj.blob); objectUrls.push(url);
        img.src = url; img.alt = obj.name || ""; el.appendChild(img);
      } else {
        el.classList.add("file"); el.textContent = `📎 ${obj.name || "File"}`;
      }
      const del = document.createElement("button"); del.className="lm-object-delete"; del.type="button"; del.textContent="×";
      const resize = document.createElement("button"); resize.className="lm-object-resize"; resize.type="button"; resize.textContent="↘";
      el.append(del,resize);
      if (obj.id === selectedObjectId) el.classList.add("selected");
      el.addEventListener("pointerdown", event => {
        if (event.target === del || event.target === resize || ["pencil","eraser","lasso"].includes(notebookMode)) return;
        event.preventDefault(); event.stopPropagation(); selectedObjectId = obj.id; renderNotebookPage();
        const pageEl = layer.parentElement, rect = pageEl.getBoundingClientRect(), er = el.getBoundingClientRect();
        const ox = event.clientX-er.left, oy=event.clientY-er.top;
        el.setPointerCapture(event.pointerId); pushHistory();
        const move = e => { obj.x=Math.max(0,Math.min(100-obj.w,(e.clientX-rect.left-ox)/rect.width*100)); obj.y=Math.max(0,Math.min(96,(e.clientY-rect.top-oy)/rect.height*100)); el.style.left=`${obj.x}%`;el.style.top=`${obj.y}%`; };
        const end = async e => { try{el.releasePointerCapture(e.pointerId)}catch(_){ } el.removeEventListener("pointermove",move);el.removeEventListener("pointerup",end);el.removeEventListener("pointercancel",end);await persistNotebook(); };
        el.addEventListener("pointermove",move);el.addEventListener("pointerup",end);el.addEventListener("pointercancel",end);
      });
      resize.addEventListener("pointerdown", event => {
        event.preventDefault();event.stopPropagation();selectedObjectId=obj.id;pushHistory();
        const pageEl=layer.parentElement, rect=pageEl.getBoundingClientRect(), er=el.getBoundingClientRect(), left=er.left-rect.left;
        resize.setPointerCapture(event.pointerId);
        const move=e=>{obj.w=Math.max(8,Math.min(92-obj.x,(e.clientX-rect.left-left)/rect.width*100));el.style.width=`${obj.w}%`;};
        const end=async e=>{try{resize.releasePointerCapture(e.pointerId)}catch(_){ } resize.removeEventListener("pointermove",move);resize.removeEventListener("pointerup",end);resize.removeEventListener("pointercancel",end);await persistNotebook();};
        resize.addEventListener("pointermove",move);resize.addEventListener("pointerup",end);resize.addEventListener("pointercancel",end);
      });
      del.addEventListener("click", async e => { e.stopPropagation(); pushHistory(); const p=currentNotebookPage();p.objects=p.objects.filter(x=>x.id!==obj.id);if(obj.role==="date")p.date="";selectedObjectId=null;await persistNotebook();renderNotebookPage(); });
      layer.appendChild(el);
    }

    function renderNotebookPage() {
      liberaObjectUrls();
      const page=currentNotebookPage();if(!page)return;
      ensureDateObject(page);
      const pageEl=panel.querySelector(".lm-page");if(!pageEl)return;
      const layer=pageEl.querySelector(".lm-object-layer");layer.innerHTML="";
      (page.objects||[]).forEach(obj=>makePageObjectElement(obj,layer));
      layer.querySelectorAll(".lm-page-object").forEach(el=>{el.style.pointerEvents=["pencil","eraser","lasso"].includes(notebookMode)?"none":"auto";});
      const canvas=pageEl.querySelector(".lm-draw-canvas");requestAnimationFrame(()=>renderCanvas(canvas,page));
      panel.querySelector(".lm-page-counter").textContent=`${quadernoCorrente.currentPage+1} / ${quadernoCorrente.pages.length}`;
      const prev=panel.querySelector(".lm-nav-prev"),next=panel.querySelector(".lm-nav-next");prev.disabled=quadernoCorrente.currentPage===0;next.disabled=false;
      panel.querySelectorAll(".lm-notebook-tools button[data-tool]").forEach(b=>b.classList.toggle("active",b.dataset.tool===notebookMode));
      screen.dataset.notebookTool=notebookMode;
      const hint=screen.querySelector(".lm-lasso-hint");if(hint)hint.classList.toggle("aperto",selectedStrokeIndexes.size>0);
      updateTextbar();
    }

    async function addBlobObject(blob, name, type) {
      const page=currentNotebookPage(); pushHistory();
      page.objects.push({id:`o-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,type,blob,name,x:12,y:22,w:type==="file"?38:68,h:type==="file"?8:30});
      await persistNotebook(); renderNotebookPage();
    }

    async function openSheetPicker() {
      const grid=sheetModal.querySelector(".lm-sheet-picker-grid"); grid.innerHTML="";
      const records=await leggiSchede(classeCorrente.id,materiaCorrente);
      if(!records.length){grid.innerHTML="<p>Nel raccoglitore non ci sono ancora schede.</p>";} else records.forEach(r=>{
        const b=document.createElement("button");b.type="button";b.className="lm-sheet-pick";
        if(r.type?.startsWith("image/")){const u=URL.createObjectURL(r.blob);objectUrls.push(u);b.innerHTML=`<img src="${u}" alt=""><span>${r.name}</span>`;} else b.textContent=`📄 ${r.name}`;
        b.addEventListener("click",async()=>{sheetModal.classList.remove("aperto");await addBlobObject(r.blob,r.name,r.type?.startsWith("image/")?"sheet":"file");});grid.appendChild(b);
      }); sheetModal.classList.add("aperto");
    }

    function installDrawing(canvas) {
      let stroke=null, erasing=false, lassoActive=false;
      // v3A.9: sul foglio comanda esclusivamente la Pencil.
      // Dito e palmo vengono neutralizzati senza euristiche; lo scorrimento passa dalla barra laterale.
      const isTouch=e=>e.pointerType==="touch";
      const blockTouch=e=>{ if(isTouch(e)){ e.preventDefault(); e.stopImmediatePropagation(); } };
      canvas.addEventListener("contextmenu",e=>e.preventDefault());
      canvas.addEventListener("dragstart",e=>e.preventDefault());
      canvas.addEventListener("selectstart",e=>e.preventDefault());
      canvas.addEventListener("pointerdown",blockTouch,true);
      canvas.addEventListener("pointermove",blockTouch,true);
      canvas.addEventListener("pointerup",blockTouch,true);
      canvas.addEventListener("pointercancel",blockTouch,true);
      canvas.addEventListener("touchstart",e=>{e.preventDefault();e.stopPropagation();},{capture:true,passive:false});
      canvas.addEventListener("touchmove",e=>{e.preventDefault();e.stopPropagation();},{capture:true,passive:false});
      canvas.addEventListener("touchend",e=>{e.preventDefault();e.stopPropagation();},{capture:true,passive:false});
      const norm=(ev,rect)=>({x:(ev.clientX-rect.left)/rect.width,y:(ev.clientY-rect.top)/rect.height});

      canvas.addEventListener("pointerdown",e=>{
        if(e.pointerType!=="pen") return;
        const page=currentNotebookPage();if(!page)return;
        const rect=canvas.getBoundingClientRect();
        if(notebookMode==="select"){resetSelection();renderNotebookPage();return;}
        if(notebookMode==="pencil"){
          // Scrittura: solo Apple Pencil / stilo. Il dito resta libero per UI e navigazione.
          if(e.pointerType!=="pen") return;
          e.preventDefault();pushHistory();stroke={color:"#111111",width:2.2,points:[]};page.strokes.push(stroke);canvas.setPointerCapture(e.pointerId);
          const add=ev=>{const p=norm(ev,rect),last=stroke.points[stroke.points.length-1];if(!last||Math.abs(p.x-last.x)>0.00001||Math.abs(p.y-last.y)>0.00001)stroke.points.push(p)};add(e);renderCanvas(canvas,page);
          const feed=ev=>{if(ev.pointerType!=="pen")return;ev.preventDefault();let events=typeof ev.getCoalescedEvents==="function"?ev.getCoalescedEvents():[ev];if(!events.length)events=[ev];events.forEach(add);renderCanvas(canvas,page)};
          const move=ev=>feed(ev);
          const raw=ev=>feed(ev);
          const end=async ev=>{try{canvas.releasePointerCapture(ev.pointerId)}catch(_){ }canvas.removeEventListener("pointermove",move);canvas.removeEventListener("pointerrawupdate",raw);canvas.removeEventListener("pointerup",end);canvas.removeEventListener("pointercancel",end);stroke=null;await persistNotebook();};
          canvas.addEventListener("pointermove",move,{passive:false});canvas.addEventListener("pointerrawupdate",raw,{passive:false});canvas.addEventListener("pointerup",end);canvas.addEventListener("pointercancel",end);return;
        }
        if(notebookMode==="eraser"){
          if(e.pointerType!=="pen") return;
          e.preventDefault();pushHistory();erasing=true;canvas.setPointerCapture(e.pointerId);
          const eraseAt=ev=>{
            const p=norm(ev,rect), radius=.018;
            const next=[];
            (page.strokes||[]).forEach(st=>{
              const pts=st.points||[];
              if(!pts.length)return;
              let frag=[];
              const flush=()=>{if(frag.length>1)next.push({...st,points:frag});frag=[]};
              pts.forEach(pt=>{
                const hit=Math.hypot(pt.x-p.x,pt.y-p.y)<=radius;
                if(hit) flush(); else frag.push(pt);
              });
              flush();
            });
            page.strokes=next;
            renderCanvas(canvas,page);
          };
          eraseAt(e);const move=ev=>eraseAt(ev);const end=async ev=>{try{canvas.releasePointerCapture(ev.pointerId)}catch(_){ }canvas.removeEventListener("pointermove",move);canvas.removeEventListener("pointerup",end);canvas.removeEventListener("pointercancel",end);erasing=false;await persistNotebook();renderNotebookPage();};
          canvas.addEventListener("pointermove",move);canvas.addEventListener("pointerup",end);canvas.addEventListener("pointercancel",end);return;
        }
        if(notebookMode==="lasso"){
          if(e.pointerType!=="pen") return;
          e.preventDefault();resetSelection();lassoActive=true;lassoPoints=[norm(e,rect)];canvas.setPointerCapture(e.pointerId);renderCanvas(canvas,page);
          const move=ev=>{const events=typeof ev.getCoalescedEvents==="function"?ev.getCoalescedEvents():[ev];events.forEach(x=>lassoPoints.push(norm(x,rect)));renderCanvas(canvas,page)};
          const end=async ev=>{try{canvas.releasePointerCapture(ev.pointerId)}catch(_){ }canvas.removeEventListener("pointermove",move);canvas.removeEventListener("pointerup",end);canvas.removeEventListener("pointercancel",end);lassoActive=false;if(lassoPoints.length>=3){(page.strokes||[]).forEach((st,i)=>{if((st.points||[]).some(pt=>pointInPolygon(pt,lassoPoints)))selectedStrokeIndexes.add(i)});const selectedObjects=(page.objects||[]).filter(o=>pointInPolygon({x:((o.x||0)+(o.w||20)/2)/100,y:((o.y||0)+(o.h||10)/2)/100},lassoPoints));if(selectedObjects.length===1)selectedObjectId=selectedObjects[0].id;}lassoPoints=[];renderNotebookPage();};
          canvas.addEventListener("pointermove",move);canvas.addEventListener("pointerup",end);canvas.addEventListener("pointercancel",end);
        }
      });
    }

    function positionPlusMenu(anchor) {
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const w = 205, gap = 10;
      let left = Math.max(10, Math.min(window.innerWidth - w - 10, r.left + r.width/2 - w/2));
      let top = r.top - 150 - gap;
      if (top < 10) top = r.bottom + gap;
      plusMenu.style.left = `${left}px`;
      plusMenu.style.top = `${top}px`;
      plusMenu.style.bottom = 'auto';
    }

    function positionTextbarForSelection() {
      const bar = screen.querySelector('.lm-textbar');
      const pageEl = panel.querySelector('.lm-page');
      if (!bar || !pageEl) return;
      const pr = pageEl.getBoundingClientRect();
      const obj = objectById(selectedObjectId);
      let cx = pr.left + pr.width/2, y = pr.top + 110;
      if (obj) {
        cx = pr.left + ((obj.x||0)+(obj.w||20)/2)/100*pr.width;
        y = pr.top + ((obj.y||0)+(obj.h||8))/100*pr.height + 12;
      }
      bar.style.left = `${Math.max(12, Math.min(window.innerWidth-12, cx))}px`;
      bar.style.top = `${Math.max(90, Math.min(window.innerHeight-80, y))}px`;
      bar.style.transform = 'translateX(-50%)';
    }

    async function renderQuaderno() {
      liberaObjectUrls();setBinderMode(false);setNotebookMode(true);schermata="quaderno";temaClasse(classeCorrente);title.textContent=`${materiaCorrente.toUpperCase()} — QUADERNO`;
      quadernoCorrente=await leggiQuaderno(classeCorrente.id,materiaCorrente);notebookHistory=[];notebookFuture=[];resetSelection();notebookMode="pencil";
      (quadernoCorrente.pages||[]).forEach(ensureDateObject);
      panel.innerHTML=`<div class="lm-notebook-shell"><div class="lm-page"><div class="lm-page-paper"></div><canvas class="lm-draw-canvas"></canvas><div class="lm-object-layer"></div></div></div><div class="lm-notebook-tools"><span class="lm-tools-grip" title="Sposta toolbar">≡</span><button data-tool="pencil" type="button" title="Penna">✎</button><button data-tool="text" type="button" title="Testo">T</button><button class="lm-tool-eraser" data-tool="eraser" type="button" title="Gomma" aria-label="Gomma"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7.2 20.8 17.9 7.5a3 3 0 0 1 4.2-.4l3.4 2.8a3 3 0 0 1 .4 4.2L15.2 27.4H8.8l-2.4-2a3.1 3.1 0 0 1 .8-4.6Z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="m13 25.8-5.5-4.5M15.3 27.3h10.2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button><button class="lm-tool-lasso" data-tool="lasso" type="button" title="Lazo" aria-label="Lazo"><svg viewBox="0 0 34 34" aria-hidden="true"><path d="M27.6 14.6c0 5.3-5.5 9.1-12.3 9.1S4.1 20.2 4.1 15.4 9.2 7 15.8 7s11.8 3.3 11.8 7.6Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="3.4 3.4"/><path d="M25.4 20.5c3.8 1.1 5 3.2 3.7 5.1-1.2 1.8-4.4 1.5-5.8-.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button><button data-tool="plus" type="button" title="Aggiungi">＋</button><button data-tool="undo" type="button" title="Annulla">↶</button><button data-tool="redo" type="button" title="Ripristina">↷</button></div><div class="lm-scroll-rail" aria-label="Scorri la pagina"><div class="lm-scroll-track"><div class="lm-scroll-thumb"></div></div></div><div class="lm-page-nav"><button class="lm-nav-prev" type="button">‹</button><span class="lm-page-counter">1 / 1</span><button class="lm-nav-next" type="button">›</button></div>`;
      const canvas=panel.querySelector(".lm-draw-canvas");installDrawing(canvas);
      const notebookPage=panel.querySelector(".lm-page");
      // v3A.10: Safari fuori dal foglio. Il blocco e' sul CONTENITORE intero, in capture,
      // quindi palmo/dito non possono arrivare a canvas, oggetti, testo o gesture native del browser.
      const killNativeTouch=e=>{
        if(e.pointerType==="touch" || e.type.startsWith("touch")){
          e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
        }
      };
      ["pointerdown","pointermove","pointerup","pointercancel"].forEach(type=>notebookPage.addEventListener(type,killNativeTouch,{capture:true,passive:false}));
      ["touchstart","touchmove","touchend","touchcancel"].forEach(type=>notebookPage.addEventListener(type,killNativeTouch,{capture:true,passive:false}));
      ["contextmenu","selectstart","dragstart"].forEach(type=>notebookPage.addEventListener(type,e=>{e.preventDefault();e.stopPropagation();},{capture:true}));
      notebookPage.addEventListener("gesturestart",e=>e.preventDefault(),{capture:true,passive:false});
      notebookPage.addEventListener("gesturechange",e=>e.preventDefault(),{capture:true,passive:false});
      panel.querySelector(".lm-page").addEventListener("contextmenu",e=>e.preventDefault());
      panel.querySelector(".lm-page").addEventListener("selectstart",e=>e.preventDefault());
      panel.querySelector(".lm-page").addEventListener("dragstart",e=>e.preventDefault());

      // v3A.11: Safari completamente spento nella schermata Quaderno, salvo i controlli espliciti.
      if(!screen.dataset.safariGuardV3a11){
        screen.dataset.safariGuardV3a11="1";
        const isNotebookControl=target=>target instanceof Element && !!target.closest(
          ".lm-header button,.lm-notebook-tools,.lm-scroll-rail,.lm-page-nav,.lm-plus-menu,.lm-more-menu,.lm-textbar,.lm-modal,.lm-search-pop"
        );
        const stopSafariNative=e=>{
          if(schermata!=="quaderno"||isNotebookControl(e.target)) return;
          e.preventDefault();
          e.stopPropagation();
          if(typeof e.stopImmediatePropagation==="function") e.stopImmediatePropagation();
        };
        ["touchstart","touchmove","touchend","touchcancel"].forEach(type=>screen.addEventListener(type,stopSafariNative,{capture:true,passive:false}));
        ["selectstart","contextmenu","dragstart"].forEach(type=>screen.addEventListener(type,stopSafariNative,{capture:true,passive:false}));
        document.addEventListener("selectionchange",()=>{
          if(schermata!=="quaderno") return;
          const sel=window.getSelection?.();
          if(sel && sel.rangeCount) sel.removeAllRanges();
        });
      }

      const tools=panel.querySelector(".lm-notebook-tools");tools.addEventListener("pointerdown",event=>event.stopPropagation());tools.addEventListener("click",event=>event.stopPropagation());
      // v3A.8: barra laterale esplicita. La Pencil resta dedicata agli strumenti del foglio.
      const scrollShell=panel.querySelector(".lm-notebook-shell"),scrollRail=panel.querySelector(".lm-scroll-rail"),scrollTrack=panel.querySelector(".lm-scroll-track"),scrollThumb=panel.querySelector(".lm-scroll-thumb");
      const syncScrollRail=()=>{if(!scrollShell||!scrollTrack||!scrollThumb)return;const max=Math.max(0,scrollShell.scrollHeight-scrollShell.clientHeight),trackH=scrollTrack.clientHeight,ratio=scrollShell.scrollHeight?scrollShell.clientHeight/scrollShell.scrollHeight:1,thumbH=Math.max(54,Math.min(trackH,trackH*ratio)),maxTop=Math.max(0,trackH-thumbH);scrollThumb.style.height=`${thumbH}px`;scrollThumb.style.top=`${max?scrollShell.scrollTop/max*maxTop:0}px`;scrollRail.classList.remove("hidden");};
      let railDrag=null;
      scrollThumb?.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();railDrag={id:e.pointerId,y:e.clientY,top:parseFloat(scrollThumb.style.top)||0};try{scrollThumb.setPointerCapture(e.pointerId)}catch(_){}} ,{passive:false});
      scrollThumb?.addEventListener("pointermove",e=>{if(!railDrag||railDrag.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();const maxScroll=Math.max(0,scrollShell.scrollHeight-scrollShell.clientHeight),maxTop=Math.max(1,scrollTrack.clientHeight-scrollThumb.offsetHeight),top=Math.max(0,Math.min(maxTop,railDrag.top+e.clientY-railDrag.y));scrollShell.scrollTop=top/maxTop*maxScroll;syncScrollRail();},{passive:false});
      const endRail=e=>{if(!railDrag||railDrag.id!==e.pointerId)return;railDrag=null;try{scrollThumb.releasePointerCapture(e.pointerId)}catch(_){}};scrollThumb?.addEventListener("pointerup",endRail);scrollThumb?.addEventListener("pointercancel",endRail);
      scrollTrack?.addEventListener("pointerdown",e=>{if(e.target===scrollThumb)return;e.preventDefault();e.stopPropagation();const r=scrollTrack.getBoundingClientRect(),maxTop=Math.max(1,scrollTrack.clientHeight-scrollThumb.offsetHeight),top=Math.max(0,Math.min(maxTop,e.clientY-r.top-scrollThumb.offsetHeight/2)),maxScroll=Math.max(0,scrollShell.scrollHeight-scrollShell.clientHeight);scrollShell.scrollTop=top/maxTop*maxScroll;syncScrollRail();},{passive:false});
      scrollShell?.addEventListener("scroll",syncScrollRail,{passive:true});window.addEventListener("resize",syncScrollRail,{passive:true});requestAnimationFrame(syncScrollRail);setTimeout(syncScrollRail,120);
      const grip=tools.querySelector(".lm-tools-grip");
      const confinaToolbar=(x,y,w,h)=>{
        const header=screen.querySelector(".lm-header")?.getBoundingClientRect();
        const nav=panel.querySelector(".lm-page-nav")?.getBoundingClientRect();
        const rail=panel.querySelector(".lm-scroll-rail")?.getBoundingClientRect();
        const minX=12;
        const maxX=Math.max(minX,Math.min(window.innerWidth-w-12,(rail?.left||window.innerWidth)-w-10));
        const minY=Math.max(12,(header?.bottom||88)+10);
        const maxY=Math.max(minY,(nav?.top||window.innerHeight-70)-h-12);
        return {x:Math.max(minX,Math.min(maxX,x)),y:Math.max(minY,Math.min(maxY,y))};
      };
      grip.addEventListener("pointerdown",event=>{
        event.preventDefault();event.stopPropagation();
        const r=tools.getBoundingClientRect(),ox=event.clientX-r.left,oy=event.clientY-r.top;
        grip.setPointerCapture(event.pointerId);
        const move=e=>{
          const pos=confinaToolbar(e.clientX-ox,e.clientY-oy,r.width,r.height);
          tools.style.left=`${pos.x}px`;
          tools.style.top=`${pos.y}px`;
          tools.style.bottom="auto";tools.style.transform="none";
        };
        const end=e=>{try{grip.releasePointerCapture(e.pointerId)}catch(_){ }grip.removeEventListener("pointermove",move);grip.removeEventListener("pointerup",end);grip.removeEventListener("pointercancel",end)};
        grip.addEventListener("pointermove",move);grip.addEventListener("pointerup",end);grip.addEventListener("pointercancel",end);
      });
      panel.querySelectorAll(".lm-notebook-tools button[data-tool]").forEach(btn=>btn.addEventListener("click",async event=>{
        event.preventDefault();event.stopPropagation();const t=btn.dataset.tool;
        if(["pencil","eraser","lasso"].includes(t)){notebookMode=t;resetSelection();renderNotebookPage();return;}
        if(t==="text"){await convertSelectionToText();return;}
        if(t==="plus"){positionPlusMenu(btn);plusMenu.classList.toggle("aperto");moreMenu.classList.remove("aperto");return;}
        if(t==="undo"&&notebookHistory.length){notebookFuture.push(notebookSnapshot());quadernoCorrente=notebookHistory.pop();resetSelection();await persistNotebook();renderNotebookPage();return;}
        if(t==="redo"&&notebookFuture.length){notebookHistory.push(notebookSnapshot());quadernoCorrente=notebookFuture.pop();resetSelection();await persistNotebook();renderNotebookPage();}
      }));
      panel.querySelector(".lm-nav-prev").addEventListener("click",async()=>{if(quadernoCorrente.currentPage>0){quadernoCorrente.currentPage--;resetSelection();await persistNotebook();renderNotebookPage();}});
      panel.querySelector(".lm-nav-next").addEventListener("click",async()=>{if(quadernoCorrente.currentPage<quadernoCorrente.pages.length-1){quadernoCorrente.currentPage++;}else{const lesson=currentLesson();if(!lesson)return;pushHistory();const p=paginaNuova(lesson.id,false);ensureDateObject(p);quadernoCorrente.pages.push(p);quadernoCorrente.currentPage=quadernoCorrente.pages.length-1;}resetSelection();await persistNotebook();renderNotebookPage();});
      await persistNotebook();renderNotebookPage();
    }

    function creaCardScheda(record, refresh) {
      const card = document.createElement("article");
      card.className = "lm-binder-card";

      const openButton = document.createElement("button");
      openButton.type = "button";
      openButton.className = "lm-binder-open";

      const preview = document.createElement("div");
      preview.className = "lm-binder-preview";

      const name = document.createElement("span");
      name.className = "lm-binder-name";
      name.textContent = record.name;

      const meta = document.createElement("span");
      meta.className = "lm-binder-meta";
      meta.textContent = record.type || "File";

      const objectUrl = URL.createObjectURL(record.blob);
      objectUrls.push(objectUrl);

      if (record.type && record.type.startsWith("image/")) {
        const img = document.createElement("img");
        img.src = objectUrl;
        img.alt = "";
        preview.appendChild(img);
      } else if (record.type === "application/pdf") {
        preview.textContent = "📕";
      } else {
        preview.textContent = "📄";
      }

      openButton.append(preview, name, meta);
      openButton.addEventListener("click", () => window.open(objectUrl, "_blank"));

      const menuButton = document.createElement("button");
      menuButton.type = "button";
      menuButton.className = "lm-binder-menu-button";
      menuButton.textContent = "⋯";
      menuButton.setAttribute("aria-label", "Azioni scheda");

      const menu = document.createElement("div");
      menu.className = "lm-binder-menu";

      const rename = document.createElement("button");
      rename.type = "button";
      rename.className = "lm-binder-rename";
      rename.textContent = "Rinomina";

      const del = document.createElement("button");
      del.type = "button";
      del.className = "lm-binder-delete";
      del.textContent = "Elimina";

      menu.append(rename, del);

      menuButton.addEventListener("click", event => {
        event.stopPropagation();
        panel.querySelectorAll(".lm-binder-menu.aperto").forEach(other => {
          if (other !== menu) other.classList.remove("aperto");
        });
        menu.classList.toggle("aperto");
      });

      rename.addEventListener("click", async event => {
        event.stopPropagation();
        menu.classList.remove("aperto");

        const nuovoNome = window.prompt("Nuovo nome della scheda:", record.name);
        if (nuovoNome === null) return;

        const pulito = nuovoNome.trim();
        if (!pulito || pulito === record.name) return;

        await rinominaScheda(record.id, pulito);
        await refresh();
      });

      del.addEventListener("click", async event => {
        event.stopPropagation();
        const ok = window.confirm(`Eliminare \"${record.name}\" dal raccoglitore?`);
        if (!ok) return;
        await eliminaScheda(record.id);
        await refresh();
      });

      card.append(openButton, menuButton, menu);
      return card;
    }

    async function renderRaccoglitore() {
      liberaObjectUrls();
      setBinderMode(true);
      setNotebookMode(false);
      schermata = "schede";
      temaClasse(classeCorrente);
      title.textContent = `${materiaCorrente} · Schede da stampare`;

      panel.innerHTML = `
        <div class="lm-binder-head">
          <div><h2>Raccoglitore</h2><p>Qui vivono le schede originali. Quando entreranno nel Quaderno, ne verrà usata una copia.</p></div>
          <span class="lm-binder-count">0 schede</span>
        </div>
        <div class="lm-binder-empty"><div class="lm-binder-empty-icon">🗂️</div><strong>Nessuna scheda ancora</strong><span>Usa “＋ Aggiungi” per mettere qui le schede originali di ${materiaCorrente}.</span></div>
        <div class="lm-binder-grid"></div>`;

      const count = panel.querySelector(".lm-binder-count");
      const empty = panel.querySelector(".lm-binder-empty");
      const grid = panel.querySelector(".lm-binder-grid");

      async function refresh() {
        liberaObjectUrls();
        const records = await leggiSchede(classeCorrente.id, materiaCorrente);
        count.textContent = `${records.length} ${records.length === 1 ? "scheda" : "schede"}`;
        grid.innerHTML = "";
        empty.style.display = records.length ? "none" : "flex";
        records.forEach(record => grid.appendChild(creaCardScheda(record, refresh)));
      }

      await refresh();
    }

    back.addEventListener("click", () => {
      if (schermata === "classi") screen.classList.remove("aperto");
      else if (schermata === "materie") renderClassi();
      else if (schermata === "materia") renderMaterie();
      else renderMateria();
    });

    add.addEventListener("click", () => {
      if (schermata === "schede") fileInput.click();
    });

    fileInput.addEventListener("change", async () => {
      if (schermata !== "schede" || !classeCorrente || !materiaCorrente) return;
      const files = Array.from(fileInput.files || []);
      for (const file of files) await salvaScheda(file, classeCorrente.id, materiaCorrente);
      fileInput.value = "";
      await renderRaccoglitore();
    });

    more.addEventListener("click", event => { if (schermata!=="quaderno") return; event.stopPropagation(); moreMenu.classList.toggle("aperto"); plusMenu.classList.remove("aperto"); });
    plusMenu.querySelector('[data-plus="sheet"]').addEventListener("click",()=>{plusMenu.classList.remove("aperto");openSheetPicker();});
    plusMenu.querySelector('[data-plus="image"]').addEventListener("click",()=>{plusMenu.classList.remove("aperto");notebookImageInput.click();});
    plusMenu.querySelector('[data-plus="file"]').addEventListener("click",()=>{plusMenu.classList.remove("aperto");notebookAnyInput.click();});
    notebookImageInput.addEventListener("change",async()=>{const f=notebookImageInput.files?.[0];notebookImageInput.value="";if(f&&schermata==="quaderno")await addBlobObject(f,f.name,"image");});
    notebookAnyInput.addEventListener("change",async()=>{const f=notebookAnyInput.files?.[0];notebookAnyInput.value="";if(f&&schermata==="quaderno")await addBlobObject(f,f.name,f.type?.startsWith("image/")?"image":"file");});
    screen.querySelectorAll(".lm-modal-close").forEach(b=>b.addEventListener("click",()=>b.closest(".lm-modal").classList.remove("aperto")));
    moreMenu.querySelector('[data-more="lesson"]').addEventListener("click",async()=>{if(schermata!=="quaderno")return;moreMenu.classList.remove("aperto");pushHistory();const id=`l-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;quadernoCorrente.lessons.push({id,title:"",startPage:quadernoCorrente.pages.length,createdAt:Date.now()});const nuova=paginaNuova(id,true);ensureDateObject(nuova);quadernoCorrente.pages.push(nuova);quadernoCorrente.currentPage=quadernoCorrente.pages.length-1;selectedObjectId=null;await persistNotebook();renderNotebookPage();});
    moreMenu.querySelector('[data-more="share"]').addEventListener("click",()=>{moreMenu.classList.remove("aperto");const lesson=currentLesson();shareModal.querySelector(".lm-share-info").textContent=lesson?`Argomento: ${lesson.title||"senza titolo"}. Verranno considerate le pagine di questa lezione.`:"Questa pagina non appartiene ancora a una lezione.";shareModal.classList.add("aperto");});
    shareModal.querySelector(".lm-share-now").addEventListener("click",()=>{shareModal.classList.remove("aperto");window.print();});
    const fontTrigger=screen.querySelector(".lm-font-trigger"),fontMenu=screen.querySelector(".lm-font-menu");fontTrigger.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();fontMenu.classList.toggle("aperto")});screen.querySelectorAll(".lm-font-choice").forEach(b=>b.addEventListener("click",async e=>{e.preventDefault();e.stopPropagation();const o=objectById(selectedObjectId);if(!o)return;pushHistory();o.fontFamily=b.dataset.value;fontTrigger.textContent=b.textContent;fontTrigger.style.fontFamily=b.dataset.value;fontMenu.classList.remove("aperto");await persistNotebook();renderNotebookPage();}));
    screen.querySelector(".lm-size").addEventListener("change",async e=>{const o=objectById(selectedObjectId);if(!o)return;pushHistory();o.fontSize=Number(e.target.value);await persistNotebook();renderNotebookPage();});
    screen.querySelector(".lm-align").addEventListener("click",async()=>{const o=objectById(selectedObjectId);if(!o)return;pushHistory();o.align=o.align==="left"?"center":o.align==="center"?"right":"left";await persistNotebook();renderNotebookPage();});
    screen.querySelector(".lm-color").addEventListener("input",async e=>{const o=objectById(selectedObjectId);if(!o)return;o.color=e.target.value;await persistNotebook();renderNotebookPage();});

    search.addEventListener("click", () => {
      if (schermata !== "quaderno") { searchPop.classList.add("aperto"); return; }
      searchResults.classList.add("aperto"); const input=searchResults.querySelector(".lm-search-input"), results=searchResults.querySelector(".lm-results"); input.value=""; results.innerHTML="<p>Scrivi una parola o una frase.</p>"; input.focus();
    });
    searchResults.querySelector(".lm-search-input").addEventListener("input",e=>{const q=e.target.value.trim().toLowerCase(),results=searchResults.querySelector(".lm-results");results.innerHTML="";if(!q){results.innerHTML="<p>Scrivi una parola o una frase.</p>";return;}quadernoCorrente.pages.forEach((p,i)=>{const texts=(p.objects||[]).filter(o=>o.type==="text").map(o=>o.text).join(" ");const lesson=quadernoCorrente.lessons.find(l=>l.id===p.lessonId);if(`${texts} ${lesson?.title||""}`.toLowerCase().includes(q)){const b=document.createElement("button");b.type="button";b.textContent=`Pagina ${i+1}${lesson?.title?` · ${lesson.title}`:""}`;b.addEventListener("click",async()=>{quadernoCorrente.currentPage=i;await persistNotebook();searchResults.classList.remove("aperto");renderNotebookPage();});results.appendChild(b);}});if(!results.children.length)results.innerHTML="<p>Nessun risultato.</p>";});

    searchPop.querySelector("button").addEventListener("click", () => searchPop.classList.remove("aperto"));
    searchPop.addEventListener("click", event => { if (event.target === searchPop) searchPop.classList.remove("aperto"); });

    document.addEventListener("click", event => {
      panel.querySelectorAll(".lm-binder-menu.aperto").forEach(menu => menu.classList.remove("aperto"));
      if (!plusMenu.contains(event.target)) plusMenu.classList.remove("aperto");
      if (event.target !== more && !moreMenu.contains(event.target)) moreMenu.classList.remove("aperto");
    });

    hotspot.removeAttribute("data-target");
    hotspot.addEventListener("click", event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      renderClassi();
      screen.classList.add("aperto");
    }, true);

    renderClassi();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
