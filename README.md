# @eavdmeer/noarch-sqlite3

## Table of Contents

* [Features](#features)
* [Documentation](#documentation)
* [Install](#install)
* [Usage](#usage)
  * [Node](#node)
* [License](#license)


## Features

This module allows you to interact with the `sqlite3` binary installed on your system to access SQLite databases. It is 100% JavaScript. This will entirely elaviate binary dependencies such as for the [sqlite3](https://www.npmjs.com/) and [better-sqlite](https://www.npmjs.com/package/better-sqlite3) modules.


## Documentation

Coming soon...


## Install

[npm][]:

```sh
npm install @eavdmeer/noarch-sqlite3
```

[yarn][]:

```sh
yarn add @eavdmeer/noarch-sqlite3
```


## Usage

### Node

```js
const Database = require('@eavdmeer/noarch-sqlite3');

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

* `sqlite3Path`: full path the the `sqlite3` executable. Allows you to override the default location (/usr/bin/sqlite3)`

## License

[MIT](LICENSE)


##

[npm]: https://www.npmjs.com/

[yarn]: https://yarnpkg.com/
