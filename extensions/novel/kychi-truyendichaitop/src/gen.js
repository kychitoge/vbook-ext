load('config.js');

function execute(url, page) {
    if (typeof input !== 'undefined' && input) {
        if (Array.isArray(input)) {
            url = input[0];
            page = input[1];
        } else if (typeof input === 'string') {
            url = input;
        }
    }

    url = normalizeUrl(url);
    page = page || '1';
    url = buildPageUrl(url, page);

    var response = fetchPage(url);
    if (!response.ok) return Response.error('HTTP Error: ' + response.status);

    var rawHtml = response.text();
    if (!rawHtml) return Response.error('Trang trống');

    var doc = Html.parse(rawHtml);
    if (!doc) return Response.error('Không thể parse HTML');

    var data = [];
    var seen = {};

    collectStoryCards(doc.select('.single-trending-work'), data, seen);
    collectStoryCards(doc.select('.work-card'), data, seen);

    var next = detectNextPage(doc);

    return Response.success(data, next);
}
