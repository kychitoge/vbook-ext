load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    return Response.success([url]);
}
