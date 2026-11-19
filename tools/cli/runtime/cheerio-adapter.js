'use strict';

const cheerio = require('cheerio');

function createCheerioWrapper(cheerioObj) {
  return {
    select: (sel) => {
      const found = cheerioObj.find ? cheerioObj.find(sel) : cheerioObj(sel);
      return createCheerioWrapper(found);
    },
    first: () => createCheerioWrapper(cheerioObj.first()),
    last: () => createCheerioWrapper(cheerioObj.last()),
    get: (idx) => createCheerioWrapper(cheerioObj.eq(idx)),
    text: () => cheerioObj.text().trim(),
    html: () => cheerioObj.html() || '',
    attr: (name) => cheerioObj.attr(name) || '',
    attributes: () => {
      const el = cheerioObj[0];
      return el && el.attribs ? { ...el.attribs } : {};
    },
    size: () => cheerioObj.length,
    isEmpty: () => cheerioObj.length === 0,
    map: (fn) => {
      const res = [];
      cheerioObj.each((i, el) => {
        res.push(fn(createCheerioWrapper(cheerio(el)), i));
      });
      return res;
    },
    forEach: (fn) => {
      cheerioObj.each((i, el) => {
        fn(createCheerioWrapper(cheerio(el)), i);
      });
    },
    hasClass: (cls) => cheerioObj.hasClass(cls),
    remove: () => {
      cheerioObj.remove();
      return createCheerioWrapper(cheerioObj);
    }
  };
}

function parseHtml(content) {
  const $ = cheerio.load(content || '');
  return createCheerioWrapper($.root());
}

module.exports = {
  createCheerioWrapper,
  parseHtml
};
