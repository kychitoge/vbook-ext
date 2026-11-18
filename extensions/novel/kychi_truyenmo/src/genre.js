load("config.js");

function execute() {
    let response = fetchPage(BASE_URL);
    if (!response.ok) return Response.error("HTTP " + response.status);

    let doc = response.html();
    if (!doc) return Response.success([]);

    let data = [];
    let seen = {};

    doc.select(".list-story-categories .show-list-categories a[href*='/the-loai/'], .dropdown-menu a.dropdown-item[href*='/the-loai/'], .list-categories .item-category a[href*='/the-loai/']").forEach(function (a) {
        let href = normalizeUrl(a.attr("href") + "");
        if (!href || seen[href]) return;
        seen[href] = true;

        let title = cleanText(a.text() + "");
        if (!title) return;

        data.push({
            title: title,
            input: href,
            script: "search.js"
        });
    });

    return Response.success(data);
}
