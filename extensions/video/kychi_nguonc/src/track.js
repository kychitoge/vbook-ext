load('config.js');

/**
 * Return a User-Agent that identifies Chromium/Android rather than an
 * Edge-only Safari string (e.g. UserAgent.chrome() without Chrome/), which
 * tricks streamc.xyz into enabling its Safari branch and failing after ads.
 */
function resolvePlayerUserAgent() {
    let ua = UserAgent.system();
    if (!ua || (/safari/i.test(ua) && !/(?:Chrome|CriOS|Chromium|Android|iPhone|iPad|iPod)/i.test(ua))) {
        ua = UserAgent.android();
    }
    return ua;
}

function execute(data) {
    if (!data) return Response.error("Link trống");

    let targetUrl = String(data).trim();
    if (targetUrl.indexOf("{") === 0) {
        try {
            let parsed = JSON.parse(targetUrl);
            if (parsed && parsed.url) {
                targetUrl = String(parsed.url).trim();
            }
        } catch (e) {
        }
    }

    if (!targetUrl) return Response.error("Link trống");

    return Response.success({
        type: "webview",
        data: JSON.stringify({
            embed: targetUrl,
            data: targetUrl,
            host: BASE_URL
        }),
        host: BASE_URL,
        headers: {
            "User-Agent": resolvePlayerUserAgent(),
            "Referer": BASE_URL + "/"
        },
        timeSkip: []
    });
}
