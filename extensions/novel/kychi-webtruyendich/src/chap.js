load("config.js");

function execute(url) {
    try {
        // Bước 1: Lấy HTML trang chương (fetch có cookie VBook → pass Cloudflare)
        var response = fetch(url);
        if (!response || !response.ok) return Response.error("Lỗi kết nối: " + url);

        var html = response.text();

        // Bước 2: Trích xuất các tham số cần thiết từ HTML
        var getVar = function (regex, def) {
            var match = html.match(regex);
            return (match && match[1]) ? match[1] : (def || "");
        };

        var chapter_id = getVar(/chapter_id\s*[=:]\s*["']?(\d+)["']?/);
        var novel_id   = getVar(/novel_id\s*[=:]\s*["']?(\d+)["']?/);
        var source_name = getVar(/source_name\s*[=:]\s*["']([^"']+)["']/, "fanqie");
        var source_id   = getVar(/sourceId\s*[=:]\s*["']?(\d+)["']?/);
        var chapter_url = getVar(/chapterUrl\s*[=:]\s*["']([^"']+)["']/);
        var novel_url   = getVar(/novel_url\s*[=:]\s*["']([^"']+)["']/);

        if (!chapter_id || !novel_id) return Response.error("Không tìm thấy chapter_id/novel_id.");

        // Bước 3: Gọi API getChapter với Vietphrase
        var payload = JSON.stringify({
            chapter_id:  chapter_id,
            novel_id:    novel_id,
            source_name: source_name,
            source_id:   source_id,
            chapter_url: chapter_url,
            novel_url:   novel_url,
            translator:  "Vietphrase"
        });

        var apiRes = fetch(BASE_URL + "/api/getChapter", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    payload
        });

        if (apiRes && apiRes.ok) {
            var raw = apiRes.text();
            if (raw) {
                try {
                    var json = JSON.parse(raw);
                    var content = json.content || json.data || "";
                    if (isValidContent(content)) return Response.success(cleanContent(content));
                } catch (e) {
                    if (isValidContent(raw)) return Response.success(cleanContent(raw));
                }
            }
        }

        // Bước 4: Fallback đọc thẳng #article từ HTML trang
        var doc = response.html();
        if (doc) {
            var article = doc.select("#article, #chapter-content-body").first();
            if (article) {
                var hc = "" + article.html();
                if (isValidContent(hc)) return Response.success(cleanContent(hc));
            }
        }

        return Response.error("Không lấy được nội dung chương.");
    } catch (e) {
        return Response.error("Lỗi: " + (e ? e.message : ""));
    }
}

function isValidContent(text) {
    if (!text || ("" + text).replace(/\s/g, "").length < 50) return false;
    var lower = ("" + text).toLowerCase();
    if (lower.indexOf("mô hình ai hiện đang quá tải") >= 0) return false;
    if (lower.indexOf("vui lòng thử lại sau") >= 0) return false;
    if (lower.indexOf("cloudflare") >= 0) return false;
    if (lower.indexOf("just a moment") >= 0) return false;
    if (lower.indexOf("chờ một chút") >= 0) return false;
    var trimmed = ("" + text).replace(/^\s+|\s+$/g, "");
    if (trimmed.charAt(0) === '{' && trimmed.indexOf('"detail"') >= 0) return false;
    return true;
}

function cleanContent(text) {
    var s = "" + text;
    s = s.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    s = s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    s = s.replace(/<ins[^>]*>[\s\S]*?<\/ins>/gi, '');
    s = s.replace(/<\/?(p|div|article|section|h[1-6]|blockquote|li|tr|ul|ol)[^>]*>/gi, '\n');
    s = s.replace(/<br\s*\/?>/gi, '\n');
    s = s.replace(/<[^>]+>/g, '');
    s = s.replace(/&nbsp;/gi, ' ');
    s = s.replace(/&quot;/gi, '"');
    s = s.replace(/&#39;/gi, "'");
    s = s.replace(/&lt;/gi, '<');
    s = s.replace(/&gt;/gi, '>');
    s = s.replace(/&amp;/gi, '&');
    s = s.replace(/[ \t]+/g, ' ');
    s = s.replace(/ *\n */g, '\n');
    s = s.replace(/\n{3,}/g, '\n\n');
    s = s.replace(/^\s+|\s+$/g, '');
    return s.replace(/\n/g, '<br>');
}
