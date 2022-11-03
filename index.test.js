/* global jest, describe, it, expect, beforeAll, afterAll, afterEach */
const cp = require('node:child_process');
const fs = require('fs');
const async = require('async');

const sqlite3 = require('./');

// Need to mock execFileSync and execFile
jest.mock('node:child_process');

const dbFile = '/tmp/test.db3';

function standaloneTests(db)
{
  describe('noarch-sqlite3.configure', () =>
  {
    it('sets known options correctly', () =>
    {
      db.configure('busyTimeout', 30001);
      expect(db.options.busyTimeout).toBe(30001);
    });
    it('catches unknown options correctly', () =>
    {
      expect(() => db.configure('noSuchOption', 30001))
        .toThrow(/Invalid option: noSuchOption/);
    });
  });
  describe('noarch-sqlite3.safe', () =>
  {
    it('escapes single quotes correctly', () =>
    {
      expect(db.safe('no quotes here')).toBe('no quotes here');
      expect(db.safe('don\'t mess this up'))
        .toBe('don\'\'t mess this up');
      expect(db.safe('isn\'t it 5 o\'clock'))
        .toBe('isn\'\'t it 5 o\'\'clock');
    });
  });
  describe('noarch-sqlite3.quote', () =>
  {
    it('properly quotes values', () =>
    {
      expect(db.quote('string value')).toBe('\'string value\'');
      expect(db.quote(0)).toBe(0);
      expect(db.quote(100)).toBe(100);
      expect(db.quote(100.0)).toBe(100.0);
      expect(db.quote('10')).toBe('\'10\'');
      expect(db.quote('10.0')).toBe('\'10.0\'');
    });
  });
  describe('noarch-sqlite3.expandArgs', () =>
  {
    it('properly works without bind parameters', () =>
    {
      const q = 'SELECT * FROM packages WHERE package=\'dashboard\'';
      let d = [];
      expect(db.expandArgs(q, d))
        .toBe('SELECT * FROM packages WHERE package=\'dashboard\'');
      d = {};
      expect(db.expandArgs(q, d))
        .toBe('SELECT * FROM packages WHERE package=\'dashboard\'');
      d = undefined;
      expect(db.expandArgs(q, d))
        .toBe('SELECT * FROM packages WHERE package=\'dashboard\'');
    });
    it('properly substitutes a single value in a query', () =>
    {
      const q = 'SELECT * FROM packages WHERE package=?';
      const d = [ 'dashboard' ];
      expect(db.expandArgs(q, d))
        .toBe('SELECT * FROM packages WHERE package=\'dashboard\'');
      expect(db.expandArgs(q, ...d))
        .toBe('SELECT * FROM packages WHERE package=\'dashboard\'');
    });
    it('properly substitutes multiple values in a querY', () =>
    {
      const q = 'SELECT * FROM packages WHERE package=? AND npa=?';
      const d = [ 'dashboard', 'both' ];
      expect(db.expandArgs(q, d))
        .toBe('SELECT * FROM packages WHERE package=\'dashboard\' AND npa=\'both\'');
      expect(db.expandArgs(q, ...d))
        .toBe('SELECT * FROM packages WHERE package=\'dashboard\' AND npa=\'both\'');
    });
    it('properly substitutes mixed type values in a querY', () =>
    {
      const q = 'SELECT * FROM packages WHERE package=? AND npa=?';
      const d = [ 'dashboard', 121 ];
      expect(db.expandArgs(q, d))
        .toBe('SELECT * FROM packages WHERE package=\'dashboard\' AND npa=121');
    });
    it('properly catches missing bind parameter values for a query', () =>
    {
      const q = 'SELECT * FROM packages WHERE package=? AND npa=?';
      const d = [ 'dashboard' ];
      expect(() => db.expandArgs(q, d))
        .toThrow(/Too few .* bind parameter values/);
      expect(() => db.expandArgs(q, ...d))
        .toThrow(/Too few .* bind parameter values/);
    });
    it('properly catches extra bind parameter values for a query', () =>
    {
      const q = 'SELECT * FROM packages WHERE package=? AND npa=?';
      const d = [ 'dashboard', 'both', 'too many' ];
      expect(() => db.expandArgs(q, d))
        .toThrow(/Too many .* bind parameter values/);
      expect(() => db.expandArgs(q, ...d))
        .toThrow(/Too many .* bind parameter values/);
    });
    it('properly expands bind parameters in an object', () =>
    {
      const q = 'SELECT * FROM packages WHERE package=$pkg AND npa=:npa AND age=@age AND agelong=@agelong';
      const d = { bad: 'value', age: 21, npa: 'web', pkg: 'sqlite3',
        agelong: 50 };
      expect(db.expandArgs(q, d))
        .toBe('SELECT * FROM packages WHERE package=\'sqlite3\' AND npa=\'web\' AND age=21 AND agelong=50');
    });
    it('properly expands date bind parameters in an object', () =>
    {
      const q = 'SELECT * FROM packages WHERE date=$date';
      const now = new Date();
      const d = { date: now };
      expect(db.expandArgs(q, d))
        .toBe(`SELECT * FROM packages WHERE date='${now.toISOString()}'`);
    });
    it('properly expands simple date bind parameters', () =>
    {
      const q = 'SELECT * FROM packages WHERE date=?';
      const d = new Date();
      expect(db.expandArgs(q, d))
        .toBe(`SELECT * FROM packages WHERE date='${d.toISOString()}'`);
    });
  });
  describe('noarch-sqlite3.close', () =>
  {
    it('properly does callback on close', done =>
    {
      db.close(done);
    });
  });
}

function queryTests(db)
{
  const msg = `noarch-sqlite3.querry (${db.useJson ? '-json' : '-html'})`;
  describe(msg, () =>
  {
    it('properly selects the default record with query()', done =>
    {
      const q = 'SELECT * FROM packages WHERE package=?';
      const d = [ 'dashboard' ];
      db.all(q, d, (err, records) =>
      {
        if (err)
        {
          done(err);
          return;
        }
        expect(records).toEqual([
          {
            package: 'dashboard',
            url: 'https://dev.azure.com/P00743-dashboard',
            npa: 'web'
          }
        ]);
        done();
      });
    });
    it('properly selects the default record with get()', done =>
    {
      const q = 'SELECT * FROM packages WHERE package=?';
      const d = [ 'dashboard' ];
      db.get(q, d, (err, records) =>
      {
        if (err)
        {
          done(err);
          return;
        }
        expect(records).toEqual({
          package: 'dashboard',
          url: 'https://dev.azure.com/P00743-dashboard',
          npa: 'web'
        });
        done();
      });
    });
    it('properly runs multiple semicolon-separated queries', done =>
    {
      const q = 'SELECT * FROM packages WHERE package=?; SELECT * FROM packages WHERE package=?';
      const d = [ 'dashboard', 'dashboard' ];
      db.all(q, d, (err, records) =>
      {
        if (err)
        {
          done(err);
          return;
        }
        expect(records).toEqual([
          [
            {
              package: 'dashboard',
              url: 'https://dev.azure.com/P00743-dashboard',
              npa: 'web'
            }
          ],
          [
            {
              package: 'dashboard',
              url: 'https://dev.azure.com/P00743-dashboard',
              npa: 'web'
            }
          ]
        ]);
        done();
      });
    });
    it('properly reads result set with one empty record', done =>
    {
      const q = 'SELECT * FROM packages WHERE package=?; SELECT * FROM packages WHERE package=?';
      const d = [ 'non-existent', 'dashboard' ];
      db.all(q, d, (err, records) =>
      {
        if (err)
        {
          console.log(err.message);
          done(err);
          return;
        }
        expect(records).toEqual([
          {
            package: 'dashboard',
            url: 'https://dev.azure.com/P00743-dashboard',
            npa: 'web'
          }
        ]);
        done();
      });
    });
    it('properly inserts a new record', done =>
    {
      const q = 'INSERT INTO packages (package, url, npa) VALUES (?,?,?)';
      const d = [
        'dashboard-backend',
        'https://dev.azure.com/P00743-dashboard-backend',
        'web'
      ];
      db.run(q, d, err =>
      {
        if (err)
        {
          done(err);
          return;
        }
        db.all('SELECT * FROM packages', (err, records) =>
        {
          if (err)
          {
            done(err);
            return;
          }
          expect(records).toEqual([
            {
              package: 'dashboard',
              url: 'https://dev.azure.com/P00743-dashboard',
              npa: 'web'
            },
            {
              package: 'dashboard-backend',
              url: 'https://dev.azure.com/P00743-dashboard-backend',
              npa: 'web'
            }
          ]);
          done();
        });
      });
    });
    it('properly inserts multiple records', done =>
    {
      const q = `INSERT INTO
        packages (package, url, npa)
      VALUES
        (?,?,?),
        (?,?,?)`;
      const d = [
        'dashboard-backend',
        'https://dev.azure.com/P00743-dashboard-backend',
        'web',
        'gmdb-agent',
        'https://dev.azure.com/P00743-gmdb-agent',
        'both'
      ];
      db.run(q, ...d, err =>
      {
        if (err)
        {
          done(err);
          return;
        }
        db.all('SELECT * FROM packages', (err, records) =>
        {
          if (err)
          {
            done(err);
            return;
          }
          expect(records).toEqual([
            {
              package: 'dashboard',
              url: 'https://dev.azure.com/P00743-dashboard',
              npa: 'web'
            },
            {
              package: 'dashboard-backend',
              url: 'https://dev.azure.com/P00743-dashboard-backend',
              npa: 'web'
            },
            {
              package: 'gmdb-agent',
              url: 'https://dev.azure.com/P00743-gmdb-agent',
              npa: 'both'
            }
          ]);
          done();
        });
      });
    });
    it('properly runs calls the handler for each record', done =>
    {
      const q = `INSERT INTO
        packages (package, url, npa)
      VALUES
        (?,?,?),
        (?,?,?)`;
      const d = [
        'dashboard-backend',
        'https://dev.azure.com/P00743-dashboard-backend',
        'web',
        'gmdb-agent',
        'https://dev.azure.com/P00743-gmdb-agent',
        'both'
      ];
      db.run(q, d, err =>
      {
        if (err)
        {
          done(err);
          return;
        }
        const each = jest.fn();
        db.each('SELECT * FROM packages', each, (err, count) =>
        {
          if (err)
          {
            done(err);
            return;
          }
          expect(count).toBe(3);
          expect(each).toBeCalledTimes(3);
          expect(each).lastCalledWith(null, {
            package: 'gmdb-agent',
            url: 'https://dev.azure.com/P00743-gmdb-agent',
            npa: 'both'
          });
          done();
        });
      });
    });
    it('properly inserts multiple records in a transaction', done =>
    {
      const q = `BEGIN TRANSACTION;
      INSERT INTO
        packages (package, url, npa)
      VALUES
        (?,?,?),
        (?,?,?);
      COMMIT;`;
      const d = [
        'dashboard-backend-trans',
        'https://dev.azure.com/P00743-dashboard-backend',
        'web',
        'gmdb-agent-trans',
        'https://dev.azure.com/P00743-gmdb-agent',
        'both'
      ];
      db.run(q, d, err =>
      {
        if (err)
        {
          done(err);
          return;
        }
        db.all('SELECT * FROM packages', (err, records) =>
        {
          if (err)
          {
            done(err);
            return;
          }
          expect(records).toEqual([
            {
              package: 'dashboard',
              url: 'https://dev.azure.com/P00743-dashboard',
              npa: 'web'
            },
            {
              package: 'dashboard-backend-trans',
              url: 'https://dev.azure.com/P00743-dashboard-backend',
              npa: 'web'
            },
            {
              package: 'gmdb-agent-trans',
              url: 'https://dev.azure.com/P00743-gmdb-agent',
              npa: 'both'
            }
          ]);
          done();
        });
      });
    });
    it('properly inserts multiple records with runAll', done =>
    {
      // Mix three styles: plain string, placeholders with array for the
      // values and placeholders with plain arguments for the values
      const q = [
        'BEGIN TRANSACTION',
        [
          'INSERT INTO packages (package, url, npa) VALUES (?,?,?)',
          [
            'dashboard-backend-trans',
            'https://dev.azure.com/P00743-dashboard-backend',
            'web'
          ]
        ],
        [
          'INSERT INTO packages (package, url, npa) VALUES (?,?,?)',
          'gmdb-agent-trans',
          'https://dev.azure.com/P00743-gmdb-agent',
          'both'
        ],
        'COMMIT'
      ];
      db.runAll(q, err =>
      {
        if (err)
        {
          done(err);
          return;
        }
        db.all('SELECT * FROM packages', (err, records) =>
        {
          if (err)
          {
            done(err);
            return;
          }
          expect(records).toEqual([
            {
              package: 'dashboard',
              url: 'https://dev.azure.com/P00743-dashboard',
              npa: 'web'
            },
            {
              package: 'dashboard-backend-trans',
              url: 'https://dev.azure.com/P00743-dashboard-backend',
              npa: 'web'
            },
            {
              package: 'gmdb-agent-trans',
              url: 'https://dev.azure.com/P00743-gmdb-agent',
              npa: 'both'
            }
          ]);
          done();
        });
      });
    });
    const max = 15000;
    it(`properly inserts ${max} records`, done =>
    {
      const queries = [];
      const q = 'INSERT INTO packages (package, url, npa) VALUES (?,?,?)';

      queries.push('BEGIN TRANSACTION');
      for (let i = 0; i < max; i++)
      {
        queries.push([ q, `package_${i}`,
          `https://dev.azure.com/P00743-package_${i}`, 'both' ]);
      }
      queries.push('COMMIT');

      db.runAll(queries, err =>
      {
        if (err)
        {
          done(err);
          return;
        }
        db.get('SELECT COUNT(*) AS count FROM packages', (err, row) =>
        {
          if (err)
          {
            done(err);
            return;
          }
          expect(row).toEqual({ count: max + 1 });
          done();
        });
      });
    });
    it(`properly inserts and reads back ${max} records`, done =>
    {
      const queries = [];
      const q = 'INSERT INTO packages (package, url, npa) VALUES (?,?,?)';

      queries.push('BEGIN TRANSACTION');
      for (let i = 0; i < max; i++)
      {
        queries.push([ q, `package_${i}`,
          `https://dev.azure.com/P00743-package_${i}`, 'both' ]);
      }
      queries.push('COMMIT');

      db.runAll(queries, err =>
      {
        if (err)
        {
          done(err);
          return;
        }
        db.all('SELECT * FROM packages', (err, rows) =>
        {
          if (err)
          {
            done(err);
            return;
          }
          expect(rows.length).toEqual(max + 1);
          done();
        });
      });
    });
    it('properly handles transaction failure', done =>
    {
      const q = `BEGIN TRANSACTION;
      INSERT INTO
        packages (package, url, badfield)
      VALUES
        (?,?,?),
        (?,?,?);
      COMMIT;`;
      const d = [
        'dashboard-backend-trans',
        'https://dev.azure.com/P00743-dashboard-backend',
        'web',
        'gmdb-agent-trans',
        'https://dev.azure.com/P00743-gmdb-agent',
        'both'
      ];
      db.run(q, d, err =>
      {
        expect(err.message).toMatch(/no column named badfield/);
        db.all('SELECT * FROM packages', (err, records) =>
        {
          if (err)
          {
            done(err);
            return;
          }
          expect(records).toEqual([
            {
              package: 'dashboard',
              url: 'https://dev.azure.com/P00743-dashboard',
              npa: 'web'
            }
          ]);
          done();
        });
      });
    });
    it('properly handles query errors with callback', done =>
    {
      const q = 'SELECT * FROM no_such_table';
      db.all(q, (err, rows) =>
      {
        expect(err).toBeTruthy();
        expect(err.message).toMatch(/no such table: no_such_table/);
        expect(rows).toBeUndefined();
        done();
      });
    });
    it('properly handles query errors without callback', () =>
    {
      const q = 'SELECT * FROM no_such_table';
      db.on('error', err => expect(err.message).toMatch(/no such table/));
      db.all(q);
    });
    it('correctly detects SQL syntax errors', done =>
    {
      const q = 'SELECTING LIKE THIS WILL NOT WORK';
      db.all(q, (err, rows) =>
      {
        expect(err).toBeTruthy();
        expect(err.message).toMatch(/near "SELECTING": syntax error/);
        expect(rows).toBeUndefined();
        done();
      });
    });
  });
}

// Figure out whether we have a real working sqlite3 that's sufficiently
// new for -json to work
try
{
  const db = new sqlite3.Database(dbFile);
  db.configure('autoConvert', true);

  beforeAll(done =>
  {
    const queries = [
      `CREATE TABLE IF NOT EXISTS packages(
      package STRING NOT nulL,
      url STRING NOT NULL,
      npa STRING NOT NULL);`,
      `INSERT INTO packages
      (package, url, npa)
     VALUES
       ('dashboard', 'https://dev.azure.com/P00743-dashboard', 'web')`
    ];
    async.eachSeries(queries, (query, cb) =>
    {
      db.run(query, err => cb(err));
    }, err =>
    {
      done(err);
    });
  });
  afterAll(done =>
  {
    fs.unlink(dbFile, err =>
    {
      // We don't care if the file does not exist
      if (err && err.code !== 'ENOENT')
      {
        done(err);
        return;
      }
      done();
    });
  });

  afterEach(done =>
  {
    jest.clearAllMocks();
    db.run('DELETE FROM packages WHERE package <> \'dashboard\'', done);
  });

  describe('noarch-sqlite3.constructor', () =>
  {
    it('properly detects missing sqlite3 executable', () =>
    {
      expect(() => new sqlite3.Database('/tmp/broken.db3', { sqlite3Path: '/usr/bin/notthere' }))
        .toThrow(/sqlite3 executable .* not found/);
    });
    it('properly detects non-existing database directory', done =>
    {
      const ndb = new sqlite3.Database('./missing-dir/broken.db3');
      const query = `CREATE TABLE IF NOT EXISTS packages(
      package STRING NOT nulL,
      url STRING NOT NULL,
      npa STRING NOT NULL);`;
      ndb.run(query, err =>
      {
        expect(err.message).toMatch(/unable to open database/);
        done();
      });
    });
  });
  standaloneTests(db);
  queryTests(db);
  if (db.useJson)
  {
    // Repeat the query tests with the -html option
    const ldb = new sqlite3.Database(dbFile);
    ldb.configure('autoConvert', true);
    ldb.useJson = false;
    queryTests(ldb);
  }
}
catch (ex)
{
  // Check for known exceptions that we expect
  if (
    /sqlite3 executable .* not found/.test(ex.message) ||
    /Unable to determine sqlite3 version/.test(ex.message) ||
    /requires at least sqlite3/.test(ex.message) ||
    /Invalid sqlite3 version detected/.test(ex.message)
  )
  {
    // We don't have a working sqlite3 on the system
    console.log(`No working sqlite3:\n ${ex.message}\nRunning alternative tests`);
  }
  else
  {
    // Re-throw other exceptions
    throw ex;
  }

  cp.activateOverride();

  describe('noarch-sqlite3.constructor', () =>
  {
    it('properly detects unsupported sqlite3 versions', () =>
    {
      expect(() => new sqlite3.Database('/tmp/broken.db3'))
        .toThrow(/requires at least sqlite3/);
    });
  });

  const db = new sqlite3.Database(dbFile);
  standaloneTests(db);
}
