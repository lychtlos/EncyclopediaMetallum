// Cloudflare Worker als Proxy für Metal Explorer.
// Browser -> Worker -> ScraperAPI (löst Cloudflare) -> Metal Archives.
// Key bleibt serverseitig. Mit Cache: einmal geholte URLs kommen danach sofort.

const SCRAPERAPI_KEY = "f6c8228294ded4089b9cb96662d7d177";
const RENDER = false;      // Cloudflare per Headless-Browser lösen (langsam/teurer).
                          // TIPP: einmal auf false testen – wenn Suche klappt, so lassen (viel schneller).
const CACHE_SECONDS = 21600; // 6 h Cache pro URL

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors() });

    const target = new URL(request.url).searchParams.get("url");
    if (!target || !/^https:\/\/www\.metal-archives\.com\//.test(target)) {
      return new Response("Nur metal-archives.com erlaubt. ?url=<encoded> fehlt.", { status: 400, headers: cors() });
    }

    const cache = caches.default;
    const cacheKey = new Request("https://ma-cache/" + encodeURIComponent(target));
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const api = "https://api.scraperapi.com/?api_key=" + SCRAPERAPI_KEY +
      (RENDER ? "&render=true" : "") + "&url=" + encodeURIComponent(target);

    let upstream;
    try { upstream = await fetch(api); }
    catch (e) { return new Response("Proxy-Fehler: " + e.message, { status: 502, headers: cors() }); }

    const body = await upstream.text();
    const looksBlocked = /Just a moment|challenge-platform|Sicherheitsüberprüfung|cf-browser-verification/i.test(body);

    const res = new Response(body, {
      status: upstream.status,
      headers: {
        ...cors(),
        "Content-Type": upstream.headers.get("content-type") || "text/plain; charset=utf-8",
        "Cache-Control": "max-age=" + CACHE_SECONDS,
      },
    });

    // nur echte, brauchbare Antworten cachen
    if (upstream.status === 200 && !looksBlocked) {
      ctx.waitUntil(cache.put(cacheKey, res.clone()));
    }
    return res;
  },
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };
}
