const { request } = require('https');
const { homedir } = require('os');
const { readFile } = require('fs');
const { parse } = require('ini');
const { sign } = require('aws4');
const proxy = require('proxy-agent');

function makeSigner(options, callback) {
  if (typeof options === 'function') {
    [options, callback] = [{}, options];
  }

  getProfiles(options, (err, profiles) => {
    if (err) {
      return callback(err);
    }

    const profile = options.profile || process.env.AWS_PROFILE || 'default';

    options = {
      ...options,
      profiles,
      profile,
    };

    /*
     * Create the default proxy agent if environment variables is set.
     */
    if (options.agent === undefined) {
      const { env } = process;
      const proxyUrl = env.HTTPS_PROXY || env.https_proxy
        || env.HTTP_PROXY || env.http_proxy || env.ALL_PROXY || env.all_proxy;

      if (proxyUrl !== undefined) {
        options.agent = proxy(proxyUrl);
      }
    }

    const defaultAgent = options.agent;

    getConfig(options, (err, config) => {
      if (err) {
        return callback(err);
      }

      getCredentials(options, (err, credentials) => {
        if (err) {
          return callback(err);
        }

        const defaultRegion = options.region || process.env.AWS_REGION
          || credentials.region || config.region;

        callback(null, options => {
          /*
           * Sign with credentials.
           */
          if (options.region !== undefined &&
            (options.agent !== undefined || defaultAgent === undefined)) {
            return sign(options, credentials);
          }

          /*
           * Sign with default settings and credentials.
           */
          options = { ...options };

          if (options.region === undefined) {
            options.region = defaultRegion;
          }

          if (options.agent === undefined) {
            options.agent = defaultAgent;
          }

          return sign(options, credentials);
        });
      });
    });
  });
}

function getCredentials(options, callback) {
  const {
    profiles,
    profile: profileName,
  } = options;

  const profile = profiles[profileName];

  if (profile === undefined) {
    return callback(new Error(`Profile ${profileName} not found.`));
  }

  const { source_profile } = profile;

  if (source_profile === undefined) {
    return callback(null, {
      accessKeyId: profile['aws_access_key_id'],
      secretAccessKey: profile['aws_secret_access_key'],
      sessionToken: profile['aws_session_token'],
      region: profile['region'],
    });
  }

  getCredentials({
    profiles,
    profile: source_profile,
  }, (err, credentials) => {
    if (err) {
      return callback(err);
    }

    const { role_arn } = profile;

    if (role_arn === undefined) {
      return callback(null, credentials);
    }

    const roleSessionName = profileName + '-' + Math.random().toString(36).substr(2);

    const requestOptions = sign({
      service: 'sts',
      path: '/?Version=2011-06-15&Action=AssumeRole&' +
        `RoleArn=${role_arn}&RoleSessionName=${roleSessionName}`,
    }, credentials);

    requestOptions.agent = options.agent;

    request(requestOptions, res => {
      const data = [];

      res
        .on('error', err => callback(err))
        .on('data', chunk => data.push(chunk.toString()))
        .on('end', () => {
          const xml = data.join();

          const accessKeyId = xml.match(/<AccessKeyId>(.+)<\/AccessKeyId>/)[1];
          const secretAccessKey = xml.match(/<SecretAccessKey>(.+)<\/SecretAccessKey>/)[1];
          const sessionToken = xml.match(/<SessionToken>(.+)<\/SessionToken>/)[1];
          const expiration = xml.match(/<Expiration>(.+)<\/Expiration>/)[1];

          callback(null, {
            accessKeyId,
            secretAccessKey,
            sessionToken,
            expiration,
          });
        });
    }).on('error', err => callback(err))
      .end();
  });
}

function getProfiles(options, callback) {
  const credentialsFile = process.env.AWS_SHARED_CREDENTIALS_FILE
    || `${homedir()}/.aws/credentials`;

  readFile(credentialsFile, 'utf-8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return callback(null, {});
      }

      return callback(err);
    }

    try {
      callback(null, parse(data) || {});
    } catch (err) {
      callback(err);
    }
  });
}

function getConfig(options, callback) {
  const configFile = process.env.AWS_CONFIG_FILE
    || `${homedir()}/.aws/config`;

  readFile(configFile, 'utf-8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return callback(null, {});
      }

      return callback(err);
    }

    let config;

    try {
      config = parse(data) || {};
    } catch (err) {
      return callback(err);
    }

    const key = options.profile === 'default' ? 'default' : 'profile ' + options.profile;

    callback(null, config[key]);
  });
}

/*
 * Exports.
 */
exports.makeSigner = makeSigner;