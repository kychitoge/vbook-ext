load("config.js");

function execute(url) {
  if (!checkConfigured()) {
    return Response.error("Ủa chưa điền email/mật khẩu trong cài đặt thì tớ lấy token bằng niềm tin à? Điền lẹ đi nha! :D");
  }

  var mangaId = "";
  
  if (url && /^\d+$/.test(String(url).trim())) {
    mangaId = String(url).trim();
  } else {
    url = normalizeUrl(url);
    let lookup = fetchMangaByUrl(url, false);
    if (lookup.invalidUrl) {
      return Response.error("Đường dẫn truyện không hợp lệ: " + url);
    }
    if (!lookup.ok) {
      return Response.error("Lỗi lấy ID truyện để phân trang: " + lookup.status);
    }
    if (!lookup.item) {
      return Response.error("Không tìm thấy thông tin truyện để phân trang.");
    }
    mangaId = String(lookup.item.id);
  }

  var limit = 50;
  // Gọi thử trang đầu tiên của chapters với per_page=limit để lấy thông tin phân trang từ JSON body hoặc headers
  var testUrl = API_URL + "/initmanga/v1/chapters?manga_id=" + mangaId + "&paged=1&per_page=" + limit;
  var testResponse = fetchApi(testUrl);
  if (!testResponse.ok) {
    // Trả về mặc định 1 trang nếu không gọi được API
    return Response.success([API_URL + "/initmanga/v1/chapters?manga_id=" + mangaId + "&paged=1&per_page=" + limit]);
  }

  var totalPages = 0;
  
  // 1. Ưu tiên lấy trực tiếp total_pages từ JSON body của TruyệnCV (trả về trực tiếp trong response JSON)
  try {
    var testData = testResponse.json();
    if (testData) {
      if (testData.total_pages !== undefined) {
        totalPages = parseInt(testData.total_pages, 10);
      } else if (testData.total !== undefined) {
        totalPages = Math.ceil(parseInt(testData.total, 10) / limit);
      } else if (testData.count !== undefined) {
        totalPages = Math.ceil(parseInt(testData.count, 10) / limit);
      }
    }
  } catch (e) {}

  // 2. Dự phòng lấy từ HTTP headers nếu không parse được từ JSON body
  if (!totalPages || isNaN(totalPages) || totalPages <= 0) {
    var totalStr = "";
    if (testResponse.header && typeof testResponse.header === "function") {
      totalStr = testResponse.header("X-WP-Total") || testResponse.header("x-wp-total") || "";
    } else if (testResponse.headers) {
      if (typeof testResponse.headers.get === "function") {
        totalStr = testResponse.headers.get("X-WP-Total") || testResponse.headers.get("x-wp-total") || "";
      } else {
        totalStr = testResponse.headers["X-WP-Total"] || testResponse.headers["x-wp-total"] || "";
      }
    }
    if (totalStr) {
      var total = parseInt(totalStr, 10);
      if (total > 0) {
        totalPages = Math.ceil(total / limit);
      }
    }
  }

  // 3. Fallback: Nếu vẫn không lấy được, mặc định trả về 1 trang duy nhất
  if (!totalPages || isNaN(totalPages) || totalPages <= 0) {
    return Response.success([API_URL + "/initmanga/v1/chapters?manga_id=" + mangaId + "&paged=1&per_page=" + limit]);
  }

  var pages = [];
  // TruyệnCV trả về chương mới nhất ở paged=1 và chương cũ nhất ở paged=totalPages
  // Đếm lùi từ totalPages về 1 để vBook tải chương từ cũ nhất đến mới nhất (A-Z)
  for (var i = totalPages; i >= 1; i--) {
    pages.push(API_URL + "/initmanga/v1/chapters?manga_id=" + mangaId + "&paged=" + i + "&per_page=" + limit);
  }

  return Response.success(pages);
}
