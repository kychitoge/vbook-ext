load("config.js");

function execute(url, page) {
  if (!page) page = "1";
  url = normalizeUrl(url);

  var queryUrl = url;
  // Decide which page parameter this endpoint uses: "page" or "paged"
  var pageParam = /[?&]paged=/i.test(url) ? "paged" : "page";

  var pageRegex = new RegExp('([?&])' + pageParam + '=[^&]*', 'i');
  if (pageRegex.test(url)) {
    queryUrl = url.replace(pageRegex, '$1' + pageParam + '=' + page);
  } else {
    if (parseInt(page, 10) > 1) {
      var separator = queryUrl.indexOf("?") !== -1 ? "&" : "?";
      queryUrl = queryUrl + separator + pageParam + "=" + page;
    }
  }

  var response = fetchApi(queryUrl);
  if (!response.ok) {
    return Response.error("Lỗi mạng: " + response.status);
  }

  var data = response.json();
  var items = parseApiList(data);
  var list = [];

  if (items.length > 0) {
    var isWP = false;
    if (items.length > 0) {
      var first = items[0];
      if (first.title && typeof first.title === "object" && first.title.rendered) {
        isWP = true;
      } else if (first._embedded || first.slug) {
        isWP = true;
      }
    }

    if (isWP) {
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        list.push({
          name: getTitleText(item),
          link: buildMangaLink(item.slug),
          cover: extractCoverUrl(item),
          description: extractAuthorName(item),
          host: BASE_URL
        });
      }
    } else {
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        list.push({
          name: cleanText(item.title),
          link: buildMangaLink(item.slug),
          cover: extractCoverUrl(item),
          description: cleanText(item.author),
          host: BASE_URL
        });
      }
    }
  }

  // Determine pagination end via max_pages, X-WP-TotalPages, or perPage fallback.
  let currentPage = parseInt(page, 10) || 1;
  let next = "";
  if (list.length > 0) {
    let maxPages = 0;
    if (data && data.max_pages !== undefined) {
      maxPages = parseInt(data.max_pages, 10) || 0;
    } else {
      let totalPagesHeader = getResponseHeader(response, "X-WP-TotalPages");
      if (totalPagesHeader) {
        maxPages = parseInt(totalPagesHeader, 10) || 0;
      }
    }

    if (maxPages > 0) {
      if (currentPage < maxPages) {
        next = String(currentPage + 1);
      }
    } else {
      let perPage = 20;
      let perMatch = queryUrl.match(/[?&](?:per_page|limit)=?(\d+)/i);
      if (perMatch && perMatch[1]) {
        perPage = parseInt(perMatch[1], 10) || perPage;
      }
      if (items.length >= perPage) {
        next = String(currentPage + 1);
      }
    }
  }

  return Response.success(list, next);
}

