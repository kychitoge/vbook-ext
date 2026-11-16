load("config.js");

function buildChapterItem(item, orderIndex) {
  let rawNumber = item && item.number !== undefined && item.number !== null ? String(item.number) : "?";
  let rawTitle = item && item.title ? cleanText(item.title) : "";
  let chapterName = "Chương " + rawNumber + (rawTitle ? " : " + rawTitle : "");
  let chapterNo = Number(item && item.number);
  if (isNaN(chapterNo)) {
    chapterNo = null;
  }

  let lockType = item && item.lock_type ? String(item.lock_type).toLowerCase() : "none";
  let lockValue = item && item.lock_value ? Number(item.lock_value) : 0;
  let isPurchased = !!(item && item.is_purchased);
  let isPay = lockType === "premium" || lockType === "pay" || lockValue > 0;
  let isLock = lockType !== "none" && !isPurchased;

  return {
    name: chapterName,
    url: API_URL + "/initmanga/v1/chapter/" + item.id,
    host: BASE_URL,
    pay: isPay,
    lock: isLock,
    _chapterNo: chapterNo,
    _order: orderIndex
  };
}

function sortAndCleanChapters(list) {
  list.sort(function(a, b) {
    if (a._chapterNo !== null && b._chapterNo !== null && a._chapterNo !== b._chapterNo) {
      return a._chapterNo - b._chapterNo;
    }
    if (a._chapterNo === null && b._chapterNo !== null) return 1;
    if (a._chapterNo !== null && b._chapterNo === null) return -1;
    return a._order - b._order;
  });

  for (let i = 0; i < list.length; i++) {
    delete list[i]._chapterNo;
    delete list[i]._order;
  }
  return list;
}

function execute(input) {
  if (!checkConfigured()) {
    return Response.error("Ủa chưa điền email/mật khẩu trong cài đặt thì tớ lấy token bằng niềm tin à? Điền lẹ đi nha! :D");
  }

  // Khắc phục độ trễ TOC: Nếu input đã là một API URL phân trang từ page.js, gọi trực tiếp cực nhanh
  if (input && !/^\d+$/.test(String(input).trim())) {
    input = normalizeUrl(input);
  }
  if (input && input.indexOf("/initmanga/v1/chapters") !== -1) {
    let response = fetchApi(input);
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return Response.error("Cấu hình tài khoản mật khẩu trong cài đặt ext. Tải bị ban thì tự chịu :vv");
      }
      return Response.error("Lỗi tải mục lục chương: " + response.status);
    }

    let data = response.json();
    let items = parseApiList(data);
    let list = [];
    for (let i = 0; i < items.length; i++) {
      list.push(buildChapterItem(items[i], i));
    }

    return Response.success(sortAndCleanChapters(list));
  }

  // Fallback nếu không qua page.js (Mở trực tiếp từ đường dẫn chi tiết)
  let mangaId = "";
  if (input && /^\d+$/.test(String(input).trim())) {
    mangaId = String(input).trim();
  } else {
    let lookup = fetchMangaByUrl(input, false);
    if (lookup.invalidUrl) {
      return Response.error("Đường dẫn truyện không hợp lệ: " + input);
    }
    if (!lookup.ok) {
      return Response.error("Lỗi lấy ID truyện để tải chương: " + lookup.status);
    }
    if (!lookup.item) {
      return Response.error("Không tìm thấy thông tin truyện để tải chương.");
    }
    mangaId = String(lookup.item.id);
  }

  let allChapters = [];
  let orderIndex = 0;
  let page = 1;
  let limit = 50;
  let chapterListBaseUrl = API_URL + "/initmanga/v1/chapters?manga_id=" + mangaId;

  while (true) {
    let tocUrl = chapterListBaseUrl + "&paged=" + page + "&per_page=" + limit;
    let response = fetchApi(tocUrl);
    if (!response.ok) {
      if (page === 1) {
        if (response.status === 401 || response.status === 403) {
          return Response.error("Cấu hình tài khoản mật khẩu trong cài đặt ext. Tải bị ban thì tự chịu :vv");
        }
        return Response.error("Lỗi tải mục lục chương: " + response.status);
      }
      break;
    }

    let data = response.json();
    let items = parseApiList(data);

    if (items.length === 0) {
      break;
    }

    for (let i = 0; i < items.length; i++) {
      allChapters.push(buildChapterItem(items[i], orderIndex));
      orderIndex++;
    }

    if (items.length < limit) {
      break;
    }
    page++;

    if (page > 100) {
      break;
    }
  }

  if (allChapters.length === 0) {
    return Response.error("Không có chương nào được tải.");
  }

  return Response.success(sortAndCleanChapters(allChapters));
}

