load('config.js');

let FALLBACK_GENRES = [
    { title: "Hành Động", slug: "hanh-dong" },
    { title: "Phiêu Lưu", slug: "phieu-luu" },
    { title: "Hoạt Hình", slug: "hoat-hinh" },
    { title: "Hài", slug: "phim-hai" },
    { title: "Hình Sự", slug: "hinh-su" },
    { title: "Tài Liệu", slug: "tai-lieu" },
    { title: "Chính Kịch", slug: "chinh-kich" },
    { title: "Gia Đình", slug: "gia-dinh" },
    { title: "Giả Tưởng", slug: "gia-tuong" },
    { title: "Lịch Sử", slug: "lich-su" },
    { title: "Kinh Dị", slug: "kinh-di" },
    { title: "Nhạc", slug: "phim-nhac" },
    { title: "Bí Ẩn", slug: "bi-an" },
    { title: "Lãng Mạn", slug: "lang-man" },
    { title: "Khoa Học Viễn Tưởng", slug: "khoa-hoc-vien-tuong" },
    { title: "Gây Cấn", slug: "gay-can" },
    { title: "Chiến Tranh", slug: "chien-tranh" },
    { title: "Tâm Lý", slug: "tam-ly" },
    { title: "Tình Cảm", slug: "tinh-cam" },
    { title: "Cổ Trang", slug: "co-trang" },
    { title: "Miền Tây", slug: "mien-tay" },
    { title: "Phim 18+", slug: "phim-18" }
];

function execute() {
    let response = fetch(BASE_URL, {
        headers: defaultHeaders(BASE_URL + "/")
    });

    if (response.ok) {
        let doc = response.html();
        let seen = {};
        let genres = [];
        doc.select("a[href*='/the-loai/']").forEach(function (el) {
            let href = (el.attr("href") + "").trim();
            let title = (el.text() + "").replace(/\s+/g, " ").trim();
            let m = href.match(/\/the-loai\/([^\/?#]+)/);
            if (!m || !title) return;
            let slug = m[1];
            if (seen[slug]) return;
            seen[slug] = true;
            genres.push({
                title: title,
                input: "/api/films/the-loai/" + slug,
                script: "search.js"
            });
        });
        if (genres.length > 0) {
            return Response.success(genres);
        }
    }

    return Response.success(FALLBACK_GENRES.map(function (g) {
        return {
            title: g.title,
            input: "/api/films/the-loai/" + g.slug,
            script: "search.js"
        };
    }));
}
