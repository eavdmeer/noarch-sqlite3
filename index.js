const { execFile, execFileSync } = require('node:child_process');
const { htmlToJson } = require('./modules/htmltojson');

const debug = require('debug')('noarch-sqlite3');
const semver = require('semver');

const defaultOptions = {
  autoConvert: false,
  busyTimeout: 30000,
  enableForeignKeys: true,
  sqlite3Path: '/usr/bin/sqlite3'
};

function helper(dbPath, options = {})
{
  this.db = dbPath;
  this.options = { ...defaultOptions, ...options };

  debug(`new database helper for path ${this.db}`);
  debug(`options are: ${JSON.stringify(this.options, null, 2)}`);

  this.requiredVersion = {
    json: '3.33.0',
    // TODO: figure out what version introduced -html support
    html: '3.0.0'
  };

  // Only available for sqlite3 >= 3.33.0
  this.useJson = false;

  this.versionInfo = { version: 'unknown', date: 'unknown', hash: 'unknown' };

  // Figure out what version of sqlite3 we have, if any!
  try
  {
    const stdout = execFileSync(this.options.sqlite3Path, [ '--version' ]);
    const parts = stdout.toString().split(' ');
    this.versionInfo.version = parts[0];
    this.versionInfo.date = `${parts[1]} ${parts[2]}`;
    this.versionInfo.hash = parts[3];
  }
  catch (ex)
  {
    throw new Error(ex.code === 'ENOENT' ?
      `sqlite3 executable ${this.options.sqlite3Path} not found!` :
      `Unable to determine sqlite3 version! ${ex.message}`);
  }

  // Version sanity checks
  if (! semver.valid(this.versionInfo.version))
  {
    throw new Error(`Invalid sqlite3 version detected: ${this.versionInfo.version}`);
  }
  if (semver.lt(this.versionInfo.version, this.requiredVersion.html))
  {
    throw new Error(`noarch-sqlite3 requires at least sqlite3 ${this.requiredVersion.html}. Found ${this.versionInfo.version}`);
  }
  if (semver.gte(this.versionInfo.version, this.requiredVersion.json))
  {
    this.useJson = true;
  }

  debug(`detected version: ${JSON.stringify(this.versionInfo, null, 2)}`);
}
helper.prototype.configure = function(name, value)
{
  if (! Object.keys(this.options).includes(name))
  {
    throw new Error(`Invalid option: ${name}!`);
  }
  this.options[name] = value;
};
helper.prototype.getVersionInfo = function()
{
  return this.versionInfo;
};
helper.prototype.safe = function(data)
{
  debug(`sanitize ${JSON.stringify(data)}`);
  return typeof data === 'string' ? data.replace(/'/g, '\'\'') : data;
};
helper.prototype.quote = function(data)
{
  debug(`quote ${JSON.stringify(data)}`);
  return typeof data === 'string' ? `'${data}'` : data;
};
helper.prototype.expandArgs = function(...args)
{
  // First argument is the query
  const query = args.shift();

  // Second argument may be an array with all values or just the first of
  // the parameter values
  const data = [ 'undefined', 'object' ].includes(typeof args[0]) ?
    args[0] : args;

  if (! (args[0] instanceof Array) && typeof args[0] === 'object')
  {
    console.log(`expanding ${query}/${JSON.stringify(data)}`);
  }
  debug(`expanding ${query}/${JSON.stringify(data)}`);
  if (! data || data.length === 0) { return query; }
  if (! (data instanceof Array))
  {
    throw new Error(`Invalid type for query data: ${typeof data}`);
  }

  // Sanity check. We need as many data elements as bind parameters
  const bpars = (query.match(/\?/g) || []).length;
  if (data.length < bpars)
  {
    throw new Error(`Too few (${data.length}/${bpars}) bind parameter values)`);
  }
  else if (data.length > bpars)
  {
    throw new Error(`Too many (${data.length}/${bpars}) bind parameter values)`);
  }

  let result = query;
  data
    .map(v => this.safe(v))
    .map(v => this.quote(v))
    .forEach(v => result = result.replace('?', v));

  return result;
};
helper.prototype.runQueries = function(queries, returnResult, callback)
{
  // Add the required PRAGMA commands
  const list = [ `PRAGMA busy_timeout=${this.options.busyTimeout}` ];
  if (this.options.enableForeignKeys)
  {
    list.push('PRAGMA foreign_keys=ON');
  }
  list.push(...queries);

  // Use the correct options, depending on the installed version
  const pars = this.useJson ?
    [ '-json', this.db, list.join(';') ] :
    [ '-html', '-header', this.db, list.join(';') ];

  execFile(this.options.sqlite3Path, pars, (err, stdout, stderr) =>
  {
    if (err)
    {
      callback(new Error(`Failed to run query: ${stderr}`));
      return;
    }

    // Early out for run/exec
    if (! returnResult)
    {
      callback(null);
      return;
    }

    try
    {
      const set = this.useJson ?
        JSON.parse(`[ ${stdout.replace(/\n/, ',').replace(/,$/, '')} ]`) :
        htmlToJson(stdout);

      // Remove the first result set. It will contain the output of the
      // PRAGMA busy_timeout=xxxx.
      set.shift();
      callback(null, set.length === 1 ? set.pop() : set);
    }
    catch (ex)
    {
      callback(new Error(`Failed to parse sqlite3 answer: ${ex.message} in ${stdout}`));
    }
  });
};
helper.prototype.all = function(...args)
{
  const callback = args.pop();
  const query = this.expandArgs(...args);
  debug(`running query: ${query}`);

  this.runQueries([ query ], true, callback);
  return this;
};
helper.prototype.get = function(...args)
{
  const callback = args.pop();
  const query = this.expandArgs(...args);
  debug(`running get: ${query}`);

  this.runQueries([ query ], true, (err, records) =>
  {
    callback(err, records ? records.pop() : records);
  });

  return this;
};
helper.prototype.run = function(...args)
{
  const callback = args.pop();
  const query = this.expandArgs(...args);
  debug(`running: ${query}`);

  this.runQueries([ query ], false, (err, records) =>
  {
    callback(err, records ? records.pop() : records);
  });

  return this;
};
helper.prototype.each = function(...args)
{
  // We may have a completion callback
  const complete = typeof args[args.length - 2] === 'function' ?
    args.pop() : undefined;
  const callback = args.pop();

  this.all(...args, (err, rows) =>
  {
    rows.forEach(row => callback(err, row));
    if (complete) { complete(err, rows.length); }
  });
};
helper.prototype.exec = helper.prototype.run;
helper.prototype.close = function(callback)
{
  debug('fake close');
  if (callback) { callback(null); }

  return true;
};

module.exports = { Database: helper };
