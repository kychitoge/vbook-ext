load('config.js');
function execute(url, page) {
    if (!url) return Response.success([]);
    if (!page) page = '1';

    var fetchUrl = normalizeUrl(url);
    if (page !== '1') fetchUrl = fetchUrl.replace(/([?&])page=\d+/, '') + (fetchUrl.indexOf('?') >= 0 ? '&' : '?') + 'page=' + page;

    var response = fetchPage(fetchUrl);
    if (!response.ok) return Response.error('Lỗi tải trang');

    var doc = response.html();
    var data = [];

    doc.select('.info-mobile-card').forEach(function(e) {
        var a = e.select('.name a').first();
        if (!a) return;
        var name = a.attr('title') || cleanText(a.text());
        var link = a.attr('href');
        if (!name || !link) return;
        var img = e.select('.info-image img').first();
        var cover = img ? (img.attr('src') || '') : '';
        var authorA = e.select('.author a').first();
        var author = authorA ? cleanText(authorA.text()) : '';
        data.push({ name: name, title: name, link: normalizeUrl(link), cover: cover, description: author, host: BASE_URL });
    });

    var next = '';
    if (data.length > 0) {
        var nextEl = doc.select('.custom-pagination-list .nav-next a, .pagination .nav-next a, .pagination li.active + li a').first();
        if (nextEl) {
            var m = (nextEl.attr('href') || '').match(/page=(\d+)/);
            next = m ? m[1] : String(parseInt(page, 10) + 1);
        }
    }

    return Response.success(data, next);
}
