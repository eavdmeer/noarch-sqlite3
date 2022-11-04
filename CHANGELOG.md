# Changelog

## v1.11.0
- Fix bug in expansion of '?' placeholders. Would fail if one of multiple values had a '?' in it.

## v1.10.0
- Fix bug where older sqlite versions complain about incomplete SQL due to a missing trailing semicolon
- Detect the string `Error:` in the `stderr` output as the incomplete SQL error comes with a 0 exit code

## v1.9.2
## v1.9.1
- Fix object key sorting

## v1.9.0
- Resolve issue #11: support object-style query data

## v1.8.0
- Drop himalaya dependency in favor of a custom parser

## v1.7.0
- Pass queries through stdin instead of the command line to allow much larger query sets

## v1.6.1
- Fix major bug in JSON parsing
- Fix bug: `autoConvert` option was not passed to `htmlToJson`
- Update maximum query length documentation
- Always run tests with `autoConvert` on

## v1.6.0
- Add `outputBufferSize` option for large query results
- Document query length limitation

## v1.5.3
- Major documentation cleanup

## v1.5.2
- Add getVersionInfo docs
- Minor other documentation fixes

## v1.5.1
- Introduce `Database#runAll` to call `Database#runQueries` instead of exposing internal function directly
- Add test cases for `Database#runAll` 
- Allow mixing of plain text queries and queries with placeholders and values in the queries array passed to `Database#runAll`

## v1.5.0
- Expose the `Database#runQeueries` function
- Have `Database#runQueries` behave like the `Database#run` function
- Make all callbacks optional
- Have `Database` inherit from `EventEmitter` so it can emit an `error` event.
- Document everything

## v1.4.3
- Minor documentation update

## v1.4.2
- Fix bug #4: empty `<TD>` break HTML parsing

## v1.4.1
- Major documentation update
- Remove some debug code left behind

## v1.4.0 (breaking changes!)
- Make contructor compatible wiwh standard [sqlite3](https://www.npmjs.com/package/sqlite3) modules
- No longer suppport `query()` function. Use `all()` instead

## v1.3.1
- Allow passing bind parameters directly in the arguments

## v1.3.0
- Implement `all()`, `get()`, `run()`, `exec()` and `close()` standard [sqlite3](https://www.npmjs.com/package/sqlite3) functions
- Implement sqlite3 `each()` function

## v1.2.0
- Add auto-conversion of int/float/bool values for HTML output

## v1.1.1
- Rename for npm deployment

## v1.1.0
- Add support for -html output of sqlite3

## v1.0.0
- First implementation
