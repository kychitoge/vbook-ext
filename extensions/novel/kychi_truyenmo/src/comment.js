load("config.js");

function execute(input, page) {
    let parsed = parseCommentInput(input, page);
    let storyId = parsed.storyId;
    let currentNum = parsed.page;
    let token = parsed.token;

    if (!storyId) return Response.success([], "");

    let rawHtml = "";
    if (currentNum <= 1) {
        let p1Res = fetchFirstCommentPage(storyId);
        if (!p1Res.ok) return Response.error("HTTP " + p1Res.status);
        rawHtml = p1Res.html;
        if (p1Res.token) token = p1Res.token;
    } else {
        // If page 2+ is requested directly without a cached CSRF token/cookie, bootstrap from page 1 first.
        if (!token) {
            let boot = fetchFirstCommentPage(storyId);
            if (!boot.ok) return Response.error("HTTP " + boot.status);
            token = boot.token;
        }

        let moreRes = postMoreComments(storyId, currentNum, token);
        if (!moreRes.ok && moreRes.status === 419) {
            let refreshed = fetchFirstCommentPage(storyId);
            if (refreshed.ok && refreshed.token) {
                token = refreshed.token;
                moreRes = postMoreComments(storyId, currentNum, token);
            }
        }
        if (!moreRes.ok) return Response.error("HTTP " + moreRes.status);
        rawHtml = moreRes.text() + "";
    }

    if (!rawHtml) return Response.success([], "");

    let doc = Html.parse(rawHtml);
    if (!doc) return Response.success([], "");

    let comments = [];
    let topItems = doc.select("ul.comments > li");
    if (!topItems || topItems.size() === 0) {
        topItems = doc.select("ul > li");
    }

    topItems.forEach(function (item) {
        let node = parseCommentNode(doc, item);
        if (node) comments.push(node);
    });

    let next = "";
    let moreBtn = doc.select("button[onclick*='more_comments'], a[onclick*='more_comments']").first();
    if (moreBtn && comments.length > 0) {
        let onclick = moreBtn.attr("onclick") + "";
        let match = onclick.match(/more_comments\(\s*['"]?(\d+)['"]?\s*,\s*['"]?(\d+)['"]?\s*,\s*['"]?(\d+)['"]?\s*\)/);
        let nextPageNum = match ? parseInt(match[3], 10) : (currentNum + 1);
        if (nextPageNum > currentNum) {
            next = JSON.stringify({
                storyId: storyId,
                page: nextPageNum,
                token: token
            });
        }
    }

    return Response.success(comments, next);
}

function postMoreComments(storyId, nextPageNum, token) {
    return fetchPage(BASE_URL + "/ajax/more-comments", {
        method: "POST",
        headers: {
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Referer": BASE_URL + "/"
        },
        body: {
            _token: token,
            media_id: storyId,
            current_page: String(nextPageNum - 1),
            next_page: String(nextPageNum)
        }
    });
}

function fetchFirstCommentPage(storyId) {
    let url = BASE_URL + "/ajax/showComment?story_id=" + encodeURIComponent(storyId);
    let response = fetchPage(url, {
        headers: {
            "X-Requested-With": "XMLHttpRequest",
            "Referer": BASE_URL + "/"
        }
    });
    if (!response.ok) {
        return { ok: false, status: response.status, html: "", token: "" };
    }

    let html = response.text() + "";
    let doc = html ? Html.parse(html) : null;
    let token = "";
    if (doc) {
        let tokenEl = doc.select("input[name='_token']").first();
        if (tokenEl) token = (tokenEl.attr("value") + "").trim();
    }
    return { ok: true, status: response.status, html: html, token: token };
}

function parseCommentNode(doc, item) {
    let postEl = item.select(".post-comments").first();
    if (!postEl) return null;

    let pEls = postEl.select("p");
    if (!pEls || pEls.size() < 2) return null;

    let contentEl = pEls.first();
    let metaEl = pEls.last();
    let content = cleanText(contentEl.text() + "");
    if (!content) return null;

    let authorEl = metaEl.select("a").first();
    let author = authorEl ? cleanText(authorEl.text() + "") : "";
    if (!author) author = "Ẩn danh";

    let timeText = "";
    let smallEl = metaEl.select("small").first();
    if (smallEl) {
        timeText = cleanText((smallEl.text() + "").replace(/Trả lời/gi, "").replace(/·/g, ""));
    } else {
        timeText = cleanText((metaEl.text() + "").replace(author, "").replace(/Trả lời/gi, "").replace(/·/g, ""));
    }

    let avatar = "";
    let avatarEl = item.select(".avt_user img").first();
    if (avatarEl) {
        avatar = resolveMediaUrl((avatarEl.attr("src") + "").trim());
    }

    let replies = [];
    let clsMatch = (item.attr("class") + "").match(/\bcomment_\d+\b/);
    let replyEls = clsMatch ? doc.select("li." + clsMatch[0] + " > ul > li") : item.select("ul > li");
    replyEls.forEach(function (r) {
        let replyNode = parseCommentNode(doc, r);
        if (replyNode) replies.push(replyNode);
    });

    let result = {
        name: author,
        avatar: avatar,
        content: content,
        description: timeText,
        replies: replies
    };
    if (replies.length > 0) {
        result.reply_count = replies.length;
    }

    return result;
}

function parseCommentInput(input, page) {
    let out = { storyId: "", page: 1, token: "" };

    function readValue(value) {
        if (!value) return null;
        let str = String(value).trim();
        if (!str) return null;
        if (str.charAt(0) === "{") {
            try { return JSON.parse(str); } catch (e) { return null; }
        }
        return str;
    }

    let a = readValue(input);
    let b = readValue(page);

    if (typeof a === "string") {
        out.storyId = a.replace(/\D+/g, "");
    } else if (a) {
        out.storyId = String(a.storyId || a.story_id || a.id || "").replace(/\D+/g, "");
        out.page = parseInt(String(a.page || a.currentPage || a.current_page || "1"), 10) || 1;
        if (a.token) out.token = String(a.token);
    }

    if (typeof b === "string") {
        out.page = parseInt(b, 10) || out.page;
    } else if (b) {
        let sid = String(b.storyId || b.story_id || b.id || "").replace(/\D+/g, "");
        if (sid) out.storyId = sid;
        out.page = parseInt(String(b.page || b.currentPage || b.current_page || out.page), 10) || out.page;
        if (b.token) out.token = String(b.token);
    }

    if (out.page < 1) out.page = 1;
    return out;
}
