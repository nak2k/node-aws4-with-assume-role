const https = require('https');
const xml2js = require('xml2js');
const { makeSigner } = require('..');

function request(options) {
  https.request(options, res => {
    const data = [];

    res.on('data', chunk => data.push(chunk))
      .on('end', () => {
        const parser = new xml2js.Parser();
        parser.parseString(data.join(), (err, result) => {
          if (err) {
            throw err;
          }

          console.dir(result, { depth: null });
        });
      });
  }).end(options.body || '');
}

makeSigner({}, (err, sign) => {
  if (err) {
    throw err;
  }

  const stackName = process.argv[2];

  request(
    sign({
      service: 'cloudformation',
      path: `/?Action=DescribeStackResources&StackName=${stackName}`,
      signQuery: true,
    })
  );
});
