(() => {
  "use strict";

  const STORAGE_KEY = "BaseSegretaNoziDaNonDimenticareV1";

  function loadItems() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }

  function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function uid() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function start() {
    const hotspot = document.querySelector('[data-target="overlayRemember"]');
    if (!hotspot || document.getElementById("rememberScreen")) return;

    const style = document.createElement("style");
    style.textContent = `
      .remember-screen{position:fixed;inset:0;z-index:245;display:none;flex-direction:column;background:#edf5ff;color:#285b94;overflow:hidden}
      .remember-screen.aperto{display:flex}
      .remember-header{display:flex;align-items:center;gap:14px;padding:max(16px,env(safe-area-inset-top)) max(18px,env(safe-area-inset-right)) 12px max(18px,env(safe-area-inset-left));background:#dcecf8;border-bottom:1px solid rgba(23,63,122,.10)}
      .remember-back,.remember-add{appearance:none;border:0;height:48px;border-radius:16px;background:rgba(255,255,255,.82);color:#285b94;cursor:pointer;box-shadow:0 5px 14px rgba(50,65,80,.10);font-weight:800}
      .remember-back{width:48px;flex:0 0 48px;font-size:30px;line-height:1}
      .remember-add{padding:0 18px;font-size:16px}
      .remember-title{flex:1;margin:0;font-size:clamp(24px,3.5vw,38px);font-weight:800}
      .remember-workspace{flex:1;min-height:0;overflow:auto;padding:clamp(18px,4vw,52px)}
      .remember-board{width:min(920px,94vw);margin:0 auto;background:#fffaf0;border:10px solid #acd2ed;border-radius:34px;box-shadow:0 18px 38px rgba(63,93,125,.12);padding:clamp(18px,3vw,34px)}
      .remember-intro{margin:0 0 18px;text-align:center;font-size:clamp(16px,2vw,21px);font-weight:700;color:#4776a6}
      .remember-list{display:flex;flex-direction:column;gap:14px}
      .remember-empty{text-align:center;padding:48px 15px;color:#6f91b3;font-size:18px;font-weight:700}
      .remember-card{display:flex;flex-direction:column;gap:16px;padding:16px;background:rgba(255,255,255,.72);border:2px solid #c8ddec;border-radius:20px}
      .remember-top{display:flex;align-items:flex-end;gap:24px;width:100%}
      .remember-date{flex:0 0 220px;width:220px}
      .remember-time-field{flex:0 0 auto;width:auto}
      .remember-note{width:100%}
      .remember-field{display:flex;flex-direction:column;gap:5px;min-width:0}
      .remember-field label{font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#6d8dab}
      .remember-field input{box-sizing:border-box;width:100%;min-width:0;max-width:100%;height:44px;border:1.5px solid #b9d0e3;border-radius:12px;background:#fff;color:#285b94;padding:0 11px;font:700 16px -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;outline:none}
      .remember-field input:focus{border-color:#7daed2;box-shadow:0 0 0 3px rgba(125,174,210,.16)}
      .remember-times{display:flex;gap:16px;justify-content:flex-start}.remember-times input{width:118px;min-width:118px;max-width:118px;flex:0 0 118px}
      .remember-delete{appearance:none;border:0;width:44px;height:44px;flex:0 0 44px;margin-left:auto;border-radius:13px;background:#fff;color:#8b5f72;font-size:22px;cursor:pointer;box-shadow:0 3px 10px rgba(60,70,80,.08)}
      @media(max-width:720px){.remember-workspace{padding:14px 8px}.remember-board{width:96vw;border-width:7px;border-radius:25px;padding:14px}.remember-top{gap:12px}.remember-date{flex-basis:180px;width:180px}.remember-times{gap:10px}.remember-times input{width:90px;min-width:90px;max-width:90px;flex-basis:90px}.remember-title{font-size:22px}.remember-add{padding:0 12px}}
    `;
    document.head.appendChild(style);

    const screen = document.createElement("section");
    screen.id = "rememberScreen";
    screen.className = "remember-screen";
    screen.innerHTML = `
      <header class="remember-header">
        <button class="remember-back" type="button" aria-label="Torna alla Base">‹</button>
        <h1 class="remember-title">Da non dimenticare</h1>
        <button class="remember-add" type="button">＋ Nuovo</button>
      </header>
      <div class="remember-workspace">
        <div class="remember-board">
          <p class="remember-intro">Le cose da ricordare, finalmente senza bigliettini dispersi 😈</p>
          <div class="remember-list"></div>
        </div>
      </div>`;
    document.body.appendChild(screen);

    const list = screen.querySelector(".remember-list");
    let items = loadItems();

    function sortItems() {
      items.sort((a,b) => (a.date || "9999").localeCompare(b.date || "9999") || (a.from || "99:99").localeCompare(b.from || "99:99"));
    }

    function render() {
      sortItems();
      list.innerHTML = "";
      if (!items.length) {
        const empty = document.createElement("div");
        empty.className = "remember-empty";
        empty.textContent = "Niente da ricordare. Sospettosamente tranquillo. 👀";
        list.appendChild(empty);
        return;
      }

      items.forEach(item => {
        const card = document.createElement("div");
        card.className = "remember-card";
        card.innerHTML = `
          <div class="remember-top">
            <div class="remember-field remember-date"><label>Giorno</label><input data-k="date" type="date"></div>
            <div class="remember-field remember-time-field"><label>Orario</label><div class="remember-times"><input data-k="from" type="time" aria-label="Dalle"><input data-k="to" type="time" aria-label="Alle"></div></div>
            <button class="remember-delete" type="button" aria-label="Elimina">×</button>
          </div>
          <div class="remember-field remember-note"><label>Da ricordare</label><input data-k="text" type="text" maxlength="120" placeholder="Es. Sostituzione in 3ª B"></div>`;

        ["date","from","to","text"].forEach(k => {
          const input = card.querySelector(`[data-k="${k}"]`);
          input.value = item[k] || "";
          input.addEventListener("input", () => {
            item[k] = input.value;
            saveItems(items);
          });
          input.addEventListener("change", () => { saveItems(items); });
        });

        card.querySelector(".remember-delete").addEventListener("click", () => {
          items = items.filter(x => x.id !== item.id);
          saveItems(items);
          render();
        });
        list.appendChild(card);
      });
    }

    function addItem() {
      const today = new Date();
      const local = new Date(today.getTime() - today.getTimezoneOffset()*60000).toISOString().slice(0,10);
      const item = { id: uid(), date: local, from:"", to:"", text:"" };
      items.push(item);
      saveItems(items);
      render();
      const cards = list.querySelectorAll(".remember-card");
      cards[cards.length-1]?.querySelector('[data-k="text"]')?.focus();
    }

    screen.querySelector(".remember-back").addEventListener("click", () => screen.classList.remove("aperto"));
    screen.querySelector(".remember-add").addEventListener("click", addItem);

    hotspot.removeAttribute("data-target");
    hotspot.addEventListener("click", event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      render();
      screen.classList.add("aperto");
    }, true);

    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once:true});
  else start();
})();
