load("config.js");

function execute() {
    var g = String(GENDER);
    var libHot  = FANQIE_URL + "/api/author/library/book_list/v0/?page_count=20&creation_status=-1&word_count=-1&book_type=-1&sort=0&gender=" + g + "&category_id=-1&page_index={{page}}";
    var libNew  = FANQIE_URL + "/api/author/library/book_list/v0/?page_count=20&creation_status=-1&word_count=-1&book_type=-1&sort=1&gender=" + g + "&category_id=-1&page_index={{page}}";
    var libDone = FANQIE_URL + "/api/author/library/book_list/v0/?page_count=20&creation_status=0&word_count=-1&book_type=-1&sort=0&gender=" + g + "&category_id=-1&page_index={{page}}";
    var libLong = FANQIE_URL + "/api/author/library/book_list/v0/?page_count=20&creation_status=-1&word_count=3&book_type=-1&sort=2&gender=" + g + "&category_id=-1&page_index={{page}}";
    return Response.success([
        { title: "\u70ED\u95E8\u63A8\u8350", input: libHot,  script: "gen.js" },
        { title: "\u65B0\u4E66\u901F\u9012", input: libNew,  script: "gen.js" },
        { title: "\u5B8C\u7ED3\u7CBE\u9009", input: libDone, script: "gen.js" },
        { title: "\u957F\u7BC7\u5DE8\u8457", input: libLong, script: "gen.js" },
        { title: "\uD83D\uDCDA \u4E66\u67B6", input: FANQIE_URL + "/api/reader/book/progress", script: "bookshelf.js" }
    ]);
}
