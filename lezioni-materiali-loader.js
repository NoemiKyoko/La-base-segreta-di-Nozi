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

    const style = document.createElement("style");
    style.textContent = `
      .lm-screen{position:fixed;inset:0;z-index:238;display:none;flex-direction:column;overflow:hidden;background:linear-gradient(180deg,#eef6ff 0%,#f7f2fb 100%);color:#315d91;--lm-color:#82bce6;--lm-soft:#edf7ff;--lm-dark:#416f96}
      .lm-screen.aperto{display:flex}
      .lm-header{display:flex;align-items:center;gap:14px;padding:max(16px,env(safe-area-inset-top)) max(18px,env(safe-area-inset-right)) 12px max(18px,env(safe-area-inset-left));background:color-mix(in srgb,var(--lm-color) 27%,white);border-bottom:1px solid color-mix(in srgb,var(--lm-color) 28%,transparent)}
      .lm-back{appearance:none;border:0;width:48px;height:48px;flex:0 0 48px;border-radius:16px;background:rgba(255,255,255,.82);color:var(--lm-dark);font-size:30px;line-height:1;cursor:pointer;box-shadow:0 5px 14px rgba(50,65,80,.10)}
      .lm-title{flex:1;margin:0;color:var(--lm-dark);font-size:clamp(24px,3.5vw,38px);font-weight:800}
      .lm-search{appearance:none;border:0;height:46px;min-width:46px;padding:0 15px;border-radius:15px;background:rgba(255,255,255,.82);color:var(--lm-dark);font-size:20px;cursor:pointer;box-shadow:0 5px 14px rgba(50,65,80,.10)}
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
      .lm-choice-icon{font-size:70px;margin-bottom:18px}
      .lm-choice-title{font-size:clamp(22px,2.4vw,32px);font-weight:850;color:var(--lm-dark)}
      .lm-choice-sub{margin-top:8px;font-size:15px;color:color-mix(in srgb,var(--lm-dark) 70%,#6b7280)}
      .lm-placeholder{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:55vh;text-align:center;color:var(--lm-dark)}
      .lm-placeholder-icon{font-size:84px;margin-bottom:18px}.lm-placeholder h2{margin:0 0 10px;font-size:clamp(28px,4vw,46px)}.lm-placeholder p{margin:0;max-width:640px;font-size:18px;line-height:1.5}
      .lm-search-pop{position:fixed;inset:0;z-index:950;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(35,45,65,.52);backdrop-filter:blur(5px)}
      .lm-search-pop.aperto{display:flex}.lm-search-card{width:min(540px,92vw);padding:24px;border-radius:24px;background:#fffaf7;box-shadow:0 20px 55px rgba(20,30,50,.26)}.lm-search-card h2{margin:0 0 12px;color:var(--lm-dark)}.lm-search-card p{margin:0 0 16px;color:#5f7184}.lm-search-card button{appearance:none;border:0;padding:12px 18px;border-radius:13px;background:var(--lm-soft);color:var(--lm-dark);font-weight:800;cursor:pointer}
      @media(max-width:760px){.lm-header{gap:8px}.lm-workspace{padding:14px 10px}.lm-panel{width:96vw;padding:16px;border-width:6px}.lm-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.lm-class-card,.lm-subject-card{min-height:135px;padding:12px}.lm-class-folder{width:88px;height:62px;margin-bottom:12px}.lm-class-folder::before{width:42px;height:16px;top:-13px}.lm-card-label,.lm-subject-name{font-size:15px}.lm-subject-icon{font-size:34px}.lm-choice-grid{grid-template-columns:1fr;gap:14px}.lm-choice-card{min-height:180px}.lm-choice-icon{font-size:54px}.lm-search{padding:0 11px}.lm-title{font-size:21px}}
    `;
    document.head.appendChild(style);

    const screen = document.createElement("section");
    screen.id = "lessonsMaterialsScreen";
    screen.className = "lm-screen";
    screen.innerHTML = `
      <header class="lm-header">
        <button class="lm-back" type="button" aria-label="Indietro">‹</button>
        <h1 class="lm-title">Lezioni & Materiali</h1>
        <button class="lm-search" type="button" aria-label="Cerca" title="Cerca">⌕</button>
      </header>
      <div class="lm-workspace"><main class="lm-panel"></main></div>
      <div class="lm-search-pop">
        <div class="lm-search-card">
          <h2>Ricerca</h2>
          <p>La struttura per la ricerca è pronta. La collegheremo ai contenuti reali quando entreremo nel raccoglitore e nel quaderno.</p>
          <button type="button">Chiudi</button>
        </div>
      </div>`;
    document.body.appendChild(screen);

    const panel = screen.querySelector(".lm-panel");
    const title = screen.querySelector(".lm-title");
    const back = screen.querySelector(".lm-back");
    const search = screen.querySelector(".lm-search");
    const searchPop = screen.querySelector(".lm-search-pop");

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

    function renderClassi() {
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
      schermata = "materia";
      temaClasse(classeCorrente);
      title.textContent = `${classeCorrente.label} · ${materiaCorrente}`;
      panel.innerHTML = `
        <p class="lm-intro">${materiaCorrente}</p>
        <div class="lm-choice-grid">
          <button class="lm-choice-card" data-choice="quaderno" type="button">
            <span class="lm-choice-icon">📓</span>
            <span class="lm-choice-title">Quaderno</span>
            <span class="lm-choice-sub">Il quaderno della lezione da usare in classe</span>
          </button>
          <button class="lm-choice-card" data-choice="schede" type="button">
            <span class="lm-choice-icon">🗂️</span>
            <span class="lm-choice-title">Schede da stampare</span>
            <span class="lm-choice-sub">Il raccoglitore con le schede originali</span>
          </button>
        </div>`;
      panel.querySelector('[data-choice="quaderno"]').addEventListener("click", () => renderPlaceholder("quaderno"));
      panel.querySelector('[data-choice="schede"]').addEventListener("click", () => renderPlaceholder("schede"));
    }

    function renderPlaceholder(tipo) {
      schermata = tipo;
      temaClasse(classeCorrente);
      if (tipo === "schede") {
        title.textContent = `${materiaCorrente} · Schede da stampare`;
        panel.innerHTML = `<div class="lm-placeholder"><div class="lm-placeholder-icon">🗂️</div><h2>Raccoglitore</h2><p>Struttura pronta. Il prossimo passo sarà farlo funzionare come l'archivio “Documenti importanti”, mantenendo qui gli originali delle schede.</p></div>`;
      } else {
        title.textContent = `${materiaCorrente} · Quaderno`;
        panel.innerHTML = `<div class="lm-placeholder"><div class="lm-placeholder-icon">📓</div><h2>Quaderno della lezione</h2><p>La porta del boss finale è pronta. L'editor vero arriverà dopo il raccoglitore.</p></div>`;
      }
    }

    back.addEventListener("click", () => {
      if (schermata === "classi") {
        screen.classList.remove("aperto");
      } else if (schermata === "materie") {
        renderClassi();
      } else if (schermata === "materia") {
        renderMaterie();
      } else {
        renderMateria();
      }
    });

    search.addEventListener("click", () => searchPop.classList.add("aperto"));
    searchPop.querySelector("button").addEventListener("click", () => searchPop.classList.remove("aperto"));
    searchPop.addEventListener("click", e => { if (e.target === searchPop) searchPop.classList.remove("aperto"); });

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
