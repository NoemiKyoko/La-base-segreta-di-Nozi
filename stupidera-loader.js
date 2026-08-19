(() => {
  "use strict";

  const ASSETS = [
    {
      src: "assets/stupidera-copertina.png",
      alt: "Copertina della Stupidera"
    },
    {
      src: "assets/stupidera-intro.png",
      alt: "Introduzione della Stupidera"
    },
    {
      src: "assets/stupidera-pagine.png",
      alt: "Pagine della Stupidera"
    }
  ];

  function avviaStupidera() {
    if (document.getElementById("stupideraScreen")) {
      return;
    }

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
          max(18px, env(safe-area-inset-top))
          max(18px, env(safe-area-inset-right))
          max(18px, env(safe-area-inset-bottom))
          max(18px, env(safe-area-inset-left));

        background:
          linear-gradient(
            180deg,
            #eaf3fb 0%,
            #f7f2fb 100%
          );

        z-index: 700;
      }

      .stupidera-screen.aperto {
        display: flex;
      }

      .stupidera-stage {
        position: relative;

        width: min(96vw, 1200px);
        height: min(94vh, 900px);

        display: flex;
        align-items: center;
        justify-content: center;
      }

      .stupidera-image {
        display: block;

        max-width: 100%;
        max-height: 100%;

        width: auto;
        height: auto;

        object-fit: contain;

        user-select: none;
        -webkit-user-select: none;
        -webkit-user-drag: none;

        -webkit-tap-highlight-color: transparent;
      }

      .stupidera-image.stupidera-clickable {
        cursor: pointer;
      }

      .stupidera-back {
        position: fixed;

        top:
          max(
            18px,
            env(safe-area-inset-top)
          );

        left:
          max(
            18px,
            env(safe-area-inset-left)
          );

        appearance: none;
        border: 0;

        width: 52px;
        height: 52px;

        display: flex;
        align-items: center;
        justify-content: center;

        border-radius: 17px;

        background:
          rgba(
            255,
            255,
            255,
            0.88
          );

        color: #4c4274;

        box-shadow:
          0 5px 16px
          rgba(
            65,
            55,
            90,
            0.14
          );

        font-size: 32px;
        line-height: 1;

        cursor: pointer;

        z-index: 2;

        -webkit-tap-highlight-color:
          transparent;
      }

      @media (max-width: 700px) {
        .stupidera-screen {
          padding:
            max(12px, env(safe-area-inset-top))
            max(10px, env(safe-area-inset-right))
            max(12px, env(safe-area-inset-bottom))
            max(10px, env(safe-area-inset-left));
        }

        .stupidera-back {
          width: 46px;
          height: 46px;
          font-size: 28px;
        }
      }
    `;

    document.head.appendChild(style);


    /* =========================
       SCHERMATA
    ========================== */

    const screen =
      document.createElement("section");

    screen.className =
      "stupidera-screen";

    screen.id =
      "stupideraScreen";


    const stage =
      document.createElement("div");

    stage.className =
      "stupidera-stage";


    const back =
      document.createElement("button");

    back.className =
      "stupidera-back";

    back.type =
      "button";

    back.setAttribute(
      "aria-label",
      "Indietro"
    );

    back.textContent =
      "‹";


    const image =
      document.createElement("img");

    image.className =
      "stupidera-image stupidera-clickable";

    image.id =
      "stupideraImage";

    image.draggable =
      false;


    stage.appendChild(image);

    screen.appendChild(stage);

    screen.appendChild(back);

    document.body.appendChild(screen);


    /* =========================
       NAVIGAZIONE
    ========================== */

    let pagina =
      0;


    function mostraPagina(
      indice
    ) {

      pagina =
        Math.max(
          0,
          Math.min(
            indice,
            ASSETS.length - 1
          )
        );


      image.src =
        ASSETS[pagina].src;


      image.alt =
        ASSETS[pagina].alt;


      image.classList.toggle(
        "stupidera-clickable",
        pagina <
          ASSETS.length - 1
      );

    }


    function apri() {

      pagina =
        0;

      mostraPagina(
        0
      );

      screen.classList.add(
        "aperto"
      );

    }


    function chiudi() {

      screen.classList.remove(
        "aperto"
      );

      pagina =
        0;

    }


    image.addEventListener(
      "click",
      () => {

        if (
          pagina <
          ASSETS.length - 1
        ) {

          mostraPagina(
            pagina + 1
          );

        }

      }
    );


    back.addEventListener(
      "click",
      (event) => {

        event.preventDefault();
        event.stopPropagation();


        if (
          pagina > 0
        ) {

          mostraPagina(
            pagina - 1
          );

          return;

        }


        chiudi();

      }
    );


    /* =========================
       AGGANCIO AUTOMATICO
       AL QUADERNO ESISTENTE
    ========================== */

    const notebookHotspot =
      document.querySelector(
        '.hotspot[data-target="overlayNotebook"]'
      );


    if (!notebookHotspot) {

      console.error(
        "Stupidera: hotspot del Quaderno delle cose buffe non trovato."
      );

      return;

    }


    /*
      Rimuoviamo il vecchio attributo:
      così il click non apre più
      il pannello provvisorio.
    */

    notebookHotspot.removeAttribute(
      "data-target"
    );


    /*
      Usiamo un listener in capture:
      parte prima del listener già presente
      nell'Index e apre direttamente
      la Stupidera.
    */

    notebookHotspot.addEventListener(
      "click",
      (event) => {

        event.preventDefault();
        event.stopImmediatePropagation();

        apri();

      },
      true
    );


    /*
      Precarichiamo le tre immagini.
    */

    ASSETS.forEach(
      (item) => {

        const preload =
          new Image();

        preload.src =
          item.src;

      }
    );


    console.log(
      "La Stupidera è pronta."
    );
  }


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      avviaStupidera,
      {
        once: true
      }
    );

  } else {

    avviaStupidera();

  }

})();
