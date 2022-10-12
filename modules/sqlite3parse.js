const debug = require('debug')('sqlite3parse');

function convert(val)
{
  if (/^true$/i.test(val))
  {
    return true;
  }
  if (/^false$/i.test(val))
  {
    return false;
  }
  if (/^\d+$/i.test(val))
  {
    return parseInt(val, 10);
  }
  if (/^(\d+\.\d+|\d+e[+-]\d+|\d+\.\d+e[+-]\d+)$/i.test(val))
  {
    return parseFloat(val);
  }
  return val;
}

function processSet(set, autoConvert)
{
  const hdr = set.shift();
  debug('set header:', JSON.stringify(hdr));
  const fields = hdr.map(v => v.pop());
  debug('set fields:', JSON.stringify(fields));

  const values = set
    .map(v => v
      .map(w => w.length > 0 ? w.pop() : '')
      .reduce((a, w, i) =>
      {
        a[fields[i]] = autoConvert ? convert(w) : w;
        return a;
      }, {})
    );
  debug('set values:', JSON.stringify(values));

  return values;
}

function sqlite3Parse(html = '', autoConvert = false)
{
  // Early out for empty input
  if (/^\s*$/gs.test(html)) { return []; }

  // Sanitize incoming HTML:
  // - remove all whitespace and newlines between tags
  // - make sure all tag names are lowercase
  const sanitized = html
    .replace(/<[/]?t[rhd]>/ig, v => v.toLowerCase())
    .replace(/[\s\n]*(<[/]?tr>)[\s\n]*/ig, '$1')
    .replace(/(<\/t[dh]>)[\s\n]*/ig, '$1');

  // Extract each row to an array of arrays like this:
  // [
  //   [
  //     [ 'th', 'one' ],
  //     [ 'th', 'two' ]
  //   ]
  //   [
  //     [ 'td', '1' ],
  //     [ 'td', '2' ]
  //   ]
  // ]
  //
  // This corresponds to object { one: '1', two: '2' }
  const rows = html.match(/<tr>(.*?)<\/tr>/sig)
    .map(row => row.match(/^<tr>(.*)<\/tr>$/is))
    .map(v => v[1])
    .map(row => row.match(/<t[dh]>(.*?)<\/t[dh]>/sig)
      .map(v => v.match(/^<(t[dh])>(.*)<\/t[dh]>$/si))
      .map(v => [ v[1].toLowerCase(), v[2] ]));
  debug('rows:', JSON.stringify(rows));

  // Translate this back to HTML so we can compare
  const compare = rows
    .map(v => `<tr>${v.map(w => `<${w[0]}>${w[1]}</${w[0]}>`).join('')}</tr>`)
    .join('');

  if (sanitized !== compare)
  {
    throw new Error('Parse error in HTML!');
  }

  // Find all rows with headers
  const headerRows =
    rows
      .map((v, i) => v.some(w => w[0] === 'th') ? i : false)
      .filter(v => v !== false);
  debug('headers found in row(s):', headerRows);

  if (headerRows.length === 0)
  {
    throw new Error('Unable to detect HTML header <TH> elements! Did you include -header?');
  }

  // Cut the rows into sets with their own header, starting at the back of
  // the rows
  const set = [];
  headerRows.reverse().forEach(v => set.unshift(rows.splice(v)));
  debug('found', set.length, 'sets:');
  set.forEach((s, i) => debug('set', i + 1, JSON.stringify(s)));

  const values = set.map(v => processSet(v, autoConvert));

  debug('final values:', JSON.stringify(values));
  return values;
}

module.exports = { sqlite3Parse, convert };
