load('config.js');

function formatTimestamp(ts) {
    if (!ts) return '';
    try {
        let parts = ts.split('T');
        if (parts.length === 2) {
            let date = parts[0];
            let time = parts[1].split('.')[0];
            return date + ' ' + time;
        }
    } catch (e) {}
    return ts;
}

function cleanCommentContent(str) {
    if (!str) return '';
    return String(str)
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .trim();
}

function mapComment(c) {
    let replies = [];
    if (c.replies && Array.isArray(c.replies)) {
        for (let i = 0; i < c.replies.length; i++) {
            if (c.replies[i]) {
                replies.push(mapComment(c.replies[i]));
            }
        }
    }

    let item = {
        name: c.username || 'Thành viên',
        content: cleanCommentContent(c.content || ''),
        description: formatTimestamp(c.timestamp)
    };
    if (c.userAvatar) {
        item.avatar = c.userAvatar;
    }
    if (replies.length > 0) {
        item.replies = replies;
        item.reply_count = replies.length;
    }
    return item;
}

function execute(input, next) {
    let raw = String(input || '').trim();
    let m = raw.match(/\/novel\/([^\/\?#]+)/);
    let slug = (m && m[1]) ? m[1] : raw;
    if (!slug) return Response.error('Thiếu mã định danh truyện');

    let resNovel = fetchPage(BASE_URL + '/api/novels/' + slug);
    if (!resNovel.ok) return Response.error('HTTP ' + resNovel.status);

    let jsonNovel = JSON.parse(resNovel.text());
    let novelId = (jsonNovel && jsonNovel.success && jsonNovel.data && jsonNovel.data._id) ? jsonNovel.data._id : '';
    if (!novelId) return Response.error('Không tìm thấy thông tin truyện để tải bình luận.');

    let pageNum = next ? next : '1';
    let resComments = fetchPage(BASE_URL + '/api/novels/' + novelId + '/comments?page=' + pageNum + '&limit=10&all=true');
    if (!resComments.ok) return Response.error('HTTP ' + resComments.status);

    let jsonComments = JSON.parse(resComments.text());
    if (!jsonComments || !jsonComments.success || !Array.isArray(jsonComments.data)) {
        return Response.error('Không tải được bình luận.');
    }

    let comments = [];
    for (let i = 0; i < jsonComments.data.length; i++) {
        if (jsonComments.data[i]) {
            comments.push(mapComment(jsonComments.data[i]));
        }
    }

    let nextPage = '';
    if (jsonComments.pagination && jsonComments.pagination.page < jsonComments.pagination.pages) {
        nextPage = String(jsonComments.pagination.page + 1);
    } else if (!jsonComments.pagination && jsonComments.data.length > 0) {
        nextPage = String(parseInt(pageNum, 10) + 1);
    }
    return Response.success(comments, nextPage);
}
