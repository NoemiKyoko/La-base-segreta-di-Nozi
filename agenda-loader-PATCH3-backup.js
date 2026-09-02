(() => {
  "use strict";
  const ASSET="assets/agenda-pagine.jpg";
  const KEY="BaseSegretaNoziAgendaV1", MONTH_KEY="BaseSegretaNoziAgendaMeseV1";
  const MESI=["GEN","FEB","MAR","APR","MAG","GIU","LUG","AGO","SET","OTT","NOV","DIC"];
  const id=()=>`${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const vuota=()=>({id:id(),objects:[],strokes:[]});
  const fresh=()=>Array.from({length:12},()=>[vuota()]);
  const load=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||"null");if(Array.isArray(x)&&x.length===12)return x}catch(_){}return fresh()};
  let mesi=load(), mese=Math.max(0,Math.min(11,Number(localStorage.getItem(MONTH_KEY))||new Date().getMonth())), pagina=0, selected=null, mode="pencil", stroke=null, history=[],future=[], zoom=1, panX=0, panY=0, touchPan=null, suppressClickUntil=0;
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(mesi));localStorage.setItem(MONTH_KEY,String(mese))}catch(e){alert("Non riesco a salvare: prova con immagini più piccole.")}};
  const clone=v=>JSON.parse(JSON.stringify(v)); const current=()=>mesi[mese][pagina]; const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  function boot(){
    if(document.getElementById("agendaScreen"))return;
    const st=document.createElement("style");st.textContent=`
      .agenda-screen{position:fixed;inset:0;z-index:990;display:none;background:linear-gradient(180deg,#eaf3fb,#f7f2fb);overflow:hidden}.agenda-screen.aperto{display:block;visibility:hidden}.agenda-screen.aperto.pronta{visibility:visible}
      .agenda-viewport{position:absolute;inset:0;overflow:hidden;touch-action:none}.agenda-stage{position:absolute;aspect-ratio:1536/1024;transform-origin:0 0;will-change:transform,left,top;touch-action:none;-webkit-touch-callout:none;user-select:none;-webkit-user-select:none}.agenda-bg{display:block;width:100%;height:100%;object-fit:contain;user-select:none;-webkit-user-drag:none}.agenda-layer{position:absolute;inset:0;overflow:hidden;pointer-events:none}.agenda-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:auto;touch-action:none;-webkit-touch-callout:none;user-select:none;-webkit-user-select:none}
      .agenda-back{position:fixed;left:max(18px,env(safe-area-inset-left));top:max(18px,env(safe-area-inset-top));z-index:1002;width:52px;height:52px;border:0;border-radius:17px;background:rgba(255,255,255,.9);color:#315d91;font-size:31px;box-shadow:0 5px 16px rgba(65,55,90,.14)}
      .agenda-tools{position:fixed;left:max(18px,env(safe-area-inset-left));bottom:max(18px,env(safe-area-inset-bottom));z-index:1003;display:flex;align-items:center;gap:1px;padding:6px 7px 6px 22px;border:1.25px solid #b8d8ec;border-radius:17px;background:#edf6fb;box-shadow:0 5px 14px rgba(65,55,90,.13);touch-action:none}.agenda-grip{position:absolute;left:5px;top:50%;transform:translateY(-50%);width:16px;height:29px;display:grid;place-items:center;color:#6f8da7;font-weight:900;cursor:grab}.agenda-tool{border:0;width:34px;height:34px;border-radius:9px;background:transparent;color:#315d91;font-size:17px;font-weight:800}.agenda-tool.active{background:#fff;box-shadow:0 2px 7px rgba(45,50,60,.09)}.agenda-eraser{display:grid;place-items:center}.agenda-eraser svg{width:19px;height:19px;display:block;overflow:visible}
      .agenda-menu{position:fixed;z-index:1010;display:none;min-width:190px;padding:8px;border:1px solid #c9ddea;border-radius:17px;background:#fffaf7;box-shadow:0 10px 30px rgba(35,45,60,.20)}.agenda-menu.aperto{display:block}.agenda-menu button{border:0;width:100%;padding:11px 13px;border-radius:11px;background:transparent;color:#315d91;text-align:left;font-size:15px;font-weight:750}.agenda-menu .danger{color:#94515d}
      .agenda-zoom{position:fixed;right:max(18px,env(safe-area-inset-right));top:max(18px,env(safe-area-inset-top));z-index:1003;display:flex;gap:4px;padding:6px;border:1.25px solid #b8d8ec;border-radius:17px;background:#edf6fb;box-shadow:0 5px 16px rgba(65,55,90,.13)}.agenda-zoom button{border:0;min-width:48px;height:34px;padding:0 8px;border-radius:10px;background:transparent;color:#315d91;font-size:13px;font-weight:800}.agenda-zoom button.active{background:#fff;box-shadow:0 2px 7px rgba(45,50,60,.09)}
      .agenda-nav{position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:1003;display:flex;align-items:center;gap:7px;padding:7px 9px;border:1.25px solid #b8d8ec;border-radius:18px;background:#edf6fb;box-shadow:0 5px 16px rgba(65,55,90,.13)}.agenda-nav button{border:0;width:38px;height:38px;border-radius:12px;background:transparent;color:#315d91;font-size:24px}.agenda-nav .agenda-add{background:white;font-size:22px}.agenda-count{min-width:58px;text-align:center;color:#315d91;font-weight:800}
      .agenda-obj{position:absolute;z-index:3;pointer-events:auto;touch-action:none;border:2px solid transparent;border-radius:10px;cursor:grab}.agenda-obj.selected{border-color:rgba(49,93,145,.6);background:rgba(255,255,255,.16)}.agenda-obj img{display:block;width:100%;height:auto;pointer-events:none}.agenda-remove,.agenda-resize{position:absolute;display:none;align-items:center;justify-content:center;border:0;width:28px;height:28px;border-radius:50%;color:white;font-weight:800;box-shadow:0 3px 9px rgba(45,40,60,.22)}.agenda-obj.selected .agenda-remove,.agenda-obj.selected .agenda-resize{display:flex}.agenda-remove{top:-14px;right:-14px;background:#9f5964;font-size:19px}.agenda-resize{right:-14px;bottom:-14px;background:#5277a5}
      .agenda-month{position:absolute;right:1.4%;width:8.3%;height:6.3%;z-index:5;border:0;background:transparent;cursor:pointer}.agenda-month.active{outline:0}.agenda-file{display:none}.agenda-picker{position:fixed;inset:0;z-index:1020;display:none;place-items:center;padding:24px;background:rgba(38,46,67,.55);backdrop-filter:blur(5px)}.agenda-picker.aperto{display:grid}.agenda-picker-card{width:min(760px,92vw);max-height:82vh;overflow:auto;padding:22px;border-radius:26px;background:#fffaf7}.agenda-picker-head{display:flex;align-items:center}.agenda-picker-head h2{flex:1;color:#315d91}.agenda-picker-close{border:0;width:40px;height:40px;border-radius:13px;background:#edf3fa;color:#315d91;font-size:22px}.agenda-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px}.agenda-item{border:1px solid rgba(49,93,145,.12);border-radius:18px;background:#f8f7fb;padding:9px;color:#315d91;font-weight:700}.agenda-item img{display:block;width:100%;aspect-ratio:1;object-fit:contain}
      @media(max-width:700px){.agenda-back{width:44px;height:44px}.agenda-tools{left:10px;bottom:10px}.agenda-nav{bottom:10px}.agenda-zoom{right:10px;top:10px;gap:2px;padding:5px}.agenda-zoom button{min-width:42px;padding:0 5px;font-size:12px}}
    `;document.head.appendChild(st);
    const s=document.createElement("section");s.id="agendaScreen";s.className="agenda-screen";s.innerHTML=`<div class="agenda-viewport"><div class="agenda-stage"><img class="agenda-bg" src="${ASSET}" alt="Agenda"><div class="agenda-layer"><canvas class="agenda-canvas"></canvas></div>${MESI.map((m,i)=>`<button class="agenda-month" data-m="${i}" aria-label="${m}"></button>`).join("")}</div></div><button class="agenda-back">‹</button><div class="agenda-zoom" aria-label="Zoom Agenda">${[100,125,150,175,200].map((z,i)=>`<button data-z="${z}" class="${i===0?"active":""}">${z}%</button>`).join("")}</div><div class="agenda-tools"><span class="agenda-grip">≡</span><button class="agenda-tool active" data-t="pencil">✎</button><button class="agenda-tool agenda-eraser" data-t="eraser" title="Gomma" aria-label="Gomma"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7.2 20.8 17.9 7.5a3 3 0 0 1 4.2-.4l3.4 2.8a3 3 0 0 1 .4 4.2L15.2 27.4H8.8l-2.4-2a3.1 3.1 0 0 1 .8-4.6Z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="m13 25.8-5.5-4.5M15.3 27.3h10.2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button><button class="agenda-tool" data-t="plus">＋</button><button class="agenda-tool" data-t="undo">↶</button><button class="agenda-tool" data-t="redo">↷</button></div><div class="agenda-menu"><button data-a="sticker">Sticker</button><button data-a="image">Foto / immagine</button><button class="danger" data-a="delete">Elimina pagina</button></div><div class="agenda-nav"><button data-n="prev">‹</button><span class="agenda-count">1 / 1</span><button data-n="next">›</button><button class="agenda-add" data-n="add">+</button></div><input class="agenda-file" type="file" accept="image/*"><div class="agenda-picker"><div class="agenda-picker-card"><div class="agenda-picker-head"><h2>Sticker di Nozi</h2><button class="agenda-picker-close">×</button></div><div class="agenda-grid"></div></div></div>`;document.body.appendChild(s);
    const viewport=s.querySelector('.agenda-viewport'),stage=s.querySelector('.agenda-stage'), layer=s.querySelector('.agenda-layer'), canvas=s.querySelector('canvas'),ctx=canvas.getContext('2d'),tools=s.querySelector('.agenda-tools'),menu=s.querySelector('.agenda-menu'),file=s.querySelector('.agenda-file'),picker=s.querySelector('.agenda-picker'),grid=s.querySelector('.agenda-grid'),zoomBar=s.querySelector('.agenda-zoom');
    // tabs positions calibrated to the approved 1536x1024 image
    s.querySelectorAll('.agenda-month').forEach((b,i)=>{b.style.top=(6.5+i*6.45)+'%';b.addEventListener('click',e=>{e.stopPropagation();mese=i;pagina=0;history=[];future=[];render();save()})});
    function snap(){return clone(mesi)} function push(){history.push(snap());future=[]}
    function layoutStage(){
      const vw=viewport.clientWidth||innerWidth,vh=viewport.clientHeight||innerHeight;
      const baseW=Math.max(1,Math.min(vw*.96,1536,vh*.94*(1536/1024))),baseH=baseW*(1024/1536);
      stage.style.width=baseW+'px';stage.style.height=baseH+'px';
      const scaledW=baseW*zoom,scaledH=baseH*zoom;
      const maxX=Math.max(0,(scaledW-vw)/2),maxY=Math.max(0,(scaledH-vh)/2);
      panX=clamp(panX,-maxX,maxX);panY=clamp(panY,-maxY,maxY);
      stage.style.left=((vw-scaledW)/2+panX)+'px';stage.style.top=((vh-scaledH)/2+panY)+'px';stage.style.transform=`scale(${zoom})`;
    }
    function size(){layoutStage();const w=layer.clientWidth,h=layer.clientHeight,d=Math.max(1,devicePixelRatio||1),q=d*zoom;canvas.width=Math.round(w*q);canvas.height=Math.round(h*q);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(q,0,0,q,0,0);draw()}
    function draw(){const w=layer.clientWidth,h=layer.clientHeight;ctx.clearRect(0,0,w,h);ctx.lineCap='round';ctx.lineJoin='round';for(const st of current().strokes||[]){ctx.globalCompositeOperation=st.erase?'destination-out':'source-over';ctx.strokeStyle='#315d91';ctx.lineWidth=st.erase?18:2.4;ctx.beginPath();(st.points||[]).forEach((p,i)=>{const x=p.x*w,y=p.y*h;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()}ctx.globalCompositeOperation='source-over'}
    function deselect(){selected=null;layer.querySelectorAll('.selected').forEach(x=>x.classList.remove('selected'))}
    function objects(){layer.querySelectorAll('.agenda-obj').forEach(x=>x.remove());for(const o of current().objects||[]){const box=document.createElement('div');box.className='agenda-obj';box.style.cssText=`left:${o.x}%;top:${o.y}%;width:${o.width}%`;box.innerHTML=`<img src="${o.src}" alt=""><button class="agenda-remove">×</button><button class="agenda-resize">↘</button>`;layer.appendChild(box);const rm=box.querySelector('.agenda-remove'),rs=box.querySelector('.agenda-resize');box.addEventListener('pointerdown',e=>{if(e.target===rm||e.target===rs)return;e.preventDefault();e.stopPropagation();deselect();box.classList.add('selected');selected=o.id;const r=layer.getBoundingClientRect(),br=box.getBoundingClientRect(),ox=e.clientX-br.left,oy=e.clientY-br.top;box.setPointerCapture(e.pointerId);const mv=q=>{o.x=clamp((q.clientX-r.left-ox)/r.width*100,0,100-o.width);o.y=clamp((q.clientY-r.top-oy)/r.height*100,0,92);box.style.left=o.x+'%';box.style.top=o.y+'%'};const up=q=>{box.removeEventListener('pointermove',mv);box.removeEventListener('pointerup',up);save()};box.addEventListener('pointermove',mv);box.addEventListener('pointerup',up)});rs.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();deselect();box.classList.add('selected');const r=layer.getBoundingClientRect(),br=box.getBoundingClientRect(),left=br.left-r.left;rs.setPointerCapture(e.pointerId);const mv=q=>{o.width=clamp((q.clientX-r.left-left)/r.width*100,6,55);box.style.width=o.width+'%'};const up=()=>{rs.removeEventListener('pointermove',mv);rs.removeEventListener('pointerup',up);save()};rs.addEventListener('pointermove',mv);rs.addEventListener('pointerup',up)});rm.addEventListener('pointerdown',e=>{e.stopPropagation();push();current().objects=current().objects.filter(x=>x.id!==o.id);save();objects()})}}
    function render(){s.querySelector('.agenda-count').textContent=`${pagina+1} / ${mesi[mese].length}`;s.querySelectorAll('.agenda-month').forEach((b,i)=>b.classList.toggle('active',i===mese));objects();requestAnimationFrame(size);save()}
    function addObj(src,label,w=18){push();current().objects.push({id:id(),src,label,x:60,y:50,width:w});save();objects()}
    // Pencil Agenda: stesso comportamento collaudato del Quaderno.
    const isTouch=e=>e.pointerType==='touch';
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('dragstart',e=>e.preventDefault());
    canvas.addEventListener('selectstart',e=>e.preventDefault());
    ['touchstart','touchmove','touchend','touchcancel'].forEach(type=>canvas.addEventListener(type,e=>{e.preventDefault()},{capture:true,passive:false}));

    function setZoom(next){
      zoom=clamp(Number(next)||1,1,2);panX=0;panY=0;deselect();
      zoomBar.querySelectorAll('button').forEach(b=>b.classList.toggle('active',Number(b.dataset.z)===Math.round(zoom*100)));
      requestAnimationFrame(size);
    }
    zoomBar.addEventListener('click',e=>{const b=e.target.closest('button[data-z]');if(b)setZoom(Number(b.dataset.z)/100)});
    viewport.addEventListener('pointerdown',e=>{
      if(!isTouch(e)||zoom<=1)return;
      if(e.target.closest?.('.agenda-obj,.agenda-remove,.agenda-resize,.agenda-month'))return;
      touchPan={id:e.pointerId,startX:e.clientX,startY:e.clientY,baseX:panX,baseY:panY,moved:false};
      try{viewport.setPointerCapture(e.pointerId)}catch(_){}
      e.preventDefault();
    },{capture:true,passive:false});
    viewport.addEventListener('pointermove',e=>{
      if(!touchPan||e.pointerId!==touchPan.id)return;
      const dx=e.clientX-touchPan.startX,dy=e.clientY-touchPan.startY;
      if(Math.hypot(dx,dy)>4)touchPan.moved=true;
      panX=touchPan.baseX+dx;panY=touchPan.baseY+dy;layoutStage();
      e.preventDefault();e.stopPropagation();
    },{capture:true,passive:false});
    const endPan=e=>{
      if(!touchPan||e.pointerId!==touchPan.id)return;
      if(touchPan.moved){suppressClickUntil=Date.now()+350;e.preventDefault();e.stopPropagation()}
      try{viewport.releasePointerCapture(e.pointerId)}catch(_){}
      touchPan=null;
    };
    viewport.addEventListener('pointerup',endPan,{capture:true,passive:false});
    viewport.addEventListener('pointercancel',endPan,{capture:true,passive:false});
    viewport.addEventListener('click',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopPropagation()}},{capture:true});

    canvas.addEventListener('pointerdown',e=>{
      if(!['pencil','eraser'].includes(mode) || e.pointerType!=='pen')return;
      e.preventDefault();e.stopPropagation();push();
      stroke={erase:mode==='eraser',points:[]};
      canvas.setPointerCapture(e.pointerId);
      const add=ev=>{
        const r=canvas.getBoundingClientRect();
        const p={x:clamp((ev.clientX-r.left)/r.width,0,1),y:clamp((ev.clientY-r.top)/r.height,0,1)};
        const last=stroke?.points?.[stroke.points.length-1];
        if(stroke && (!last||Math.abs(p.x-last.x)>0.00001||Math.abs(p.y-last.y)>0.00001))stroke.points.push(p);
      };
      add(e);
      const preview=()=>{
        if(!stroke)return;
        const old=current().strokes;
        current().strokes=[...old,stroke];draw();current().strokes=old;
      };
      preview();
      const feed=ev=>{
        if(!stroke||ev.pointerType!=='pen')return;
        ev.preventDefault();ev.stopPropagation();
        let events=typeof ev.getCoalescedEvents==='function'?ev.getCoalescedEvents():[ev];
        if(!events.length)events=[ev];
        events.forEach(add);preview();
      };
      const move=ev=>feed(ev),raw=ev=>feed(ev);
      const end=ev=>{
        if(!stroke)return;
        try{canvas.releasePointerCapture(ev.pointerId)}catch(_){}
        canvas.removeEventListener('pointermove',move);
        canvas.removeEventListener('pointerrawupdate',raw);
        canvas.removeEventListener('pointerup',end);
        canvas.removeEventListener('pointercancel',end);
        current().strokes.push(stroke);stroke=null;save();draw();
      };
      canvas.addEventListener('pointermove',move,{passive:false});
      canvas.addEventListener('pointerrawupdate',raw,{passive:false});
      canvas.addEventListener('pointerup',end);
      canvas.addEventListener('pointercancel',end);
    });
    tools.querySelectorAll('.agenda-tool').forEach(b=>b.addEventListener('click',()=>{const t=b.dataset.t;if(t==='pencil'||t==='eraser'){mode=t;tools.querySelectorAll('[data-t=pencil],[data-t=eraser]').forEach(x=>x.classList.toggle('active',x.dataset.t===t));return}if(t==='plus'){const r=b.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(innerWidth-210,r.left))+'px';menu.style.top=Math.max(8,r.top-150)+'px';menu.classList.toggle('aperto')}if(t==='undo'&&history.length){future.push(snap());mesi=history.pop();pagina=Math.min(pagina,mesi[mese].length-1);render()}if(t==='redo'&&future.length){history.push(snap());mesi=future.pop();pagina=Math.min(pagina,mesi[mese].length-1);render()}}));
    s.querySelector('[data-n=prev]').onclick=()=>{if(pagina>0){pagina--;render()}};s.querySelector('[data-n=next]').onclick=()=>{if(pagina<mesi[mese].length-1){pagina++;render()}};s.querySelector('[data-n=add]').onclick=()=>{push();mesi[mese].push(vuota());pagina=mesi[mese].length-1;render()};
    menu.addEventListener('click',e=>{const a=e.target.dataset.a;if(!a)return;menu.classList.remove('aperto');if(a==='image')file.click();if(a==='sticker'){grid.innerHTML='';const list=(typeof STICKERS!=='undefined'&&Array.isArray(STICKERS))?STICKERS:[];for(const st of list){const b=document.createElement('button');b.className='agenda-item';b.innerHTML=`<img src="assets/${st.file}"><span>${st.label}</span>`;b.onclick=()=>{addObj(`assets/${st.file}`,st.label);picker.classList.remove('aperto')};grid.appendChild(b)}if(!list.length)grid.textContent='Nessuno sticker disponibile.';picker.classList.add('aperto')}if(a==='delete'){if(!confirm(`Eliminare la pagina ${pagina+1}?`))return;push();if(mesi[mese].length===1)mesi[mese][0]=vuota();else{mesi[mese].splice(pagina,1);pagina=Math.min(pagina,mesi[mese].length-1)}render()}});
    file.onchange=()=>{const f=file.files?.[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{addObj(rd.result,f.name,24);file.value=''};rd.readAsDataURL(f)};s.querySelector('.agenda-picker-close').onclick=()=>picker.classList.remove('aperto');picker.onclick=e=>{if(e.target===picker)picker.classList.remove('aperto')};s.querySelector('.agenda-back').onclick=()=>s.classList.remove('aperto','pronta');
    const grip=s.querySelector('.agenda-grip');let drag=null;grip.addEventListener('pointerdown',e=>{const r=tools.getBoundingClientRect();drag={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top};grip.setPointerCapture(e.pointerId);tools.style.left=r.left+'px';tools.style.top=r.top+'px';tools.style.bottom='auto'});grip.addEventListener('pointermove',e=>{if(!drag)return;tools.style.left=clamp(e.clientX-drag.dx,8,innerWidth-tools.offsetWidth-8)+'px';tools.style.top=clamp(e.clientY-drag.dy,8,innerHeight-tools.offsetHeight-8)+'px'});grip.addEventListener('pointerup',()=>drag=null);
    layer.addEventListener('pointerdown',e=>{if(e.target===layer)deselect()});
    stage.addEventListener('contextmenu',e=>e.preventDefault());
    stage.addEventListener('dragstart',e=>e.preventDefault());
    stage.addEventListener('selectstart',e=>e.preventDefault());
    window.addEventListener('resize',()=>{panX=0;panY=0;size()});
    window.apriAgenda=()=>{s.classList.remove('pronta');s.classList.add('aperto');panX=0;panY=0;render();requestAnimationFrame(()=>{size();requestAnimationFrame(()=>s.classList.add('pronta'))})};
    const hotspot=document.querySelector('.hotspot[data-agenda="agendaScreen"]');if(hotspot){hotspot.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();window.apriAgenda()},true)}
    render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();