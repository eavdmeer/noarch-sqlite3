/* global describe, it, expect */

const { convert, sqlite3Parse } = require('./sqlite3parse');

describe('convert', () =>
{
  it('properly converts booleans', () =>
  {
    expect(convert('true')).toBe(true);
    expect(convert('false')).toBe(false);
    expect(convert('TRUE')).toBe(true);
    expect(convert('FALSE')).toBe(false);
  });
  it('properly converts integers', () =>
  {
    expect(convert('1')).toBe(1);
    expect(convert('1000')).toBe(1000);
    expect(convert('1000000000000')).toBe(1000000000000);
  });
  it('properly converts floats', () =>
  {
    expect(convert('1.0')).toBe(1.0);
    expect(convert('12.34')).toBe(12.34);
    expect(convert('0.004')).toBe(0.004);
    expect(convert('4e-4')).toBe(4e-4);
    expect(convert('4.23e+4')).toBe(4.23e+4);
  });
});

describe('htmltojson', () =>
{
  it('properly handles empty sqlite3 html output', () =>
  {
    const html = '';
    expect(sqlite3Parse(html)).toEqual([]);
  });
  it('properly handles sqlite3 html output without header', () =>
  {
    const html = '<TR><TD>dashboard</TD></TR>';
    expect(() => sqlite3Parse(html)).toThrow(/Unable to detect HTML header/);
  });
  it('properly handles non-sqlite3 html', () =>
  {
    const html = `</TR>
    <TR>
      <TD>dashboard</TD>
      <TD>no comment</TD>
    </TR>`;
    expect(() => sqlite3Parse(html)).toThrow(/Parse error in HTML/);
  });
  it('properly parses sqlite3 html output', () =>
  {
    const html = `<TR>
      <TH>package</TH>
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
      [
        {
          package: 'dashboard',
          comment: 'no comment'
        },
        {
          package: 'dashboard-backend',
          comment: 'This is a\ncomment over multiple lines\n\nwith an empty line'
        }
      ]
    ];
    expect(sqlite3Parse(html)).toEqual(json);
  });
  it('properly parses multi-record sqlite3 html output', () =>
  {
    const html = `<TR>
      <TH>timeout</TH>
    </TR>
    <TR>
      <TD>10000</TD>
    </TR>
    <TR>
      <TH>package</TH>
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
      [
        {
          timeout: '10000'
        }
      ],
      [
        {
          package: 'dashboard',
          comment: 'no comment'
        },
        {
          package: 'dashboard-backend',
          comment: 'This is a\ncomment over multiple lines\n\nwith an empty line'
        }
      ]
    ];
    expect(sqlite3Parse(html)).toEqual(json);
  });
  it('properly parses sqlite3 html output with empty values', () =>
  {
    const html = `
      <TR>
        <TH>applicationId</TH>
        <TH>connectionId</TH>
        <TH>environmentId</TH>
        <TH>application</TH>
        <TH>environment</TH>
        <TH>connection</TH>
        <TH>ctype</TH>
        <TH>direction</TH>
        <TH>status</TH>
        <TH>notes</TH>
        <TH>name</TH>
        <TH>value</TH>
      </TR>
      <TR>
        <TD>3</TD>
        <TD>3</TD>
        <TD>1</TD>
        <TD>Summit</TD>
        <TD>test</TD>
        <TD>SUMMIT-T</TD>
        <TD>XFB</TD>
        <TD>out</TD>
        <TD>inactive</TD>
        <TD>No notes.</TD>
        <TD></TD>
        <TD></TD>
      </TR>`;
    const json = [
      [
        {
          applicationId: 3,
          connectionId: 3,
          environmentId: 1,
          application: 'Summit',
          environment: 'test',
          connection: 'SUMMIT-T',
          ctype: 'XFB',
          direction: 'out',
          status: 'inactive',
          notes: 'No notes.',
          name: '',
          value: ''
        }
      ]
    ];

    expect(sqlite3Parse(html, true)).toEqual(json);
  });
  it('properly auto-converts sqlite3 html output values', () =>
  {
    const html = `<TR>\
      <TH>package</TH>
      <TH>isNew</TH>
      <TH>installCount</TH>
    </TR>
    <TR>
      <TD>dashboard</TD>
      <TD>true</TD>
      <TD>123</TD>
    </TR>
    <TR>
      <TD>dashboard-backend</TD>
      <TD>false</TD>
      <TD>10.55</TD>
    </TR>`;
    const json = [
      [
        {
          package: 'dashboard',
          isNew: true,
          installCount: 123
        },
        {
          package: 'dashboard-backend',
          isNew: false,
          installCount: 10.55
        }
      ]
    ];
    expect(sqlite3Parse(html, true)).toEqual(json);
  });
  it('properly auto-converts sqlite3 html with lots of white space', () =>
  {
    const html = `

<TR>
  <th>aap</th>
  <TH>noot</th>
  <TH>comment</th>
  <TH>timestamp</th>
</tr>
<tr>
  <td>1</td>
  <td>2</td>
  <td>2
and
3</td>
  <td>2022-10-11 20:44:00</td>
</tr>
<tr>
  <th>timeout</th>
</tr>
<tr>
  <td>300000</td>
</tr>

<tr>
  <td></td>
</tr>



`;

    const json = [
      [
        {
          aap: 1,
          noot: 2,
          comment: '2\nand\n3',
          timestamp: '2022-10-11 20:44:00'
        }
      ],
      [
        { timeout: 300000 },
        { timeout: '' }
      ]
    ];
    expect(sqlite3Parse(html, true)).toEqual(json);
  });
});
