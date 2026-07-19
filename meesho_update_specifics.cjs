#!/usr/bin/env node
/**
 * Surgically update attributes for specific category IDs.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ATTR_FILE = './public/meesho/attributes.json';
const CDP_URL = 'http://localhost:9222';
const BASE_URL = 'https://supplier.meesho.com';
const SUPPLIER_ID = 4402738;
const IDENTIFIER = 'req4n';

async function api(page, endpoint, body) {
  return page.evaluate(
    async ({ base, ep, bd, headers }) => {
      try {
        const res = await fetch(`${base}${ep}`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json;charset=UTF-8' },
          credentials: 'include',
          body: JSON.stringify(bd),
        });
        const data = await res.json().catch(() => null);
        return { ok: res.ok, status: res.status, data };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    { base: BASE_URL, ep: endpoint, bd: body,
      headers: { 'identifier': IDENTIFIER, 'client-type': 'd-web',
        'client-package-version': '1.0.1', 'supplier-id': String(SUPPLIER_ID),
        'browser-id': 'NncgKyAyMzkgKyAxaGN1MDFoY3F6bw==', 'accept': 'application/json, text/plain, */*' },
    }
  );
}

async function main() {
  const browser = await chromium.connectOverCDP(CDP_URL);
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('meesho.com')) || await context.newPage();

  const ids = [15511, 15165, 15094, 13268];
  const allAttrs = JSON.parse(fs.readFileSync(ATTR_FILE, 'utf-8'));

  console.log(`Updating attributes for IDs: ${ids.join(', ')}...`);

  for (const id of ids) {
    try {
      const res = await api(page, '/api/cataloging/catalog-upload/fetch-sscat-image', {
        sub_sub_category_id: id,
        identifier: IDENTIFIER,
      });
      
      allAttrs[String(id)] = {
        category_id: String(id),
        image_link: res.data?.image_link || null,
        required_images_count: res.data?.required_images_count || null,
        updated: true,
      };
      console.log(`  ID ${id} → image_link: ${res.data?.image_link}, req_count: ${res.data?.required_images_count}`);
    } catch (e) {
      console.error(`  Failed for ID ${id}:`, e.message);
    }
  }

  fs.writeFileSync(ATTR_FILE, JSON.stringify(allAttrs, null, 2));
  // Keep also in meesho_output
  fs.writeFileSync('./meesho_output/attributes.json', JSON.stringify(allAttrs, null, 2));
  console.log('Successfully updated attributes file!');
  
  await browser.close();
}

main().catch(console.error);
