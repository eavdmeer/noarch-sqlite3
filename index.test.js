/* global describe, it, expect, beforeAll, afterAll, afterEach */
const fs = require('fs');
const async = require('async');

const Database = require('./');

const dbFile = '/tmp/test.db3';

let workingSqlite = true;

let db = null;

// Figure out whether we have a real working sqlite3 that's sufficiently
// new for -json to work
try
{
  db = new Database(dbFile);
}
catch (ex)
{
  if (
    /sqlite3 executable .* not found/.test(ex.message) ||
    /Unable to determine sqlite3 version/.test(ex.message) ||
    /requires at least sqlite3/.test(ex.message) ||
    /Invalid sqlite3 version detected/.test(ex.message)
  )
  {
    // We don't have a working sqlite3 on the system
    console.log(`No working sqlite3:\n ${ex.message}\nRunning alternative tests`);
    workingSqlite = false;
  }
  else
  {
    console.log('RETHROW');
    throw ex;
  }
}

if (workingSqlite)
{
  // Only preform the normal tests when we have a working sqlite3
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
      db.query(query, err => cb(err));
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
    db.query('DELETE FROM packages WHERE package <> \'dashboard\'', done);
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
    // expect(() => new Database('./missing-dir/broken.db3'))
    //   .toThrow();
      const ndb = new Database('./missing-dir/broken.db3');
      const query = `CREATE TABLE IF NOT EXISTS packages(
      package STRING NOT nulL,
      url STRING NOT NULL,
      npa STRING NOT NULL);`;
      ndb.query(query, err =>
      {
        expect(err.message).toMatch(/unable to open database/);
        done();
      });
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
  describe('noarch-sqlite3.expandArgs', () =>
  {
    it('properly works without bind parameters', () =>
    {
      const q = 'SELECT * FROM packages WHERE package=\'dashboard\'';
      const d = undefined;
      expect(db.expandArgs(q, d))
        .toBe('SELECT * FROM packages WHERE package=\'dashboard\'');
    });
    it('properly substitutes a single value in a query', () =>
    {
      const q = 'SELECT * FROM packages WHERE package=?';
      const d = [ 'dashboard' ];
      expect(db.expandArgs(q, d))
        .toBe('SELECT * FROM packages WHERE package=\'dashboard\'');
    });
    it('properly substitutes multiple values in a querY', () =>
    {
      const q = 'SELECT * FROM packages WHERE package=? AND npa=?';
      const d = [ 'dashboard', 'both' ];
      expect(db.expandArgs(q, d))
        .toBe('SELECT * FROM packages WHERE package=\'dashboard\' AND npa=\'both\'');
    });
    it('properly substitutes mixed type values in a querY', () =>
    {
      const q = 'SELECT * FROM packages WHERE package=? AND npa=?';
      const d = [ 'dashboard', 121 ];
      expect(db.expandArgs(q, d))
        .toBe('SELECT * FROM packages WHERE package=\'dashboard\' AND npa=121');
    });
    it('properly catches invalid types for data', () =>
    {
      const q = 'SELECT * FROM packages WHERE package=? AND npa=?';
      const d = 'dashboard';
      expect(() => db.expandArgs(q, d)).toThrow(/Invalid type for query data/);
    });
    it('properly catches missing bind parameter values for a query', () =>
    {
      const q = 'SELECT * FROM packages WHERE package=? AND npa=?';
      const d = [ 'dashboard' ];
      expect(() => db.expandArgs(q, d)).toThrow(/Too few .* bind parameter values/);
    });
    it('properly catches extra bind parameter values for a query', () =>
    {
      const q = 'SELECT * FROM packages WHERE package=? AND npa=?';
      const d = [ 'dashboard', 'both', 'too many' ];
      expect(() => db.expandArgs(q, d)).toThrow(/Too many .* bind parameter values/);
    });
  });
  describe('noarch-sqlite3.query', () =>
  {
    it('properly selects the default record', done =>
    {
      const q = 'SELECT * FROM packages WHERE package=?';
      const d = [ 'dashboard' ];
      db.query(q, d, (err, records) =>
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
    it('properly inserts a new record', done =>
    {
      const q = 'INSERT INTO packages (package, url, npa) VALUES (?,?,?)';
      const d = [
        'dashboard-backend',
        'https://dev.azure.com/P00743-dashboard-backend',
        'web'
      ];
      db.query(q, d, err =>
      {
        if (err)
        {
          done(err);
          return;
        }
        db.query('SELECT * FROM packages', (err, records) =>
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
      db.query(q, d, err =>
      {
        if (err)
        {
          done(err);
          return;
        }
        db.query('SELECT * FROM packages', (err, records) =>
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
      db.query(q, d, err =>
      {
        if (err)
        {
          done(err);
          return;
        }
        db.query('SELECT * FROM packages', (err, records) =>
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
      db.query(q, d, err =>
      {
        expect(err.message).toMatch(/no column named badfield/);
        db.query('SELECT * FROM packages', (err, records) =>
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
  });
}
else
{
  // We need to mock execFile and execFileSync
  it('runs a fake test', () =>
  {
    expect(1).toBeTruthy();
  });
}
