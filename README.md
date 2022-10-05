# noarch-sqlite3

> This should currently be considered untested and experimental! Be warned!

## Table of Contents

* [Features](#features)
* [Documentation](#documentation)
* [Install](#install)
* [Usage](#usage)
  * [Node](#node)
* [License](#license)


## Requirements

For this module to work, you **need** a version of the `sqlite3` command line tool installed on your system. Many versions will work, however, it is strongly recommended that you install a version above 3.33.0 as this provides native JSON support. Versions below 3.33.0 will use HTML output as an alternative.

> Caveats: if you use an older version, **all columns will be returned as strings by default.** Please look at the `autoConvert` option to change that behavior


## Features

This module allows you to interact with the `sqlite3` binary installed on your system to access SQLite databases. It is 100% JavaScript. This will entirely elaviate binary dependencies such as for the [sqlite3](https://www.npmjs.com/) and [better-sqlite](https://www.npmjs.com/package/better-sqlite3) modules.


## Documentation

Coming soon...


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
const Database = require('noarch-sqlite3');

const db = new Database('./mydb.db3', [ options ]);

db.query('SELECT * FROM table', (err, records) =>
{
  if (err)
  {
    console.error(err.message);
    return;
  }
  console.log(records);
})
```

#### Options

Options can be one of the following:

* `autoConvert`: instead of the default behavior of returning all values as strings, auto-convert 'true' and 'false' to their boolean values and '1'/'1.1' to their numeric values (only applies to pre-3.33.0 versions of `sqlite3`)

* `busyTimeout`: allows you to override the default busy timeout of 30000 ms

* `enableForeignKeys`: allows you to override enforcements of foreign keys (default: true)

* `sqlite3Path`: full path the the `sqlite3` executable. Allows you to override the default location (/usr/bin/sqlite3)`

## License

[MIT](LICENSE)


##

[npm]: https://www.npmjs.com/

[yarn]: https://yarnpkg.com/
