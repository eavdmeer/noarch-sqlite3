# Changelog

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
