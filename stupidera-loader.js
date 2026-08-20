(() => {
  "use strict";

  const ASSETS = [
    { src: "assets/stupidera-copertina.png", alt: "Copertina della Stupidera" },
    { src: "assets/stupidera-intro.png", alt: "Introduzione della Stupidera" },
    { src: "assets/stupidera-pagine.png", alt: "Pagine della Stupidera" }
  ];

  const PAGES_KEY = "BaseSegretaNoziStupideraPagineV2";
  const INDEX_KEY = "BaseSegretaNoziStupideraPaginaV2";

  function idNuovo() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function paginaVuota() {
    return { id: idNuovo(), objects: [] };
  }

  function caricaPagine() {
    try {
      const raw = localStorage.getItem(PAGES_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch (e) {
      console.error("Stupidera: errore caricamento pagine", e);
    }
    return [paginaVuota()];
  }

  function avviaStupidera() {
    if (document.getElementById("stupideraScreen")) return;

    let pagine = caricaPagine();
    let indicePagina = Math.min(
      Math.max(Number(localStorage.getItem(INDEX_KEY)) || 0, 0),
      pagine.length - 1
    );
    let schermata = 0; // 0 copertina, 1 intro, 2 quaderno
    let selezionato = null;

    const style = document.createElement("style");
    style.textContent = `
      .stupidera-screen{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:max(18px,env(safe-area-inset-top)) max(18px,env(safe-area-inset-right)) max(18px,env(safe-area-inset-bottom)) max(18px,env(safe-area-inset-left));background:linear-gradient(180deg,#eaf3fb 0%,#f7f2fb 100%);z-index:700}
      .stupidera-screen.aperto{display:flex}
      .stupidera-stage{position:relative;width:min(96vw,1200px);height:min(94vh,900px);display:flex;align-items:center;justify-content:center}
      .stupidera-image{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;user-select:none;-webkit-user-select:none;-webkit-user-drag:none;-webkit-tap-highlight-color:transparent}
      .stupidera-image.stupidera-clickable{cursor:pointer}
      .stupidera-back{position:fixed;top:max(18px,env(safe-area-inset-top));left:max(18px,env(safe-area-inset-left));appearance:none;border:0;width:52px;height:52px;display:flex;align-items:center;justify-content:center;border-radius:17px;background:rgba(255,255,255,.88);color:#4c4274;box-shadow:0 5px 16px rgba(65,55,90,.14);font-size:32px;line-height:1;cursor:pointer;z-index:8}
      .stupidera-tools{position:fixed;top:max(18px,env(safe-area-inset-top));right:max(18px,env(safe-area-inset-right));display:none;gap:9px;z-index:8}
      .stupidera-screen.editor .stupidera-tools{display:flex}
      .stupidera-tool{appearance:none;border:0;min-height:46px;padding:0 15px;border-radius:15px;background:rgba(255,255,255,.9);color:#4c4274;box-shadow:0 5px 16px rgba(65,55,90,.13);font-size:14px;font-weight:700;cursor:pointer}
      .stupidera-tool.danger{color:#94515d}
      .stupidera-nav{position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);display:none;align-items:center;gap:8px;padding:7px 9px;border-radius:18px;background:rgba(255,255,255,.9);box-shadow:0 5px 16px rgba(65,55,90,.13);z-index:8}
      .stupidera-screen.editor .stupidera-nav{display:flex}
      .stupidera-nav button{appearance:none;border:0;width:38px;height:38px;border-radius:12px;background:#edf1fa;color:#4c4274;font-size:24px;line-height:1;cursor:pointer}
      .stupidera-nav button:disabled{opacity:.3;cursor:default}
      .stupidera-counter{min-width:58px;text-align:center;color:#4c4274;font-size:14px;font-weight:700}
      .stupidera-page-layer{position:absolute;display:none;pointer-events:none;z-index:3;overflow:hidden}
      .stupidera-screen.editor .stupidera-page-layer{display:block}
      .stupidera-object{position:absolute;pointer-events:auto;touch-action:none;border:2px solid transparent;border-radius:10px;cursor:grab;user-select:none;-webkit-user-select:none}
      .stupidera-object.selected{border-color:rgba(76,66,116,.58);background:rgba(255,255,255,.15)}
      .stupidera-object img{display:block;width:100%;height:auto;pointer-events:none;-webkit-user-drag:none}
      .stupidera-object-remove,.stupidera-object-resize{position:absolute;display:none;align-items:center;justify-content:center;border:0;width:28px;height:28px;border-radius:50%;color:#fff;font-weight:700;box-shadow:0 3px 9px rgba(45,40,60,.22);touch-action:none}
      .stupidera-object.selected .stupidera-object-remove,.stupidera-object.selected .stupidera-object-resize{display:flex}
      .stupidera-object-remove{top:-14px;right:-14px;background:#9f5964;font-size:19px}
      .stupidera-object-resize{right:-14px;bottom:-14px;background:#66568c;font-size:15px}
      .stupidera-picker{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(38,46,67,.58);backdrop-filter:blur(5px);z-index:900}
      .stupidera-picker.aperto{display:flex}
      .stupidera-picker-card{width:min(760px,92vw);max-height:82vh;overflow:auto;padding:22px;border-radius:26px;background:#fffaf7;box-shadow:0 22px 60px rgba(30,35,55,.28)}
      .stupidera-picker-head{display:flex;align-items:center;gap:12px;margin-bottom:16px}.stupidera-picker-head h2{flex:1;margin:0;color:#4c4274;font-size:22px}.stupidera-picker-close{border:0;width:40px;height:40px;border-radius:13px;background:#edf3fa;color:#4c4274;font-size:22px}
      .stupidera-picker-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px}.stupidera-picker-item{border:1px solid rgba(76,66,116,.1);border-radius:18px;background:#f8f7fb;padding:9px;color:#4c4274;font-weight:600}.stupidera-picker-item img{display:block;width:100%;aspect-ratio:1;object-fit:contain;margin-bottom:6px}
      .stupidera-file{display:none}
      @media(max-width:700px){.stupidera-screen{padding:max(12px,env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left))}.stupidera-back{width:44px;height:44px;font-size:27px}.stupidera-tools{top:max(12px,env(safe-area-inset-top));right:max(8px,env(safe-area-inset-right));gap:5px}.stupidera-tool{min-height:40px;padding:0 9px;font-size:12px}.stupidera-nav{bottom:max(10px,env(safe-area-inset-bottom))}.stupidera-nav button{width:35px;height:35px}}
    `;
    document.head.appendChild(style);

    const screen = document.createElement("section");
    screen.className = "stupidera-screen";
    screen.id = "stupideraScreen";
    screen.innerHTML = `
      <div class="stupidera-stage" id="stupideraStage">
        <img class="stupidera-image stupidera-clickable" id="stupideraImage" draggable="false" alt="">
        <div class="stupidera-page-layer" id="stupideraPageLayer"></div>
      </div>
      <button class="stupidera-back" id="stupideraBack" type="button" aria-label="Indietro">‹</button>
      <div class="stupidera-tools">
        <button class="stupidera-tool" id="stupideraSticker" type="button">Sticker</button>
        <button class="stupidera-tool" id="stupideraImmagine" type="button">Immagine</button>
        <button class="stupidera-tool danger" id="stupideraElimina" type="button">Elimina</button>
      </div>
      <div class="stupidera-nav">
        <button id="stupideraPrev" type="button" aria-label="Pagina precedente">‹</button>
        <span class="stupidera-counter" id="stupideraCounter">1 / 1</span>
        <button id="stupideraNext" type="button" aria-label="Pagina successiva">›</button>
        <button id="stupideraAdd" type="button" aria-label="Nuova pagina" title="Nuova pagina">+</button>
      </div>
      <input class="stupidera-file" id="stupideraFile" type="file" accept="image/*">
      <div class="stupidera-picker" id="stupideraPicker">
        <div class="stupidera-picker-card">
          <div class="stupidera-picker-head"><h2>Sticker di Nozi</h2><button class="stupidera-picker-close" id="stupideraPickerClose" type="button">×</button></div>
          <div class="stupidera-picker-grid" id="stupideraPickerGrid"></div>
        </div>
      </div>`;
    document.body.appendChild(screen);

    const stage = screen.querySelector("#stupideraStage");
    const image = screen.querySelector("#stupideraImage");
    const layer = screen.querySelector("#stupideraPageLayer");
    const back = screen.querySelector("#stupideraBack");
    const prev = screen.querySelector("#stupideraPrev");
    const next = screen.querySelector("#stupideraNext");
    const add = screen.querySelector("#stupideraAdd");
    const counter = screen.querySelector("#stupideraCounter");
    const stickerBtn = screen.querySelector("#stupideraSticker");
    const imageBtn = screen.querySelector("#stupideraImmagine");
    const deleteBtn = screen.querySelector("#stupideraElimina");
    const fileInput = screen.querySelector("#stupideraFile");
    const picker = screen.querySelector("#stupideraPicker");
    const pickerGrid = screen.querySelector("#stupideraPickerGrid");
    const pickerClose = screen.querySelector("#stupideraPickerClose");

    function salva() {
      try {
        localStorage.setItem(PAGES_KEY, JSON.stringify(pagine));
        localStorage.setItem(INDEX_KEY, String(indicePagina));
      } catch (e) {
        console.error("Stupidera: memoria piena o non disponibile", e);
        alert("Non riesco a salvare questa immagine: prova con un file più piccolo.");
      }
    }

    function limita(n, min, max) { return Math.min(max, Math.max(min, n)); }

    function aggiornaLayer() {
      if (schermata !== 2 || !image.naturalWidth) return;
      const stageRect = stage.getBoundingClientRect();
      const imgRect = image.getBoundingClientRect();
      layer.style.left = `${imgRect.left - stageRect.left}px`;
      layer.style.top = `${imgRect.top - stageRect.top}px`;
      layer.style.width = `${imgRect.width}px`;
      layer.style.height = `${imgRect.height}px`;
    }

    function deseleziona() {
      selezionato = null;
      layer.querySelectorAll(".selected").forEach(el => el.classList.remove("selected"));
    }

    function renderOggetti() {
      layer.innerHTML = "";
      selezionato = null;
      const pagina = pagine[indicePagina];
      if (!pagina) return;

      pagina.objects.forEach(obj => {
        const box = document.createElement("div");
        box.className = "stupidera-object";
        box.style.left = `${obj.x}%`;
        box.style.top = `${obj.y}%`;
        box.style.width = `${obj.width}%`;
        box.dataset.id = obj.id;

        const img = document.createElement("img");
        img.src = obj.src;
        img.alt = obj.label || "";

        const remove = document.createElement("button");
        remove.className = "stupidera-object-remove";
        remove.type = "button";
        remove.textContent = "×";

        const resize = document.createElement("button");
        resize.className = "stupidera-object-resize";
        resize.type = "button";
        resize.textContent = "↘";

        box.append(img, remove, resize);
        layer.appendChild(box);

        box.addEventListener("pointerdown", event => {
          if (event.target === remove || event.target === resize) return;
          event.preventDefault(); event.stopPropagation();
          deseleziona(); box.classList.add("selected"); selezionato = obj.id;
          const rect = layer.getBoundingClientRect();
          const boxRect = box.getBoundingClientRect();
          const ox = event.clientX - boxRect.left;
          const oy = event.clientY - boxRect.top;
          box.setPointerCapture(event.pointerId);
          const move = e => {
            let left = limita(e.clientX - rect.left - ox, 0, rect.width - box.offsetWidth);
            let top = limita(e.clientY - rect.top - oy, 0, rect.height - box.offsetHeight);
            obj.x = left / rect.width * 100; obj.y = top / rect.height * 100;
            box.style.left = `${obj.x}%`; box.style.top = `${obj.y}%`;
          };
          const end = e => {
            try { box.releasePointerCapture(e.pointerId); } catch (_) {}
            box.removeEventListener("pointermove", move); box.removeEventListener("pointerup", end); box.removeEventListener("pointercancel", end); salva();
          };
          box.addEventListener("pointermove", move); box.addEventListener("pointerup", end); box.addEventListener("pointercancel", end);
        });

        resize.addEventListener("pointerdown", event => {
          event.preventDefault(); event.stopPropagation();
          deseleziona(); box.classList.add("selected"); selezionato = obj.id;
          const rect = layer.getBoundingClientRect();
          const boxRect = box.getBoundingClientRect();
          const left = boxRect.left - rect.left;
          resize.setPointerCapture(event.pointerId);
          const move = e => {
            let w = limita(e.clientX - rect.left - left, rect.width * .08, rect.width * .5);
            obj.width = w / rect.width * 100;
            if (obj.x + obj.width > 100) obj.x = 100 - obj.width;
            box.style.width = `${obj.width}%`; box.style.left = `${obj.x}%`;
          };
          const end = e => {
            try { resize.releasePointerCapture(e.pointerId); } catch (_) {}
            resize.removeEventListener("pointermove", move); resize.removeEventListener("pointerup", end); resize.removeEventListener("pointercancel", end); salva();
          };
          resize.addEventListener("pointermove", move); resize.addEventListener("pointerup", end); resize.addEventListener("pointercancel", end);
        });

        remove.addEventListener("pointerdown", event => {
          event.preventDefault(); event.stopPropagation();
          pagina.objects = pagina.objects.filter(x => x.id !== obj.id);
          salva(); renderOggetti();
        });
      });
    }

    function renderEditor() {
      counter.textContent = `${indicePagina + 1} / ${pagine.length}`;
      prev.disabled = indicePagina === 0;
      next.disabled = indicePagina === pagine.length - 1;
      aggiornaLayer();
      renderOggetti();
      salva();
    }

    function mostraSchermata(indice) {
      schermata = limita(indice, 0, 2);
      image.src = ASSETS[schermata].src;
      image.alt = ASSETS[schermata].alt;
      image.classList.toggle("stupidera-clickable", schermata < 2);
      screen.classList.toggle("editor", schermata === 2);
      if (schermata === 2) {
        image.onload = () => { aggiornaLayer(); renderEditor(); };
        if (image.complete) setTimeout(() => { aggiornaLayer(); renderEditor(); }, 0);
      } else {
        layer.innerHTML = "";
      }
    }

    function aggiungiOggetto(src, label, width = 18) {
      const pagina = pagine[indicePagina];
      const n = pagina.objects.length;
      pagina.objects.push({ id:idNuovo(), src, label, x:limita(66-(n%3)*16,5,78), y:limita(62-Math.floor(n/3)*15,5,78), width });
      salva(); renderOggetti();
    }

    function creaPickerSticker() {
      pickerGrid.innerHTML = "";
      const lista = (typeof STICKERS !== "undefined" && Array.isArray(STICKERS)) ? STICKERS : [];
      lista.forEach(sticker => {
        const b = document.createElement("button");
        b.className = "stupidera-picker-item"; b.type = "button";
        b.innerHTML = `<img src="assets/${sticker.file}" alt=""><span>${sticker.label}</span>`;
        b.addEventListener("click", () => { aggiungiOggetto(`assets/${sticker.file}`, sticker.label, 18); picker.classList.remove("aperto"); });
        pickerGrid.appendChild(b);
      });
      if (!lista.length) pickerGrid.textContent = "Nessuno sticker disponibile.";
    }

    image.addEventListener("click", () => { if (schermata < 2) mostraSchermata(schermata + 1); });
    back.addEventListener("click", event => {
      event.preventDefault(); event.stopPropagation();
      if (schermata > 0) mostraSchermata(schermata - 1); else screen.classList.remove("aperto");
    });
    prev.addEventListener("click", () => { if (indicePagina > 0) { indicePagina--; renderEditor(); } });
    next.addEventListener("click", () => { if (indicePagina < pagine.length - 1) { indicePagina++; renderEditor(); } });
    add.addEventListener("click", () => { pagine.push(paginaVuota()); indicePagina = pagine.length - 1; renderEditor(); });
    deleteBtn.addEventListener("click", () => {
      if (!confirm(`Eliminare la pagina ${indicePagina + 1}?`)) return;
      if (pagine.length === 1) { pagine[0] = paginaVuota(); indicePagina = 0; }
      else { pagine.splice(indicePagina,1); indicePagina = Math.min(indicePagina,pagine.length-1); }
      renderEditor();
    });
    stickerBtn.addEventListener("click", () => { creaPickerSticker(); picker.classList.add("aperto"); });
    pickerClose.addEventListener("click", () => picker.classList.remove("aperto"));
    picker.addEventListener("click", e => { if (e.target === picker) picker.classList.remove("aperto"); });
    imageBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { aggiungiOggetto(reader.result, file.name, 24); fileInput.value = ""; };
      reader.readAsDataURL(file);
    });
    layer.addEventListener("pointerdown", e => { if (e.target === layer) deseleziona(); });
    window.addEventListener("resize", () => { if (screen.classList.contains("editor")) aggiornaLayer(); });

    const notebookHotspot = document.querySelector('.hotspot[data-target="overlayNotebook"]');
    if (!notebookHotspot) { console.error("Stupidera: hotspot non trovato."); return; }
    notebookHotspot.removeAttribute("data-target");
    notebookHotspot.addEventListener("click", event => {
      event.preventDefault(); event.stopImmediatePropagation();
      mostraSchermata(0); screen.classList.add("aperto");
    }, true);

    ASSETS.forEach(item => { const preload = new Image(); preload.src = item.src; });
    console.log("La Stupidera è pronta: Sticker · Immagine · Elimina / ‹ pagina › +");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avviaStupidera, { once:true });
  else avviaStupidera();
})();
