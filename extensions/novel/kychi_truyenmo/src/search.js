load("config.js");

function execute(query, page) {
    query = String(query || "").trim();
    page = String(page || "1").trim() || "1";
    if (!query) return Response.success([], "");

    let targetUrl;
    if (query.indexOf("/") === 0 || query.indexOf("http://") === 0 || query.indexOf("https://") === 0) {
        let baseUrl = query === "/" ? BASE_URL : normalizeUrl(query);
        targetUrl = buildPageUrl(baseUrl, page);
    } else {
        let searchUrl = BASE_URL + "/tim-kiem?search=" + encodeURIComponent(query).replace(/%20/g, "+");
        targetUrl = buildPageUrl(searchUrl, page);
    }

    let response = fetchPage(targetUrl);
    if (!response.ok) return Response.error("HTTP " + response.status);

    let doc = response.html();
    if (!doc) return Response.success([], "");

    let data = [];
    let seen = {};

    collectStoryCards(doc.select(".single-story-block"), data, seen);
    collectStoryCards(doc.select(".row.product-grid > div"), data, seen);

    let next = data.length > 0 ? detectNextPage(doc, page) : "";
    return Response.success(data, next);
}
