load('config.js');

function execute(url) {
    var listchapter = [];
    var normalizedUrl = normalizeUrl(url);
    var response = fetchWithFallback(normalizedUrl);

    if (response.ok) {
        var html = response.text();
        listchapter = extractChaptersFromHtml(html, normalizedUrl);
    }

    if (listchapter.length === 0) {
        var apiUrl = buildApiUrl(url, BASE_URL);
        if (apiUrl) {
            var apiResp = fetchWithFallback(apiUrl);
            if (apiResp.ok) {
                try {
                    var json = JSON.parse(apiResp.text());
                    var chapters = json.chapters || [];
                    chapters.forEach(function(e) {
                        listchapter.push({
                            name: e.name,
                            url: "/doc-truyen/" + e.slug + "-" + e.id,
                            host: BASE_URL
                        });
                    });
                } catch (e) {}
            }
        }
    }

    return Response.success(listchapter);
}

function extractChaptersFromHtml(html, pageUrl) {
    var chapters = [];
    var seen = {};

    function addChap(name, url, id) {
        if (!name || !url) return;
        url = String(url).trim();
        if (url.indexOf('/doc-truyen/') !== 0 && url.indexOf('http') !== 0) {
            if (url.indexOf('doc-truyen/') === 0) url = '/' + url;
            else return;
        }
        if (seen[url]) return;
        seen[url] = true;

        var num = 0;
        var numMatch = name.match(/Chương\s+(\d+)/i) || url.match(/chuong-(\d+)/i);
        if (numMatch) {
            num = parseInt(numMatch[1], 10);
        }

        chapters.push({
            name: name.trim(),
            url: url,
            host: BASE_URL,
            num: num,
            id: id ? parseInt(id, 10) : 0
        });
    }

    var storySlug = pageUrl.replace(/^https?:\/\/[^\/]+/i, '').replace(/^\/truyen\//i, '').replace(/\/.*$/, '').trim();

    // 1. Extract from Next.js RSC stream payload (contains full chapter data)
    var rscRegex = /self\.__next_f\.push\(\[1,"((?:\\.|[^"\\])*)"\]\)/g;
    var match;
    while ((match = rscRegex.exec(html)) !== null) {
        var raw = match[1];
        var decoded = '';
        try {
            decoded = JSON.parse('"' + raw + '"');
        } catch (e) {
            continue;
        }

        var chapObjRegex = /\{"id":(\d+),"name":"([^"]+)","slug":"([^"]+)"\}/g;
        var mObj;
        while ((mObj = chapObjRegex.exec(decoded)) !== null) {
            var id = mObj[1];
            var name = mObj[2];
            var slug = mObj[3];
            var chapUrl = '/doc-truyen/';
            if (storySlug && slug.indexOf(storySlug) === -1) {
                chapUrl += storySlug + '-' + slug + '-' + id;
            } else {
                chapUrl += slug + '-' + id;
            }
            addChap(name, chapUrl, id);
        }
    }

    // 2. Extract <a> tags with href containing /doc-truyen/ as fallback
    var aRegex = /<a[^>]*href="(\/doc-truyen\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    while ((match = aRegex.exec(html)) !== null) {
        var href = match[1];
        var title = match[2].replace(/<[^>]+>/g, '').trim();
        if (title && title !== 'Đọc ngay' && title !== 'Đọc tiếp') {
            addChap(title, href, 0);
        }
    }

    chapters.sort(function(a, b) {
        if (a.num && b.num && a.num !== b.num) return a.num - b.num;
        if (a.id && b.id && a.id !== b.id) return a.id - b.id;
        return 0;
    });

    return chapters.map(function(item) {
        return {
            name: item.name,
            url: item.url,
            host: item.host
        };
    });
}

function buildApiUrl(url, baseUrl) {
    if (!url) return null;
    if (url.indexOf('/novels/') >= 0 && url.indexOf('/chapters') >= 0) return url;
    var normalized = url;
    if (normalized.indexOf('http') !== 0) {
        normalized = baseUrl + normalized;
    }
    normalized = normalized.replace(
        /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img,
        BASE_URL
    );
    var response = fetchWithFallback(normalized);
    if (!response.ok) return null;
    var html = response.text();
    var storyId = extractStoryId(html);
    if (!storyId) return null;
    var pageMatch = url.match(/[?&]page=(\d+)/);
    var pageNum = pageMatch ? pageMatch[1] : '1';
    return getApiDomain() + '/novels/' + storyId + '/chapters?page=' + pageNum;
}

function extractStoryId(html) {
    if (!html) return null;
    var normalized = html.replace(/\\/g, '');
    var patterns = [
        /"data"\s*:\s*\{"id"\s*:\s*(\d+)/,
        /data\s*:\s*\{id\s*:\s*(\d+)/,
        /"novelId"\s*:\s*(\d+)/,
        /novelId\s*:\s*(\d+)/,
        /"storyId"\s*:\s*(\d+)/,
        /storyId\s*:\s*(\d+)/
    ];
    for (var i = 0; i < patterns.length; i++) {
        var match = normalized.match(patterns[i]);
        if (match) return match[1];
    }
    return null;
}