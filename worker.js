// Cloudflare Worker als CORS-Proxy für Metal Explorer.
// Einrichtung ohne Installation über das Cloudflare-Dashboard (siehe README).
export default {
  async fetch(request) {
    const inUrl = new URL(request.url);

    // CORS-Preflight beantworten
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors() });
    }

    const target = inUrl.searchParams.get("url");
    if (!target || !/^https:\/\/www\.metal-archives\.com\//.test(target)) {
      return new Response("Nur metal-archives.com erlaubt. ?url=<encoded> fehlt.", {
        status: 400, headers: cors(),
      });
    }

    const upstream = await fetch(target, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        "Accept": "application/json, text/html, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://www.metal-archives.com/",
      },
    });

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
