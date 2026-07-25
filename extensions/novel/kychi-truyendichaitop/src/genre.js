load('config.js');

function execute() {
    var url = BASE_URL + '/danh-muc';
    var response = fetchPage(url);
    var genres = [];
    var seen = {};

    if (response.ok) {
        var rawHtml = response.text();
        if (rawHtml) {
            var doc = Html.parse(rawHtml);
            if (doc) {
                doc.select("a[href*='/danh-muc/']").forEach(function(e) {
                    var name = cleanText(e.text());
                    var href = e.attr('href');
                    if (name && href) {
                        name = name.replace(/\(\d+\)/g, '').trim();
                        href = normalizeUrl(href);
                        if (!seen[href]) {
                            seen[href] = true;
                            genres.push({
                                title: name,
                                input: href,
                                script: 'gen.js'
                            });
                        }
                    }
                });
            }
        }
    }

    if (!genres.length) {
        genres = [
            { title: 'Ngôn tình', input: BASE_URL + '/danh-muc/ngon-tinh', script: 'gen.js' },
            { title: 'Huyền huyễn', input: BASE_URL + '/danh-muc/huyen-huyen', script: 'gen.js' },
            { title: 'Kỳ ảo', input: BASE_URL + '/danh-muc/ky-ao', script: 'gen.js' },
            { title: 'Khoa huyễn', input: BASE_URL + '/danh-muc/khoa-huyen', script: 'gen.js' },
            { title: 'Đô thị', input: BASE_URL + '/danh-muc/do-thi', script: 'gen.js' },
            { title: 'Tiên hiệp', input: BASE_URL + '/danh-muc/tien-hiep', script: 'gen.js' },
            { title: 'Linh dị', input: BASE_URL + '/danh-muc/linh-di', script: 'gen.js' },
            { title: 'Võng du', input: BASE_URL + '/danh-muc/vong-du', script: 'gen.js' },
            { title: 'Đam mỹ', input: BASE_URL + '/danh-muc/dam-my', script: 'gen.js' }
        ];
    }

    return Response.success(genres);
}
