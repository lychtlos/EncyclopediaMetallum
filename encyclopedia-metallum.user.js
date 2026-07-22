// ==UserScript==
// @name         Encyclopedia Metallum
// @namespace    metal-explorer
// @version      1.1
// @description  Suche, Filter & Streaming-Links als Overlay auf Metal Archives – ohne Proxy, ohne Cloudflare-Probleme.
// @author       Steffen
// @match        https://www.metal-archives.com/*
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function () {
  "use strict";
  console.log("[Encyclopedia Metallum] Userscript geladen auf", location.href);

  // MA liefert kein Mobil-Viewport -> die Seite wird als ~980px breite Desktop-Seite
  // gerendert. Das muss VOR dem ersten Layout passieren, daher @run-at document-start.
  function setViewport() {
    const head = document.head || document.documentElement;
    if (!head) return false;
    let vp = document.querySelector('meta[name="viewport"]');
    if (!vp) {
      vp = document.createElement("meta");
      vp.setAttribute("name", "viewport");
      head.appendChild(vp);
    }
    vp.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover");
    return true;
  }
  if (!setViewport()) {
    const mo = new MutationObserver(() => { if (setViewport()) mo.disconnect(); });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  // Start ueber die Homescreen-Verknuepfung (#mx): MA-Seite gar nicht erst aufblitzen
  // lassen, sondern direkt in die Oberflaeche starten.
  const BOOT = location.hash.toLowerCase() === "#mx";
  if (BOOT) {
    document.documentElement.classList.add("mx-boot");
    const st = document.createElement("style");
    st.textContent =
      "html.mx-boot{background:#0b0b0d!important}" +
      "html.mx-boot body{background:#0b0b0d!important}" +
      "html.mx-boot body > *:not(#mx-overlay):not(#mx-detail):not(#mx-launch){display:none!important}";
    (document.head || document.documentElement).appendChild(st);
  }

  // UI erst aufbauen, wenn der Body existiert.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

function init() {
  setViewport();

  // ---------- Styles ----------
  const CSS = `
  #mx-launch{position:fixed;right:14px;bottom:14px;z-index:2147483000;background:#c8102e;color:#fff;
    font:600 13px/1 Inter,system-ui,sans-serif;padding:12px 14px;border:0;border-radius:999px;cursor:pointer;
    box-shadow:0 4px 14px rgba(0,0,0,.5);letter-spacing:.03em}
  #mx-launch:hover{background:#e0455e}
  #mx-overlay{position:fixed;inset:0;z-index:2147483001;background:#0b0b0d;color:#e7e7ea;display:none;
    overflow-y:auto;font-family:Inter,system-ui,sans-serif;-webkit-text-size-adjust:100%}
  #mx-overlay.mx-open{display:block}
  #mx-overlay *{box-sizing:border-box}
  .mx-wrap{max-width:1100px;margin:0 auto;padding:0 14px 40px}
  .mx-head{position:sticky;top:0;z-index:5;background:#0b0b0d;border-bottom:1px solid #2a2a31;
    display:flex;align-items:center;gap:10px;padding:12px 14px;margin:0 -14px 14px}
  .mx-mark{width:30px;height:30px;background:#c8102e;display:flex;align-items:center;justify-content:center;
    font:700 17px/1 Oswald,Inter,sans-serif;color:#fff}
  .mx-title{font:700 clamp(14px,4.4vw,22px)/1.15 Oswald,Inter,sans-serif;letter-spacing:.02em;flex:1;min-width:0;overflow-wrap:anywhere}
  .mx-x{width:34px;height:34px;border-radius:8px;background:#1b1b21;border:1px solid #2a2a31;color:#e7e7ea;
    font-size:16px;cursor:pointer}
  .mx-x:hover{filter:brightness(1.3)}
  .mx-panel{background:#141418;border:1px solid #2a2a31;border-radius:8px}
  .mx-p{padding:14px}
  .mx-searchrow{display:flex;flex-direction:column;gap:10px}
  @media(min-width:640px){.mx-searchrow{flex-direction:row}}
  .mx-inp{background:#1b1b21;border:1px solid #2a2a31;color:#e7e7ea;border-radius:6px;padding:12px 14px;font-size:16px;width:100%}
  .mx-inp:focus{outline:0;border-color:#e0455e}
  .mx-btns{display:flex;gap:10px}
  .mx-btn{background:#c8102e;color:#fff;border:0;border-radius:6px;padding:12px 20px;font:600 14px Inter;cursor:pointer;white-space:nowrap;flex:1}
  @media(min-width:640px){.mx-btn{flex:none}}
  .mx-btn:hover{background:#e0455e}
  .mx-btn2{background:#1b1b21;border:1px solid #2a2a31;color:#e7e7ea;border-radius:6px;padding:12px 16px;font:400 14px Inter;cursor:pointer;white-space:nowrap;flex:1}
  @media(min-width:640px){.mx-btn2{flex:none}}
  .mx-btn2:hover{filter:brightness(1.3)}
  .mx-filters{display:none;grid-template-columns:1fr;gap:10px;margin-top:14px;padding-top:14px;border-top:1px solid #2a2a31}
  .mx-filters.mx-show{display:grid}
  @media(min-width:640px){.mx-filters{grid-template-columns:1fr 1fr}}
  @media(min-width:900px){.mx-filters{grid-template-columns:repeat(4,1fr)}}
  .mx-lbl{font-size:13px;color:#9a9aa4;display:block;margin-bottom:4px}
  .mx-sel{background:#1b1b21;border:1px solid #2a2a31;color:#e7e7ea;border-radius:6px;padding:9px 10px;width:100%;font-size:14px}
  .mx-status{text-align:center;color:#9a9aa4;font-size:14px;margin:18px 0}
  .mx-results{display:grid;grid-template-columns:1fr;gap:10px;margin-top:16px}
  @media(min-width:640px){.mx-results{grid-template-columns:1fr 1fr}}
  @media(min-width:900px){.mx-results{grid-template-columns:1fr 1fr 1fr}}
  .mx-card{background:#141418;border:1px solid #2a2a31;border-radius:6px;padding:14px;text-align:left;cursor:pointer;color:#e7e7ea}
  .mx-card:hover,.mx-card:active{border-color:#e0455e;background:#1b1b21}
  .mx-card b{font:600 17px Oswald,Inter,sans-serif;display:block;margin-bottom:4px}
  .mx-card .g{font-size:13px;color:#d8d4c8;margin-bottom:3px}
  .mx-card .c{font-size:12px;color:#9a9aa4}
  .mx-pager{display:none;justify-content:center;gap:10px;margin-top:22px;align-items:center}
  .mx-pager.mx-show{display:flex}
  .mx-pg{background:#1b1b21;border:1px solid #2a2a31;color:#e7e7ea;border-radius:6px;padding:8px 16px;font-size:14px;cursor:pointer}
  .mx-pg:disabled{opacity:.4;cursor:default}
  .mx-pginfo{color:#9a9aa4;font-size:14px}
  /* Detail */
  #mx-detail{position:fixed;inset:0;z-index:2147483002;background:rgba(0,0,0,.85);display:none;overflow-y:auto}
  #mx-detail.mx-open{display:block}
  .mx-dinner{max-width:820px;margin:0 auto;background:#141418;border:1px solid #2a2a31;min-height:100vh}
  @media(min-width:640px){.mx-dinner{margin:32px auto;min-height:0;border-radius:10px}}
  .mx-dx{position:sticky;top:0;float:right;margin:12px;width:36px;height:36px;border-radius:999px;background:#1b1b21;
    border:1px solid #2a2a31;color:#e7e7ea;font-size:16px;cursor:pointer;z-index:3}
  .mx-dbody{padding:20px}
  .mx-logo{max-height:130px;max-width:100%;width:auto;height:auto;margin-bottom:16px;cursor:zoom-in;display:block}
  @media(min-width:640px){.mx-logo{max-height:180px}}
  .mx-name{font:700 26px Oswald,Inter,sans-serif;margin:0 0 16px;word-break:break-word}
  .mx-photo{height:96px;max-width:100%;width:auto;border-radius:6px;margin-bottom:20px;object-fit:cover;cursor:zoom-in;display:block}
  @media(min-width:640px){.mx-photo{height:112px}}
  /* nichts darf den Container sprengen */
  #mx-detail img,#mx-overlay img{max-width:100%;height:auto}
  .mx-dinner{overflow-x:hidden}
  .mx-dbody{overflow-wrap:anywhere}
  .mx-info span{overflow-wrap:anywhere;min-width:0}
  .mx-wrap{overflow-x:hidden}
  .mx-streams{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:24px}
  .mx-stream{padding:9px 16px;border-radius:6px;font:600 14px Inter;color:#fff;text-decoration:none;display:inline-block}
  .mx-stream:hover{filter:brightness(1.1)}
  .mx-info{background:#1b1b21;border:1px solid #2a2a31;border-radius:6px;padding:14px;margin-bottom:24px;
    display:grid;grid-template-columns:1fr;gap:6px 24px;font-size:14px}
  @media(min-width:640px){.mx-info{grid-template-columns:1fr 1fr}}
  .mx-info .r{display:flex;gap:8px}
  .mx-info .k{width:92px;flex:none;color:#9a9aa4}
  .mx-h3{font:600 18px Oswald,Inter,sans-serif;margin:0 0 10px}
  .mx-tblwrap{overflow-x:auto;margin-bottom:24px}
  .mx-tbl{width:100%;max-width:100%;border-collapse:collapse;font-size:14px;table-layout:auto}
  .mx-tbl th{text-align:left;color:#9a9aa4;font-weight:500;border-bottom:1px solid #2a2a31;padding:8px 12px 8px 0}
  .mx-tbl td{border-bottom:1px solid #2a2a31;padding:8px 12px 8px 0;vertical-align:middle}
  /* Typ, Jahr und Button nur so breit wie noetig und nie umbrechen;
     der Release-Titel bekommt den restlichen Platz und darf umbrechen. */
  .mx-tbl th:nth-child(2),.mx-tbl td:nth-child(2){white-space:nowrap;width:1%;font-size:13px;padding-right:10px}
  .mx-tbl th:nth-child(3),.mx-tbl td:nth-child(3){white-space:nowrap;width:1%;padding-right:10px}
  .mx-tbl th:nth-child(4),.mx-tbl td:nth-child(4){white-space:nowrap;width:1%;padding-right:0}
  .mx-tbl th:first-child,.mx-tbl td:first-child{width:auto;overflow-wrap:anywhere}
  .mx-tbl td.t{color:#d8d4c8}
  .mx-tbl td.y{color:#9a9aa4}
  .mx-ytm{background:#ff0000;color:#fff;text-decoration:none;padding:5px 9px;border-radius:5px;font:600 12px Inter;white-space:nowrap;display:inline-block}
  .mx-ytm:hover{filter:brightness(1.1)}
  .mx-lineup{background:#1b1b21;border:1px solid #2a2a31;border-radius:6px;padding:14px;margin-bottom:24px}
  .mx-grp{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#9a9aa4;margin:0 0 6px}
  .mx-mem{font-size:14px;display:flex;flex-direction:column;margin-bottom:4px}
  @media(min-width:640px){.mx-mem{flex-direction:row;gap:10px}}
  .mx-mem .n{font-weight:600;width:190px;flex:none}
  .mx-mem .role{color:#d8d4c8}
  .mx-simgrid{display:grid;grid-template-columns:1fr;gap:8px}
  @media(min-width:640px){.mx-simgrid{grid-template-columns:1fr 1fr}}
  .mx-sim{background:#1b1b21;border:1px solid #2a2a31;border-radius:6px;padding:9px 12px;text-align:left;cursor:pointer;color:#e7e7ea}
  .mx-sim:hover{border-color:#e0455e}
  .mx-sim b{font-weight:600;font-size:14px;display:block}
  .mx-sim span{font-size:12px;color:#9a9aa4}
  .mx-malink{display:block;margin-top:20px;padding-top:16px;border-top:1px solid #2a2a31;color:#9a9aa4;font-size:14px}
  .mx-muted{color:#9a9aa4;font-size:14px}
  .mx-spin{width:26px;height:26px;border:3px solid #2a2a31;border-top-color:#c8102e;border-radius:50%;
    display:inline-block;animation:mxspin .8s linear infinite;vertical-align:middle}
  .mx-spin.sm{width:18px;height:18px;border-width:2px}
  @keyframes mxspin{to{transform:rotate(360deg)}}
  `;
  (typeof GM_addStyle === "function")
    ? GM_addStyle(CSS)
    : (() => { const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); })();

  // ---------- Daten: same-origin fetch, kein Proxy ----------
  const PAGE_SIZE = 200;
  const memCache = new Map();
  async function fetchText(path) {
    if (memCache.has(path)) return memCache.get(path);
    const res = await fetch(path, { credentials: "include", headers: { "X-Requested-With": "XMLHttpRequest" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const t = await res.text();
    memCache.set(path, t);
    return t;
  }

  const parser = new DOMParser();
  const H = (s) => parser.parseFromString(s || "", "text/html");
  const idFrom = (h) => (h || "").match(/\/(\d+)(?:[#?].*)?$/)?.[1] || null;
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const esc = (s) => (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function extractJson(raw) {
    try { return JSON.parse(raw); } catch {}
    const d = H(raw);
    return JSON.parse((d.querySelector("pre")?.textContent || d.body?.textContent || "").trim());
  }

  const COUNTRIES = [
    ["", "Alle Länder"], ["US", "USA"], ["DE", "Deutschland"], ["NO", "Norwegen"], ["SE", "Schweden"],
    ["FI", "Finnland"], ["GB", "Großbritannien"], ["FR", "Frankreich"], ["IT", "Italien"], ["NL", "Niederlande"],
    ["PL", "Polen"], ["CA", "Kanada"], ["BR", "Brasilien"], ["JP", "Japan"], ["AU", "Australien"], ["ES", "Spanien"],
    ["BE", "Belgien"], ["DK", "Dänemark"], ["CH", "Schweiz"], ["AT", "Österreich"], ["GR", "Griechenland"],
    ["RU", "Russland"], ["CZ", "Tschechien"], ["PT", "Portugal"], ["IS", "Island"], ["UA", "Ukraine"],
    ["MX", "Mexiko"], ["CL", "Chile"], ["HU", "Ungarn"],
  ];

  // ---------- UI aufbauen ----------
  const launch = document.createElement("button");
  launch.id = "mx-launch";
  launch.textContent = "⚡ METALLUM";
  document.body.appendChild(launch);

  const overlay = document.createElement("div");
  overlay.id = "mx-overlay";
  overlay.innerHTML = `
    <div class="mx-wrap">
      <div class="mx-head">
        <div class="mx-mark">M</div>
        <div class="mx-title">ENCYCLOPEDIA METALLUM</div>
        <button class="mx-x" id="mx-close">✕</button>
      </div>
      <div class="mx-panel mx-p">
        <div class="mx-searchrow">
          <input id="mx-q" class="mx-inp" type="text" inputmode="search" placeholder="Band suchen … (z. B. Emperor)" autocomplete="off"/>
          <div class="mx-btns">
            <button id="mx-ftoggle" class="mx-btn2">Filter <span id="mx-fcount" style="color:#e0455e"></span></button>
            <button id="mx-search" class="mx-btn">Suchen</button>
          </div>
        </div>
        <div id="mx-filters" class="mx-filters">
          <label><span class="mx-lbl">Genre</span><input id="mx-genre" class="mx-inp" style="font-size:14px;padding:9px 10px" placeholder="z. B. Black Metal"/></label>
          <label><span class="mx-lbl">Land</span><select id="mx-country" class="mx-sel"></select></label>
          <label><span class="mx-lbl">Gegründet ab</span><input id="mx-yfrom" class="mx-inp" style="font-size:14px;padding:9px 10px" type="number" placeholder="1990"/></label>
          <label><span class="mx-lbl">Gegründet bis</span><input id="mx-yto" class="mx-inp" style="font-size:14px;padding:9px 10px" type="number" placeholder="2010"/></label>
        </div>
      </div>
      <div id="mx-status" class="mx-status">Gib einen Bandnamen ein oder nutze die Filter.</div>
      <div id="mx-results" class="mx-results"></div>
      <div id="mx-pager" class="mx-pager">
        <button id="mx-prev" class="mx-pg">Zurück</button>
        <span id="mx-pginfo" class="mx-pginfo"></span>
        <button id="mx-next" class="mx-pg">Weiter</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const detail = document.createElement("div");
  detail.id = "mx-detail";
  detail.innerHTML = `<div class="mx-dinner" id="mx-dinner"></div>`;
  document.body.appendChild(detail);

  const $ = (id) => document.getElementById(id);
  $("mx-country").innerHTML = COUNTRIES.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");

  function openOverlay() {
    overlay.classList.add("mx-open");
    setTimeout(() => $("mx-q").focus(), 60);
  }
  launch.addEventListener("click", openOverlay);
  // Unabhängig vom Button: URL mit #mx öffnet die Oberfläche sofort.
  // Praktisch als Homescreen-Verknüpfung: https://www.metal-archives.com/#mx
  if (location.hash.toLowerCase() === "#mx") openOverlay();
  window.addEventListener("hashchange", () => {
    if (location.hash.toLowerCase() === "#mx") openOverlay();
  });
  $("mx-close").addEventListener("click", () => {
    overlay.classList.remove("mx-open");
    document.documentElement.classList.remove("mx-boot");
  });
  $("mx-ftoggle").addEventListener("click", () => $("mx-filters").classList.toggle("mx-show"));
  ["mx-genre", "mx-country", "mx-yfrom", "mx-yto"].forEach((id) =>
    $(id).addEventListener("input", () => {
      const n = ["mx-genre", "mx-country", "mx-yfrom", "mx-yto"].filter((x) => $(x).value.trim()).length;
      $("mx-fcount").textContent = n ? `(${n})` : "";
    }));
  $("mx-search").addEventListener("click", () => runSearch(0));
  $("mx-q").addEventListener("keydown", (e) => { if (e.key === "Enter") runSearch(0); });
  $("mx-prev").addEventListener("click", () => runSearch(state.start - PAGE_SIZE));
  $("mx-next").addEventListener("click", () => runSearch(state.start + PAGE_SIZE));
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (detail.classList.contains("mx-open")) detail.classList.remove("mx-open");
    else { overlay.classList.remove("mx-open"); document.documentElement.classList.remove("mx-boot"); }
  });
  detail.addEventListener("click", (e) => { if (e.target === detail) detail.classList.remove("mx-open"); });

  // ---------- Suche ----------
  const state = { start: 0, total: 0 };
  function searchPath(start) {
    const p = new URLSearchParams();
    p.set("bandName", $("mx-q").value.trim());
    p.set("exactBandMatch", "0");
    if ($("mx-genre").value.trim()) p.set("genre", $("mx-genre").value.trim());
    if ($("mx-country").value) p.append("country[]", $("mx-country").value);
    if ($("mx-yfrom").value) p.set("yearCreationFrom", $("mx-yfrom").value);
    if ($("mx-yto").value) p.set("yearCreationTo", $("mx-yto").value);
    p.set("iDisplayStart", String(Math.max(0, start)));
    p.set("sEcho", "1");
    return "/search/ajax-advanced/searching/bands/?" + p.toString();
  }

  async function runSearch(start) {
    const any = $("mx-q").value.trim() || $("mx-genre").value.trim() || $("mx-country").value || $("mx-yfrom").value || $("mx-yto").value;
    if (!any) { setStatus("Bitte mindestens ein Feld ausfüllen."); return; }
    state.start = Math.max(0, start);
    $("mx-results").innerHTML = "";
    $("mx-pager").classList.remove("mx-show");
    $("mx-status").innerHTML = `<span class="mx-spin"></span> Suche läuft …`;
    try {
      const json = extractJson(await fetchText(searchPath(state.start)));
      const bands = (json.aaData || []).map((row) => {
        const a = H(row[0]).querySelector("a");
        return {
          id: idFrom(a?.getAttribute("href")),
          name: clean(a?.textContent) || clean(H(row[0]).body.textContent),
          genre: clean(H(row[1]).body.textContent),
          country: clean(H(row[2]).body.textContent),
        };
      });
      state.total = json.iTotalRecords || bands.length;
      $("mx-results").innerHTML = bands.map((b) => `
        <button class="mx-card" data-id="${b.id}"><b>${esc(b.name)}</b>
          <div class="g">${esc(b.genre) || "—"}</div><div class="c">${esc(b.country) || "—"}</div></button>`).join("");
      $("mx-results").querySelectorAll("button[data-id]").forEach((btn) =>
        btn.addEventListener("click", () => openBand(btn.dataset.id)));
      if (!bands.length) { setStatus("Keine Treffer."); return; }
      const from = state.start + 1, to = state.start + bands.length;
      setStatus(`${state.total.toLocaleString("de-DE")} Treffer gesamt`);
      $("mx-pginfo").textContent = `${from}–${to} von ${state.total.toLocaleString("de-DE")}`;
      $("mx-prev").disabled = state.start === 0;
      $("mx-next").disabled = to >= state.total;
      $("mx-pager").classList.add("mx-show");
    } catch (err) {
      setStatus("⚠ " + err.message + " – bist du auf metal-archives.com eingeloggt/erreichst die Seite?");
    }
  }
  function setStatus(t) { $("mx-status").textContent = t; }

  // ---------- Detail ----------
  async function openBand(id) {
    if (!id || id === "null") return;
    detail.classList.add("mx-open");
    detail.scrollTo(0, 0);
    $("mx-dinner").innerHTML = `<div style="padding:64px;text-align:center"><span class="mx-spin"></span></div>`;
    try {
      const b = parseCore(id, await fetchText(`/bands/_/${id}`));
      $("mx-dinner").innerHTML = bandHtml(b);
      bindDetail();
      loadDisco(id, b.name);
      loadSimilar(id);
    } catch (err) {
      $("mx-dinner").innerHTML = `<div class="mx-dbody"><p style="color:#e0455e">⚠ ${esc(err.message)}</p>
        <button class="mx-btn2" id="mx-dclose" style="margin-top:12px">Schließen</button></div>`;
      bindDetail();
    }
  }

  function parseCore(id, pageHtml) {
    const doc = H(pageHtml);
    const f = {};
    doc.querySelectorAll("#band_stats dt, .band_stats dt").forEach((dt) => {
      const label = clean(dt.textContent).replace(/:$/, "").toLowerCase();
      const dd = dt.nextElementSibling;
      if (label && dd) f[label] = clean(dd.textContent);
    });
    const name = clean(doc.querySelector("h1.band_name a")?.textContent) ||
      clean(doc.querySelector("h1.band_name")?.textContent) ||
      doc.querySelector('meta[property="og:title"]')?.getAttribute("content") || "";
    const logo = doc.querySelector("#logo")?.getAttribute("href") || doc.querySelector("#logo img")?.getAttribute("src") || null;
    const photo = doc.querySelector("#photo")?.getAttribute("href") || doc.querySelector("#photo img")?.getAttribute("src") || null;
    let lineup = parseLineup(doc, "#band_members tr");
    if (!lineup.length) lineup = parseLineup(doc, ".lineupRow, .lineupHeaders");
    return {
      id, name, logo, photo,
      country: f["country of origin"] || "", location: f["location"] || "", status: f["status"] || "",
      formed: f["formed in"] || "", yearsActive: f["years active"] || "", genre: f["genre"] || "",
      themes: f["lyrical themes"] || f["themes"] || "", label: f["current label"] || f["last label"] || "",
      lineup,
    };
  }
  function parseLineup(doc, sel) {
    const out = []; let group = "Besetzung";
    doc.querySelectorAll(sel).forEach((tr) => {
      if (tr.classList.contains("lineupHeaders")) group = clean(tr.textContent) || group;
      else if (tr.classList.contains("lineupRow")) {
        const tds = tr.querySelectorAll("td");
        const a = tds[0]?.querySelector("a");
        const nm = clean(a?.textContent || tds[0]?.textContent);
        if (nm) out.push({ group, name: nm, role: clean(tds[1]?.textContent) });
      }
    });
    return out;
  }

  async function loadDisco(id, bandName) {
    const box = $("mx-disco"); if (!box) return;
    try {
      const albums = [];
      H(await fetchText(`/band/discography/id/${id}/tab/all`))
        .querySelectorAll("table.discog tbody tr, table.display tbody tr").forEach((tr) => {
          const tds = tr.querySelectorAll("td");
          if (tds.length < 3) return;
          const nm = clean(tds[0].textContent);
          if (!nm || /no discography/i.test(nm)) return;
          albums.push({ name: nm, type: clean(tds[1].textContent), year: clean(tds[2].textContent) });
        });
      box.innerHTML = albums.length ? `<table class="mx-tbl"><thead><tr>
          <th>Release</th><th>Typ</th><th>Jahr</th><th></th></tr></thead><tbody>${albums.map((a) => {
            const rq = encodeURIComponent(bandName + " " + a.name);
            return `<tr><td>${esc(a.name)}</td><td class="t">${esc(a.type)}</td><td class="y">${esc(a.year)}</td>
              <td style="text-align:right"><a class="mx-ytm" target="_blank" rel="noopener"
                 href="https://music.youtube.com/search?q=${rq}" title="Release bei YouTube Music suchen">▶ YTM</a></td></tr>`;
          }).join("")}</tbody></table>`
        : `<p class="mx-muted">Keine Releases gefunden.</p>`;
    } catch { box.innerHTML = `<p class="mx-muted">Diskografie konnte nicht geladen werden.</p>`; }
  }

  async function loadSimilar(id) {
    const box = $("mx-similar"); if (!box) return;
    try {
      const similar = [];
      H(await fetchText(`/band/ajax-recommendations/id/${id}`)).querySelectorAll("tbody tr, tr").forEach((tr) => {
        const a = tr.querySelector("a[href*='/bands/']"); if (!a) return;
        const tds = tr.querySelectorAll("td");
        similar.push({ id: idFrom(a.getAttribute("href")), name: clean(a.textContent),
          country: tds.length > 1 ? clean(tds[1].textContent) : "", genre: tds.length > 2 ? clean(tds[2].textContent) : "" });
      });
      box.innerHTML = similar.length ? `<div class="mx-simgrid">${similar.slice(0, 12).map((s) => `
        <button class="mx-sim" data-simid="${s.id}"><b>${esc(s.name)}</b>
          <span>${esc(s.genre)}${s.country ? " · " + esc(s.country) : ""}</span></button>`).join("")}</div>`
        : `<p class="mx-muted">Keine Empfehlungen.</p>`;
      box.querySelectorAll("button[data-simid]").forEach((btn) =>
        btn.addEventListener("click", () => { detail.scrollTo(0, 0); openBand(btn.dataset.simid); }));
    } catch { box.innerHTML = `<p class="mx-muted">Empfehlungen konnten nicht geladen werden.</p>`; }
  }

  function bandHtml(b) {
    const q = encodeURIComponent(b.name);
    const links = [
      ["Spotify", `https://open.spotify.com/search/${q}`, "#1db954"],
      ["YouTube Music", `https://music.youtube.com/search?q=${q}`, "#ff0000"],
      ["YouTube", `https://www.youtube.com/results?search_query=${q}`, "#ff0000"],
    ];
    const info = [["Land", b.country], ["Ort", b.location], ["Status", b.status], ["Gegründet", b.formed],
      ["Aktiv", b.yearsActive], ["Genre", b.genre], ["Themen", b.themes], ["Label", b.label]].filter(([, v]) => v);
    const groups = {};
    (b.lineup || []).forEach((m) => { (groups[m.group] ||= []).push(m); });
    const lineup = Object.keys(groups).length
      ? Object.entries(groups).map(([g, ms]) => `<div style="margin-bottom:12px"><div class="mx-grp">${esc(g)}</div>${ms.map((m) =>
          `<div class="mx-mem"><span class="n">${esc(m.name)}</span><span class="role">${esc(m.role)}</span></div>`).join("")}</div>`).join("")
      : `<p class="mx-muted">Keine Lineup-Daten.</p>`;
    return `
      <button class="mx-dx" id="mx-dclose">✕</button>
      <div class="mx-dbody">
        ${b.logo
          ? `<a href="${b.logo}" target="_blank" rel="noopener" title="Logo in voller Größe"><img class="mx-logo" src="${b.logo}" alt="${esc(b.name)}" referrerpolicy="no-referrer" onerror="this.parentElement.style.display='none';document.getElementById('mx-nameFb').style.display='block'"/></a>
             <h2 class="mx-name" id="mx-nameFb" style="display:none">${esc(b.name)}</h2>`
          : `<h2 class="mx-name">${esc(b.name)}</h2>`}
        ${b.photo ? `<a href="${b.photo}" target="_blank" rel="noopener" title="Foto in voller Größe"><img class="mx-photo" src="${b.photo}" alt="" referrerpolicy="no-referrer" onerror="this.parentElement.style.display='none'"/></a>` : ""}
        <div class="mx-streams">${links.map(([l, u, c]) => `<a class="mx-stream" style="background:${c}" href="${u}" target="_blank" rel="noopener">${l} ↗</a>`).join("")}</div>
        <div class="mx-info">${info.map(([k, v]) => `<div class="r"><span class="k">${k}</span><span>${esc(v)}</span></div>`).join("")}</div>
        <h3 class="mx-h3">Diskografie</h3>
        <div id="mx-disco" class="mx-tblwrap"><span class="mx-spin sm"></span> <span class="mx-muted">lädt …</span></div>
        <h3 class="mx-h3">Lineup</h3>
        <div class="mx-lineup">${lineup}</div>
        <h3 class="mx-h3">Ähnliche Bands</h3>
        <div id="mx-similar"><span class="mx-spin sm"></span> <span class="mx-muted">lädt …</span></div>
        <a class="mx-malink" href="https://www.metal-archives.com/bands/_/${b.id}" target="_blank" rel="noopener">Auf Metal Archives ansehen ↗</a>
      </div>`;
  }
  function bindDetail() {
    $("mx-dclose")?.addEventListener("click", () => detail.classList.remove("mx-open"));
  }

  // ---------- Zweite Absicherung ----------
  // Falls der Browser das Viewport-Meta ignoriert, wird die Oberflaeche hier per JS
  // exakt auf den tatsaechlich sichtbaren Bildschirmausschnitt gelegt.
  function fitToScreen() {
    const vv = window.visualViewport;
    if (!vv) return;
    const w = Math.round(vv.width), h = Math.round(vv.height);
    const l = Math.round(vv.offsetLeft), t = Math.round(vv.offsetTop);
    [overlay, detail].forEach((elm) => {
      elm.style.left = l + "px";
      elm.style.top = t + "px";
      elm.style.width = w + "px";
      elm.style.height = h + "px";
      elm.style.right = "auto";
      elm.style.bottom = "auto";
    });
    launch.style.left = (l + w - launch.offsetWidth - 14) + "px";
    launch.style.top = (t + h - launch.offsetHeight - 14) + "px";
    launch.style.right = "auto";
    launch.style.bottom = "auto";
  }
  fitToScreen();
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", fitToScreen);
    window.visualViewport.addEventListener("scroll", fitToScreen);
  }
  window.addEventListener("orientationchange", () => setTimeout(fitToScreen, 250));
  window.addEventListener("load", () => setTimeout(fitToScreen, 100));
}
})();
