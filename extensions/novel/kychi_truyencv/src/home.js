load("config.js");

function execute() {
  return Response.success([
    {
      title: "Mới cập nhật",
      input: API_URL + "/wp/v2/manga?orderby=modified&order=desc&per_page=20&_embed=wp:featuredmedia,author,wp:term&page=",
      script: "gen.js"
    },
    {
      title: "Truyện mới đăng",
      input: API_URL + "/wp/v2/manga?orderby=date&order=desc&per_page=20&_embed=wp:featuredmedia,author,wp:term&page=",
      script: "gen.js"
    },
    {
      title: "Xem nhiều nhất",
      input: API_URL + "/initmanga/v1/ranking?tab=views&range=all_time&limit=20&page=",
      script: "gen.js"
    },
    {
      title: "Đang ra",
      input: API_URL + "/wp/v2/manga?orderby=modified&order=desc&per_page=20&_embed=wp:featuredmedia,author,wp:term&manga_status=ongoing&page=",
      script: "gen.js"
    },
    {
      title: "Đã hoàn thành",
      input: API_URL + "/wp/v2/manga?orderby=modified&order=desc&per_page=20&_embed=wp:featuredmedia,author,wp:term&manga_status=completed&page=",
      script: "gen.js"
    }
  ]);
}
