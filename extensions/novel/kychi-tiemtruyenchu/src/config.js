var BASE_URL = "https://kychitoge.pages.dev";

var Response = {
    success: function(data, data2) {
        return JSON.stringify({ code: 0, data: data, data2: data2 });
    },
    error: function(data) {
        return JSON.stringify({ code: 1, data: data });
    }
};

function cleanText(text) {
    if (text === undefined || text === null) return "";
    return String(text).replace(/\s+/g, " ").trim();
}

var DEMO_STORY = {
    name: "Tiệm Truyện Chữ",
    link: BASE_URL,
    description: "Liên hệ kychi",
    cover: "https://i.ibb.co/Xx0tpJPF/ttc-vbook.png",
    tag: "demo",
    author: "kychi",
    host: BASE_URL
};

var DEMO_DETAIL = {
    name: "Tiệm Truyện Chữ",
    cover: "https://i.ibb.co/Xx0tpJPF/ttc-vbook.png",
    author: "kychi",
    description: "Lưu ý: TTC ghim vbook nên không công khai, sử dụng vui lòng liên hệ đặt riêng\n\nDiscord: @kyctg\nHoặc mở trang nguồn tại trang chi tiết này để thêm thông tin liên hệ khác",
    detail: "Tác giả: kychi\nTrạng thái:Demo\nDiscord: @kyctg",
    url: BASE_URL,
    type: "novel",
    format: "novel",
    ongoing: true,
    tags: [],
    genres: [],
    suggests: [],
    comments: [],
    reviews: [],
    host: BASE_URL
};
