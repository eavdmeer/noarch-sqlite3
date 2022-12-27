# noarch-sqlite3

> This should currently be considered untested and experimental! Be warned!
> Please report any [issues](https://github.com/eavdmeer/noarch-sqlite3/issues) on GitHub

## Table of Contents

* [Requirements](#requirements)
* [Features](#features)
  * [Performance](#performance)
* [Install](#install)
* [Usage](#usage)
* [API Documentation](#api_documentation)
  * [constructor](#new)
  * [close](#close)
  * [configure](#configure)
  * [run](#run)
  * [all](#all)
  * [each](#each)
  * [exec](#exec)
  * [get](#get)
  * [runAll](#runall)
  * [getVersionInfo](#versioninfo)
* [Debugging](#debugging)
* [License](#license)
* [Changelog](#changelog)


## Requirements

For this module to work, you **need** a version of the `sqlite3` command line tool installed on your system. Many versions will work, however, it is strongly recommended that you install version 3.33.0 or above as this provides native JSON support. Versions below 3.33.0 will use HTML output as an alternative.

> Caveat: if you use an older version, **all columns will be returned as strings by default.** Please look at the `autoConvert` [option](#options) to change that behavior


## Features

This module allows you to interact with the `sqlite3` binary installed on your system to access SQLite databases. It is 100% JavaScript. This will entirely elaviate binary dependencies such as for the [sqlite3] and [better-sqlite] modules.

> Caveat: Beware that, unlike with [sqlite3], you do **not** have a connection to the database by creating a `Database` object! Transactions **must** be run in a single `run()` or `exec()` command! Every query you run will be automatically preceded by `PRAGMA` commands to set busy timeout and enable foreign keys.

### Performance

Inserting large numbers of records should always be done inside of a transaction in `sqlite3` to help with performance:

```sql
BEGIN TRANACTION;
INSERT INTO table (field, field, ..) VALUES
(a, b, c, ...),
(d, e, f, ...)
....
(z, z, z, ...);
COMMIT;
```
A test inserting 15000 records took 258 ms, so around 58000 records/s.

Inserting those same 15000 records and reading them back took 272 ms for
JSON support and 370 ms for HTML.

## Install

[npm][]:

```sh
npm install noarch-sqlite3
```

[yarn][]:

```sh
yarn add noarch-sqlite3
```


## Usage

Here is a very straightforward example of how to use `noarch-sqlite3`:

```js
const sqlite3 = require("noarch-sqlite3");

const db = new sqlite3.Database("./mydb.db3", [ options ]);

db.all("SELECT * FROM table", (err, records) =>
{
  if (err)
  {
    console.error(err.message);
    return;
  }
  console.log(records);
});
```

## API Documentation

The API is mostly identical to that of the [sqlite3] package and its [API](https://github.com/TryGhost/node-sqlite3/wiki/API).

<a id="new"></a>
### new sqlite3.Database(filename [, options])
Return a new Database object. This will use the executable set by the `sqlite3Path`option to determine your current `sqlite3` command line version. It will detect whether JSON is supported (`Database.useJson`).

* `filename`: The name of your new or already existing sqlite3 database
* `options` (optional) Object containing valid option properties.

  <a id="options"></a>Options can be one of the following:

  * `autoConvert`: instead of the default behavior of returning all values as strings, auto-convert 'true' and 'false' to their boolean values and '1'/'1.1' to their numeric values (only applies to pre-3.33.0 versions of `sqlite3`)

  * `busyTimeout`: allows you to override the default busy timeout of 30000 ms

  * `enableForeignKeys`: allows you to override enforcements of foreign keys (default: true)

  * `outputBufferSize`: allows you to override the maximum output buffer size for large query results (default: 1024 * 1024)

  * `sqlite3Path`: full path of the `sqlite3` executable. Allows you to override the default location (`/usr/bin/sqlite3`)

May throw:

* sqlite3 executable not found
* unable to determine sqlite3 version
* invalid (non semver) sqlite3 version detected
* more recent version of sqlite3 required


### Database object:

<a id="close"></a>
### close([callback])
Fake close that is only there to provide drop-in compatibility with [sqlite3]

* `callback` (optional): called immediately with `null`


<a id="configure"></a>
### configure(option, value)
Set a configuration [option](#options) for the database.


<a id="run"></a>
### run(sql [, param, ...] [, callback])

Run all (semicolon separated) SQL queries in the supplied string. No result rows are retrieved. Will return the `Database` object to allow for function chaining. If present, on completion or failure, the `callback` will be called with either `null` or an `Error` object as its only argument. If no `callback` is present, en `error` event will be emitted on any failure.

* `sql`: The SQL query to run.

* `param, ...` (optional): If the SQL statement contains placeholders, parameters passed here will be replaced in the statement before it is executed. This automatically sanitizes inputs.

  There are three ways of passing bind parameters: directly in the function's arguments, as an array or as an object. Parameters may not be used for column or table names.

        // Directly in the function arguments.
        db.run("UPDATE tbl SET name = ? WHERE id = ?", "bar", 2);

        // As an array.
        db.run("UPDATE tbl SET name = ? WHERE id = ?", [ "bar", 2 ]);

        // As an object.
        db.run("UPDATE tbl SET name = $name WHERE id = $id", { name: "bar", id: 2 });
        db.run("UPDATE tbl SET name = :name WHERE id = :id", { name: "bar", id: 2 });
        db.run("UPDATE tbl SET name = @name WHERE id = @id", { name: "bar", id: 2 });

        // As an object with [sqlite3] compatibility
        db.run("UPDATE tbl SET name = $name WHERE id = $id", { $name: "bar", $id: 2 });
        db.run("UPDATE tbl SET name = :name WHERE id = :id", { ":name": "bar", ":id": 2 });
        db.run("UPDATE tbl SET name = @name WHERE id = @id", { "@name": "bar", "@id": 2 });

  > The [sqlite3] module that this API is mostly based on, requires that the placeholders in the query strictly match the fields in the object.

  In case you want to keep the callback as the 3rd parameter, you should set `param` to `[]` (empty Array), `{}` (empty object) or `undefined`

  > You can use either an array or object or pass each parameter as an argument. Do **not** mix those!

* `callback(err)` (optional): Will be called if an `Error` object if any error occurs during execution.


<a id="all"></a>
### all(sql [, param, ...] [, callback])
Run the SQL query with the specified parameters and call the `callback` with all result rows afterwards. Will return the `Database` object to allow for function chaining. The parameters are the same as the [Database#run](#run) function, with the following differences:

The signature of the callback is: `function(err, rows) {}`. `rows` is an array. If the result set is empty, it will be an empty array, otherwise it will have an object for each result row which in turn contains the values of that row, like the [Database#get](#get) function.

> All result rows are retrieved first and stored in memory!

Please note that, while this function allows `query` to contain multiple semicolon separated SQL statements, the result can get highly confusing if any of the queries do not return results. You will get a set of records back:

```
[
  [ records for query 1],
  [ records for query 2]
  ...
]
```

However, any query that does not return anything **will not** have an empty entry in the set. Moreover, if there is only one set of records present, only that set is returned:

```
[ record for set with result ]
```

In that case you will not receive an array of arrays!

<a id="each"></a>
### each(sql [, param, ...] [, callback] [, complete])
Run the SQL query with the specified parameters and call the callback once for each result row. Will return the `Database` object to allow for function chaining. The parameters are the same as the [Database#run](#run) function, with the following differences:

The signature of the callback is: `function(err, row) {}`. If the result set succeeds but is empty, the callback is never called. In all other cases, the callback is called once for every retrieved row. The order of calls correspond exactly to the order of rows in the result set.

After all row callbacks were called, the `completion` callback will be called if present. The first argument is an error object, and the second argument is the number of retrieved rows. If you specify only one function, it will be treated as row callback, if you specify two, the first (== second to last) function will be the row callback, the last function will be the completion callback.

> This function (currently) loads all rows in memory first!

<a id="exec"></a>
### exec(sql [, callback])
This is an alias for [Database#run](#run)


<a id="get"></a>
### get(sql [, param, ...][, callback])
Run the SQL query with the specified parameters and call the callback with a subsequent result row. Will return the `Database` object to allow for function chaining. The parameters are the same as the [Database#run](#run) function, with the following differences:

The signature of `callback` is: `function(err, row) {}`. If the result set is empty, the `row` parameter is undefined, otherwise it is an object containing the values for the first row.


<a id="runall"></a>
### runAll(queries [, callback])

Run multiple queries in succession. Will return the `Database` object to allow for function chaining. If present, on completion or failure, the `callback` will be called with either `null` or an `Error` object as its only argument. If no `callback` is present, en `error` event will be emitted on any failure.

> The queries will be run in *exactly* the order in which they are found in the array

* `queries`: The SQL queries to run. This is an array of sets of arguments like you would pass to [Database#run](#run):

        db.runAll([
            [ "INSERT INTO table (name) VALUES (?)", "one" ],
            [ "INSERT INTO table (name) VALUES (?)", "two" ]
          ],
          err => console.log(err));
        )

  If you want to pass plain queries without placeholders, you can pass them
  as strings or even mix both forms;

        db.runAll([
            "INSERT INTO table (name) VALUES ('one')",
            [ "INSERT INTO table (name) VALUES (?)", "two" ],
            "INSERT INTO table (name) VALUES ('three')",
            [ "INSERT INTO table (name) VALUES (?)", [ "four" ] ]
          ],
          err => console.log(err));
        )

* `callback(err)` (optional): Will be called if an `Error` object if any error occurs during execution.

<a id="versioninfo"></a>
### getVersionInfo()

Return an object describing the verion of `sqlite3` found in the `sqlite3Path` on your system. For example:
```js
{
  version: "3.37.0",
  data: "2021-12-09 01:34:53",
  hash: "9ff244ce0739f8ee52a3e9671adb4ee54c83c640b02e3f9d185fd2f9a179aapl"
}
```

## Debugging

Includes [debug](https://www.npmjs.com/package/debug) support for the main module as well as the sqlite3parse module:

```
DEBUG="noarch-sqlite3,sqlite3parse" node my-code.js
```


## License

[MIT](LICENSE)


## Changelog

Please check the extended [changelog](https://github.com/eavdmeer/noarch-sqlite3/blob/master/CHANGELOG.md) (GitHub)


##

[npm]: https://www.npmjs.com/
[sqlite3]: https://www.npmjs.com/package/sqlite3
[better-sqlite]: https://www.npmjs.com/package/better-sqlite3
[yarn]: https://yarnpkg.com/
