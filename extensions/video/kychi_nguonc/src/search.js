load('config.js');

function execute(query, page) {
    query = query ? String(query).trim() : "";
    page = page || "1";

    if (query.indexOf("/") === 0 || query.indexOf("http") === 0) {
        return fetchListing(query, page);
    }

    let searchUrl = BASE_URL + "/api/films/search?keyword=" + encodeURIComponent(query);
    return fetchListing(searchUrl, page);
}
