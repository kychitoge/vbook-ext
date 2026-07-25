load('config.js');

function execute(url) {
    if (url && url.charAt(url.length - 1) !== '/') {
        url = url + '/';
    }

    url = normalizeUrl(url);

    var response = fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": BASE_URL
        }
    });

    if (!response.ok) {
        return Response.error("Lỗi tải thông tin truyện: " + response.status);
    }

    var doc = response.html();

    var name = doc.select("h1").text().trim();
    var cover = doc.select(".cover img, .book-img img, img[src*='thumb']").attr("src");

    var author = "未知";
    var authorEl = doc.select(".info .meta .author, .info .author, .meta .author").first();
    if (authorEl) {
        author = authorEl.text().replace(/.*作者[：:\s]*/, "").trim();
    }
    if (!author || author === "未知") {
        var metaEl = doc.select(".info .meta").first();
        if (metaEl) {
            var metaText = metaEl.text();
            var m = metaText.match(/作者[：:\s]*([^\s]+)/);
            if (m) author = m[1].trim();
        }
    }

    var updateTime = "";
    var updateEl = doc.select(".meta .iconf:contains('更新'), .info :contains('更新')").first();
    if (updateEl) {
        updateTime = updateEl.text().replace(/.*更新[：:\s]*/, "").trim();
    }

    var descEl = doc.select(".intro, .description, .detail, p.desc").first();
    var description = "";
    if (descEl) {
        description = descEl.html() || descEl.text() || "";
    }

    var pageText = doc.text();
    var ongoing = pageText.indexOf("完結") === -1;

    var genres = [];
    var genreTexts = [];
    var seenGenre = {};
    doc.select(".meta a[href*='cid='], .breadcrumb a[href*='cid=']").forEach(function(a) {
        var gTitle = a.text().trim();
        var gHref = a.attr("href");
        if (gTitle && gHref && !seenGenre[gHref]) {
            seenGenre[gHref] = true;
            genres.push({
                title: gTitle,
                input: normalizeUrl(gHref),
                script: "gen.js"
            });
            genreTexts.push(gTitle);
        }
    });

    var detailText = "<p><strong>作者：</strong> " + author + "</p>";
    detailText += "<p><strong>狀態：</strong> " + (ongoing ? "連載" : "完結") + "</p>";
    if (updateTime) {
        detailText += "<p><strong>更新：</strong> " + updateTime + "</p>";
    }
    if (genreTexts.length > 0) {
        detailText += "<p><strong>分類：</strong> " + genreTexts.join(", ") + "</p>";
    }

    var suggests = [
        {
            title: "編輯推薦",
            input: genres.length > 0 ? genres[0].input : BASE_URL + "/bookstack/",
            script: "gen.js"
        }
    ];

    return Response.success({
        name: name,
        author: author,
        cover: normalizeUrl(cover),
        description: description,
        detail: detailText,
        url: url,
        type: "chinese_novel",
        ongoing: ongoing,
        locale: "zh_CN",
        genres: genres,
        tags: [],
        suggests: suggests,
        comments: [],
        reviews: [],
        host: BASE_URL
    });
}
