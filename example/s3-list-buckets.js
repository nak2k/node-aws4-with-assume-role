const https = require('https');
const { makeSigner } = require('..');

function request(options) {
  https.request(options, res => { res.pipe(process.stdout) })
    .end(options.body || '');
}

makeSigner({}, (err, sign) => {
  if (err) {
    throw err;
  }

  request(
    sign({
      service: 's3',
      path: '/',
      signQuery: true,
    })
  );
});
