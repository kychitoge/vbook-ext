load('config.js');

function execute(url) {
    url = normalizeUrl(url);

    var response = fetchPage(url);
    if (!response.ok) return Response.error('HTTP Error: ' + response.status);

    var rawHtml = response.text();
    if (!rawHtml) return Response.error('Trang trống');

    var match = rawHtml.match(/WORK_ID\s*=\s*(\d+)/i);
    if (!match) return Response.error('Không tìm thấy ID truyện');

    var workId = match[1];
    var slugMatch = rawHtml.match(/WORK_SLUG\s*=\s*['"]([^'"]+)['"]/i);
    var workSlug = slugMatch ? slugMatch[1] : '';

    if (!workSlug) {
        var clean = url.replace(BASE_URL, '').split('?')[0];
        workSlug = clean.replace(/^\/+|\/+$/g, '');
    }

    var apiUrl = BASE_URL + '/api/chapters/' + workId;
    var apiRes = fetchPage(apiUrl);
    if (!apiRes.ok) return Response.error('Không thể tải danh sách chương');

    var apiText = apiRes.text();
    if (!apiText) return Response.error('API danh sách chương trống');

    var json = JSON.parse(apiText);
    var list = (json && json.data) ? json.data : json;
    var chapters = [];

    if (list && list.length > 0) {
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            var code = (typeof item.code !== 'undefined') ? item.code : (i + 1);
            var pos = (typeof item.position !== 'undefined') ? item.position : i;
            var name = 'Chương ' + code + (item.name ? ': ' + item.name : '');
            var chapUrl = '/' + workSlug + '/' + pos + '/chuong-' + code;

            chapters.push({
                name: name,
                url: chapUrl,
                host: BASE_URL
            });
        }
    }

    return Response.success(chapters);
}
