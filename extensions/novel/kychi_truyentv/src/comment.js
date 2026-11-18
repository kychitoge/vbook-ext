load("config.js");

function fetchCommentsForType(commentableType, commentableId, currentPage) {
    let apiUrl = BASE_URL + "/api/comments?commentable_type=" + encodeURIComponent(commentableType) +
                 "&commentable_id=" + encodeURIComponent(commentableId) + "&page=" + currentPage;
    let resp = fetchPage(apiUrl);
    if (!resp.ok) return null;

    try {
        let j = JSON.parse(resp.text() + "");
        let container = j && j.data ? j.data : j;
        let list = [];
        if (Array.isArray(container)) {
            list = container;
        } else if (container) {
            if (Array.isArray(container.data)) list = container.data;
            else if (Array.isArray(container.comments)) list = container.comments;
            else if (Array.isArray(container.items)) list = container.items;
        }

        let curr = j.current_page || (container && (container.current_page || container.currentPage)) || 1;
        let last = j.last_page || (container && (container.last_page || container.lastPage)) || curr;

        let out = [];
        for (let k = 0; k < list.length; k++) {
            let c = list[k];
            if (!c) continue;
            let rawContent = c.content || c.message || c.body || c.content_html || c.comment || "";
            let name = c.username || c.name || c.user_name || (c.user && (c.user.name || c.user.username)) || "Ẩn danh";
            let avatar = c.avatar || (c.user && c.user.avatar) || "";
            if (avatar && !String(avatar).match(/^https?:\/\//i)) {
                avatar = normalizeUrl(avatar);
            }

            out.push({
                name: String(name),
                content: cleanText(rawContent),
                avatar: String(avatar),
                description: String(c.created_at || c.time || c.created_at_iso || c.created || "")
            });
        }

        return {
            items: out,
            current: parseInt(curr, 10) || 1,
            last: parseInt(last, 10) || parseInt(curr, 10) || 1
        };
    } catch (e) {
        return null;
    }
}

function execute(input, page) {
    let url = normalizeUrl(input);
    if (!url) return Response.success([], "");

    let currentPage = page ? String(page) : "1";
    let detailResponse = fetchPage(url);
    if (!detailResponse.ok) return Response.success([], "");

    let doc = detailResponse.html();
    let commentableId = "";

    let idEl = doc.select("[data-commentable-id], input[name='commentable_id']").first();
    if (idEl) {
        commentableId = (idEl.attr("data-commentable-id") || idEl.attr("value") || "") + "";
    }

    if (!commentableId) {
        let scripts = doc.select("script[type='application/ld+json']");
        for (let i = 0; i < scripts.size(); i++) {
            let scriptEl = scripts.get(i);
            if (!scriptEl) continue;
            try {
                let data = JSON.parse(scriptEl.html() + "");
                if (data && data["@id"]) {
                    commentableId = String(data["@id"]).split("/").pop();
                    break;
                }
            } catch (e) {}
        }
    }

    if (!commentableId) {
        let urlParts = url.split("-");
        for (let j = urlParts.length - 1; j >= 0; j--) {
            let part = urlParts[j].replace(".html", "");
            if (part.match(/^\d+$/)) {
                commentableId = part;
                break;
            }
        }
    }

    if (!commentableId) return Response.success([], "");

    let triedTypes = ["novels", "comics"];
    let finalResult = null;
    for (let t = 0; t < triedTypes.length; t++) {
        let r = fetchCommentsForType(triedTypes[t], commentableId, currentPage);
        if (r && r.items && r.items.length > 0) {
            finalResult = r;
            break;
        }
        if (!finalResult && r) finalResult = r;
    }

    if (!finalResult || !finalResult.items || finalResult.items.length === 0) {
        return Response.success([], "");
    }

    let nextPage = finalResult.current < finalResult.last ? String(finalResult.current + 1) : "";
    return Response.success(finalResult.items, nextPage);
}
