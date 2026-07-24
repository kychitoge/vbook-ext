load('config.js');

var DEFAULT_AVATAR = "https://cdn.tienvuc.link/static/images/no-img-user.jpg";

function execute(input, page) {
    var url = normalizeUrl(input);
    if (!url) return Response.success([], "");

    var slug = url.split('/').pop().split('?')[0];
    if (!slug) return Response.success([], "");

    // 1. Tải bình luận cấp 1 (top-level comments)
    var apiUrl = BASE_URL + '/api/comments/books/' + encodeURIComponent(slug) + '?sort=-_id&limit=20';
    if (page && String(page).trim()) {
        apiUrl += '&next=' + encodeURIComponent(String(page).trim());
    }

    var resp = fetchPage(apiUrl, {
        headers: { 'Accept': 'application/json, text/plain, */*' }
    });

    if (!resp.ok) return Response.success([], "");
    var text = resp.text();
    if (!text) return Response.success([], "");

    try {
        var json = JSON.parse(text);
        var docs = json.docs || json.data || [];
        if (!Array.isArray(docs) && docs && docs.docs) docs = docs.docs;
        if (!Array.isArray(docs)) return Response.success([], "");

        var replyCounts = (json.options && json.options.counts) ? json.options.counts : {};
        var comments = [];

        docs.forEach(function(item) {
            var parentParsed = parseCommentOrDonation(item, false);
            if (parentParsed) {
                comments.push(parentParsed);

                // Kiểm tra xem bình luận này có bình luận con (reply) hay không
                var commentId = item.id || item._id;
                var hasReplies = false;
                if (commentId && replyCounts[commentId] && replyCounts[commentId] > 0) {
                    hasReplies = true;
                } else if (item.childrenCount && item.childrenCount > 0) {
                    hasReplies = true;
                }

                // 2. Nếu có reply, tự động gọi API lấy danh sách câu trả lời của bình luận đó
                if (hasReplies && commentId) {
                    var childUrl = BASE_URL + '/api/comments/books/' + encodeURIComponent(slug) + '?parent=' + encodeURIComponent(commentId) + '&limit=10';
                    var childResp = fetchPage(childUrl, {
                        headers: { 'Accept': 'application/json, text/plain, */*' }
                    });
                    if (childResp.ok) {
                        try {
                            var childText = childResp.text();
                            if (childText) {
                                var childJson = JSON.parse(childText);
                                var childDocs = childJson.docs || childJson.data || [];
                                if (Array.isArray(childDocs)) {
                                    childDocs.forEach(function(childItem) {
                                        var childParsed = parseCommentOrDonation(childItem, true);
                                        if (childParsed) {
                                            comments.push(childParsed);
                                        }
                                    });
                                }
                            }
                        } catch (err) {}
                    }
                }
            }
        });

        // Lấy con trỏ phân trang tiếp theo cho danh sách bình luận cấp 1
        var nextPage = (json.next && comments.length > 0) ? String(json.next) : "";
        return Response.success(comments, nextPage);
    } catch (e) {
        return Response.success([], "");
    }
}

function parseCommentOrDonation(item, isReply) {
    if (!item) return null;
    var user = item.user || item.createdBy || item.donor || item.author || {};
    var name = 'Ẩn danh';
    var avatar = DEFAULT_AVATAR;

    if (typeof user === 'string') {
        name = user;
    } else if (user) {
        name = user.displayName || user.name || user.username || 'Ẩn danh';
        if (user.avatar) avatar = normalizeUrl(user.avatar);
    }

    var content = cleanText(item.content || item.message || item.text || item.comment || '');
    if (item.coins) {
        if (content) {
            content += ' (Ủng hộ ' + item.coins + ' xu)';
        } else {
            content = 'Ủng hộ ' + item.coins + ' xu';
        }
    }

    if (!content) return null;

    var time = 'Vừa xong';
    if (item.createdAt) {
        time = cleanText(String(item.createdAt).split('T')[0]);
    } else if (item.created_at) {
        time = cleanText(String(item.created_at).split('T')[0]);
    }

    return {
        name: (isReply ? "↳ " : "") + name,
        content: content,
        avatar: avatar,
        description: time
    };
}
