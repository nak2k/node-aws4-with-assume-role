# aws4-with-assume-role

[aws4](https://github.com/mhart/aws4#readme) with assume role.

## Installation

```
npm i aws4-with-assume-role
```

## Usage

``` javascript
const { makeSigner } = require('aws4-with-assume-role');

makeSigner({
  profile: 'my_profile',
  region: 'us-west-2',
}, (err, sign) => {
  if (err) {
    return callback(err);
  }

  /*
   * Make a signed request options with credentials of 'my_profile'.
   */
  const requestOptions = sign({
    service: 's3',
    path: '/',
    signQuery: true,
  });
});
```

## makeSigner([options, ]callback)

- `options.profile`
- `options.region`
- `callback(err, sign)`

## License

MIT
