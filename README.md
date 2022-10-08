# noarch-sqlite3

> This should currently be considered untested and experimental! Be warned!

## Table of Contents

* [Features](#features)
* [Install](#install)
* [Usage](#usage)
  * [Node](#node)
* [Documentation](#documentation)
* [License](#license)
* [Changelog](#changelog)


## Requirements

For this module to work, you **need** a version of the `sqlite3` command line tool installed on your system. Many versions will work, however, it is strongly recommended that you install version 3.33.0 or above as this provides native JSON support. Versions below 3.33.0 will use HTML output as an alternative.

> Caveat: if you use an older version, **all columns will be returned as strings by default.** Please look at the `autoConvert` [option](#options) to change that behavior


## Features

This module allows you to interact with the `sqlite3` binary installed on your system to access SQLite databases. It is 100% JavaScript. This will entirely elaviate binary dependencies such as for the [sqlite3] and [better-sqlite] modules.

> Caveat: Beware that, unlike with [sqlite3], you do **not** have a connection to the database by creating a `Database` object! Transactions **must** be run in a single `run()` or `exec()` command! Every query you run will be automatically preceded by `PRAGMA` commands to set busy timeout and enable foreign keys.


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

### Node

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

## Documentation

### API usage

The API is mostly identical to that of the [sqlite3] package and its [API](https://github.com/TryGhost/node-sqlite3/wiki/API).

#### new sqlite3.Database(filename [, options])
Return a new Database object. This will use the executable set by the ${sqlite3Path} option to determine your current `sqlite3` command line version. It will detect whether JSON is supported (`Database.useJson`).

* `filename`: The name of your new or already existing sqlite3 database
* `options` (optional) Object containing valid [option](#options) properties.

May throw:
* sqlite3 executable not found
* unable to determine sqlite3 version
* invalid (non semver) sqlite3 version detected
* more recent version of sqlite3 required


#### Database object:


#### close([callback])
Fake close that is only there to provide drop-in compatibility with [sqlite3]

* `callback` (optional): called immediately with `null`


#### configure(option, value)
Set a configuration [option](#options) for the database.


#### run(sql [, param, ...] [, callback])

Run all (semicolon separated) SQL queries in the supplied string. No result rows are retrieved. Will return the Database object to allow for function chaining. If present, on completion or failure, the `callback` will be called with either `null` or an `Error` object as its only argument. If no `callback` is present, en `error` event will be emitted on any failure.

* `sql`: The SQL query to run.

* `param, ...` (optional): If the SQL statement contains placeholders, parameters passed here will be replaced in the statement before it is executed. This automatically sanitizes inputs.

  There are two ways of passing bind parameters: directly in the function's arguments or as an array. Parameters may not be used for column or table names.

        // Directly in the function arguments.
        db.run("UPDATE tbl SET name = ? WHERE id = ?", "bar", 2);

        // As an array.
        db.run("UPDATE tbl SET name = ? WHERE id = ?", [ "bar", 2 ]);

  In case you want to keep the callback as the 3rd parameter, you should set `param` to `[]` (empty Array) or `undefined`

  > You can use either an array or pass each parameter as an argument. Do **not** mix those!

* `callback(err)` (optional): Will be called if an `Error` object if any error occurs during execution.


#### all(sql [, param, ...] [, callback])
Run the SQL query with the specified parameters and call the `callback` with all result rows afterwards. Will return the Database object to allow for function chaining. The parameters are the same as the [Database#run](#run) function, with the following differences:

The signature of the callback is: `function(err, rows) {}`. `rows` is an array. If the result set is empty, it will be an empty array, otherwise it will have an object for each result row which in turn contains the values of that row, like the [Database#get](#get) function.

> All result rows are retrieved first and stored in memory!


#### each(sql [, param, ...] [, callback] [, complete])
Run the SQL query with the specified parameters and call the callback once for each result row. Will return the Database object to allow for function chaining. The parameters are the same as the [Database#run](#run) function, with the following differences:

The signature of the callback is: `function(err, row) {}`. If the result set succeeds but is empty, the callback is never called. In all other cases, the callback is called once for every retrieved row. The order of calls correspond exactly to the order of rows in the result set.

After all row callbacks were called, the `completion` callback will be called if present. The first argument is an error object, and the second argument is the number of retrieved rows. If you specify only one function, it will be treated as row callback, if you specify two, the first (== second to last) function will be the row callback, the last function will be the completion callback.

> This function (currently) loads all rows in memory first!

#### exec(sql [, callback])
This is an alias for [Database#run](#run)


#### get(sql [, param, ...][, callback])
Run the SQL query with the specified parameters and call the callback with a subsequent result row. Will return the Database object to allow for function chaining. The parameters are the same as the [Database#run](#run) function, with the following differences:

The signature of `callback` is: `function(err, row) {}`. If the result set is empty, the `row` parameter is undefined, otherwise it is an object containing the values for the first row.


#### runAll(queries [, callback])

Run multiple queries in succession. Will return the Database object to allow for function chaining. If present, on completion or failure, the `callback` will be called with either `null` or an `Error` object as its only argument. If no `callback` is present, en `error` event will be emitted on any failure.

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
            [ "INSERT INTO table (name) VALUES (?)", [ "four" ] ],
          ],
          err => console.log(err));
        )

* `callback(err)` (optional): Will be called if an `Error` object if any error occurs during execution.


#### Options

Options can be one of the following:

* `autoConvert`: instead of the default behavior of returning all values as strings, auto-convert 'true' and 'false' to their boolean values and '1'/'1.1' to their numeric values (only applies to pre-3.33.0 versions of `sqlite3`)

* `busyTimeout`: allows you to override the default busy timeout of 30000 ms

* `enableForeignKeys`: allows you to override enforcements of foreign keys (default: true)

* `sqlite3Path`: full path of the `sqlite3` executable. Allows you to override the default location (`/usr/bin/sqlite3`)

## Debugging

Includes [debug](https://www.npmjs.com/package/debug) support for the main module as well as the htmltojson module:

```
DEBUG="noarch-sqlite3,htmltojson" node my-code.js
```


## License

[MIT](LICENSE)

## Changelog

Please check the extended [changelog](CHANGELOG.md) (only on github)

##

[npm]: https://www.npmjs.com/
[sqlite3]: https://www.npmjs.com/package/sqlite3
[better-sqlite]: https://www.npmjs.com/package/better-sqlite3
[yarn]: https://yarnpkg.com/
