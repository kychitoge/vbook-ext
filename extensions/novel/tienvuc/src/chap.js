load('config.js');

function execute(url) {
    url = normalizeUrl(url);

    // Ưu tiên 1: Tải HTML trực tiếp (đối với các chương miễn phí render SSR)
    var response = fetch(url);
    if (response.ok) {
        var doc = response.html();
        if (doc) {
            var contentEl = doc.select(".chapter-content").first();
            if (contentEl && contentEl.select("p").size() > 0) {
                contentEl.select("script, style, button, .is-hidden-mobile").remove();
                var htmlContent = contentEl.html();
                if (htmlContent && cleanText(htmlContent).length > 50) {
                    return Response.success(htmlContent);
                }
            }
        }
    }

    // Ưu tiên 2: Sử dụng Headless Browser để tự động giải mã & render JS (đối với chương VIP / render Client)
    if (typeof Engine !== 'undefined' && Engine && typeof Engine.newBrowser === 'function') {
        var browser = Engine.newBrowser();
        try {
            var pageDoc = browser.launch(url, 10000);
            if (pageDoc) {
                var contentEl2 = pageDoc.select(".chapter-content").first();
                if (contentEl2) {
                    contentEl2.select("script, style, button, .is-hidden-mobile").remove();
                    var htmlContent2 = contentEl2.html();
                    if (htmlContent2 && cleanText(htmlContent2).length > 50) {
                        return Response.success(htmlContent2);
                    }
                }
            }
        } catch (e) {
            Log.log("[tienvuc] Lỗi render trình duyệt: " + e);
        } finally {
            if (browser && typeof browser.close === 'function') {
                browser.close();
            }
        }
    }

    return Response.error("Không thể lấy nội dung chương. Vui lòng kiểm tra lại đăng nhập trên ứng dụng.");
}