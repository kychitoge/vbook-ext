'use strict';

const axios = require('axios');

const url = process.argv[2];
const opts = JSON.parse(process.argv[3] || '{}');

axios({
  url,
  method: opts.method || 'GET',
  headers: opts.headers || {},
  data: opts.body,
  timeout: opts.timeout || 30000,
  validateStatus: () => true,
  responseType: 'arraybuffer'
}).then((res) => {
  const resp = {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
    url: (res.request && res.request.res && res.request.res.responseUrl) ? res.request.res.responseUrl : url,
    data: Buffer.from(res.data).toString('base64')
  };
  process.stdout.write(JSON.stringify(resp));
}).catch((err) => {
  process.stderr.write(err.message || String(err));
  process.exit(1);
});
