const { execFile, execFileSync } = require('node:child_process');

const debug = require('debug')('@eavdmeer/noarch-sqlite3');
const semver = require('semver');

const defaultOptions = {
  sqlite3Path: '/usr/bin/sqlite3'
};

function helper(dbPath, options = {})
{
  this.db = dbPath;
  this.options = { ...defaultOptions, ...options };

  debug(`new database helper for path ${this.db}`);
  debug(`options are: ${JSON.stringify(this.options, null, 2)}`);

  this.requiredVersion = '3.33.0';
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
  if (semver.lt(this.versionInfo.version, this.requiredVersion))
  {
    throw new Error(`@eavdmeer/noarch-sqlite3 requires at least sqlite3 ${this.requiredVersion}. Found ${this.versionInfo.version}`);
  }

  debug(`detected version: ${JSON.stringify(this.versionInfo, null, 2)}`);
}
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
helper.prototype.expandArgs = function(query, data)
{
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
helper.prototype.query = function(...args)
{
  const callback = args.pop();
  const query = this.expandArgs(...args);
  debug(`running query: ${query}`);

  const pars = [ '-json', this.db, query ];
  execFile(this.options.sqlite3Path, pars, (err, stdout, stderr) =>
  {
    if (err)
    {
      callback(new Error(`Failed to run query: ${stderr}`));
      return;
    }
    try
    {
      callback(null, stdout ? JSON.parse(stdout) : stdout);
    }
    catch (ex)
    {
      callback(new Error(`Failed to run query: ${ex.message}`));
    }
  });
};

module.exports = helper;
