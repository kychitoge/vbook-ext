load("config.js");

function buildSuggests(authorUrl, teamUrl, firstGenreUrl) {
    let suggests = [];
    let seen = {};

    function pushSuggest(title, input) {
        if (suggests.length >= 2) return;
        input = normalizeUrl(input);
        if (!input || seen[input]) return;
        seen[input] = true;
        suggests.push({
            title: title,
            input: input,
            script: "search.js"
        });
    }

    if (authorUrl) {
        pushSuggest("Cùng tác giả", authorUrl);
    }
    if (teamUrl) {
        pushSuggest("Cùng nhóm dịch", teamUrl);
    }
    if (firstGenreUrl) {
        pushSuggest("Cùng thể loại", firstGenreUrl);
    }

    return suggests;
}

function execute(url) {
    url = normalizeUrl(url);
    let response = fetchPage(url);
    if (!response.ok) return Response.error("HTTP " + response.status);

    let rawHtml = response.text() + "";
    if (!rawHtml) return Response.error("Trang trống");

    let doc = Html.parse(rawHtml);
    if (!doc) return Response.error("Không thể parse HTML");

    let map = extractBeforeContentMap(rawHtml);

    let name = "";
    let nameEl = doc.select("h2.card-title[itemprop='name'], h1.story-title").first();
    if (nameEl) name = cleanText(nameEl.text() + "");
    if (!name) {
        let ogTitle = doc.select("meta[property='og:title']").first();
        if (ogTitle) name = cleanText(ogTitle.attr("content") + "");
    }

    let cover = "";
    let ogImg = doc.select("meta[property='og:image']").first();
    if (ogImg) cover = (ogImg.attr("content") + "").trim();
    if (!cover) {
        let coverEl = doc.select(".col-md-3 img.img-fluid, .card img, .book img").first();
        if (coverEl) {
            cover = ((coverEl.attr("data-src") + "") || (coverEl.attr("src") + "")).trim();
        }
    }
    cover = resolveMediaUrl(cover);

    let description = "";
    let descEl = doc.select(".story-description .inner, .story-description [itemprop='description']").first();
    if (descEl) {
        description = descEl.html() + "";
    } else {
        let descFallback = doc.select(".story-description").first();
        if (descFallback) description = descFallback.html() + "";
    }
    description = decodeObfuscatedSpan(description, map);

    let author = "";
    let authorUrl = "";
    let authorEl = doc.select("a[href*='/tac-gia/']").first();
    if (authorEl) {
        author = cleanText(authorEl.text() + "");
        authorUrl = normalizeUrl(authorEl.attr("href") + "");
    }

    let team = "";
    let teamUrl = "";
    let teamEl = doc.select("a[href*='/nhom-dich/']").first();
    if (teamEl) {
        team = cleanText(teamEl.text() + "");
        teamUrl = normalizeUrl(teamEl.attr("href") + "");
    }

    if (!author) {
        author = team || "Đang cập nhật";
    }

    let status = "Đang ra";
    let statusEl = doc.select("dt:contains(Trạng thái) + dd").first();
    if (!statusEl) {
        statusEl = doc.select(".label-success, .label-info, .label-warning, .label-primary").first();
    }
    if (statusEl) status = cleanText(statusEl.text() + "") || status;

    let ongoing = true;
    let statusText = String(status).toLowerCase();
    if (statusText.indexOf("hoàn") >= 0 || statusText.indexOf("full") >= 0 || statusText.indexOf("đủ bộ") >= 0) {
        ongoing = false;
        status = "Hoàn thành";
    }

    let genres = [];
    let genreTexts = [];
    let firstGenreUrl = "";
    doc.select("a.cate-item[itemprop='genre'], a[itemprop='genre']").forEach(function (a) {
        let title = cleanText(a.text() + "");
        let href = normalizeUrl(a.attr("href") + "");
        if (!title || !href) return;
        genres.push({ title: title, input: href, script: "search.js" });
        genreTexts.push(title);
        if (!firstGenreUrl) firstGenreUrl = href;
    });

    let storyId = "";
    let storyIdEl = doc.select("#report_story_id, #story_id").first();
    if (storyIdEl) {
        storyId = cleanText((storyIdEl.attr("value") + "") || (storyIdEl.text() + ""));
    }
    if (!storyId) {
        let commentBtn = doc.select("#loadCommentBtn, a[onclick*='loadComments(']").first();
        if (commentBtn) {
            let onclick = commentBtn.attr("onclick") + "";
            let match = onclick.match(/loadComments\((\d+)\)/);
            if (match) storyId = match[1];
        }
    }

    let detail = "";
    detail += "<p><strong>Tác giả:</strong> " + author + "</p>";
    if (team && team !== author) {
        detail += "<p><strong>Nhóm dịch:</strong> " + team + "</p>";
    }
    detail += "<p><strong>Trạng thái:</strong> " + status + "</p>";

    let chapterCount = doc.select("#listChapters .list-chapters .item").size();
    if (!chapterCount) {
        let totalChapEl = doc.select("#totalChapter, .total-chapter, .story-info .chapters").first();
        if (totalChapEl) {
            chapterCount = parseInt(cleanText(totalChapEl.text() + "").replace(/\D+/g, ""), 10) || 0;
        }
    }
    if (chapterCount) {
        detail += "<p><strong>Số chương:</strong> " + chapterCount + "</p>";
    }
    if (genreTexts.length) {
        detail += "<p><strong>Thể loại:</strong> " + genreTexts.join(", ") + "</p>";
    }

    let suggests = buildSuggests(authorUrl, teamUrl, firstGenreUrl);
    let comments = [];
    if (storyId) {
        let countEl = doc.select("#loadCommentBtn .count-items, .count-items").first();
        let commentCountText = countEl ? cleanText(countEl.text() + "") : "";
        let commentTitle = "Bình luận";
        if (commentCountText) commentTitle += " (" + commentCountText + ")";
        comments.push({
            title: commentTitle,
            input: JSON.stringify({ storyId: storyId, page: 1 }),
            script: "comment.js"
        });
    }

    return Response.success({
        name: name,
        author: author,
        cover: cover,
        description: description,
        detail: detail,
        url: url,
        type: "novel",
        format: "novel",
        ongoing: ongoing,
        nsfw: false,
        locale: "vi",
        genres: genres,
        suggests: suggests,
        comments: comments,
        host: BASE_URL
    });
}
