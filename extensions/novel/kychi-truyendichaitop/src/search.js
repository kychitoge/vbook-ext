load('config.js');

function execute(query, pageArg) {
    var keyword = '';
    var page = '1';

    if (Array.isArray(query)) {
        keyword = query[0] || '';
        page = query[1] || '1';
    } else if (typeof query === 'string') {
        keyword = query;
        page = pageArg || '1';
    }

    keyword = String(keyword || '').trim();
    page = String(page || '1');

    var url = '';
    if (keyword.indexOf('http://') === 0 || keyword.indexOf('https://') === 0 || keyword.indexOf('/') === 0) {
        url = normalizeUrl(keyword);
    } else if (keyword) {
        url = BASE_URL + '/tim-kiem?q=' + encodeURIComponent(keyword);
    } else {
        url = BASE_URL + '/tim-kiem';
    }

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
    collectStoryCards(doc.select('.single-recommended-post'), data, seen);
    collectStoryCards(doc.select('.work-card'), data, seen);

    var next = detectNextPage(doc);

    return Response.success(data, next);
}
