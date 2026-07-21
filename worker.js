// Cloudflare Worker als Proxy für Metal Explorer.
// Route: Browser -> dieser Worker -> ScraperAPI (löst Cloudflare) -> Metal Archives.
// Der ScraperAPI-Key bleibt hier serverseitig und ist NICHT im Browser-Code sichtbar.

const SCRAPERAPI_KEY = "f6c8228294ded4089b9cb96662d7d177";
const RENDER = true; // Cloudflare-Challenge per Headless-Browser lösen. Kostet mehr Credits.
                     // Wenn es auch ohne klappt: auf false setzen, spart Credits.

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors() });
    }

    const target = new URL(request.url).searchParams.get("url");
    if (!target || !/^https:\/\/www\.metal-archives\.com\//.test(target)) {
      return new Response("Nur metal-archives.com erlaubt. ?url=<encoded> fehlt.", {
        status: 400, headers: cors(),
      });
    }

    const api =
      "https://api.scraperapi.com/?api_key=" + SCRAPERAPI_KEY +
      (RENDER ? "&render=true" : "") +
      "&url=" + encodeURIComponent(target);

    let upstream;
    try {
      upstream = await fetch(api);
    } catch (e) {
      return new Response("Proxy-Fehler: " + e.message, { status: 502, headers: cors() });
    }

    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        ...cors(),
        "Content-Type": upstream.headers.get("content-type") || "text/plain; charset=utf-8",
      },
    });
  },
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };
}
