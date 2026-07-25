load('config.js');

function execute(url) {
    url = normalizeUrl(url);

    var response = fetchPage(url);
    if (!response.ok) return Response.error('HTTP Error: ' + response.status);

    var rawHtml = response.text();
    if (!rawHtml) return Response.error('Trang trống');

    var doc = Html.parse(rawHtml);
    if (!doc) return Response.error('Không thể parse HTML');

    var titleEl = doc.select('.chapter-reader-title, h1').first();
    var title = titleEl ? cleanText(titleEl.text()) : '';

    var contentEl = doc.select('.chapter-reader-content').first();
    if (!contentEl) contentEl = doc.select('.story-content').first();
    if (!contentEl) contentEl = doc.select('#workChapContent').first();
    if (!contentEl) contentEl = doc.select('article').first();
    if (!contentEl) return Response.error('Không tìm thấy nội dung chương');

    contentEl.select('script, style, iframe, .ads-class, .ads, .quang-cao, .chapter-nav').remove();

    var content = contentEl.html();
    if (!content) return Response.error('Nội dung chương trống');

    content = content.replace(/<!DOCTYPE[^>]*>/gi, '');
    content = content.replace(/<\/?(?:html|head|body)[^>]*>/gi, '');
    content = content.replace(/[\u200B-\u200D\uFEFF]/g, '');

    return Response.success(content, title);
}
