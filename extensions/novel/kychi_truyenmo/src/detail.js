load('config.js');

function buildSuggests(authorUrl, firstGenreUrl, detailUrl) {
    var suggests = [];
    var seen = {};

    function pushSuggest(title, input) {
        input = normalizeUrl(input);
        if (!input || seen[input]) return;
        seen[input] = true;
        suggests.push({
            title: title,
            input: input,
            script: 'gen.js'
        });
    }

    if (authorUrl) {
        pushSuggest('Cùng tác giả/nhóm dịch', authorUrl);
    }

    return suggests;
}

function execute(url) {
    url = normalizeUrl(url);
    var response = fetchPage(url);
    if (!response.ok) {
        return Response.error('HTTP Error: ' + response.status);
    }

    // Đọc rawHtml trước, rồi parse - tránh double-read làm html() null
    var rawHtml = response.text();
    if (!rawHtml) return Response.error('Trang trống');

    var doc = Html.parse(rawHtml);
    if (!doc) return Response.error('Không thể parse HTML');

    var map = extractBeforeContentMap(rawHtml);

    // --- Tên truyện ---
    var name = '';
    var nameEl = doc.select('h2.card-title[itemprop="name"], h1.story-title').first();
    if (nameEl) name = cleanText(nameEl.text());
    if (!name) {
        var ogTitle = doc.select('meta[property="og:title"]').first();
        if (ogTitle) name = cleanText(ogTitle.attr('content') || '');
    }

    // --- Ảnh bìa ---
    var cover = '';
    var ogImg = doc.select('meta[property="og:image"]').first();
    if (ogImg) cover = ogImg.attr('content') || '';
    if (!cover) {
        var coverEl = doc.select('.col-md-3 img.img-fluid, .card img, .book img').first();
        if (coverEl) cover = coverEl.attr('data-src') || coverEl.attr('src') || '';
    }
    cover = normalizeUrl(cover);

    // --- Mô tả ---
    var description = '';
    var descEl = doc.select('.story-description .inner, .story-description [itemprop="description"]').first();
    if (descEl) {
        description = descEl.html();
    } else {
        var descFallback = doc.select('.story-description').first();
        if (descFallback) description = descFallback.html();
    }
    description = decodeObfuscatedSpan(description || '', map);

    // --- Tác giả ---
    var author = 'Đang cập nhật';
    var authorUrl = '';
    var authorEl = doc.select('a[href*="/tac-gia/"], a[href*="/nhom-dich/"]').first();
    if (authorEl) {
        author = cleanText(authorEl.text()) || author;
        authorUrl = normalizeUrl(authorEl.attr('href'));
    }

    // --- Trạng thái ---
    var status = 'Đang ra';
    var statusEl = doc.select('dt:contains(Trạng thái) + dd, .label-success, .label-info, .label-warning, .label-primary').first();
    if (statusEl) status = cleanText(statusEl.text());

    var ongoing = true;
    var statusText = String(status || '').toLowerCase();
    if (statusText.indexOf('hoàn') >= 0 || statusText.indexOf('full') >= 0 || statusText.indexOf('đủ bộ') >= 0) {
        ongoing = false;
        status = 'Hoàn thành';
    }

    // --- Thể loại ---
    var genres = [];
    var genreTexts = [];
    var firstGenreUrl = '';
    doc.select('a.cate-item[itemprop="genre"], a[itemprop="genre"]').forEach(function(a) {
        var title = cleanText(a.text());
        var href = normalizeUrl(a.attr('href'));
        if (!title || !href) return;
        genres.push({ title: title, input: href, script: 'gen.js' });
        genreTexts.push(title);
        if (!firstGenreUrl) firstGenreUrl = href;
    });

    // --- Story ID (cho comment) ---
    var storyId = '';
    var storyIdEl = doc.select('#story_id, #report_story_id').first();
    if (storyIdEl) {
        storyId = cleanText(String(storyIdEl.attr('value') || storyIdEl.text() || ''));
    }
    if (!storyId) {
        var commentBtn = doc.select('#loadCommentBtn, a[onclick*="loadComments("]').first();
        if (commentBtn) {
            var onclick = commentBtn.attr('onclick') || '';
            var match = onclick.match(/loadComments\((\d+)\)/);
            if (match) storyId = match[1];
        }
    }

    // --- Detail block ---
    var detail = '';
    detail += '<p><strong>Tác giả:</strong> ' + author + '</p>';
    detail += '<p><strong>Trạng thái:</strong> ' + status + '</p>';

    var chapterCount = 0;
    var chapListEls = doc.select('#listChapters .list-chapters .item');
    if (chapListEls) chapterCount = chapListEls.size();
    if (!chapterCount) {
        var totalChapEl = doc.select('#totalChapter, .total-chapter, .story-info .chapters').first();
        if (totalChapEl) chapterCount = parseInt(cleanText(totalChapEl.text()).replace(/\D+/g, ''), 10) || 0;
    }
    if (chapterCount) {
        detail += '<p><strong>Số chương:</strong> ' + chapterCount + '</p>';
    }
    if (genreTexts.length) {
        detail += '<p><strong>Thể loại:</strong> ' + genreTexts.join(', ') + '</p>';
    }

    // --- Suggests & Comments ---
    var suggests = buildSuggests(authorUrl, firstGenreUrl, url);
    var comments = [];
    if (storyId) {
        var countEl = doc.select('#loadCommentBtn .count-items, .count-items').first();
        var commentCountText = countEl ? cleanText(countEl.text()) : '';
        var commentTitle = 'Bình luận';
        if (commentCountText) commentTitle += ' (' + commentCountText + ')';
        comments.push({
            title: commentTitle,
            input: JSON.stringify({ storyId: storyId, page: 1 }),
            script: 'comment.js'
        });
    }

    return Response.success({
        name: name,
        cover: cover,
        author: author,
        description: description,
        detail: detail,
        ongoing: ongoing,
        genres: genres,
        suggests: suggests,
        comments: comments,
        host: BASE_URL
    });
}