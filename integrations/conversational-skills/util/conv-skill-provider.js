#!/usr/bin/env node
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-var-requires */

require('dotenv').config();
const https = require("https");

const ASST_URL=process.env.ASST_URL;
const API_KEY=process.env.API_KEY;
const SKILL_SERVER_DOMAIN=process.env.SKILL_SERVER_DOMAIN;
const SKILL_PROVIDER_ID=process.env.SKILL_PROVIDER_ID;
const SERVER_AUTH_TOKEN=process.env.SERVER_AUTH_TOKEN;

function initSkillProviderInput() {
  return {
    provider_id: SKILL_PROVIDER_ID,
    specification: {
      servers: [
        {
          url: SKILL_SERVER_DOMAIN
        }
      ],
      components: {
        securitySchemes: {
          authentication_method: 'basic',
          basic: {
            username: {
              type: 'value',
              value: 'convskilluser'
            }
          }
        }
      }
    },
    private: {
      authentication: {
        basic: {
          password: {
            type: 'value',
            value: SERVER_AUTH_TOKEN
          }
        }
      }
    }
  };
}

function initRequestOptions() {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(`apikey:${API_KEY}`).toString('base64')
    },
  };
}

async function registerSkillProvider() {
  const url = new URL(`${ASST_URL}/v2/providers?version=2023-06-15`);
  const options = initRequestOptions();
  const apiInput = initSkillProviderInput();

  return new Promise((resolve, reject) => {
    let body = '';
    const req = https.request(url, options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body = chunk;
      });
      res.on('end', () => {
        resolve(JSON.parse(body));
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(JSON.stringify(apiInput));
    req.end();
  });
}

async function updateSkillProvider() {
  const url = new URL(`${ASST_URL}/v2/providers/${SKILL_PROVIDER_ID}?version=2023-06-15`);
  const options = initRequestOptions();
  const apiInput = initSkillProviderInput();
  console.log(JSON.stringify(apiInput, null, 2));

  return new Promise((resolve, reject) => {
    let body = ''
    const req = https.request(url, options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body = chunk;
      });
      res.on('end', () => {
        resolve(JSON.parse(body));
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(JSON.stringify(apiInput));
    req.end();
  });
}

async function listSkillProviders() {
  const url = new URL(`${ASST_URL}/v2/providers?version=2023-06-15`);
  const options = initRequestOptions();
  options.method = 'GET';

  return new Promise((resolve, reject) => {
    let body = '';
    const req = https.request(url, options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      res.setEncoding('utf8');
      res.on('data', (data) => {
        body = data;
      });
      res.on('end', () => {
        resolve(JSON.parse(body));
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.end();
  });
}

async function main() {
  const operation = process.argv[2];
  switch (operation) {
    case 'register':
      return registerSkillProvider()
        .then((res) => {
          console.log('Registered skill provider\n', JSON.stringify(res, null, 2));
        });
    case 'update':
      return updateSkillProvider()
        .then((res) => {
          console.log('Updated skill provider\n', JSON.stringify(res, null, 2));
        });;
    case 'list':
      return listSkillProviders()
        .then((res) => {
          console.log('Skill providers\n', JSON.stringify(res, null, 2));
        });
    default:
      console.log('Unknown operation', operation);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
