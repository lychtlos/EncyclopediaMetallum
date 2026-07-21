// Metal Explorer – rein statisch, läuft komplett im Browser.
// Zugriff auf Metal Archives über öffentliche CORS-Proxys (mit Fallback)
// oder einen eigenen Cloudflare-Worker (unter ⚙ eintragbar).

const MA = "https://www.metal-archives.com";
const PAGE_SIZE = 200;

// ---- Proxy-Schicht ----
// Reihenfolge = Priorität. {url}-Platzhalter wird durch die enkodierte MA-URL ersetzt.
const PUBLIC_PROXIES = [
  "https://api.allorigins.win/raw?url={url}",
  "https://corsproxy.io/?url={url}",
  "https://thingproxy.freeboard.io/fetch/{raw}",
];

function customProxy() {
  return (localStorage.getItem("ma_proxy") || "").trim();
}

function buildAttempts(maUrl) {
  const enc = encodeURIComponent(maUrl);
  const list = [];
  const cp = customProxy();
  if (cp) {
    // Eigener Proxy/Worker: erwartet ?url=<encoded>
    list.push(cp + (cp.includes("?") ? "&" : "?") + "url=" + enc);
  }
  for (const tpl of PUBLIC_PROXIES) {
    list.push(tpl.replace("{url}", enc).replace("{raw}", maUrl));
  }
  return list;
}

async function maFetch(maUrl) {
  let lastErr;
  for (const reqUrl of buildAttempts(maUrl)) {
    try {
      const res = await fetch(reqUrl, { headers: { Accept: "application/json, text/html, */*" } });
      if (!res.ok) { lastErr = new Error("HTTP " + res.status); continue; }
      const text = await res.text();
      if (text && text.length > 0) return text;
      lastErr = new Error("Leere Antwort");
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(
    "Kein Proxy erreichbar (evtl. Cloudflare-Block oder Proxy down). " +
    "Unter ⚙ einen eigenen Cloudflare-Worker eintragen hilft. Details: " +
    (lastErr ? lastErr.message : "unbekannt")
  );
}

// ---- Parsing-Helfer (DOMParser statt cheerio) ----
const parser = new DOMParser();
const html = (s) => parser.parseFromString(s || "", "text/html");
const idFromHref = (h) => (h || "").match(/\/(\d+)(?:[#?].*)?$/)?.[1] || null;
const clean = (s) => (s || "").replace(/\s+/g, " ").trim();

// ---- DOM-Kurzform + State ----
const el = (id) => document.getElementById(id);
const state = { start: 0, total: 0 };

const COUNTRIES = [
  ["", "Alle Länder"], ["US", "USA"], ["DE", "Deutschland"], ["NO", "Norwegen"],
  ["SE", "Schweden"], ["FI", "Finnland"], ["GB", "Großbritannien"], ["FR", "Frankreich"],
  ["IT", "Italien"], ["NL", "Niederlande"], ["PL", "Polen"], ["CA", "Kanada"],
  ["BR", "Brasilien"], ["JP", "Japan"], ["AU", "Australien"], ["ES", "Spanien"],
  ["BE", "Belgien"], ["DK", "Dänemark"], ["CH", "Schweiz"], ["AT", "Österreich"],
  ["GR", "Griechenland"], ["RU", "Russland"], ["CZ", "Tschechien"], ["PT", "Portugal"],
  ["IS", "Island"], ["UA", "Ukraine"], ["MX", "Mexiko"], ["CL", "Chile"], ["HU", "Ungarn"],
];
el("country").innerHTML = COUNTRIES.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");

// ---- Proxy-Einstellungen (⚙) ----
el("settingsBtn").addEventListener("click", () => el("settings").classList.toggle("hidden"));
el("proxyInput").value = customProxy();
el("proxySave").addEventListener("click", () => {
  const v = el("proxyInput").value.trim();
  if (v) localStorage.setItem("ma_proxy", v); else localStorage.removeItem("ma_proxy");
  el("settings").classList.add("hidden");
  setStatus(v ? "Eigener Proxy gespeichert." : "Eigener Proxy entfernt – nutze öffentliche Proxys.");
});

// ---- Filter-UI ----
el("filterToggle").addEventListener("click", () => el("filters").classList.toggle("hidden"));
["genre", "country", "yearFrom", "yearTo"].forEach((id) =>
  el(id).addEventListener("input", () => {
    const n = ["genre", "country", "yearFrom", "yearTo"].filter((x) => el(x).value.trim()).length;
    el("filterCount").textContent = n ? `(${n})` : "";
  })
);

el("searchBtn").addEventListener("click", () => runSearch(0));
el("q").addEventListener("keydown", (e) => { if (e.key === "Enter") runSearch(0); });
el("prevBtn").addEventListener("click", () => runSearch(state.start - PAGE_SIZE));
el("nextBtn").addEventListener("click", () => runSearch(state.start + PAGE_SIZE));

// ---- Suche ----
function searchUrl(start) {
  const p = new URLSearchParams();
  p.set("bandName", el("q").value.trim());
  p.set("exactBandMatch", "0");
  if (el("genre").value.trim()) p.set("genre", el("genre").value.trim());
  if (el("country").value) p.append("country[]", el("country").value);
  if (el("yearFrom").value) p.set("yearCreationFrom", el("yearFrom").value);
  if (el("yearTo").value) p.set("yearCreationTo", el("yearTo").value);
  p.set("iDisplayStart", String(Math.max(0, start)));
  p.set("sEcho", "1");
  return `${MA}/search/ajax-advanced/searching/bands/?${p.toString()}`;
}

async function runSearch(start) {
  const anyInput = el("q").value.trim() || el("genre").value.trim() || el("country").value ||
    el("yearFrom").value || el("yearTo").value;
  if (!anyInput) { setStatus("Bitte mindestens ein Feld ausfüllen."); return; }

  state.start = Math.max(0, start);
  el("results").innerHTML = "";
  el("pager").classList.add("hidden");
  setSpinner("Suche läuft …");

  try {
    const raw = await maFetch(searchUrl(state.start));
    let json;
    try { json = JSON.parse(raw); }
    catch { throw new Error("Unerwartete Antwort (kein JSON) – Proxy liefert evtl. eine Fehlerseite."); }

    const bands = (json.aaData || []).map((row) => {
      const a = html(row[0]).querySelector("a");
      return {
        id: idFromHref(a?.getAttribute("href")),
        name: clean(a?.textContent) || clean(html(row[0]).body.textContent),
        genre: clean(html(row[1]).body.textContent),
        country: clean(html(row[2]).body.textContent),
      };
    });

    state.total = json.iTotalRecords || bands.length;
    renderResults(bands);

    if (!bands.length) {
      setStatus("Keine Treffer.");
    } else {
      const from = state.start + 1, to = state.start + bands.length;
      setStatus(`${state.total.toLocaleString("de-DE")} Treffer gesamt`);
      el("pageInfo").textContent = `${from}–${to} von ${state.total.toLocaleString("de-DE")}`;
      el("prevBtn").disabled = state.start === 0;
      el("nextBtn").disabled = to >= state.total;
      el("pager").classList.remove("hidden");
      el("pager").classList.add("flex");
    }
  } catch (err) {
    setStatus("⚠ " + err.message);
  }
}

function renderResults(bands) {
  el("results").innerHTML = bands.map((b) => `
    <button data-id="${b.id}" class="link-card panel text-left p-4 rounded transition fade">
      <div class="display text-lg font-600 mb-1">${esc(b.name)}</div>
      <div class="text-sm mb-1" style="color: var(--bone);">${esc(b.genre) || "—"}</div>
      <div class="text-xs" style="color: var(--muted);">${esc(b.country) || "—"}</div>
    </button>`).join("");
  el("results").querySelectorAll("button[data-id]").forEach((btn) =>
    btn.addEventListener("click", () => openBand(btn.dataset.id)));
}

// ---- Detailansicht ----
async function openBand(id) {
  if (!id || id === "null") return;
  el("detail").classList.remove("hidden");
  el("detailInner").innerHTML = `<div class="p-16 flex justify-center"><div class="spinner"></div></div>`;

  try {
    const [pageHtml, discoHtml, membersHtml, recoHtml] = await Promise.all([
      maFetch(`${MA}/bands/_/${id}`),
      maFetch(`${MA}/band/discography/id/${id}/tab/all`),
      maFetch(`${MA}/band/view/members/all/id/${id}`).catch(() => ""),
      maFetch(`${MA}/band/ajax-recommendations/id/${id}`).catch(() => ""),
    ]);
    el("detailInner").innerHTML = bandHtml(parseBand(id, pageHtml, discoHtml, membersHtml, recoHtml));
    bindDetail();
  } catch (err) {
    el("detailInner").innerHTML = `
      <div class="p-8">
        <p class="mb-4" style="color: var(--accent-soft);">⚠ ${esc(err.message)}</p>
        <button id="closeDetail" class="panel-2 px-4 py-2 rounded text-sm">Schließen</button>
      </div>`;
    bindDetail();
  }
}

function parseBand(id, pageHtml, discoHtml, membersHtml, recoHtml) {
  const doc = html(pageHtml);
  const fields = {};
  doc.querySelectorAll("#band_stats dt, .band_stats dt").forEach((dt) => {
    const label = clean(dt.textContent).replace(/:$/, "").toLowerCase();
    const dd = dt.nextElementSibling;
    if (label && dd) fields[label] = clean(dd.textContent);
  });

  const name =
    clean(doc.querySelector("h1.band_name a")?.textContent) ||
    clean(doc.querySelector("h1.band_name")?.textContent) ||
    doc.querySelector('meta[property="og:title"]')?.getAttribute("content") || "";

  const logo = doc.querySelector("#logo")?.getAttribute("href") ||
    doc.querySelector("#logo img")?.getAttribute("src") || null;
  const photo = doc.querySelector("#photo")?.getAttribute("href") ||
    doc.querySelector("#photo img")?.getAttribute("src") || null;

  // Diskografie + Reviews
  const albums = [];
  html(discoHtml).querySelectorAll("table.discog tbody tr, table.display tbody tr").forEach((tr) => {
    const tds = tr.querySelectorAll("td");
    if (tds.length < 3) return;
    const nm = clean(tds[0].textContent);
    if (!nm || /no discography/i.test(nm)) return;
    const rv = tds.length > 3 ? clean(tds[3].textContent) : "";
    albums.push({
      name: nm, type: clean(tds[1].textContent), year: clean(tds[2].textContent),
      reviewCount: rv.match(/(\d+)/) ? Number(rv.match(/(\d+)/)[1]) : 0,
      reviewScore: rv.match(/(\d{1,3})\s*%/) ? Number(rv.match(/(\d{1,3})\s*%/)[1]) : null,
      reviewUrl: tds.length > 3 ? tds[3].querySelector("a")?.getAttribute("href") || null : null,
    });
  });

  // Lineup (gruppiert)
  const lineup = [];
  if (membersHtml) {
    let group = "Lineup";
    html(membersHtml).querySelectorAll("tr").forEach((tr) => {
      if (tr.classList.contains("lineupHeaders")) group = clean(tr.textContent) || group;
      else if (tr.classList.contains("lineupRow")) {
        const tds = tr.querySelectorAll("td");
        const a = tds[0]?.querySelector("a");
        const nm = clean(a?.textContent || tds[0]?.textContent);
        if (nm) lineup.push({ group, name: nm, role: clean(tds[1]?.textContent) });
      }
    });
  }

  // Ähnliche Bands
  const similar = [];
  if (recoHtml) {
    html(recoHtml).querySelectorAll("tbody tr, tr").forEach((tr) => {
      const a = tr.querySelector("a[href*='/bands/']");
      if (!a) return;
      const tds = tr.querySelectorAll("td");
      similar.push({
        id: idFromHref(a.getAttribute("href")), name: clean(a.textContent),
        country: tds.length > 1 ? clean(tds[1].textContent) : "",
        genre: tds.length > 2 ? clean(tds[2].textContent) : "",
      });
    });
  }

  return {
    id, name, logo, photo,
    country: fields["country of origin"] || "", location: fields["location"] || "",
    status: fields["status"] || "", formed: fields["formed in"] || "",
    yearsActive: fields["years active"] || "", genre: fields["genre"] || "",
    themes: fields["lyrical themes"] || fields["themes"] || "",
    label: fields["current label"] || fields["last label"] || "",
    url: `${MA}/bands/_/${id}`, albums, lineup, similar,
  };
}

function bandHtml(b) {
  const q = encodeURIComponent(b.name);
  const links = [
    ["Spotify", `https://open.spotify.com/search/${q}`, "#1db954"],
    ["YouTube Music", `https://music.youtube.com/search?q=${q}`, "#ff0000"],
    ["YouTube", `https://www.youtube.com/results?search_query=${q}`, "#ff0000"],
  ];
  const infoRows = [
    ["Land", b.country], ["Ort", b.location], ["Status", b.status],
    ["Gegründet", b.formed], ["Aktiv", b.yearsActive], ["Genre", b.genre],
    ["Themen", b.themes], ["Label", b.label],
  ].filter(([, v]) => v);

  const albums = b.albums.length
    ? `<table class="w-full text-sm">
         <thead><tr style="color: var(--muted);" class="text-left border-b">
           <th class="py-2 pr-3 font-500">Release</th><th class="py-2 pr-3 font-500">Typ</th>
           <th class="py-2 pr-3 font-500">Jahr</th><th class="py-2 font-500">Reviews</th>
         </tr></thead><tbody>${b.albums.map((a) => `
           <tr class="border-b" style="border-color: var(--border);">
             <td class="py-2 pr-3">${esc(a.name)}</td>
             <td class="py-2 pr-3" style="color: var(--bone);">${esc(a.type)}</td>
             <td class="py-2 pr-3" style="color: var(--muted);">${esc(a.year)}</td>
             <td class="py-2">${reviewBadge(a)}</td>
           </tr>`).join("")}</tbody></table>`
    : `<p class="text-sm" style="color: var(--muted);">Keine Releases gefunden.</p>`;

  const groups = {};
  (b.lineup || []).forEach((m) => { (groups[m.group] ||= []).push(m); });
  const lineup = Object.keys(groups).length
    ? Object.entries(groups).map(([g, ms]) => `
        <div class="mb-3">
          <div class="text-xs uppercase tracking-wide mb-1" style="color: var(--muted);">${esc(g)}</div>
          <ul class="space-y-1">${ms.map((m) => `
            <li class="text-sm flex flex-col sm:flex-row sm:gap-2">
              <span class="font-500 sm:w-48 shrink-0">${esc(m.name)}</span>
              <span style="color: var(--bone);">${esc(m.role)}</span>
            </li>`).join("")}</ul>
        </div>`).join("")
    : `<p class="text-sm" style="color: var(--muted);">Keine Lineup-Daten.</p>`;

  const similar = (b.similar || []).length
    ? `<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${b.similar.slice(0, 12).map((s) => `
         <button data-simid="${s.id}" class="link-card panel-2 text-left px-3 py-2 rounded transition">
           <div class="font-500 text-sm">${esc(s.name)}</div>
           <div class="text-xs" style="color: var(--muted);">${esc(s.genre)}${s.country ? " · " + esc(s.country) : ""}</div>
         </button>`).join("")}</div>`
    : `<p class="text-sm" style="color: var(--muted);">Keine Empfehlungen.</p>`;

  return `
    <div class="relative">
      <button id="closeDetail" class="sticky top-0 float-right m-3 z-10 w-9 h-9 rounded-full panel-2 flex items-center justify-center hover:brightness-125">✕</button>
      ${b.photo ? `<div class="w-full h-48 sm:h-56 bg-black overflow-hidden">
        <img src="${b.photo}" alt="" class="w-full h-full object-cover opacity-90" referrerpolicy="no-referrer" onerror="this.parentElement.style.display='none'"/></div>` : ""}
      <div class="p-5 sm:p-6">
        ${b.logo
          ? `<img src="${b.logo}" alt="${esc(b.name)}" class="max-h-16 sm:max-h-20 mb-4" referrerpolicy="no-referrer" onerror="this.style.display='none';document.getElementById('nameFb').style.display='block'"/>
             <h2 id="nameFb" class="display text-2xl sm:text-3xl font-700 mb-4" style="display:none;">${esc(b.name)}</h2>`
          : `<h2 class="display text-2xl sm:text-3xl font-700 mb-4">${esc(b.name)}</h2>`}
        <div class="flex flex-wrap gap-2 sm:gap-3 mb-6">
          ${links.map(([label, url, color]) => `
            <a href="${url}" target="_blank" rel="noopener"
               class="px-4 py-2 rounded text-sm font-600 hover:brightness-110"
               style="background:${color}; color:#fff;">${label} ↗</a>`).join("")}
        </div>
        <div class="panel-2 rounded p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          ${infoRows.map(([k, v]) => `
            <div class="flex gap-2"><span class="w-24 shrink-0" style="color: var(--muted);">${k}</span><span>${esc(v)}</span></div>`).join("")}
        </div>
        <h3 class="display text-lg font-600 mb-2">Lineup</h3>
        <div class="panel-2 rounded p-4 mb-6">${lineup}</div>
        <h3 class="display text-lg font-600 mb-2">Diskografie</h3>
        <div class="overflow-x-auto mb-6">${albums}</div>
        <h3 class="display text-lg font-600 mb-2">Ähnliche Bands</h3>
        <div class="mb-2">${similar}</div>
        <div class="mt-6 pt-4" style="border-top: 1px solid var(--border);">
          <a href="${b.url}" target="_blank" rel="noopener" class="text-sm" style="color: var(--muted);">Auf Metal Archives ansehen ↗</a>
        </div>
      </div>
    </div>`;
}

function reviewBadge(a) {
  if (a.reviewScore == null && !a.reviewCount) return `<span style="color: var(--muted);">—</span>`;
  const color = a.reviewScore == null ? "var(--muted)"
    : a.reviewScore >= 75 ? "#3fb950" : a.reviewScore >= 50 ? "#d8d4c8" : "var(--accent-soft)";
  const label = (a.reviewScore != null ? a.reviewScore + "% " : "") + "(" + a.reviewCount + ")";
  const inner = `<span style="color:${color};" class="font-500">${label}</span>`;
  return a.reviewUrl ? `<a href="${a.reviewUrl}" target="_blank" rel="noopener">${inner}</a>` : inner;
}

function bindDetail() {
  const close = () => el("detail").classList.add("hidden");
  el("closeDetail")?.addEventListener("click", close);
  el("detail").addEventListener("click", (e) => { if (e.target === el("detail")) close(); });
  el("detailInner").querySelectorAll("button[data-simid]").forEach((b) =>
    b.addEventListener("click", () => { el("detail").scrollTo(0, 0); openBand(b.dataset.simid); }));
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape") el("detail").classList.add("hidden"); });

// ---- Helfer ----
function setStatus(t) { el("status").textContent = t; }
function setSpinner(t) {
  el("status").innerHTML = `<span class="inline-flex items-center gap-2 justify-center"><span class="spinner"></span>${t}</span>`;
}
function esc(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
