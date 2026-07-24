load("config.js");

function execute(url) {
    url = normalizeUrl(url);
    var res = fetchPage(url);
    if (!res || !res.ok) return Response.success([]);
    var html = res.text() + "";

    var nIdMatch = html.match(/novel_id\s*=\s*["'](\d+)["']/) || html.match(/data-novel-id=["'](\d+)["']/);
    var sNameMatch = html.match(/defaultSource\s*=\s*["']([^"']+)["']/) || html.match(/source_name\s*=\s*['"]([^'"]+)['"]/);
    var nSlugMatch = html.match(/novel_url\s*=\s*["']([^"']+)["']/);
    var slug = nSlugMatch ? nSlugMatch[1] : (url.split('/').filter(Boolean).pop() || "");

    if (!slug) {
        var slugMatch = url.match(/\/truyen\/([^\/\?#]+)/i);
        if (slugMatch) slug = slugMatch[1];
    }

    var novelId = nIdMatch ? nIdMatch[1] : "";
    var sourceName = sNameMatch ? sNameMatch[1] : "sudugu";

    var allChapters = [];
    var seen = {};

    if (novelId) {
        var apiUrlBig = BASE_URL + "/api/novels/" + novelId + "/chapters?source=" + encodeURIComponent(sourceName) + "&limit=10000";
        var resBig = fetchPage(apiUrlBig, { headers: { "X-Requested-With": "XMLHttpRequest", "Accept": "application/json" } });

        if (resBig && resBig.ok) {
            var jsonBig = resBig.json();
            var dataBig = (jsonBig && jsonBig.data) ? jsonBig.data : ((jsonBig && jsonBig.items) ? jsonBig.items : []);
            if (dataBig && dataBig.length > 0) {
                for (var i = 0; i < dataBig.length; i++) {
                    var chSlug1 = dataBig[i].chapter_url || dataBig[i].slug;
                    var cUrl1 = BASE_URL + "/truyen/" + slug + "/" + sourceName + "/" + chSlug1;
                    if (!seen[cUrl1]) {
                        allChapters.push({
                            name: cleanText(dataBig[i].title || dataBig[i].name || ("Chương " + (i + 1))),
                            url: cUrl1,
                            host: BASE_URL
                        });
                        seen[cUrl1] = true;
                    }
                }
                return Response.success(allChapters);
            }
        }
    }

    // Fallback: Quét DOM nếu không gọi được API
    var doc = res.html();
    if (doc) {
        doc.select("a[href*='/chuong-'], a[href*='/chuong']").forEach(function(el) {
            var href = el.attr("href") + "";
            var name = cleanText(el.text() + "");
            if (href && name && href.indexOf("danh-sach-chuong") < 0) {
                var fullUrl = normalizeUrl(href);
                if (!seen[fullUrl]) {
                    allChapters.push({
                        name: name,
                        url: fullUrl,
                        host: BASE_URL
                    });
                    seen[fullUrl] = true;
                }
            }
        });
    }

    return Response.success(allChapters);
}
