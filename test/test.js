const test = require('tape');
const { makeSigner } = require('..');

test('test', t => {
  t.plan(2);

  makeSigner({}, (err, sign) => {
    t.error(err);
    t.equal(typeof sign, 'function');
  });
});
