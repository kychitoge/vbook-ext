load("config.js");

function execute(url) {
    url = normalizeUrl(url);
    let response = fetchPage(url);
    if (!response.ok) {
        return Response.error("Không thể tải chi tiết truyện (HTTP " + response.status + "). Kiểm tra kết nối mạng hoặc tên miền trong cài đặt, rồi thử lại.");
    }

    let doc = response.html();

    let name = "";
    let cover = "";
    let author = "Đang cập nhật";
    let authorUrl = "";
    let description = "";
    let statusText = "Đang ra";

    // JSON-LD schema gives the cleanest structured metadata when present.
    let scriptEl = doc.select("script[type='application/ld+json']").first();
    if (scriptEl) {
        try {
            let jsonLd = JSON.parse(scriptEl.html() + "");
            if (jsonLd) {
                if (jsonLd.name) name = cleanText(jsonLd.name);
                if (jsonLd.image) cover = String(jsonLd.image);
                if (jsonLd.description) description = cleanDescription(jsonLd.description);
                if (jsonLd.author) {
                    if (jsonLd.author.name) author = cleanText(jsonLd.author.name);
                    if (jsonLd.author.url) authorUrl = String(jsonLd.author.url);
                }
                if (jsonLd.identifier && jsonLd.identifier.value) {
                    statusText = cleanText(jsonLd.identifier.value);
                }
            }
        } catch (err) {}
    }

    if (!name) {
        let nameEl = doc.select("h3.title[itemprop='name'], h3#comic_name, h3.title, h1").first();
        name = nameEl ? cleanText(nameEl.text()) : "";
    }

    if (!cover) {
        let coverEl = doc.select(".books .book img, img[itemprop='image'], .book img").first();
        cover = coverEl ? (coverEl.attr("src") + "") : "";
    }

    if (author === "Đang cập nhật" || !author || !authorUrl) {
        let authorEl = doc.select(".info .author a, [itemprop='author'], .author .item-value, a[href*='/tac-gia/']").first();
        if (authorEl) {
            if (author === "Đang cập nhật" || !author) {
                let parsedAuthor = cleanText(authorEl.text());
                if (parsedAuthor) author = parsedAuthor;
            }
            if (!authorUrl) {
                authorUrl = authorEl.attr("href") + "";
            }
        }
    }

    if (!description) {
        let descSelectors = [
            "section.limit-desc",
            ".limit-desc",
            ".desc-text",
            "[itemprop='description']",
            ".desc-text-full",
            ".desc-content",
            ".desc",
            "#ct-p"
        ];
        for (let d = 0; d < descSelectors.length; d++) {
            let descEl = doc.select(descSelectors[d]).first();
            if (descEl) {
                let rawDesc = cleanDescription(descEl.html());
                if (rawDesc) {
                    description = rawDesc;
                    break;
                }
            }
        }
    }
    if (description) {
        description = description.replace(/\r?\n/g, "<br>");
    }

    let genres = [];
    let genreEls = doc.select(".info .genres .item-value");
    if (genreEls.size() === 0) genreEls = doc.select("[itemprop='genre']");
    if (genreEls.size() === 0) genreEls = doc.select(".genres a");

    let firstGenreUrl = "";
    for (let i = 0; i < genreEls.size(); i++) {
        let g = genreEls.get(i);
        if (!g) continue;
        let gText = cleanText(g.text());
        let gHref = g.attr("href") + "";
        if (gText && gHref) {
            let normalizedHref = normalizeUrl(gHref);
            genres.push({
                title: gText,
                input: normalizedHref,
                script: "gen.js"
            });
            if (!firstGenreUrl) firstGenreUrl = normalizedHref;
        }
    }

    if (!statusText || statusText === "Đang ra") {
        let statusEl = doc.select(".info .text-success.item-value, .info .text-info.item-value, .info .item-value").first();
        if (statusEl) {
            statusText = cleanText(statusEl.text());
        } else {
            let infoBlocks = doc.select(".info div, .info p, .info li");
            for (let idx = 0; idx < infoBlocks.size(); idx++) {
                let block = infoBlocks.get(idx);
                if (!block) continue;
                let text = block.text() + "";
                if (text.indexOf("Trạng thái:") >= 0) {
                    statusText = cleanText(text.replace("Trạng thái:", ""));
                    break;
                }
            }
        }
    }

    statusText = cleanText(statusText || "Đang ra");
    let lowerStatus = statusText.toLowerCase();
    let ongoing = lowerStatus.indexOf("hoàn thành") === -1 &&
                  lowerStatus.indexOf("đã hoàn") === -1 &&
                  lowerStatus.indexOf("full") === -1 &&
                  lowerStatus.indexOf("complete") === -1;

    let suggests = [];
    if (authorUrl && author !== "Đang cập nhật" && authorUrl.indexOf("/tac-gia/dang-cap-nhat") === -1) {
        suggests.push({
            title: "Truyện cùng tác giả",
            input: normalizeUrl(authorUrl),
            script: "gen.js"
        });
    }
    if (firstGenreUrl) {
        suggests.push({
            title: "Truyện cùng thể loại",
            input: firstGenreUrl,
            script: "gen.js"
        });
    }

    let detailParts = [];
    detailParts.push("<p><strong>Tác giả:</strong> " + author + "</p>");
    detailParts.push("<p><strong>Trạng thái:</strong> " + (ongoing ? "Đang ra" : "Hoàn thành") + "</p>");
    if (genres.length > 0) {
        let genreTitles = [];
        for (let j = 0; j < genres.length; j++) {
            genreTitles.push(genres[j].title);
        }
        detailParts.push("<p><strong>Thể loại:</strong> " + genreTitles.join(", ") + "</p>");
    }
    let detail = detailParts.join("<br>");

    return Response.success({
        name: name,
        cover: cover,
        author: author,
        description: description,
        genres: genres,
        detail: detail,
        url: url,
        type: "novel",
        format: "novel",
        ongoing: ongoing,
        host: BASE_URL,
        suggests: suggests,
        comments: [
            {
                title: "Bình luận",
                input: url,
                script: "comment.js"
            }
        ]
    });
}
