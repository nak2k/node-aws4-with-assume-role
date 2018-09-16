const test = require('tape');
const { makeSigner } = require('..');

test('test', t => {
  t.plan(4);

  makeSigner({}, (err, sign) => {
    t.error(err);
    t.equal(typeof sign, 'function');

    const options = sign({
      service: 's3',
      path: '/',
      signQuery: true,
    });

    t.equal(typeof options.service, 'string');
    t.equal(typeof options.headers, 'object');
  });
});

test('test', t => {
  const { ROLE_ARN } = process.env;

  t.plan(3);

  makeSigner({}, (err, sign) => {
    sign({
      service: 's3',
      path: '/',
      signQuery: true,
    }, { roleArn: ROLE_ARN }, (err, options) => {
      t.error(err);
      t.equal(typeof options.service, 'string');
      t.equal(typeof options.headers, 'object');
    });
  });
});
