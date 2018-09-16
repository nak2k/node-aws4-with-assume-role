const { sign } = require('aws4');
const { parseArn } = require('arn2');
const { request } = require('https');
const xml2js = require('xml2js');

function assumeRole(options, callback) {
  const {
    agent,
    credentials,
    roleArn,
  } = options;

  const [parseArnErr, roleArnObj] = parseArn(roleArn);

  if (parseArnErr) {
    return callback(parseArnErr);
  }

  if (roleArnObj.service !== 'iam' || roleArnObj.resourceType !== 'role'
    || !roleArnObj.resource) {
    return callback(new Error(`"${roleArn}" is an invalid Role ARN`));
  }

  const roleName = roleArnObj.resource;

  const roleSessionName = roleName.replace('/', '-') + '-' + Math.random().toString(36).substr(2);

  const requestOptions = sign({
    service: 'sts',
    path: '/?Version=2011-06-15&Action=AssumeRole&' +
      `RoleArn=${roleArn}&RoleSessionName=${roleSessionName}`,
  }, credentials);

  requestOptions.agent = options.agent;

  request(requestOptions, res => {
    const data = [];

    res
      .on('error', err => callback(err))
      .on('data', chunk => data.push(chunk.toString()))
      .on('end', () => {
        const xml = data.join();

        const parser = new xml2js.Parser();

        parser.parseString(xml, (err, result) => {
          if (err) {
            return callback(err);
          }

          const { AssumeRoleResponse = {} } = result;
          const { AssumeRoleResult = [] } = AssumeRoleResponse;
          const [ AssumeRoleResult1 = {} ] = AssumeRoleResult;
          const { Credentials = [] } = AssumeRoleResult1;
          const [ Credentials1 ] = Credentials;

          if (!Credentials1) {
            return callback('Invalid response from sts:assumeRole');
          }

          const {
            AccessKeyId = [],
            SecretAccessKey = [],
            SessionToken = [],
            Expiration = [],
          } = Credentials1;

          callback(null, {
            accessKeyId: AccessKeyId[0],
            secretAccessKey: SecretAccessKey[0],
            sessionToken: SessionToken[0],
            expiration: Expiration[0],
          });
        });
      });
  }).on('error', err => callback(err))
    .end();
}

/*
 * Exports.
 */
exports.assumeRole = assumeRole;
