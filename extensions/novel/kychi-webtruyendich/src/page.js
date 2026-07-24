load("config.js");

function execute(url) {
    url = normalizeUrl(url);
    var pages = [url];
    return Response.success(pages);
}
