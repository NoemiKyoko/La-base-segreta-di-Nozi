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
      paperType: String(classeId)==="1" ? "grid-1cm" : null,
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
      .lm-screen.notebook{user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-user-drag:none;width:100vw;height:100dvh;max-width:none;max-height:none;inset:0;background:linear-gradient(180deg,color-mix(in srgb,var(--lm-soft) 92%,white) 0%,color-mix(in srgb,var(--lm-soft) 62%,#fff7f2) 100%);overflow:hidden}
      .lm-screen.notebook .lm-header{position:relative;min-height:88px;flex:0 0 88px;padding:max(18px,env(safe-area-inset-top)) max(24px,env(safe-area-inset-right)) 10px max(24px,env(safe-area-inset-left));gap:12px;background:transparent;border:0;z-index:20}
      .lm-screen.notebook .lm-title{position:absolute;left:50%;top:50%;transform:translate(-50%,-42%);width:min(62vw,760px);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:clamp(25px,3vw,38px);letter-spacing:.01em}
      .lm-screen.notebook .lm-back{width:52px;height:52px;flex:0 0 52px;border-radius:18px;font-size:31px;z-index:2}
      .lm-screen.notebook .lm-search{margin-left:auto;width:52px;height:52px;min-width:52px;border-radius:18px;z-index:2}.lm-screen.notebook .lm-search svg{width:31px;height:31px}
      .lm-screen.notebook .lm-panel{width:100%;height:100%;max-width:none;margin:0;padding:0;border:0;background:transparent;box-shadow:none}.lm-screen.notebook.notebook-preparing .lm-panel{visibility:hidden}.lm-screen.notebook .lm-panel{transition:none}
      .lm-screen.notebook .lm-workspace{position:relative;flex:1;min-height:0;padding:4px 18px 78px;overflow:hidden;background:transparent}
      .lm-notebook-shell{position:absolute;inset:0 0 66px;display:flex;align-items:flex-start;justify-content:center;padding:22px 28px 22px;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;touch-action:none}
      .lm-page{position:relative;width:min(calc(100vw - 56px),calc((100dvh - 190px)*.82));height:auto;max-width:none;max-height:calc(100dvh - 190px);aspect-ratio:.82;background:#fff;box-shadow:0 10px 28px rgba(55,60,70,.17);border-radius:10px;overflow:hidden;touch-action:none;-webkit-touch-callout:none;user-select:none;-webkit-user-select:none}
      /* v3A.19 — pagina più grande, stessa proporzione */
      .lm-page{width:min(92vw,820px)!important;max-width:820px!important}

      /* v3A.19.1 — editor data: strumento generale del Quaderno, lavanda */
      .lm-date-editor-backdrop{
        position:fixed;inset:0;z-index:99999;background:rgba(45,52,72,.22);
        display:flex;align-items:center;justify-content:center;padding:22px;
      }
      .lm-date-editor{
        width:min(560px,92vw);background:#fbf9ff;border:2px solid #c9bce8;
        border-radius:24px;padding:24px;box-shadow:0 18px 55px rgba(74,61,111,.18);
        color:#354d68;font-family:Arial,sans-serif;
      }
      .lm-date-editor-title{font-size:24px;font-weight:700;margin-bottom:16px;color:#66558f}
      .lm-date-editor-input{
        box-sizing:border-box;width:100%;font-size:16px;padding:13px 14px;
        border:1.5px solid #d8cfee;border-radius:14px;background:white;color:#24384d;outline:none;
      }
      .lm-date-editor-input:focus{border-color:#9f8dcc;box-shadow:0 0 0 3px rgba(159,141,204,.16)}
      .lm-date-editor-label{font-size:16px;font-weight:700;margin:20px 0 10px;color:#66558f}
      .lm-date-writing{display:grid;grid-template-columns:1fr 1.55fr 1fr;gap:8px}
      .lm-date-writing button,.lm-date-editor-actions button{
        border:1.5px solid #d8cfee;background:#fff;border-radius:13px;padding:11px 10px;
        font:600 14px Arial,sans-serif;color:#5b5272;
      }
      .lm-date-writing button.is-active{background:#e8e0f6;border-color:#a997d3;color:#493b70}
      .lm-date-editor-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:22px}
      .lm-date-editor-actions .lm-date-save{background:#7966aa;border-color:#7966aa;color:white}
      @media(max-width:560px){
        .lm-date-writing{grid-template-columns:1fr}
        .lm-date-editor{padding:19px}
      }
.lm-page,.lm-page *{user-select:none!important;-webkit-user-select:none!important;-webkit-touch-callout:none!important;-webkit-user-drag:none!important}
      .lm-page-paper{position:absolute;inset:0;background-color:#fff;background-image:linear-gradient(to right,rgba(89,130,170,.12) 1px,transparent 1px),linear-gradient(to bottom,rgba(89,130,170,.12) 1px,transparent 1px);background-size:24px 24px}
      .lm-page-paper.paper-grid-1cm{background-image:linear-gradient(to right,rgba(89,130,170,.14) 1px,transparent 1px),linear-gradient(to bottom,rgba(89,130,170,.14) 1px,transparent 1px);background-size:48px 48px}
      .lm-page-paper.paper-grid-05cm{background-image:linear-gradient(to right,rgba(89,130,170,.12) 1px,transparent 1px),linear-gradient(to bottom,rgba(89,130,170,.12) 1px,transparent 1px);background-size:24px 24px}
      .lm-page-paper.paper-lines-2{background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 30px,rgba(98,130,170,.20) 30px,rgba(98,130,170,.20) 31px);background-size:100% 31px}
      .lm-page-paper.paper-lines-5{background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 30px,rgba(98,130,170,.20) 30px,rgba(98,130,170,.20) 31px);background-size:100% 31px}
      .lm-paper-choice{position:fixed;inset:0;z-index:1200;display:grid;place-items:center;background:rgba(40,52,70,.18);backdrop-filter:blur(2px)}
      .lm-paper-choice-card{width:min(520px,calc(100vw - 44px));padding:20px;border-radius:22px;background:#fffaf7;box-shadow:0 18px 55px rgba(35,45,60,.22);color:var(--lm-dark)}
      .lm-paper-choice-card h2{margin:0 0 5px;font-size:21px}.lm-paper-choice-card p{margin:0 0 16px;font-size:14px;opacity:.78}
      .lm-paper-options{display:grid;grid-template-columns:1fr 1fr;gap:12px}.lm-paper-option{appearance:none;border:1.5px solid color-mix(in srgb,var(--lm-color) 55%,white);border-radius:16px;background:white;padding:12px;color:var(--lm-dark);font-weight:800;font-size:15px}
      .lm-paper-preview{height:116px;margin-bottom:9px;border-radius:10px;border:1px solid rgba(70,90,120,.10);background-color:#fff}
      .lm-paper-preview.grid05{background-image:linear-gradient(to right,rgba(89,130,170,.12) 1px,transparent 1px),linear-gradient(to bottom,rgba(89,130,170,.12) 1px,transparent 1px);background-size:12px 12px}
      .lm-paper-preview.lines2{background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 15px,rgba(98,130,170,.20) 15px,rgba(98,130,170,.20) 16px)}
      .lm-paper-preview.lines5{background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 15px,rgba(98,130,170,.20) 15px,rgba(98,130,170,.20) 16px)}

      .lm-draw-canvas{position:absolute;inset:0;z-index:4;width:100%;height:100%;touch-action:none;-webkit-touch-callout:none;user-select:none;-webkit-user-select:none}
      .lm-object-layer{position:absolute;inset:0;z-index:5;pointer-events:none}
      .lm-lasso-hint{position:fixed;z-index:905;display:none;left:50%;top:88px;transform:translateX(-50%);padding:7px 12px;border-radius:12px;background:rgba(255,255,255,.94);color:var(--lm-dark);font-size:13px;font-weight:800;box-shadow:0 4px 14px rgba(50,60,75,.12)}.lm-lasso-hint.aperto{display:block}
      .lm-page-object{position:absolute;pointer-events:auto;touch-action:none;border:2px solid transparent;min-width:45px;min-height:28px}.lm-page-object.selected{border-color:#2b90d9;background:rgba(255,255,255,.15)}.lm-page-object.text{padding:4px 7px;color:#111;white-space:pre-wrap;line-height:1.2}
      .lm-page-object.text.lm-textbox-editing{border:1px solid rgba(43,144,217,.38)!important;background:rgba(255,255,255,.08)!important;min-height:34px!important;padding:2px 4px!important;touch-action:auto!important;overflow:visible!important}
      .lm-text-move-handle{
        position:absolute;left:-10px;top:-10px;width:24px;height:24px;border-radius:50%;
        border:1px solid rgba(43,144,217,.35);background:rgba(255,255,255,.92);
        box-shadow:0 2px 8px rgba(0,0,0,.10);display:grid;place-items:center;
        font-size:13px;color:#5f7184;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;
      }
      .lm-text-move-handle:active{cursor:grabbing}

      .lm-page-object.text.lm-textbox-editing .lm-native-text-editor{display:block!important;width:100%!important;min-height:30px!important;height:auto;box-sizing:border-box!important;border:0!important;outline:0!important;resize:none!important;background:transparent!important;color:inherit!important;font:inherit!important;font-family:inherit!important;font-size:inherit!important;font-weight:inherit!important;font-style:inherit!important;line-height:1.2!important;text-align:inherit!important;padding:0!important;margin:0!important;overflow:hidden!important;-webkit-appearance:none!important;appearance:none!important;touch-action:auto!important;user-select:text!important;-webkit-user-select:text!important;-webkit-touch-callout:default!important;caret-color:#111!important}
.lm-page-object.text.andika{font-feature-settings:normal;font-variant-ligatures:normal}.lm-page-object img{display:block;width:100%;height:100%;object-fit:contain;pointer-events:none;-webkit-user-drag:none}.lm-page-object.file{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:10px;background:#fffaf4;color:#444;box-shadow:0 3px 10px rgba(0,0,0,.07)}
      .lm-object-delete,.lm-object-resize{display:none;position:absolute;appearance:none;border:0;width:27px;height:27px;border-radius:50%;background:#fff;color:#5f7184;box-shadow:0 2px 8px rgba(0,0,0,.16);cursor:pointer}.lm-page-object.selected .lm-object-delete,.lm-page-object.selected .lm-object-resize{display:block}.lm-object-delete{right:-12px;top:-12px}.lm-object-resize{right:-12px;bottom:-12px}
      .lm-notebook-tools{position:fixed;left:max(18px,env(safe-area-inset-left));bottom:max(18px,env(safe-area-inset-bottom));z-index:880;display:flex;align-items:center;gap:1px;padding:6px 7px 6px 22px;border:1.25px solid color-mix(in srgb,var(--lm-color) 62%,white);border-radius:17px;background:color-mix(in srgb,var(--lm-soft) 88%,white);box-shadow:0 5px 14px rgba(80,60,45,.12);touch-action:none;user-select:none;-webkit-user-select:none}.lm-tools-grip{position:absolute;left:5px;top:50%;transform:translateY(-50%);width:16px;height:29px;display:grid;place-items:center;color:color-mix(in srgb,var(--lm-dark) 62%,white);font-weight:900;font-size:14px;cursor:grab;touch-action:none}.lm-tools-grip:active{cursor:grabbing}.lm-notebook-tools button{appearance:none;border:0;width:34px;height:34px;border-radius:9px;background:transparent;color:var(--lm-dark);font-size:17px;font-weight:800;cursor:pointer;touch-action:manipulation}.lm-notebook-tools button.active{background:white;box-shadow:0 2px 7px rgba(45,50,60,.09)}.lm-notebook-tools button:disabled{opacity:.28}.lm-tool-eraser,.lm-tool-lasso{display:grid!important;place-items:center}.lm-tool-eraser svg,.lm-tool-lasso svg{width:18px;height:18px;display:block;overflow:visible}.lm-tool-eraser svg{width:19px;height:19px}.lm-tool-lasso svg{width:20px;height:20px}
      .lm-scroll-rail{position:fixed;right:max(4px,env(safe-area-inset-right));top:132px;bottom:92px;width:8px;z-index:870;display:flex;justify-content:center;touch-action:none;user-select:none;-webkit-user-select:none}.lm-scroll-track{position:relative;width:2px;height:100%;border-radius:999px;background:rgba(23,63,122,.08)}.lm-scroll-thumb{position:absolute;left:50%;top:0;transform:translateX(-50%);width:5px;min-height:42px;border-radius:999px;background:color-mix(in srgb,var(--lm-color) 72%,white);box-shadow:0 1px 4px rgba(45,55,70,.12);touch-action:none}.lm-scroll-rail.hidden{display:none}
      .lm-page-nav{position:fixed;left:50%;bottom:max(28px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:875;display:flex;align-items:center;gap:10px;padding:6px 9px;border:1.5px solid color-mix(in srgb,var(--lm-color) 58%,white);border-radius:18px;background:color-mix(in srgb,var(--lm-soft) 90%,white);box-shadow:0 6px 16px rgba(80,60,45,.11)}.lm-page-nav button{appearance:none;border:0;width:34px;height:32px;background:transparent;color:var(--lm-dark);font-size:27px;cursor:pointer}.lm-page-nav span{min-width:64px;text-align:center;color:var(--lm-dark);font-weight:850;font-size:15px}
      .lm-plus-menu,.lm-more-menu{position:fixed;z-index:910;display:none;min-width:190px;padding:8px;border:1px solid color-mix(in srgb,var(--lm-color) 42%,white);border-radius:17px;background:#fffaf7;box-shadow:0 10px 30px rgba(35,45,60,.20)}.lm-plus-menu{left:max(170px,calc(env(safe-area-inset-left) + 130px));bottom:max(92px,calc(env(safe-area-inset-bottom) + 82px))}.lm-more-menu{right:max(24px,env(safe-area-inset-right));top:max(78px,calc(env(safe-area-inset-top) + 66px))}.lm-plus-menu.aperto,.lm-more-menu.aperto{display:block}.lm-plus-menu button,.lm-more-menu button{appearance:none;border:0;width:100%;padding:11px 13px;border-radius:11px;background:transparent;color:var(--lm-dark);text-align:left;font-size:15px;font-weight:750;cursor:pointer}.lm-plus-menu button:hover,.lm-more-menu button:hover{background:var(--lm-soft)}
      .lm-transcribe{position:fixed;inset:0;z-index:960;display:none;place-items:center;background:rgba(35,42,52,.20);padding:20px}.lm-transcribe.aperto{display:grid}.lm-transcribe-card{width:min(560px,92vw);padding:18px;border-radius:20px;background:#fffaf7;border:1.5px solid color-mix(in srgb,var(--lm-color) 50%,white);box-shadow:0 18px 45px rgba(40,45,55,.20)}.lm-transcribe-title{font-weight:850;color:var(--lm-dark);margin-bottom:10px}.lm-transcribe-input{width:100%;min-height:82px;resize:vertical;border:1.5px solid rgba(80,90,105,.18);border-radius:13px;padding:12px;font:20px Andika,Arial,sans-serif;color:#111;background:white;box-sizing:border-box}.lm-transcribe-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.lm-transcribe-actions button{appearance:none;border:0;border-radius:11px;padding:10px 14px;font-weight:800}.lm-transcribe-cancel{background:#eee;color:#536273}.lm-transcribe-ok{background:var(--lm-color);color:white}
      .lm-textbar{position:fixed;left:50%;top:50%;transform:translate(-50%,70px);z-index:900;display:none;align-items:center;overflow:visible;border:1.5px solid color-mix(in srgb,var(--lm-color) 55%,white);border-radius:19px;background:#fffaf7;box-shadow:0 9px 24px rgba(60,50,45,.15)}.lm-textbar.aperto{display:flex}.lm-textbar select,.lm-textbar button,.lm-textbar input,.lm-font-trigger{height:50px;border:0;border-right:1px solid rgba(100,100,100,.09);background:transparent;color:var(--lm-dark);font-size:16px;font-weight:750}.lm-textbar select{padding:0 13px}.lm-font-wrap{position:relative}.lm-font-trigger{appearance:none;border:0;border-right:1px solid rgba(100,100,100,.09);background:transparent;padding:0 14px;min-width:170px;color:var(--lm-dark);font-size:16px;font-weight:600;text-align:left}.lm-font-menu{display:none;position:absolute;left:0;bottom:56px;min-width:220px;padding:7px;background:#fffaf7;border:1.5px solid color-mix(in srgb,var(--lm-color) 45%,white);border-radius:15px;box-shadow:0 9px 24px rgba(60,50,45,.16);z-index:930}.lm-font-menu.aperto{display:grid;gap:7px;grid-auto-rows:minmax(52px,auto)}.lm-font-choice{appearance:none;border:0!important;border-radius:10px;background:transparent!important;min-height:52px!important;height:auto!important;padding:8px 12px!important;line-height:1.15!important;overflow:visible!important;white-space:nowrap!important;text-align:left;color:#111!important;font-size:18px!important;font-weight:400!important}.lm-font-choice:hover,.lm-font-choice:focus{background:color-mix(in srgb,var(--lm-soft) 75%,white)!important}.lm-font-choice[data-font="andika"]{font-family:Andika,Arial,sans-serif}.lm-font-choice[data-font="corsivo"]{font-family:"Corsivo Primaria",cursive}.lm-font-choice[data-font="arial"]{font-family:Arial,sans-serif}.lm-textbar button{width:49px;font-size:21px;cursor:pointer}.lm-textbar input[type=color]{width:52px;padding:10px;border-right:0}.lm-font-other{appearance:none;border:0!important;border-top:1px solid rgba(100,100,100,.10)!important;background:transparent!important;width:100%!important;min-height:48px!important;height:auto!important;padding:8px 12px!important;line-height:1.2!important;text-align:left;font-size:15px!important;color:#536273!important}.lm-textbar button.on{background:color-mix(in srgb,var(--lm-soft) 76%,white)}.lm-page-object.text.editing{outline:1.5px solid color-mix(in srgb,var(--lm-color) 70%,white);cursor:text;user-select:text;-webkit-user-select:text;min-height:1.5em}
.lm-page-object.text.editing{padding:0!important;overflow:visible!important}
.lm-native-text-editor{display:block;width:100%;height:100%;min-height:1.6em;box-sizing:border-box;border:0;outline:0;resize:none;background:transparent;color:inherit;font:inherit;font-family:inherit;font-size:inherit;font-weight:inherit;font-style:inherit;line-height:inherit;text-align:inherit;padding:0;margin:0;overflow:hidden;-webkit-appearance:none;appearance:none}
.lm-screen[data-notebook-tool="text"] .lm-page{cursor:text}
      .lm-notebook-file{display:none}
      @media(max-width:760px){.lm-header{gap:8px}.lm-workspace{padding:14px 10px}.lm-panel{width:96vw;padding:16px;border-width:6px}.lm-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.lm-class-card,.lm-subject-card{min-height:135px;padding:12px}.lm-class-folder{width:88px;height:62px;margin-bottom:12px}.lm-class-folder::before{width:42px;height:16px;top:-13px}.lm-card-label,.lm-subject-name{font-size:15px}.lm-subject-icon{font-size:34px}.lm-choice-grid{grid-template-columns:1fr;gap:14px}.lm-choice-card{min-height:180px}.lm-choice-icon{font-size:54px}.lm-search{padding:0}.lm-title{font-size:21px}.lm-add{padding:0 10px;font-size:13px}.lm-binder-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.lm-binder-head{align-items:flex-start;flex-direction:column}.lm-binder-card{padding:10px}.lm-screen.notebook .lm-workspace{padding:2px 8px 74px}.lm-screen.notebook .lm-header{min-height:78px;flex-basis:78px;padding-left:12px;padding-right:12px}.lm-screen.notebook .lm-title{font-size:21px;width:58vw}.lm-screen.notebook .lm-back,.lm-screen.notebook .lm-search,.lm-screen.notebook .lm-more{width:46px;height:46px;min-width:46px;flex-basis:46px;border-radius:15px}.lm-notebook-shell{inset:0 0 58px;padding:16px 14px 0}.lm-page{width:min(calc(100vw - 28px),calc((100dvh - 160px)*.82));max-height:calc(100dvh - 160px)}.lm-notebook-tools{left:10px;bottom:10px}.lm-page-nav{bottom:10px}}
    
      /* v3A.16.5 — SOLO RIPRISTINO TOOLBAR + NAV. SCROLLBAR INTOCCABILE. */
      .lm-notebook-tools{display:flex!important;visibility:visible!important;opacity:1!important;z-index:980!important}
      .lm-page-nav{display:flex!important;visibility:visible!important;opacity:1!important;z-index:975!important}
      /* v3A.16.6 — SOLO RIPRISTINO FOGLIO. */
      .lm-page{
        display:block!important;
        visibility:visible!important;
        opacity:1!important;
        flex:0 0 auto!important;
        z-index:1!important;
        min-width:280px;
        min-height:360px;
        background:#fff!important;
      }
      .lm-page-paper{
        display:block!important;
        visibility:visible!important;
        opacity:1!important;
        z-index:0!important;
        pointer-events:none;
      }
      .lm-draw-canvas{
        display:block!important;
        visibility:visible!important;
        opacity:1!important;
      }
      .lm-object-layer{
        display:block!important;
        visibility:visible!important;
        opacity:1!important;
      }

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
      <div class="lm-transcribe"><div class="lm-transcribe-card"><div class="lm-transcribe-title">Trasforma in testo digitale</div><textarea class="lm-transcribe-input" placeholder="Scrivi qui il testo (puoi usare anche Scribble con Apple Pencil)"></textarea><div class="lm-transcribe-actions"><button class="lm-transcribe-cancel" type="button">Annulla</button><button class="lm-transcribe-ok" type="button">Digitalizza</button></div></div></div><div class="lm-lasso-hint">Scrittura selezionata: premi T per trasformarla in testo</div><div class="lm-textbar"><div class="lm-font-wrap"><button class="lm-font-trigger" type="button" aria-label="Font">Andika</button><div class="lm-font-menu"><button class="lm-font-choice" data-font="andika" data-value="'Andika', Arial, sans-serif" type="button">Andika</button><button class="lm-font-choice" data-font="corsivo" data-value="'Corsivo Primaria', cursive" type="button">Corsivo Primaria</button><button class="lm-font-choice" data-font="arial" data-value="Arial, sans-serif" type="button">Arial</button><button class="lm-font-other" type="button">Altri font…</button></div></div><select class="lm-size"><option>12</option><option>24</option><option selected>32</option><option>40</option><option>48</option><option>56</option></select><button class="lm-align" type="button" title="Allineamento">☰</button><input class="lm-color" type="color" value="#111111" title="Colore"></div>
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
        screen.classList.remove("notebook-preparing");
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

    let textDefaults={fontFamily:"'Andika', Arial, sans-serif",fontSize:32,bold:false,italic:false,align:"left",color:"#111111"};
    function textStyleTarget(){return objectById(selectedObjectId);}
    async function beginTextAtPoint(clientX,clientY){
      if(notebookMode!=="text")return;
      const page=currentNotebookPage(),pageEl=panel.querySelector(".lm-page"),layer=pageEl?.querySelector(".lm-object-layer");
      if(!page||!pageEl||!layer)return;
      const r=pageEl.getBoundingClientRect();
      const x=Math.max(1,Math.min(88,(clientX-r.left)/r.width*100));
      const y=Math.max(1,Math.min(94,(clientY-r.top)/r.height*100));
      pushHistory();
      const obj={id:`o-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,type:"text",text:"",x,y,w:Math.min(62,96-x),h:5,...textDefaults};
      page.objects.push(obj);selectedObjectId=obj.id;
      makePageObjectElement(obj,layer);
      const el=layer.querySelector(`.lm-page-object[data-id="${obj.id}"]`);
      if(el) editTextInline(obj,el,true);
    }

    function openDateEditor(obj){
      document.querySelector(".lm-date-editor-backdrop")?.remove();

      const back=document.createElement("div");
      back.className="lm-date-editor-backdrop";
      back.innerHTML=`
        <div class="lm-date-editor" role="dialog" aria-modal="true" aria-label="Modifica data">
          <div class="lm-date-editor-title">Modifica data</div>
          <input class="lm-date-editor-input" type="text" autocomplete="off">
          <div class="lm-date-editor-label">Scrittura</div>
          <div class="lm-date-writing">
            <button type="button" data-date-style="font">Font</button>
            <button type="button" data-date-style="upper">STAMPATO MAIUSCOLO</button>
            <button type="button" data-date-style="cursive">Corsivo</button>
          </div>
          <div class="lm-date-editor-actions">
            <button type="button" class="lm-date-cancel">Annulla</button>
            <button type="button" class="lm-date-save">Salva</button>
          </div>
        </div>`;

      document.body.appendChild(back);
      const input=back.querySelector(".lm-date-editor-input");
      input.value=String(obj.text||"");

      let mode=obj.dateWriting||"font";
      const refresh=()=>back.querySelectorAll("[data-date-style]").forEach(b=>
        b.classList.toggle("is-active",b.dataset.dateStyle===mode)
      );
      refresh();

      back.querySelectorAll("[data-date-style]").forEach(b=>b.addEventListener("click",()=>{
        mode=b.dataset.dateStyle; refresh();
      }));
      const close=()=>back.remove();
      back.querySelector(".lm-date-cancel").addEventListener("click",close);
      back.addEventListener("click",e=>{ if(e.target===back) close(); });

      back.querySelector(".lm-date-save").addEventListener("click",async()=>{
        pushHistory();
        let value=input.value.trim();
        obj.dateWriting=mode;
        obj.fontSize=16;
        if(mode==="upper"){
          obj.text=value.toLocaleUpperCase("it-IT");
          obj.fontFamily="Arial, sans-serif";
        }else if(mode==="cursive"){
          obj.text=value;
          obj.fontFamily="'Corsivo Primaria', cursive";
        }else{
          obj.text=value;
          obj.fontFamily="Arial, sans-serif";
        }
        await persistNotebook();
        close();
        renderNotebookPage();
      });

      setTimeout(()=>{ input.focus(); input.setSelectionRange(input.value.length,input.value.length); },0);
    }

    function editTextInline(obj,el,isNew=false){
      if(obj?.fontFamily==="Andika" || obj?.font==="Andika"){
        el.style.fontFamily='Andika, Arial, sans-serif';
      }

      if(!obj||!el)return;
      selectedObjectId=obj.id;
      el.classList.add("selected","lm-textbox-editing");
      el.style.pointerEvents="auto";
      el.innerHTML="";

      const moveHandle=document.createElement("button");
      moveHandle.type="button";
      moveHandle.className="lm-text-move-handle";
      moveHandle.textContent="↔";
      moveHandle.setAttribute("aria-label","Sposta casella di testo");
      el.appendChild(moveHandle);

      const ta=document.createElement("textarea");
      ta.className="lm-native-text-editor";
      ta.rows=1;
      ta.value=obj.text||"";
      ta.spellcheck=true;
      ta.setAttribute("aria-label","Scrivi testo");
      el.appendChild(ta);

      const autosize=()=>{
        ta.style.height="auto";
        ta.style.height=Math.max(30,ta.scrollHeight)+"px";
        el.style.height="auto";
        el.style.minHeight=Math.max(34,ta.scrollHeight+4)+"px";
      };

      ta.addEventListener("pointerdown",e=>{e.stopPropagation();});
      ta.addEventListener("click",e=>{
        e.stopPropagation();
        // Secondo tocco dentro la casella: focus esplicito.
        ta.focus({preventScroll:true});
        try{const n=ta.value.length;ta.setSelectionRange(n,n);}catch(_){}
      });
      ta.addEventListener("input",()=>{obj.text=ta.value;autosize();});

      // Spostamento SOLO dalla maniglia ↔.
      moveHandle.addEventListener("pointerdown",e=>{
        e.preventDefault();e.stopPropagation();
        const pageEl=el.closest(".lm-page");
        if(!pageEl)return;
        const pageRect=pageEl.getBoundingClientRect();
        const boxRect=el.getBoundingClientRect();
        const dx=e.clientX-boxRect.left,dy=e.clientY-boxRect.top;
        moveHandle.setPointerCapture?.(e.pointerId);
        const move=ev=>{
          ev.preventDefault();ev.stopPropagation();
          const left=Math.max(0,Math.min(pageRect.width-boxRect.width,ev.clientX-pageRect.left-dx));
          const top=Math.max(0,Math.min(pageRect.height-boxRect.height,ev.clientY-pageRect.top-dy));
          obj.x=left/pageRect.width*100;
          obj.y=top/pageRect.height*100;
          el.style.left=`${obj.x}%`;
          el.style.top=`${obj.y}%`;
        };
        const end=async ev=>{
          try{moveHandle.releasePointerCapture?.(ev.pointerId);}catch(_){}
          moveHandle.removeEventListener("pointermove",move);
          moveHandle.removeEventListener("pointerup",end);
          moveHandle.removeEventListener("pointercancel",end);
          await persistNotebook();
        };
        moveHandle.addEventListener("pointermove",move);
        moveHandle.addEventListener("pointerup",end);
        moveHandle.addEventListener("pointercancel",end);
      },{passive:false});

      ta.addEventListener("blur",async()=>{
        obj.text=ta.value.replace(/\n+$/,"");
        el.classList.remove("lm-textbox-editing");
        if(isNew&&!obj.text){
          const p=currentNotebookPage();
          if(p)p.objects=p.objects.filter(o=>o.id!==obj.id);
          selectedObjectId=null;
        }
        await persistNotebook();
        renderNotebookPage();
      },{once:true});

      updateTextbar();
      positionTextbar();
      autosize();

      // Non forziamo la tastiera al primo tocco: la casella nasce, poi l'utente tocca dentro per scrivere.
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
      const obj=objectById(selectedObjectId),style=(obj&&obj.type==="text")?obj:(notebookMode==="text"?textDefaults:null);
      textbar.classList.toggle("aperto",!!style);if(!style)return;
      screen.querySelector(".lm-size").value=String(style.fontSize||32);screen.querySelector(".lm-color").value=style.color||"#111111";
      const ft=screen.querySelector(".lm-font-trigger"),target=style.fontFamily||"'Andika', Arial, sans-serif";
      ft.textContent=target.includes("Corsivo")?"Corsivo Primaria":target.includes("Andika")?"Andika":target.startsWith("Arial")?"Arial":target.split(",")[0].replaceAll("'","").replaceAll('"',"");ft.style.fontFamily=target;
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
        el.style.fontWeight = obj.bold ? "700" : "400";
        el.style.fontStyle = obj.italic ? "italic" : "normal";
        el.style.textAlign = obj.align || "left";
        el.style.color = obj.color || "#111111";
        el.addEventListener("dblclick",event=>{event.preventDefault();event.stopPropagation();pushHistory();editTextInline(obj,el,false);});
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
        if (event.target === del || event.target === resize || ["pencil","eraser"].includes(notebookMode)) return;
        // In modalità T, un testo già esistente NON deve entrare nel drag generico:
        // il tap deve poter arrivare all'handler che riapre davvero l'editor.
        if (obj.role === "date" || (obj.type === "text" && notebookMode === "text")) {
          event.stopPropagation();
          return;
        }
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
      if(obj.type==="text"){
        const reopen=async(e)=>{
          if(obj.role==="date"){
            e.preventDefault();e.stopPropagation();
            openDateEditor(obj);
            return;
          }
          if(notebookMode!=="text")return;
          if(e.target?.closest?.(".lm-text-move-handle,.lm-object-delete,.lm-object-resize"))return;
          e.preventDefault();e.stopPropagation();
          editTextInline(obj,el,false);
        };
        el.addEventListener("dblclick",reopen);
        el.addEventListener("pointerup",e=>{
          if(obj.role!=="date" && notebookMode!=="text")return;
          reopen(e);
        });
        el.addEventListener("click",e=>{
          if(obj.role!=="date" && notebookMode!=="text")return;
          reopen(e);
        });
      }
    }

    function renderNotebookPage() {
      liberaObjectUrls();
      const page=currentNotebookPage();if(!page)return;
      ensureDateObject(page);
      applyNotebookPaper();
      const pageEl=panel.querySelector(".lm-page");if(!pageEl)return;
      const layer=pageEl.querySelector(".lm-object-layer");layer.innerHTML="";
      (page.objects||[]).forEach(obj=>makePageObjectElement(obj,layer));
      layer.querySelectorAll(".lm-page-object").forEach(el=>{el.style.pointerEvents=["pencil","eraser"].includes(notebookMode)?"none":"auto";});
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
      // v3A.14: sul canvas lavora solo la Pencil. Dito/palmo vengono neutralizzati
      // esclusivamente qui, senza blocchi globali sulla schermata o sulla toolbar.
      const isTouch=e=>e.pointerType==="touch";
      const blockTouch=e=>{if(isTouch(e)){e.preventDefault();e.stopPropagation();}};
      canvas.addEventListener("contextmenu",e=>e.preventDefault());
      canvas.addEventListener("dragstart",e=>e.preventDefault());
      canvas.addEventListener("selectstart",e=>e.preventDefault());
      ["pointerdown","pointermove","pointerup","pointercancel"].forEach(type=>canvas.addEventListener(type,blockTouch,{capture:true,passive:false}));
      ["touchstart","touchmove","touchend","touchcancel"].forEach(type=>canvas.addEventListener(type,e=>{e.preventDefault();e.stopPropagation();},{capture:true,passive:false}));
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
          const add=ev=>{const p=norm(ev,rect),last=stroke.points[stroke.points.length-1];if(!last||Math.abs(p.x-last.x)>0.00001||Math.abs(p.y-last.y)>0.00001)stroke.points.push(p)};
          add(e);renderCanvas(canvas,page);
          const feed=ev=>{if(ev.pointerType!=="pen")return;ev.preventDefault();let events=typeof ev.getCoalescedEvents==="function"?ev.getCoalescedEvents():[ev];if(!events.length)events=[ev];events.forEach(add);renderCanvas(canvas,page)};
          const move=ev=>feed(ev),raw=ev=>feed(ev);
          const end=async ev=>{try{canvas.releasePointerCapture(ev.pointerId)}catch(_){ }canvas.removeEventListener("pointermove",move);canvas.removeEventListener("pointerrawupdate",raw);canvas.removeEventListener("pointerup",end);canvas.removeEventListener("pointercancel",end);stroke=null;await persistNotebook();};
          canvas.addEventListener("pointermove",move,{passive:false});canvas.addEventListener("pointerrawupdate",raw,{passive:false});canvas.addEventListener("pointerup",end);canvas.addEventListener("pointercancel",end);return;
        }
        if(notebookMode==="eraser"){
          if(e.pointerType!=="pen") return;
          e.preventDefault();pushHistory();erasing=true;canvas.setPointerCapture(e.pointerId);
          const eraseAt=ev=>{
            const p=norm(ev,rect), radius=.018;
            const dateObj=(page.objects||[]).find(o=>o.role==="date");
            if(dateObj){
              const dx=(dateObj.x||0)/100, dy=(dateObj.y||0)/100;
              const dw=(dateObj.w||58)/100, dh=((dateObj.h||8)/100);
              const padX=.02, padY=.025;
              const hitDate = p.x>=dx-padX && p.x<=dx+dw+padX && p.y>=dy-padY && p.y<=dy+dh+padY;
              if(hitDate){
                page.objects=page.objects.filter(o=>o.id!==dateObj.id);
                page.date="";
                selectedObjectId=null;
              }
            }
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

    function applyNotebookPaper() {
      const paper=panel.querySelector(".lm-page-paper");
      if(!paper||!quadernoCorrente)return;
      const type=quadernoCorrente.paperType || (String(classeCorrente?.id)==="1" ? "grid-1cm" : "grid-05cm");
      paper.classList.remove("paper-grid-1cm","paper-grid-05cm","paper-lines-2","paper-lines-5");
      paper.classList.add(
        type==="grid-1cm" ? "paper-grid-1cm" :
        type==="grid-05cm" ? "paper-grid-05cm" :
        type==="lines-5" ? "paper-lines-5" : "paper-lines-2"
      );
    }

    async function chooseNotebookPaperIfNeeded() {
      if(!quadernoCorrente)return;
      if(String(classeCorrente.id)==="1"){
        if(quadernoCorrente.paperType!=="grid-1cm"){quadernoCorrente.paperType="grid-1cm";await persistNotebook();}
        applyNotebookPaper(); return;
      }
      if(quadernoCorrente.paperType){applyNotebookPaper();return;}

      const linesType=String(classeCorrente.id)==="5" ? "lines-5" : "lines-2";
      const linesLabel="Righe";
      const modal=document.createElement("div");
      modal.className="lm-paper-choice";
      modal.innerHTML=`<div class="lm-paper-choice-card"><h2>Scegli il foglio</h2><p>${classeCorrente.label} · ${materiaCorrente}</p><div class="lm-paper-options"><button type="button" class="lm-paper-option" data-paper="${linesType}"><div class="lm-paper-preview ${linesType==="lines-5"?"lines5":"lines2"}"></div>${linesLabel}</button><button type="button" class="lm-paper-option" data-paper="grid-05cm"><div class="lm-paper-preview grid05"></div>Quadretti da 0,5 cm</button></div></div>`;
      screen.appendChild(modal);
      await new Promise(resolve=>{
        modal.querySelectorAll("[data-paper]").forEach(btn=>btn.addEventListener("click",async()=>{
          quadernoCorrente.paperType=btn.dataset.paper;
          await persistNotebook();
          applyNotebookPaper();
          modal.remove();
          resolve();
        },{once:true}));
      });
    }

    async function renderQuaderno() {
      liberaObjectUrls();setBinderMode(false);setNotebookMode(true);screen.classList.add("notebook-preparing");schermata="quaderno";temaClasse(classeCorrente);title.textContent=`${materiaCorrente.toUpperCase()} — QUADERNO`;
      quadernoCorrente=await leggiQuaderno(classeCorrente.id,materiaCorrente);notebookHistory=[];notebookFuture=[];resetSelection();notebookMode="pencil";
      (quadernoCorrente.pages||[]).forEach(ensureDateObject);
      panel.innerHTML=`<div class="lm-notebook-shell"><div class="lm-page"><div class="lm-page-paper"></div><canvas class="lm-draw-canvas"></canvas><div class="lm-object-layer"></div></div></div><div class="lm-notebook-tools"><span class="lm-tools-grip" title="Sposta toolbar">≡</span><button data-tool="pencil" type="button" title="Penna">✎</button><button data-tool="text" type="button" title="Testo">T</button><button class="lm-tool-eraser" data-tool="eraser" type="button" title="Gomma" aria-label="Gomma"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7.2 20.8 17.9 7.5a3 3 0 0 1 4.2-.4l3.4 2.8a3 3 0 0 1 .4 4.2L15.2 27.4H8.8l-2.4-2a3.1 3.1 0 0 1 .8-4.6Z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="m13 25.8-5.5-4.5M15.3 27.3h10.2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button><button data-tool="plus" type="button" title="Aggiungi">＋</button><button data-tool="undo" type="button" title="Annulla">↶</button><button data-tool="redo" type="button" title="Ripristina">↷</button></div><div class="lm-scroll-rail" aria-label="Scorri la pagina"><div class="lm-scroll-track"><div class="lm-scroll-thumb"></div></div></div><div class="lm-page-nav"><button class="lm-nav-prev" type="button">‹</button><span class="lm-page-counter">1 / 1</span><button class="lm-nav-next" type="button">›</button></div>`;
      const restoreNotebookUI=()=>{
        const t=panel.querySelector(".lm-notebook-tools");
        const n=panel.querySelector(".lm-page-nav");
        if(t){t.style.display="flex";t.style.visibility="visible";t.style.opacity="1";}
        if(n){n.style.display="flex";n.style.visibility="visible";n.style.opacity="1";}
      };
      restoreNotebookUI();
      requestAnimationFrame(restoreNotebookUI);
      setTimeout(restoreNotebookUI,120);
      applyNotebookPaper();
      await chooseNotebookPaperIfNeeded();

      const canvas=panel.querySelector(".lm-draw-canvas");installDrawing(canvas);
      const pageForNativeBlock=panel.querySelector(".lm-page");
      pageForNativeBlock.addEventListener("contextmenu",e=>{e.preventDefault();e.stopPropagation();},{capture:true});
      pageForNativeBlock.addEventListener("selectstart",e=>{if(notebookMode!=="text"){e.preventDefault();e.stopPropagation();}},{capture:true});
      pageForNativeBlock.addEventListener("dragstart",e=>{e.preventDefault();e.stopPropagation();},{capture:true});pageForNativeBlock.addEventListener("pointerdown",e=>{if(notebookMode!=="text"||e.target.closest(".lm-page-object")||e.pointerType==="pen")return;e.stopPropagation();beginTextAtPoint(e.clientX,e.clientY);},{capture:true});
      const tools=panel.querySelector(".lm-notebook-tools");tools.addEventListener("pointerdown",event=>event.stopPropagation());tools.addEventListener("click",event=>event.stopPropagation());
      // v3A.17.3 — la toolbar si sposta SOLO dal grip ≡.
      const toolsGrip=tools.querySelector(".lm-tools-grip");
      if(toolsGrip){
        let toolsDrag=null;
        toolsGrip.addEventListener("pointerdown",e=>{
          e.preventDefault();e.stopPropagation();
          const r=tools.getBoundingClientRect();
          toolsDrag={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top};
          toolsGrip.setPointerCapture?.(e.pointerId);
          // Passa da bottom a coordinate top/left senza far saltare la toolbar.
          tools.style.left=`${r.left}px`;
          tools.style.top=`${r.top}px`;
          tools.style.bottom="auto";
        },{passive:false});
        toolsGrip.addEventListener("pointermove",e=>{
          if(!toolsDrag||e.pointerId!==toolsDrag.id)return;
          e.preventDefault();e.stopPropagation();
          const margin=8;
          const w=tools.offsetWidth,h=tools.offsetHeight;
          const left=Math.max(margin,Math.min(window.innerWidth-w-margin,e.clientX-toolsDrag.dx));
          const top=Math.max(margin,Math.min(window.innerHeight-h-margin,e.clientY-toolsDrag.dy));
          tools.style.left=`${left}px`;tools.style.top=`${top}px`;
        },{passive:false});
        const stopToolsDrag=e=>{
          if(!toolsDrag||e.pointerId!==toolsDrag.id)return;
          e.preventDefault();e.stopPropagation();
          try{toolsGrip.releasePointerCapture?.(e.pointerId);}catch(_){}
          toolsDrag=null;
        };
        toolsGrip.addEventListener("pointerup",stopToolsDrag,{passive:false});
        toolsGrip.addEventListener("pointercancel",stopToolsDrag,{passive:false});
      }
      // v3A.16.3 — MICRO SCROLL:
      // niente drag della scrollbar. Due zone discrete ▲/▼ fanno scorrere il Quaderno.
      // Nessun listener globale: toolbar, Pencil, palmo e data restano invariati.
      const scrollShell=panel.querySelector(".lm-notebook-shell"),
            scrollRail=panel.querySelector(".lm-scroll-rail"),
            scrollTrack=panel.querySelector(".lm-scroll-track"),
            scrollThumb=panel.querySelector(".lm-scroll-thumb");

      if(scrollRail && scrollShell){
        // Disinnesca la vecchia thumb trascinabile e la usa solo come contenitore grafico.
        if(scrollTrack) scrollTrack.style.display="none";
        if(scrollThumb) scrollThumb.style.display="none";

        const scrollControls=document.createElement("div");
        scrollControls.className="lm-scroll-controls";
        scrollControls.setAttribute("aria-label","Scorri il quaderno");

        const up=document.createElement("button");
        up.type="button";
        up.className="lm-scroll-step lm-scroll-up";
        up.setAttribute("aria-label","Scorri verso l'alto");
        up.textContent="▲";

        const down=document.createElement("button");
        down.type="button";
        down.className="lm-scroll-step lm-scroll-down";
        down.setAttribute("aria-label","Scorri verso il basso");
        down.textContent="▼";

        scrollControls.append(up,down);
        scrollRail.appendChild(scrollControls);
        scrollRail.classList.remove("hidden");

        const step=()=>Math.max(180,Math.round(scrollShell.clientHeight*0.42));
        const move=dir=>{
          const max=Math.max(0,scrollShell.scrollHeight-scrollShell.clientHeight);
          scrollShell.scrollTop=Math.max(0,Math.min(max,scrollShell.scrollTop+(dir*step())));
        };

        // Pointer events locali ai due pulsanti: niente drag e niente interferenze globali.
        up.addEventListener("pointerdown",e=>{
          e.preventDefault(); e.stopPropagation(); move(-1);
        },{passive:false});
        down.addEventListener("pointerdown",e=>{
          e.preventDefault(); e.stopPropagation(); move(1);
        },{passive:false});

        // Impedisce a Chrome di trasformare una pressione sui controlli in selezione testo.
        for(const el of [scrollRail,scrollControls,up,down]){
          el.addEventListener("selectstart",e=>e.preventDefault());
          el.addEventListener("contextmenu",e=>e.preventDefault());
        }
      }

      panel.querySelectorAll(".lm-notebook-tools button[data-tool]").forEach(btn=>btn.addEventListener("click",async event=>{
        event.preventDefault();event.stopPropagation();const t=btn.dataset.tool;
        if(["pencil","eraser"].includes(t)){notebookMode=t;resetSelection();renderNotebookPage();return;}
        if(t==="text"){notebookMode="text";resetSelection();renderNotebookPage();return;}
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
    const fontTrigger=screen.querySelector(".lm-font-trigger"),fontMenu=screen.querySelector(".lm-font-menu");
    fontTrigger.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();fontMenu.classList.toggle("aperto")});
    async function applyTextStyle(prop,value){const o=textStyleTarget();if(o&&o.type==="text"){pushHistory();o[prop]=value;await persistNotebook();renderNotebookPage();}else{textDefaults[prop]=value;updateTextbar();}}
    screen.querySelectorAll(".lm-font-choice").forEach(b=>b.addEventListener("click",async e=>{e.preventDefault();e.stopPropagation();await applyTextStyle("fontFamily",b.dataset.value);fontMenu.classList.remove("aperto");}));
    screen.querySelector(".lm-font-other").addEventListener("click",async e=>{e.preventDefault();e.stopPropagation();const name=window.prompt("Nome del font installato sull’iPad:");if(!name)return;await applyTextStyle("fontFamily",`'${name.replaceAll("'","")}', Arial, sans-serif`);fontMenu.classList.remove("aperto");});
    screen.querySelector(".lm-size").addEventListener("change",async e=>applyTextStyle("fontSize",Number(e.target.value)));
    screen.querySelector(".lm-align").addEventListener("click",async()=>{const s=textStyleTarget()||textDefaults;await applyTextStyle("align",s.align==="left"?"center":s.align==="center"?"right":"left")});
    screen.querySelector(".lm-color").addEventListener("input",async e=>applyTextStyle("color",e.target.value));

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
