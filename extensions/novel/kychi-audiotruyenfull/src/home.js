load('config.js');

function execute() {
    return Response.success([
        { title: "Mới Cập Nhật", input: "/?m_orderby=latest", script: "gen.js" },
        { title: "Lượt Xem", input: "/?m_orderby=views", script: "gen.js" },
        { title: "Thịnh Hành", input: "/?m_orderby=trending", script: "gen.js" },
        { title: "Đánh Giá", input: "/?m_orderby=rating", script: "gen.js" },
        { title: "Truyện Mới", input: "/?m_orderby=new-manga", script: "gen.js" },
        { title: "Truyện Full", input: "/trang-thai/hoan-thanh/", script: "gen.js" }
    ]);
}
