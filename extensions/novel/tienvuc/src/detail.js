load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    var slug = url.split('/').pop().split('?')[0];
    var response = fetch(BASE_URL + '/api/reading/' + slug);

    if (response.ok) {
        var detail = response.json();
        var ongoing = detail.status !== "D";
        var statusText = ongoing ? "Đang ra" : "Hoàn thành";
        var authorName = detail.author ? detail.author.name : (detail.createdBy ? detail.createdBy.name : "Đang cập nhật");

        // Thể loại
        var genres = [];
        var genreNames = [];
        if (detail.categories && detail.categories.length > 0) {
            detail.categories.forEach(function(cat) {
                if (cat && cat.name) {
                    genres.push({
                        title: cat.name,
                        input: cat.slug,
                        script: "cate.js"
                    });
                    genreNames.push(cat.name);
                }
            });
        }

        // Ảnh bìa
        var cover = "";
        if (detail.cover) {
            if (typeof detail.cover === "string") {
                cover = detail.cover;
            } else if (detail.cover.domain && detail.cover.url) {
                cover = detail.cover.domain + '/' + detail.cover.url;
            }
        }
        cover = normalizeUrl(cover);

        // Khối chi tiết thông tin
        var detailInfo = "";
        detailInfo += "Tác giả: " + authorName;
        detailInfo += "<br>Trạng thái: " + statusText;
        if (detail.vip === true) {
            detailInfo += " 【Truyện VIP】";
        }
        if (detail.views) {
            detailInfo += "<br>Lượt xem: " + detail.views;
        }
        if (genreNames.length > 0) {
            detailInfo += "<br>Thể loại: " + genreNames.join(", ");
        }
        if (detail.updatedAt) {
            var dateStr = String(detail.updatedAt).split('T')[0];
            detailInfo += "<br>Cập nhật: " + dateStr;
        }

        // Cấu hình Comments chuẩn vBook contract: input là url truyện
        var comments = [
            {
                title: "Bình luận",
                input: url,
                script: "comment.js"
            }
        ];

        return Response.success({
            name: detail.name,
            cover: cover,
            author: authorName,
            description: detail.intro || "",
            detail: detailInfo,
            ongoing: ongoing,
            genres: genres,
            comments: comments,
            host: BASE_URL
        });
    }

    return Response.error("Không thể tải thông tin truyện");
}