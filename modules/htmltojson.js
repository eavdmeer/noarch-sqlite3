const debug = require('debug')('htmltojson');
const { parse } = require('himalaya');

function htmlToJson(html)
{
  if (html === '') { return []; }

  // Parse valid incoming data
  const data = parse(html);
  if (! (data instanceof Array))
  {
    throw new Error('Failed to parse sqlite3 HTML!');
  }
  debug('parsed data:', JSON.stringify(data, null, 2));

  // Filter for only data rows
  const rows = data
    .filter(v => v.type === 'element' && v.tagName === 'tr');
  debug('rows:', JSON.stringify(rows, null, 2));

  // Extract the header, if any
  const hdr = rows.shift();
  if (! hdr)
  {
    throw new Error('Unable to find any header rows!');
  }
  debug('header:', JSON.stringify(hdr, null, 2));
  const fields = hdr.children
    .filter(v => v.type === 'element' && v.tagName === 'th')
    .map(v => v.children.pop().content);
  if (fields.length === 0)
  {
    throw new Error('Unable to detect HTML header <TH> elements! Did you include -header?');
  }
  debug('fields:', JSON.stringify(fields, null, 2));

  const values = rows
    .map(v => v.children
      .filter(w => w.type === 'element' && w.tagName === 'td')
      .map(w => w.children.pop().content)
      .reduce((a, w, i) =>
      {
        a[fields[i]] = w;
        return a;
      }, {})
    );
  debug('values:', JSON.stringify(values, null, 2));

  return values;
}

module.exports = { htmlToJson };
