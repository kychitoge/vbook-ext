load('config.js');
function execute(url, page) {
    if (!url) return Response.success([]);
    if (url === 'notice' || url.indexOf('notice') >= 0) {
        return Response.success([
            {
                name: 'lưu ý bật vpn 1111 lên để sử dụng',
                title: 'lưu ý bật vpn 1111 lên để sử dụng',
                link: BASE_URL,
                cover: '',
                description: 'Vui lòng bật 1.1.1.1 (Cloudflare WARP) nếu bị chặn hoặc không tải được dữ liệu.',
                host: BASE_URL
            }
        ]);
    }
    if (!page) page = '1';

    var fetchUrl = normalizeUrl(url);
    if (page !== '1') fetchUrl = fetchUrl.replace(/([?&])page=\d+/, '') + (fetchUrl.indexOf('?') >= 0 ? '&' : '?') + 'page=' + page;

    var response = fetchPage(fetchUrl);
    if (!response.ok) return Response.error('Lỗi tải trang');

    var doc = response.html();
    var data = [];
    var seen = {};

    // 1. Target .comic-card elements (Hot stories, VIP stories, sliders, grids)
    var comicCards = doc.select('.comic-card');
    for (var i = 0; i < comicCards.size(); i++) {
        var e = comicCards.get(i);
        var a = e.select('.comic-title a, a[itemprop="url"]').first();
        if (!a) a = e.select('a').first();
        if (!a) continue;

        var nameEl = e.select('.comic-title h3, h3[itemprop="name"], h3').first();
        var name = nameEl ? cleanText(nameEl.text()) : cleanText(a.attr('title') || a.text());
        var link = a.attr('href');
        if (!name || !link) continue;
        var fullLink = normalizeUrl(link);
        if (seen[fullLink]) continue;
        seen[fullLink] = true;

        var img = e.select('img.item-img, img[itemprop="image"], img').first();
        var cover = img ? (img.attr('src') || img.attr('data-src') || img.attr('data-image') || '') : '';
        var authorEl = e.select('.author, .view-overlay').first();
        var author = authorEl ? cleanText(authorEl.text()) : '';

        data.push({ name: name, title: name, link: fullLink, cover: cover, description: author, host: BASE_URL });
    }

    // 2. Target .list-truyen .row / .list-new .row elements (Newly updated stories list)
    var listRows = doc.select('.list-truyen .row, .list-new .row, .col-truyen-main .row');
    for (var j = 0; j < listRows.size(); j++) {
        var e2 = listRows.get(j);
        var a2 = e2.select('.home-new-comic-title a, .col-title a, a[itemprop="url"]').first();
        if (!a2) continue;

        var name2 = cleanText(a2.attr('title') || a2.text());
        var link2 = a2.attr('href');
        if (!name2 || !link2) continue;
        var fullLink2 = normalizeUrl(link2);
        if (seen[fullLink2]) continue;
        seen[fullLink2] = true;

        var chapEl = e2.select('.col-chap a, .chapter-text').first();
        var chapText = chapEl ? cleanText(chapEl.text()) : '';
        var timeEl = e2.select('.col-time').first();
        var timeText = timeEl ? cleanText(timeEl.text()) : '';
        var desc = chapText;
        if (timeText) desc = desc ? (desc + ' • ' + timeText) : timeText;

        data.push({ name: name2, title: name2, link: fullLink2, cover: '', description: desc, host: BASE_URL });
    }

    // 3. Fallback for classic .info-mobile-card elements
    var infoCards = doc.select('.info-mobile-card');
    for (var k = 0; k < infoCards.size(); k++) {
        var e3 = infoCards.get(k);
        var a3 = e3.select('.name a').first();
        if (!a3) continue;
        var name3 = a3.attr('title') || cleanText(a3.text());
        var link3 = a3.attr('href');
        if (!name3 || !link3) continue;
        var fullLink3 = normalizeUrl(link3);
        if (seen[fullLink3]) continue;
        seen[fullLink3] = true;

        var img3 = e3.select('.info-image img, img').first();
        var cover3 = img3 ? (img3.attr('src') || img3.attr('data-src') || '') : '';
        var authorA3 = e3.select('.author a, .author').first();
        var author3 = authorA3 ? cleanText(authorA3.text()) : '';

        data.push({ name: name3, title: name3, link: fullLink3, cover: cover3, description: author3, host: BASE_URL });
    }

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
