const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wgboyqvwrxzhzmibooyd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnYm95cXZ3cnh6aHptaWJvb3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzA3MjgsImV4cCI6MjA5NzIwNjcyOH0.idbxjPuhH05VYs4yhFykI_ryoo2ypRtuDG9VQcmw5hU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: true, raw: data });
        }
      });
    }).on('error', reject);
  });
}

async function testApi() {
  const model1 = await fetchJson('https://makerworld.com/api/v1/model-service/model/2547928');
  console.log('Model 1 API response keys:', Object.keys(model1));
  if (model1.design) console.log('Design cover:', model1.design.cover);

  const model2 = await fetchJson('https://makerworld.com/api/v1/model-service/model/2666445');
  console.log('Model 2 API response keys:', Object.keys(model2));
  if (model2.design) console.log('Design cover:', model2.design.cover);
}

testApi();
