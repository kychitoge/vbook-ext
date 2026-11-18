load("config.js");

function execute(url) {
    url = normalizeUrl(url);
    let response = fetchPage(url);
    if (!response.ok) return Response.error("HTTP " + response.status);

    let doc = response.html();
    if (!doc) return Response.success([]);

    let chapters = [];
    let seen = {};

    let items = doc.select("#listChapters .list-chapters .item .episode-title a, #listChapters .episode-title a, #listChapters a[href*='.html']");
    let fromListChapters = items && items.size() > 0;

    if (!fromListChapters) {
        items = doc.select("select#chapterSelect option[value], .chapter-select option[value]");
    }

    items.forEach(function (el) {
        let rawLink = (el.attr("href") + "") || buildChapterFromOption(el.attr("value") + "");
        let href = normalizeUrl(rawLink);
        if (!href || seen[href]) return;
        seen[href] = true;

        let title = cleanText(el.text() + "");
        if (!title) title = guessChapterName(href);

        chapters.push({
            name: title,
            url: href,
            description: "",
            lock: false,
            pay: false,
            host: BASE_URL
        });
    });

    // #listChapters is rendered newest-first; reversing preserves multi-volume order cleanly.
    if (fromListChapters && chapters.length > 1) {
        chapters.reverse();
    }

    return Response.success(chapters);
}

function buildChapterFromOption(raw) {
    let v = cleanText(raw);
    if (!v) return "";
    if (v.indexOf("http://") === 0 || v.indexOf("https://") === 0) return v;
    if (v.indexOf(",") >= 0) {
        let parts = v.split(",");
        if (parts.length >= 2) return "/" + parts[0] + "/" + parts[1] + ".html";
    }
    return v;
}

function guessChapterName(url) {
    let m = String(url || "").match(/\/([^\/]+)\.html/i);
    if (!m) return "Chương";
    return cleanText(m[1].replace(/[-_]+/g, " "));
}
