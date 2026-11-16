load("config.js");

function execute(key, page) {
  if (!page) page = "1";
  let keyword = key ? String(key).trim() : "";
  if (!keyword) {
    return Response.success([], "");
  }

  let searchUrl = API_URL + "/wp/v2/manga?search=" + encodeURIComponent(keyword) + "&per_page=20&page=" + page + "&_embed=wp:featuredmedia,author,wp:term";
  
  let response = fetchApi(searchUrl);
  if (!response.ok) {
    return Response.error("Lỗi tìm kiếm: " + response.status);
  }

  let data = response.json();
  let items = parseApiList(data);
  let list = [];

  for (let i = 0; i < items.length; i++) {
    let item = items[i];
    list.push({
      name: getTitleText(item),
      link: buildMangaLink(item.slug),
      cover: extractCoverUrl(item),
      description: extractAuthorName(item),
      host: BASE_URL
    });
  }

  let currentPage = parseInt(page, 10) || 1;
  let totalPages = parseInt(getResponseHeader(response, "X-WP-TotalPages"), 10) || 0;
  let next = "";
  if (list.length > 0) {
    if (totalPages > 0) {
      if (currentPage < totalPages) {
        next = String(currentPage + 1);
      }
    } else if (items.length >= 20) {
      next = String(currentPage + 1);
    }
  }

  return Response.success(list, next);
}

