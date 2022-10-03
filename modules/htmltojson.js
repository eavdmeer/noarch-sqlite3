const { parse } = require('himalaya');

function htmlToJson(html)
{
  const data = parse(html);
  const hdr = data.shift();
  const fields = hdr.children
    .filter(v => v.type === 'element' && v.tagName === 'th')
    .map(v => v.children.pop().content);
  const values = data
    .filter(v => v.type === 'element' && v.tagName === 'tr')
    .map(v => v.children
      .filter(w => w.type === 'element' && w.tagName === 'td')
      .map(w => w.children.pop().content)
      .reduce((a, w, i) =>
      {
        a[fields[i]] = w;
        return a;
      }, {})
    );
  return values;
}

module.exports = { htmlToJson };
