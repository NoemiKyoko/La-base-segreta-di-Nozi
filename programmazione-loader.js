(() => {
  "use strict";

  const STORAGE_KEY = "BaseSegretaNoziProgrammazioneV1";
  const VIEW_KEY = "BaseSegretaNoziProgrammazioneVistaV1";

  const MESI = [
    "GENNAIO", "FEBBRAIO", "MARZO", "APRILE", "MAGGIO", "GIUGNO",
    "LUGLIO", "AGOSTO", "SETTEMBRE", "OTTOBRE", "NOVEMBRE", "DICEMBRE"
  ];

  const GIORNI = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"];

  function caricaNote() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      console.error("Programmazione: errore nel caricamento", error);
      return {};
    }
  }

  function salvaNote(note) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(note));
    } catch (error) {
      console.error("Programmazione: errore nel salvataggio", error);
    }
  }

  function caricaVista() {
    const oggi = new Date();

    try {
      const raw = localStorage.getItem(VIEW_KEY);
      const vista = raw ? JSON.parse(raw) : null;

      if (
        vista &&
        Number.isInteger(vista.year) &&
        Number.isInteger(vista.month) &&
        vista.month >= 0 &&
        vista.month <= 11
      ) {
        return { year: vista.year, month: vista.month };
      }
    } catch (error) {
      console.error("Programmazione: errore nel caricamento del mese", error);
    }

    return { year: oggi.getFullYear(), month: oggi.getMonth() };
  }

  function salvaVista(year, month) {
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify({ year, month }));
    } catch (error) {
      console.error("Programmazione: errore nel salvataggio del mese", error);
    }
  }

  function chiaveData(year, month, day) {
    return [
      year,
      String(month + 1).padStart(2, "0"),
      String(day).padStart(2, "0")
    ].join("-");
  }

  function stessoGiorno(year, month, day, date) {
    return (
      year === date.getFullYear() &&
      month === date.getMonth() &&
      day === date.getDate()
    );
  }

  function avviaProgrammazione() {
    if (document.getElementById("planningScreen")) return;

    const hotspot = document.querySelector('.hotspot[data-target="overlayPlanning"]');

    if (!hotspot) {
      console.error("Programmazione: hotspot non trovato.");
      return;
    }

    const style = document.createElement("style");
    style.textContent = `
      .planning-screen {
        position: fixed;
        inset: 0;
        display: none;
        flex-direction: column;
        z-index: 235;
        overflow: hidden;
        background: linear-gradient(180deg, #edf5ff 0%, #f6f3fb 100%);
        color: #2f5688;
      }

      .planning-screen.aperto {
        display: flex;
      }

      .planning-header {
        display: flex;
        align-items: center;
        gap: 14px;
        padding:
          max(16px, env(safe-area-inset-top))
          max(18px, env(safe-area-inset-right))
          12px
          max(18px, env(safe-area-inset-left));
        background: #dcecf8;
        border-bottom: 1px solid rgba(47, 86, 136, 0.10);
      }

      .planning-back,
      .planning-today {
        appearance: none;
        border: 0;
        height: 48px;
        border-radius: 16px;
        background: rgba(255,255,255,.82);
        color: #2f5688;
        cursor: pointer;
        box-shadow: 0 5px 14px rgba(50,65,80,.10);
      }

      .planning-back {
        width: 48px;
        flex: 0 0 48px;
        font-size: 30px;
        line-height: 1;
      }

      .planning-today {
        padding: 0 16px;
        font-size: 15px;
        font-weight: 700;
      }

      .planning-title {
        flex: 1;
        margin: 0;
        color: #2f5688;
        font-size: clamp(24px, 3.5vw, 38px);
        font-weight: 700;
      }

      .planning-workspace {
        flex: 1;
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12px;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
      }

      .planning-board {
        position: relative;
        width: min(1220px, 96vw);
        min-width: 760px;
        aspect-ratio: 3 / 2;
        flex: 0 0 auto;
        padding: 26px 32px 28px;
        overflow: hidden;
        border: 11px solid #a9c9e5;
        border-radius: 34px;
        background: #fffaf0;
        box-shadow:
          inset 0 0 0 2px rgba(72, 117, 164, .35),
          0 16px 38px rgba(58, 75, 100, .14);
      }

      .planning-board::before {
        content: "";
        position: absolute;
        inset: 7px;
        border: 2px dashed rgba(255,255,255,.82);
        border-radius: 23px;
        pointer-events: none;
      }

      .planning-month-row {
        position: relative;
        z-index: 1;
        min-height: 88px;
        display: grid;
        grid-template-columns: 58px 1fr 58px;
        align-items: center;
        gap: 12px;
        margin-bottom: 2px;
      }

      .planning-month-nav {
        appearance: none;
        border: 0;
        width: 48px;
        height: 48px;
        justify-self: center;
        border-radius: 15px;
        background: #edf3fa;
        color: #2f5688;
        font-size: 28px;
        line-height: 1;
        cursor: pointer;
      }

      .planning-month-title {
        margin: 0;
        text-align: center;
        color: #315d91;
        font-size: clamp(30px, 4.6vw, 62px);
        font-weight: 500;
        letter-spacing: .08em;
        line-height: 1;
      }

      .planning-month-title span {
        display: inline-block;
        margin-left: .28em;
        padding-bottom: .08em;
        border-bottom: 3px solid rgba(49, 93, 145, .72);
        font-size: .62em;
        letter-spacing: .04em;
        vertical-align: .10em;
      }

      .planning-weekdays,
      .planning-grid {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
      }

      .planning-weekdays {
        height: 46px;
        align-items: end;
        padding-bottom: 9px;
      }

      .planning-weekday {
        color: #315d91;
        font-size: clamp(14px, 1.7vw, 23px);
        font-weight: 700;
        letter-spacing: .08em;
        text-align: center;
      }

      .planning-grid {
        height: calc(100% - 136px);
        grid-template-rows: repeat(6, minmax(0, 1fr));
        border-top: 2px solid rgba(72, 117, 164, .54);
        border-left: 2px solid rgba(72, 117, 164, .54);
        border-radius: 16px;
        overflow: hidden;
      }

      .planning-day {
        position: relative;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        border-right: 2px solid rgba(72, 117, 164, .48);
        border-bottom: 2px solid rgba(72, 117, 164, .48);
        background: rgba(255, 252, 244, .72);
      }

      .planning-day.empty {
        background: rgba(248, 246, 239, .48);
      }

      .planning-day.today {
        background: rgba(223, 239, 251, .48);
      }

      .planning-day-number {
        position: absolute;
        top: 7px;
        left: 9px;
        z-index: 2;
        color: #315d91;
        font-size: clamp(13px, 1.45vw, 20px);
        font-weight: 700;
        line-height: 1;
        pointer-events: none;
      }

      .planning-day.today .planning-day-number {
        min-width: 28px;
        min-height: 28px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        top: 4px;
        left: 5px;
        padding: 3px 6px;
        border-radius: 11px;
        background: rgba(169, 201, 229, .45);
      }

      .planning-note {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        resize: none;
        overflow: hidden;
        border: 0;
        outline: 0;
        padding: 30px 8px 7px;
        background: transparent;
        color: #324d6e;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
        font-size: clamp(10px, 1.12vw, 15px);
        font-weight: 600;
        line-height: 1.18;
        text-align: left;
        caret-color: #315d91;
      }

      .planning-note:focus {
        background: rgba(255,255,255,.24);
      }

      .planning-note::placeholder {
        color: transparent;
      }

      @media (max-width: 850px) {
        .planning-header { gap: 8px; }
        .planning-today { padding: 0 10px; }
        .planning-workspace { justify-content: flex-start; padding: 6px; }
        .planning-board { width: 920px; min-width: 920px; }
        .planning-title { font-size: 21px; }
        .planning-note { font-size: 11px; }
      }
    `;
    document.head.appendChild(style);

    const screen = document.createElement("section");
    screen.className = "planning-screen";
    screen.id = "planningScreen";
    screen.innerHTML = `
      <header class="planning-header">
        <button class="planning-back" id="planningBack" type="button" aria-label="Torna alla Base">‹</button>
        <h1 class="planning-title">Programmazione</h1>
        <button class="planning-today" id="planningToday" type="button">Oggi</button>
      </header>

      <div class="planning-workspace">
        <section class="planning-board" aria-label="Calendario di programmazione">
          <div class="planning-month-row">
            <button class="planning-month-nav" id="planningPrevMonth" type="button" aria-label="Mese precedente">‹</button>
            <h2 class="planning-month-title" id="planningMonthTitle"></h2>
            <button class="planning-month-nav" id="planningNextMonth" type="button" aria-label="Mese successivo">›</button>
          </div>

          <div class="planning-weekdays" id="planningWeekdays"></div>
          <div class="planning-grid" id="planningGrid"></div>
        </section>
      </div>
    `;
    document.body.appendChild(screen);

    const back = screen.querySelector("#planningBack");
    const today = screen.querySelector("#planningToday");
    const prev = screen.querySelector("#planningPrevMonth");
    const next = screen.querySelector("#planningNextMonth");
    const monthTitle = screen.querySelector("#planningMonthTitle");
    const weekdays = screen.querySelector("#planningWeekdays");
    const grid = screen.querySelector("#planningGrid");

    const note = caricaNote();
    let vista = caricaVista();

    GIORNI.forEach(giorno => {
      const el = document.createElement("div");
      el.className = "planning-weekday";
      el.textContent = giorno;
      weekdays.appendChild(el);
    });

    function render() {
      const year = vista.year;
      const month = vista.month;
      const oggi = new Date();

      monthTitle.innerHTML = `${MESI[month]} <span>${year}</span>`;
      grid.innerHTML = "";

      // getDay(): domenica 0; convertiamo a lunedì 0 ... domenica 6.
      const primoGiorno = new Date(year, month, 1).getDay();
      const offset = (primoGiorno + 6) % 7;
      const giorniNelMese = new Date(year, month + 1, 0).getDate();

      for (let index = 0; index < 42; index++) {
        const day = index - offset + 1;
        const cell = document.createElement("div");
        cell.className = "planning-day";

        if (day < 1 || day > giorniNelMese) {
          cell.classList.add("empty");
          grid.appendChild(cell);
          continue;
        }

        const key = chiaveData(year, month, day);

        if (stessoGiorno(year, month, day, oggi)) {
          cell.classList.add("today");
        }

        const number = document.createElement("div");
        number.className = "planning-day-number";
        number.textContent = day;

        const textarea = document.createElement("textarea");
        textarea.className = "planning-note";
        textarea.value = note[key] || "";
        textarea.maxLength = 120;
        textarea.spellcheck = true;
        textarea.setAttribute("aria-label", `${day} ${MESI[month].toLowerCase()} ${year}`);
        textarea.placeholder = "Scrivi...";

        textarea.addEventListener("input", () => {
          const value = textarea.value.trim();

          if (value) note[key] = textarea.value;
          else delete note[key];

          salvaNote(note);
        });

        cell.append(number, textarea);
        grid.appendChild(cell);
      }

      salvaVista(year, month);
    }

    function cambiaMese(delta) {
      const date = new Date(vista.year, vista.month + delta, 1);
      vista = { year: date.getFullYear(), month: date.getMonth() };
      render();
    }

    back.addEventListener("click", () => {
      screen.classList.remove("aperto");
    });

    today.addEventListener("click", () => {
      const now = new Date();
      vista = { year: now.getFullYear(), month: now.getMonth() };
      render();
    });

    prev.addEventListener("click", () => cambiaMese(-1));
    next.addEventListener("click", () => cambiaMese(1));

    hotspot.removeAttribute("data-target");
    hotspot.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        render();
        screen.classList.add("aperto");
      },
      true
    );

    render();
    console.log("Programmazione pronta: calendario mensile con note giornaliere salvate.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", avviaProgrammazione, { once: true });
  } else {
    avviaProgrammazione();
  }
})();
