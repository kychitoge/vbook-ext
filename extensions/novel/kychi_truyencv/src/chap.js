load("config.js");

function stripDuplicateChapterTitle(content, chapterData) {
  if (!content) return "";
  let parts = content.split(/<br\s*\/?>/i);
  if (parts.length <= 1) return content;

  let firstLine = cleanText(parts[0].replace(/<[^>]*>/g, ""));
  if (!firstLine || firstLine.length > 160) return content;

  let isDuplicate = /^(?:chương|hồi|quyển)\s*\d+\s*(?:[:.\-–]|$)/i.test(firstLine);
  if (!isDuplicate && chapterData && chapterData.title) {
    let titleText = cleanText(chapterData.title).toLowerCase();
    if (titleText && firstLine.toLowerCase().indexOf(titleText) !== -1) {
      isDuplicate = true;
    }
  }

  if (isDuplicate) {
    parts.shift();
    return parts.join("<br/>").replace(/^(<br\/>\s*)+/, "");
  }
  return content;
}

function execute(url) {
  url = normalizeUrl(url);
  if (!checkConfigured()) {
    return Response.error("Ủa chưa điền email/mật khẩu trong cài đặt thì tớ lấy token bằng niềm tin à? Điền lẹ đi nha! :D");
  }

  var response = fetchApi(url);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      return Response.error("Cấu hính tài khoản mật khẩu trong cài đặt ext nhé ! Tải nó ban tự chịu :)) ");
    }
    return Response.error("Lỗi tải nội dung chương: " + response.status);
  }

  var data = response.json();
  
  if (!data) {
    return Response.error("Dữ liệu chương trống từ server.");
  }

  if (data.lock_type && data.lock_type !== "none") {
    var lockMsg = "Chương này đang bị khóa";
    if (data.lock_type === "premium" || data.lock_type === "pay") {
      lockMsg += ". Cần mua chương trong app.";
    } else if (data.lock_type === "login") {
      lockMsg += ". Cần đăng nhập để xem.";
    } else {
      lockMsg += ".";
    }
    return Response.error(lockMsg);
  }

  var htmlContent = "";
  if (data && data.content) {
    if (typeof data.content === "string") {
      htmlContent = data.content;
    } else if (typeof data.content === "object" && data.content.rendered) {
      htmlContent = data.content.rendered;
    }
  } else if (data && data.post_content) {
    htmlContent = String(data.post_content);
  } else if (data && typeof data === "string") {
    htmlContent = data;
  }

  let cleanedContent = cleanChapterContent(htmlContent);
  cleanedContent = stripDuplicateChapterTitle(cleanedContent, data);

  if (!cleanedContent || cleanedContent.trim() === "") {
    return Response.error("Nội dung chương trống. Vui lòng thử lại sau.");
  }

  return Response.success(cleanedContent);
}
