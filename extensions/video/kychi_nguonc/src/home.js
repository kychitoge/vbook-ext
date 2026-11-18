function execute() {
    return Response.success([
        { title: "Phim mới cập nhật", input: "/api/films/phim-moi-cap-nhat", script: "search.js" },
        { title: "Phim bộ", input: "/api/films/danh-sach/phim-bo", script: "search.js" },
        { title: "Phim lẻ", input: "/api/films/danh-sach/phim-le", script: "search.js" },
        { title: "Hoạt hình", input: "/api/films/danh-sach/hoat-hinh", script: "search.js" },
        { title: "TV Shows", input: "/api/films/danh-sach/tv-shows", script: "search.js" }
    ]);
}
