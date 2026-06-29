load('config.js');

function execute() {
    return Response.success([
        { title: "男频·玄幻", input: BOOKSHELF_BASE_URL + "/qbread/api/rank/list?groupid=1501&start={{page}}&count=20&sub=", script: "gen.js" },
        { title: "男频·都市", input: BOOKSHELF_BASE_URL + "/qbread/api/rank/list?groupid=1505&start={{page}}&count=20&sub=", script: "gen.js" },
        { title: "男频·仙侠", input: BOOKSHELF_BASE_URL + "/qbread/api/rank/list?groupid=1504&start={{page}}&count=20&sub=", script: "gen.js" },
        { title: "女频·现代言情", input: BOOKSHELF_BASE_URL + "/qbread/api/rank/list?groupid=1524&start={{page}}&count=20&sub=", script: "gen.js" },
        { title: "女频·古代言情", input: BOOKSHELF_BASE_URL + "/qbread/api/rank/list?groupid=1523&start={{page}}&count=20&sub=", script: "gen.js" },
        { title: "女频·仙侠奇缘", input: BOOKSHELF_BASE_URL + "/qbread/api/rank/list?groupid=1517&start={{page}}&count=20&sub=", script: "gen.js" },
        { title: "纯爱", input: BOOKSHELF_BASE_URL + "/qbread/api/rank/list?groupid=1707&start={{page}}&count=20&sub=", script: "gen.js" }
    ]);
}
