load('config.js');

function execute(url) {
    url = normalizeUrl(url);

    var response = fetchPage(url);
    if (!response.ok) return Response.error("HTTP Error: " + response.status);

    var rawHtml = response.text();
    if (!rawHtml) return Response.error("Trang trống");

    var doc = Html.parse(rawHtml);
    if (!doc) return Response.error("Không thể parse HTML");

    var name = "";
    var nameEl = doc.select(".work-detail-card h1, h1, .work-title").first();
    if (nameEl) name = cleanText(nameEl.text());
    if (!name) {
        var ogTitle = doc.select("meta[property='og:title']").first();
        if (ogTitle) name = cleanText(ogTitle.attr("content") || "");
    }

    var cover = "";
    var ogImg = doc.select("meta[property='og:image']").first();
    if (ogImg) cover = ogImg.attr("content") || "";
    if (!cover) {
        var coverEl = doc.select(".work-detail-card img.work-thumb, .cover img, img.work-thumb").first();
        if (coverEl) cover = coverEl.attr("data-src") || coverEl.attr("src") || "";
    }
    if (cover) {
        cover = normalizeUrl(cover);
    }

    var description = "";
    var descEl = doc.select("#workDesc, .work-description, p.work-summary").first();
    if (descEl) description = descEl.html();

    var author = "Đang cập nhật";
    var authorEl = doc.select("a.work-tag--author, a[href*='/tac-gia/']").first();
    if (authorEl) author = cleanText(authorEl.text()) || author;

    var status = "Đang ra";
    var statusEl = doc.select(".work-detail-card .work-stage-badge, .work-detail-card .badge, .badge").first();
    if (statusEl) status = cleanText(statusEl.text());

    var ongoing = true;
    var statusText = String(status || "").toLowerCase();
    if (statusText.indexOf("hoàn") >= 0 || statusText.indexOf("full") >= 0) {
        ongoing = false;
        status = "Hoàn thành";
    } else {
        status = "Đang ra";
    }

    var genres = [];
    var genreTexts = [];
    var seenGenre = {};
    doc.select("a.work-tag--cat").forEach(function(a) {
        var title = cleanText(a.text()).replace(/\(\d+\)/g, "").trim();
        var href = normalizeUrl(a.attr("href"));
        if (!title || !href || seenGenre[href]) return;
        seenGenre[href] = true;
        genres.push({ title: title, input: href, script: "gen.js" });
        genreTexts.push(title);
    });

    var tags = [];
    var seenTag = {};
    doc.select(".work-tags-block a.work-tag-chip, a.work-tag-chip").forEach(function(a) {
        var title = cleanText(a.text()).replace(/^#\s*/, "").trim();
        var href = normalizeUrl(a.attr("href"));
        if (!title || !href || seenTag[href]) return;
        seenTag[href] = true;
        tags.push({ title: title, input: href, script: "search.js" });
    });

    var detail = "";
    detail += "<p><strong>Tác giả:</strong> " + author + "</p>";
    detail += "<p><strong>Trạng thái:</strong> " + status + "</p>";
    if (genreTexts.length) {
        detail += "<p><strong>Thể loại:</strong> " + genreTexts.join(", ") + "</p>";
    }

    var suggests = [
        {
            title: "Truyện liên quan",
            input: genres.length > 0 ? genres[0].input : BASE_URL + "/trending",
            script: "gen.js"
        }
    ];

    return Response.success({
        name: name,
        cover: cover,
        author: author,
        description: description,
        detail: detail,
        ongoing: ongoing,
        type: "novel",
        format: "novel",
        genres: genres,
        tags: tags,
        suggests: suggests,
        comments: [],
        reviews: [],
        host: BASE_URL
    });
}
