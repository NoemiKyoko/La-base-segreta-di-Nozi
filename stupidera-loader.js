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
    return { id: idNuovo(), objects: [], strokes: [] };
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
      .stupidera-tools{position:fixed;left:max(18px,env(safe-area-inset-left));bottom:max(18px,env(safe-area-inset-bottom));display:none;align-items:center;gap:1px;padding:6px 7px 6px 22px;border:1.25px solid #bfd7eb;border-radius:17px;background:#edf5fb;box-shadow:0 5px 14px rgba(65,55,90,.13);z-index:880;touch-action:none;user-select:none;-webkit-user-select:none}
      .stupidera-screen.editor .stupidera-tools{display:flex}
      .stupidera-tools-grip{position:absolute;left:5px;top:50%;transform:translateY(-50%);width:16px;height:29px;display:grid;place-items:center;color:#6f8da7;font-weight:900;font-size:14px;cursor:grab;touch-action:none}
      .stupidera-tool{appearance:none;border:0;width:34px;height:34px;border-radius:9px;background:transparent;color:#4c4274;font-size:17px;font-weight:800;cursor:pointer}
      .stupidera-tool.active{background:white;box-shadow:0 2px 7px rgba(45,50,60,.09)}
      .stupidera-plus-menu{position:fixed;z-index:910;display:none;min-width:190px;padding:8px;border:1px solid #c9ddea;border-radius:17px;background:#fffaf7;box-shadow:0 10px 30px rgba(35,45,60,.20)}
      .stupidera-plus-menu.aperto{display:block}.stupidera-plus-menu button{appearance:none;border:0;width:100%;padding:11px 13px;border-radius:11px;background:transparent;color:#4c4274;text-align:left;font-size:15px;font-weight:750;cursor:pointer}.stupidera-plus-menu .danger{color:#94515d}
      .stupidera-draw-canvas{position:absolute;inset:0;width:100%;height:100%;z-index:1;touch-action:none;pointer-events:auto}
      .stupidera-nav{position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);display:none;align-items:center;gap:8px;padding:7px 9px;border-radius:18px;background:rgba(255,255,255,.9);box-shadow:0 5px 16px rgba(65,55,90,.13);z-index:8}
      .stupidera-screen.editor .stupidera-nav{display:flex}
      .stupidera-nav button{appearance:none;border:0;width:38px;height:38px;border-radius:12px;background:#edf1fa;color:#4c4274;font-size:24px;line-height:1;cursor:pointer}
      .stupidera-nav button:disabled{opacity:.3;cursor:default}
      .stupidera-counter{min-width:58px;text-align:center;color:#4c4274;font-size:14px;font-weight:700}
      .stupidera-page-layer{position:absolute;display:none;pointer-events:none;z-index:3;overflow:hidden}
      .stupidera-screen.editor .stupidera-page-layer{display:block}
      .stupidera-object{position:absolute;z-index:2;pointer-events:auto;touch-action:none;border:2px solid transparent;border-radius:10px;cursor:grab;user-select:none;-webkit-user-select:none}
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
      #stupideraAdd{display:none!important}
      #stupideraGomma{display:grid!important;place-items:center}#stupideraGomma svg{width:19px;height:19px;display:block;overflow:visible}
      @media(max-width:700px){.stupidera-screen{padding:max(12px,env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left))}.stupidera-back{width:44px;height:44px;font-size:27px}.stupidera-tools{left:10px;bottom:10px}.stupidera-tool{width:34px;height:34px;font-size:16px}.stupidera-nav{bottom:max(10px,env(safe-area-inset-bottom))}.stupidera-nav button{width:35px;height:35px}}
    `;
    document.head.appendChild(style);

    const screen = document.createElement("section");
    screen.className = "stupidera-screen";
    screen.id = "stupideraScreen";
    screen.innerHTML = `
      <div class="stupidera-stage" id="stupideraStage">
        <img class="stupidera-image stupidera-clickable" id="stupideraImage" draggable="false" alt="">
        <div class="stupidera-page-layer" id="stupideraPageLayer"><canvas class="stupidera-draw-canvas" id="stupideraCanvas"></canvas></div>
      </div>
      <button class="stupidera-back" id="stupideraBack" type="button" aria-label="Indietro">‹</button>
      <div class="stupidera-tools">
        <span class="stupidera-tools-grip" title="Sposta toolbar">≡</span>
        <button class="stupidera-tool active" id="stupideraPenna" type="button" title="Penna">✎</button>
        <button class="stupidera-tool" id="stupideraGomma" type="button" title="Gomma" aria-label="Gomma"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7.2 20.8 17.9 7.5a3 3 0 0 1 4.2-.4l3.4 2.8a3 3 0 0 1 .4 4.2L15.2 27.4H8.8l-2.4-2a3.1 3.1 0 0 1 .8-4.6Z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="m13 25.8-5.5-4.5M15.3 27.3h10.2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>
        <button class="stupidera-tool" id="stupideraPlus" type="button" title="Aggiungi">＋</button>
        <button class="stupidera-tool" id="stupideraUndo" type="button" title="Annulla">↶</button>
        <button class="stupidera-tool" id="stupideraRedo" type="button" title="Ripristina">↷</button>
      </div>
      <div class="stupidera-plus-menu" id="stupideraPlusMenu">
        <button data-action="page" type="button">Nuova pagina</button>
        <button data-action="sticker" type="button">Sticker</button>
        <button data-action="image" type="button">Immagine</button>
        <button class="danger" data-action="delete" type="button">Elimina pagina</button>
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
    const penBtn = screen.querySelector("#stupideraPenna");
    const eraserBtn = screen.querySelector("#stupideraGomma");
    const plusBtn = screen.querySelector("#stupideraPlus");
    const undoBtn = screen.querySelector("#stupideraUndo");
    const redoBtn = screen.querySelector("#stupideraRedo");
    const plusMenu = screen.querySelector("#stupideraPlusMenu");
    const canvas = screen.querySelector("#stupideraCanvas");
    const ctx = canvas.getContext("2d");
    let modalita = "pencil", tratto = null, history = [], future = [];
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
      layer.querySelectorAll(".stupidera-object").forEach(el => el.remove());
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
          pushHistory();
          pagina.objects = pagina.objects.filter(x => x.id !== obj.id);
          salva(); renderOggetti();
        });
      });
    }

    function snapshot() { return JSON.parse(JSON.stringify(pagine)); }
    function pushHistory() { history.push(snapshot()); future = []; }
    function paginaCorrente() { const p=pagine[indicePagina]; if(p && !Array.isArray(p.strokes)) p.strokes=[]; return p; }
    function dimensionaCanvas() {
      const rect=layer.getBoundingClientRect(), d=Math.max(1,window.devicePixelRatio||1);
      if(!rect.width||!rect.height)return;
      canvas.width=Math.round(rect.width*d); canvas.height=Math.round(rect.height*d);
      canvas.style.width=rect.width+"px"; canvas.style.height=rect.height+"px";
      ctx.setTransform(d,0,0,d,0,0); renderDisegno();
    }
    function renderDisegno() {
      const rect=layer.getBoundingClientRect(); ctx.clearRect(0,0,rect.width,rect.height);
      const p=paginaCorrente(); if(!p)return;
      ctx.lineCap="round";ctx.lineJoin="round";
      (p.strokes||[]).forEach(st=>{ctx.globalCompositeOperation=st.erase?"destination-out":"source-over";ctx.strokeStyle="#4c4274";ctx.lineWidth=st.erase?18:2.4;ctx.beginPath();(st.points||[]).forEach((pt,i)=>{const x=pt.x*rect.width,y=pt.y*rect.height;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();});ctx.globalCompositeOperation="source-over";
    }
    function setModalita(m){modalita=m;penBtn.classList.toggle("active",m==="pencil");eraserBtn.classList.toggle("active",m==="eraser");canvas.style.pointerEvents="auto";}
    canvas.addEventListener("pointerdown",e=>{if(!["pencil","eraser"].includes(modalita))return;e.preventDefault();e.stopPropagation();pushHistory();const r=canvas.getBoundingClientRect();tratto={erase:modalita==="eraser",points:[{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height}]};canvas.setPointerCapture?.(e.pointerId);},{passive:false});
    canvas.addEventListener("pointermove",e=>{if(!tratto)return;e.preventDefault();const r=canvas.getBoundingClientRect();tratto.points.push({x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height});const p=paginaCorrente(),old=p.strokes;p.strokes=[...old,tratto];renderDisegno();p.strokes=old;},{passive:false});
    const fineTratto=e=>{if(!tratto)return;paginaCorrente().strokes.push(tratto);tratto=null;try{canvas.releasePointerCapture?.(e.pointerId)}catch(_){}salva();renderDisegno();};canvas.addEventListener("pointerup",fineTratto);canvas.addEventListener("pointercancel",fineTratto);

    function renderEditor() {
      counter.textContent = `${indicePagina + 1} / ${pagine.length}`;
      prev.disabled = indicePagina === 0;
      next.disabled = indicePagina === pagine.length - 1;
      aggiornaLayer();
      renderOggetti();
      requestAnimationFrame(dimensionaCanvas);
      salva();
    }

    function mostraSchermata(indice) {
      schermata = limita(indice, 0, 2);
      image.src = ASSETS[schermata].src;
      image.alt = ASSETS[schermata].alt;
      image.classList.toggle("stupidera-clickable", schermata < 2);
      screen.classList.toggle("editor", schermata === 2);
      if (schermata === 2) {
        setModalita("pencil");
        image.onload = () => { aggiornaLayer(); renderEditor(); };
        if (image.complete) setTimeout(() => { aggiornaLayer(); renderEditor(); }, 0);
      } else {
        layer.querySelectorAll(".stupidera-object").forEach(el => el.remove());
        ctx.clearRect(0,0,canvas.width,canvas.height);
      }
    }

    function aggiungiOggetto(src, label, width = 18) {
      pushHistory();
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
    add.addEventListener("click", () => { pushHistory(); pagine.push(paginaVuota()); indicePagina = pagine.length - 1; renderEditor(); });
    function eliminaPagina(){
      if (!confirm(`Eliminare la pagina ${indicePagina + 1}?`)) return;
      pushHistory();
      if (pagine.length === 1) { pagine[0] = paginaVuota(); indicePagina = 0; }
      else { pagine.splice(indicePagina,1); indicePagina = Math.min(indicePagina,pagine.length-1); }
      renderEditor();
    }
    penBtn.addEventListener("click",()=>setModalita("pencil")); eraserBtn.addEventListener("click",()=>setModalita("eraser"));
    plusBtn.addEventListener("click",()=>{const r=plusBtn.getBoundingClientRect();plusMenu.style.left=Math.max(8,Math.min(innerWidth-210,r.left))+"px";plusMenu.style.top=Math.max(8,r.top-190)+"px";plusMenu.classList.toggle("aperto");});
    plusMenu.addEventListener("click",e=>{const a=e.target.dataset.action;if(!a)return;plusMenu.classList.remove("aperto");if(a==="page")add.click();if(a==="delete")eliminaPagina();if(a==="sticker"){creaPickerSticker();picker.classList.add("aperto");}if(a==="image")fileInput.click();});
    undoBtn.addEventListener("click",()=>{if(!history.length)return;future.push(snapshot());pagine=history.pop();indicePagina=Math.min(indicePagina,pagine.length-1);renderEditor();});
    redoBtn.addEventListener("click",()=>{if(!future.length)return;history.push(snapshot());pagine=future.pop();indicePagina=Math.min(indicePagina,pagine.length-1);renderEditor();});
    pickerClose.addEventListener("click", () => picker.classList.remove("aperto"));
    picker.addEventListener("click", e => { if (e.target === picker) picker.classList.remove("aperto"); });
    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { aggiungiOggetto(reader.result, file.name, 24); fileInput.value = ""; };
      reader.readAsDataURL(file);
    });
    const tools=screen.querySelector(".stupidera-tools"),grip=screen.querySelector(".stupidera-tools-grip"); let toolsDrag=null;
    grip.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();const r=tools.getBoundingClientRect();toolsDrag={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top};grip.setPointerCapture?.(e.pointerId);tools.style.left=r.left+"px";tools.style.top=r.top+"px";tools.style.bottom="auto";},{passive:false});
    grip.addEventListener("pointermove",e=>{if(!toolsDrag||e.pointerId!==toolsDrag.id)return;e.preventDefault();const m=8,w=tools.offsetWidth,h=tools.offsetHeight;tools.style.left=Math.max(m,Math.min(innerWidth-w-m,e.clientX-toolsDrag.dx))+"px";tools.style.top=Math.max(m,Math.min(innerHeight-h-m,e.clientY-toolsDrag.dy))+"px";},{passive:false});
    const stopDrag=e=>{if(!toolsDrag||e.pointerId!==toolsDrag.id)return;try{grip.releasePointerCapture?.(e.pointerId)}catch(_){}toolsDrag=null;};grip.addEventListener("pointerup",stopDrag);grip.addEventListener("pointercancel",stopDrag);
    layer.addEventListener("pointerdown", e => { if (e.target === layer) deseleziona(); });
    window.addEventListener("resize", () => { if (screen.classList.contains("editor")) { aggiornaLayer(); dimensionaCanvas(); } });

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
