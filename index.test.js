/* global jest, describe, it, expect, beforeAll, afterAll, afterEach */
const cp = require('node:child_process');
const fs = require('fs');

const { Database } = require('./');

// Need to mock execFileSync and execFile
jest.mock('node:child_process');

const dbFile = '/tmp/test.db3';

const defaultRecord = {
  package: 'dashboard',
  url: 'https://dev.azure.com/P00743-dashboard',
  npa: 'web'
};

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
      expect(Database.safe('no quotes here')).toBe('no quotes here');
      expect(Database.safe('don\'t mess this up'))
        .toBe('don\'\'t mess this up');
      expect(Database.safe('isn\'t it 5 o\'clock'))
        .toBe('isn\'\'t it 5 o\'\'clock');
    });
  });
  describe('noarch-sqlite3.quote', () =>
  {
    it('properly quotes values', () =>
    {
      expect(Database.quote('string value')).toBe('\'string value\'');
      expect(Database.quote(0)).toBe(0);
      expect(Database.quote(100)).toBe(100);
      expect(Database.quote(100.0)).toBe(100.0);
      expect(Database.quote('10')).toBe('\'10\'');
      expect(Database.quote('10.0')).toBe('\'10.0\'');
    });
  });
  describe('noarch-sqlite3.expandArgs', () =>
  {
    it('properly works without bind parameters', () =>
    {
      const q = 'SELECT * FROM packages WHERE package=\'dashboard\'';
      let d = [];
      expect(Database.expandArgs(q, d))
        .toBe('SELECT * FROM packages WHERE package=\'dashboard\'');
      d = {};
      expect(Database.expandArgs(q, d))
        .toBe('SELECT * FROM packages WHERE package=\'dashboard\'');
      d = undefined;
      expect(Database.expandArgs(q, d))
        .toBe('SELECT * FROM packages WHERE package=\'dashboard\'');
    });
    it('properly substitutes a single value in a query', () =>
    {
      const q = 'SELECT * FROM packages WHERE package=?';
      const d = [ 'dashboard' ];
      expect(Database.expandArgs(q, d))
        .toBe('SELECT * FROM packages WHERE package=\'dashboard\'');
      expect(Database.expandArgs(q, ...d))
        .toBe('SELECT * FROM packages WHERE package=\'dashboard\'');
    });
    it('properly substitutes multiple values in a querY', () =>
    {
      const q = 'SELECT * FROM packages WHERE package=? AND npa=?';
      const d = [ 'dashboard', 'both' ];
      expect(Database.expandArgs(q, d))
        .toBe('SELECT * FROM packages WHERE package=\'dashboard\' AND npa=\'both\'');
      expect(Database.expandArgs(q, ...d))
        .toBe('SELECT * FROM packages WHERE package=\'dashboard\' AND npa=\'both\'');
    });
    it('properly substitutes multiple values with a ? in it', () =>
    {
      const q = 'SELECT * FROM packages WHERE package=? AND npa=?';
      const d = [ 'dashboard?', 'both?' ];
      expect(Database.expandArgs(q, d))
        .toBe('SELECT * FROM packages WHERE package=\'dashboard?\' AND npa=\'both?\'');
      expect(Database.expandArgs(q, ...d))
        .toBe('SELECT * FROM packages WHERE package=\'dashboard?\' AND npa=\'both?\'');
    });
    it('properly substitutes mixed type values in a query', () =>
    {
      const q = 'SELECT * FROM packages WHERE package=? AND npa=?';
      const d = [ 'dashboard', 121 ];
      expect(Database.expandArgs(q, d))
        .toBe('SELECT * FROM packages WHERE package=\'dashboard\' AND npa=121');
    });
    it('properly catches missing bind parameter values for a query', () =>
    {
      const q = 'SELECT * FROM packages WHERE package=? AND npa=?';
      const d = [ 'dashboard' ];
      expect(() => Database.expandArgs(q, d))
        .toThrow(/Too few .* bind parameter values/);
      expect(() => Database.expandArgs(q, ...d))
        .toThrow(/Too few .* bind parameter values/);
    });
    it('properly catches extra bind parameter values for a query', () =>
    {
      const q = 'SELECT * FROM packages WHERE package=? AND npa=?';
      const d = [ 'dashboard', 'both', 'too many' ];
      expect(() => Database.expandArgs(q, d))
        .toThrow(/Too many .* bind parameter values/);
      expect(() => Database.expandArgs(q, ...d))
        .toThrow(/Too many .* bind parameter values/);
    });
    it('properly expands bind parameters in an object', () =>
    {
      const q = 'SELECT * FROM packages WHERE package=$pkg AND npa=:npa AND agelong=@agelong AND age=@age';
      const d = { bad: 'value', age: 21, npa: 'web', pkg: 'sqlite3',
        agelong: 50 };
      expect(Database.expandArgs(q, d))
        .toBe('SELECT * FROM packages WHERE package=\'sqlite3\' AND npa=\'web\' AND agelong=50 AND age=21');
    });
    it('properly substitutes multiple object values with a $foo in it', () =>
    {
      const q = 'INSERT INTO table (name, age) VALUES ($name, $age)';
      const d = { name: 'age is in the $age field', age: 21 };
      expect(Database.expandArgs(q, d))
        .toBe('INSERT INTO table (name, age) VALUES (\'age is in the $age field\', 21)');
    });
    it('properly substitutes object values like sqlite3', () =>
    {
      const q = 'INSERT INTO table (name, age, height) VALUES ($name, :age, @height)';
      const d = { $name: 'Pete', ':age': 30, '@height': 194 };
      expect(Database.expandArgs(q, d))
        .toBe('INSERT INTO table (name, age, height) VALUES (\'Pete\', 30, 194)');
    });
    it('properly expands date bind parameters in an object', () =>
    {
      const q = 'SELECT * FROM packages WHERE date=$date';
      const now = new Date();
      const d = { date: now };
      expect(Database.expandArgs(q, d))
        .toBe(`SELECT * FROM packages WHERE date='${now.toISOString()}'`);
    });
    it('properly expands simple date bind parameters', () =>
    {
      const q = 'SELECT * FROM packages WHERE date=?';
      const d = new Date();
      expect(Database.expandArgs(q, d))
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
  const msg = `noarch-sqlite3.query (${db.useJson ? '-json' : '-html'})`;
  describe(msg, () =>
  {
    it('properly selects the default record with all()', done =>
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
        expect(records).toEqual([ defaultRecord ]);
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
        expect(records).toEqual(defaultRecord);
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
        expect(records).toEqual([ [ defaultRecord ], [ defaultRecord ] ]);
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
        expect(records).toEqual([ defaultRecord ]);
        done();
      });
    });
    it('properly inserts a new record', done =>
    {
      const newRecord = {
        package: 'dashboard-backend',
        url: 'https://dev.azure.com/P00743-dashboard-backend',
        npa: 'web'
      };

      const q = 'INSERT INTO packages (package, url, npa) VALUES (?,?,?)';
      const d = Object.values(newRecord);
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
            defaultRecord,
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
      const newRecords = [
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
      ];
      const q = `INSERT INTO
        packages (package, url, npa)
      VALUES
        (?,?,?),
        (?,?,?)`;
      const d = [
        ...Object.values(newRecords[0]),
        ...Object.values(newRecords[1])
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
          expect(records).toEqual([ defaultRecord, ...newRecords ]);
          done();
        });
      });
    });
    it('properly runs the handler for each record', done =>
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
      const newRecords = [
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
      ];

      const q = `BEGIN TRANSACTION;
      INSERT INTO
        packages (package, url, npa)
      VALUES
        (?,?,?),
        (?,?,?);
      COMMIT;`;
      const d = [
        ...Object.values(newRecords[0]),
        ...Object.values(newRecords[1])
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
          expect(records).toEqual([ defaultRecord, ...newRecords ]);
          done();
        });
      });
    });
    it('properly inserts multiple records with runAll', done =>
    {
      const newRecords = [
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
      ];

      const q = [
        'BEGIN TRANSACTION',
        [
          'INSERT INTO packages (package, url, npa) VALUES (?,?,?)',
          Object.values(newRecords[0])
        ],
        [
          'INSERT INTO packages (package, url, npa) VALUES (?,?,?)',
          ...Object.values(newRecords[1])
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
          expect(records).toEqual([ defaultRecord, ...newRecords ]);
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
      const newRecords = [
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
      ];

      const q = `BEGIN TRANSACTION;
      INSERT INTO
        packages (package, url, badfield)
      VALUES
        (?,?,?),
        (?,?,?);
      COMMIT;`;
      const d = [
        ...Object.values(newRecords[0]),
        ...Object.values(newRecords[1])
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
          expect(records).toEqual([ defaultRecord ]);
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

function promiseTests(db)
{
  afterEach(async() =>
  {
    jest.clearAllMocks();
    await db.run('DELETE FROM packages WHERE package <> \'dashboard\'');
  });

  describe('noarch-sqlite promises', () =>
  {
    it('properly selects data with all()', async () =>
    {
      expect.assertions(1);

      await expect(db.all('SELECT * FROM packages')).resolves
        .toEqual([ defaultRecord ]);
    });

    it('properly gets a single record with get()', async () =>
    {
      expect.assertions(1);

      await expect(db.get('SELECT * FROM packages')).resolves
        .toEqual(defaultRecord);
    });

    it('properly selects the default record with all()', async () =>
    {
      expect.assertions(1);

      const q = 'SELECT * FROM packages WHERE package=?';
      const d = [ 'dashboard' ];
      await expect(db.get(q, d)).resolves.toEqual(defaultRecord);
    });

    it('properly inserts a new record with run()', async () =>
    {
      expect.assertions(2);

      const newRecord = {
        package: 'dashboard-backend',
        url: 'https://dev.azure.com/P00743-dashboard-backend',
        npa: 'web'
      };

      const q = 'INSERT INTO packages (package, url, npa) VALUES (?,?,?)';
      const d = Object.values(newRecord);
      await expect(db.run(q, d)).resolves.toBe(undefined);

      await expect(db.all('SELECT * FROM packages')).resolves
        .toEqual([ defaultRecord, newRecord ]);
    });

    it('properly inserts multiple records with runAll', async () =>
    {
      const newRecords = [
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
      ];

      const q = [
        'BEGIN TRANSACTION',
        [
          'INSERT INTO packages (package, url, npa) VALUES (?,?,?)',
          Object.values(newRecords[0])
        ],
        [
          'INSERT INTO packages (package, url, npa) VALUES (?,?,?)',
          ...Object.values(newRecords[1])
        ],
        'COMMIT'
      ];

      await expect(db.runAll(q)).resolves.toBe(undefined);

      await expect(db.all('SELECT * FROM packages')).resolves
        .toEqual([ defaultRecord, ...newRecords ]);
    });

    it('properly returns a promise for fake close()', async () =>
    {
      await expect(db.close()).resolves.toBe(undefined);
    });
  });
}

// Figure out whether we have a real working sqlite3 that's sufficiently
// new for -json to work
try
{
  const db = new Database(dbFile);
  db.configure('autoConvert', true);

  beforeAll(async () =>
  {
    // Add a default record
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
    await db.exec(queries[0]);
    await db.run(queries[1]);
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
      expect(() => new Database('/tmp/broken.db3', { sqlite3Path: '/usr/bin/notthere' }))
        .toThrow(/sqlite3 executable .* not found/);
    });
    it('properly detects non-existing database directory', done =>
    {
      const ndb = new Database('./missing-dir/broken.db3');
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
    const ldb = new Database(dbFile);
    ldb.configure('autoConvert', true);
    ldb.useJson = false;
    queryTests(ldb);
  }
  promiseTests(db);
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
      expect(() => new Database('/tmp/broken.db3'))
        .toThrow(/requires at least sqlite3/);
    });
  });

  const db = new Database(dbFile);
  standaloneTests(db);
}
