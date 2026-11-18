function execute() {
    return Response.success([
        {
            title: "Truyện Hot Tháng Này",
            input: "/",
            script: "search.js"
        },
        {
            title: "Truyện Mới Cập Nhật",
            input: "/truyen-moi.html",
            script: "search.js"
        },
        {
            title: "Truyện Hoàn Thành",
            input: "/truyen-hoan-thanh.html",
            script: "search.js"
        }
    ]);
}
