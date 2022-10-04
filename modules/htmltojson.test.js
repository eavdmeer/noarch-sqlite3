/* global describe, it, expect */

const { htmlToJson } = require('./htmltojson');

describe('htmltojson', () =>
{
  it('properly handles empty sqlite3 html output', () =>
  {
    const html = '';
    expect(htmlToJson(html)).toEqual([]);
  });
  it('properly handles sqlite3 html output without header', () =>
  {
    const html = '<TABLE><TR><TD>dashboard</TD></TR></TABLE>';
    expect(() => htmlToJson(html)).toThrow(/Unable to find any header rows/);
  });
  it('properly handles non-sqlite3 html', () =>
  {
    const html = `</TR>
    <TR>
      <TD>dashboard</TD>
      <TD>no comment</TD>
    </TR>`;
    expect(() => htmlToJson(html)).toThrow(/Unable to detect HTML header/);
  });
  it('properly parses sqlite3 html output', () =>
  {
    const html = `<TR><TH>package</TH>
      <TH>comment</TH>
    </TR>
    <TR>
      <TD>dashboard</TD>
      <TD>no comment</TD>
    </TR>
    <TR>
      <TD>dashboard-backend</TD>
      <TD>This is a
comment over multiple lines

with an empty line</TD>
    </TR>`;
    const json = [
      {
        package: 'dashboard',
        comment: 'no comment'
      },
      {
        package: 'dashboard-backend',
        comment: 'This is a\ncomment over multiple lines\n\nwith an empty line'
      }
    ];
    expect(htmlToJson(html)).toEqual(json);
  });
});
