load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    var doc = loadDocument(url);
    if (!doc) return Response.error("Không thể tải thông tin truyện");
    
    var name = cleanText(doc.select(".post-title h1, h1, .post-title h3").text());
    
    var img = doc.select(".summary_image img").first();
    var cover = "";
    if (img) {
        cover = img.attr("data-src") || img.attr("src") || "";
        if (cover.indexOf("//") === 0) cover = "https:" + cover;
        if (cover && cover.indexOf("http") !== 0) cover = BASE_URL + cover;
        cover = encodeURI(cover);
    }
    
    var authorText = "Đang cập nhật";
    var statusText = "Đang ra";
    var items = doc.select(".post-content_item");
    var itemsSize = getSize(items);
    for (var i = 0; i < itemsSize; i++) {
        var item = getElement(items, i);
        if (!item) continue;
        var heading = item.select(".summary-heading").text();
        var content = item.select(".summary-content").text();
        if (heading.indexOf("Tác giả") >= 0) authorText = cleanText(content);
        if (heading.indexOf("Trạng thái") >= 0) statusText = cleanText(content);
    }
    
    if (authorText === "Đang cập nhật") {
        var authorA = doc.select(".author-content a, .post-author a").first();
        if (authorA) authorText = cleanText(authorA.text());
    }
    
    var ongoing = statusText.toLowerCase().indexOf("hoàn") === -1 && statusText.toLowerCase().indexOf("full") === -1;
    
    var genres = [];
    var genreEls = doc.select(".genres-content a, .post-content_item.mg_genres a, .genres a");
    var genresSize = getSize(genreEls);
    for (var j = 0; j < genresSize; j++) {
        var g = getElement(genreEls, j);
        if (!g) continue;
        var title = cleanText(g.text());
        var href = g.attr("href");
        if (title && href) {
            genres.push({
                title: title,
                input: normalizeUrl(href),
                script: "gen.js"
            });
        }
    }
    
    var descriptionHtml = "";
    var descEl = doc.select(".description-summary .summary__content, .description-summary, .manga-excerpt").first();
    if (descEl) {
        descEl.select(".c-content-readmore, script, style").remove();
        descriptionHtml = descEl.html();
    }
    
    var detail = "<p><strong>Tác giả:</strong> " + authorText + "</p>" +
                 "<p><strong>Trạng thái:</strong> " + statusText + "</p>";
    
    return Response.success({
        name: name,
        cover: cover,
        author: authorText,
        description: descriptionHtml,
        detail: detail,
        ongoing: ongoing,
        genres: genres.length > 0 ? genres : undefined,
        suggests: [{
            title: "Có thể bạn cũng thích",
            input: url,
            script: "suggests.js"
        }],
        host: url.match(/^(https?:\/\/[^\/]+)/i) ? url.match(/^(https?:\/\/[^\/]+)/i)[1] : BASE_URL
    });
}
