load("config.js");

function execute(url) {
    var res = fetch(url);
    if (!res || !res.ok) return null;
    var doc = res.html();

    var name = doc.select('h1').text().trim() + "";
    var cover = doc.select('meta[property="og:image"]').attr("content") + "";
    if (cover && cover.indexOf("//") === 0) cover = "https:" + cover;
    else if (cover && cover.indexOf("/") === 0) cover = BASE_URL + cover;
    
    var author = doc.select('meta[property="book:author"]').attr("content") + "";
    if (!author) {
        var authorEl = doc.select('a[href*="keyword="]').first();
        if (authorEl) author = authorEl.text().trim() + "";
    }
    if (!author) author = "Đang cập nhật";

    var originalName = "";
    var totalChapters = doc.select('.text-xl.font-bold').first().text().trim() + "";
    var status = doc.select('.bg-green-100').text().trim() + "";
    if (!status) status = "Đang ra";

    doc.select('p').forEach(function(p) {
        var t = p.text().trim() + "";
        if (t.indexOf("Tên gốc:") === 0 && !originalName) originalName = t.substring(8).trim();
        else if (t.indexOf("Số chương:") === 0 && !totalChapters) totalChapters = t.substring(10).trim();
        else if (t.indexOf("Tình trạng:") === 0 && status === "Đang ra") {
            var s = t.substring(11).trim();
            if (s) status = s;
        }
    });

    var description = doc.select('.lg\\:col-span-2 p').html() + ""; 
    var genres = [];
    var gapElement = doc.select('.flex.flex-wrap.gap-2').first();
    if (gapElement) {
        gapElement.select('a').forEach(function(a) {
            var title = a.text().trim() + "";
            if (title && a.select('.material-symbols-outlined').size() === 0) {
                var href = a.attr("href") + "";
                var inputUrl = href.indexOf("http") === 0 ? href : BASE_URL + (href.indexOf("/") === 0 ? "" : "/") + href;
                genres.push({ title: title, input: inputUrl, script: "gen.js" });
            }
        });
    }

    var lastChEl = doc.select('#gioi-thieu a[href*="/chuong-"]').first();
    var lastChapter = lastChEl ? (lastChEl.text().trim() + "") : "";

    var categoryText = genres.map(function(g) { return g.title; }).join(', ');

    if (author && author !== "Đang cập nhật") {
        genres.unshift({ 
            title: author, 
            input: BASE_URL + "/api/search-novels?keyword=" + encodeURIComponent(author) + "&page=1", 
            script: "gen.js" 
        });
    }

    var detailHtml = '<div>'
        + '<p>Tác giả: ' + author + '</p>'
        + (originalName ? '<p>Tên gốc: ' + originalName + '</p>' : '')
        + (categoryText ? '<p>Thể loại: ' + categoryText + '</p>' : '')
        + '<p>Tình trạng: ' + status + '</p>'
        + (totalChapters ? '<p>Số chương: ' + totalChapters + '</p>' : '')
        + (lastChapter ? '<p>Chương mới: ' + lastChapter + '</p>' : '')
        + '</div>';

    return Response.success({ 
        name: name, 
        cover: cover, 
        author: author, 
        description: description, 
        genres: genres, 
        detail: detailHtml, 
        ongoing: status.indexOf("Đang ra") >= 0, 
        host: BASE_URL 
    });
}
