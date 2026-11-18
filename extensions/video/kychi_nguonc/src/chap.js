load('config.js');

function execute(url) {
    if (!url) return Response.error("Link trống");

    url = String(url).trim();
    return Response.success([
        {
            title: "WebView Player",
            data: url
        }
    ]);
}
