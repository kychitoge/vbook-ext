load("config.js");

function buildDescription(item) {
  var text = "";

  if (item && item.content && item.content.rendered) {
    text = item.content.rendered;
  } else if (item && item.excerpt && item.excerpt.rendered) {
    text = item.excerpt.rendered;
  }

  return cleanDescription(text);
}

function execute(url) {
  url = normalizeUrl(url);
  let lookup = fetchMangaByUrl(url, true);
  if (!lookup.ok) {
    return Response.error("Lỗi tải chi tiết truyện: " + lookup.status);
  }
  if (!lookup.item) {
    return Response.error("Không tìm thấy truyện");
  }

  let item = lookup.item;
  var coverUrl = extractCoverUrl(item);
  var authorName = extractAuthorName(item);

  var description = buildDescription(item);

  var genres = [];
  var genreTexts = [];
  var terms = collectTerms(item, ["genre", "category"]);
  for (var i = 0; i < terms.length; i++) {
    var term = terms[i];
    genres.push({
      title: term.name,
      input: API_URL + "/wp/v2/manga?genre=" + term.id + "&per_page=20&_embed=wp:featuredmedia,author,wp:term",
      script: "gen.js"
    });
    genreTexts.push(term.name);
  }

  var mangaStatus = item.manga_status ? String(item.manga_status).toLowerCase() : "";
  var statusText = "Đang ra";
  var isOngoing = false;

  if (mangaStatus === "ongoing") {
    statusText = "Đang ra";
    isOngoing = true;
  } else if (mangaStatus === "completed") {
    statusText = "Hoàn thành";
  } else if (mangaStatus === "hiatus") {
    statusText = "Tạm ngưng";
  } else if (mangaStatus === "cancelled") {
    statusText = "Đã hủy";
  } else if (mangaStatus) {
    statusText = mangaStatus;
  }

  let detailParts = [
    "Tác giả: " + authorName
  ];
  if (genreTexts.length > 0) {
    detailParts.push("Thể loại: " + genreTexts.join(", "));
  }
  detailParts.push("Trạng thái: " + statusText);
  if (item.views !== undefined && item.views !== null) {
    let views = Math.max(0, item.views);
    detailParts.push("Lượt xem: " + views.toLocaleString());
  }
  let detailInfo = detailParts.join("<br/>");

  let suggests = [];
  let authorTerms = collectTerms(item, ["author_tax"]);
  for (let j = 0; j < authorTerms.length; j++) {
    let authorTerm = authorTerms[j];
    suggests.push({
      title: "Cùng tác giả: " + authorTerm.name,
      input: API_URL + "/wp/v2/manga?author_tax=" + authorTerm.id + "&per_page=20&_embed=wp:featuredmedia,author,wp:term",
      script: "gen.js"
    });
  }

  return Response.success({
    name: getTitleText(item),
    cover: coverUrl,
    host: BASE_URL,
    author: authorName,
    status: statusText,
    description: description,
    detail: detailInfo,
    ongoing: isOngoing,
    genres: genres,
    suggests: suggests,
    url: url,
    type: "novel",
    format: "novel"
  });
}

