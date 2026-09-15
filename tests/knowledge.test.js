import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanText, offlineAnswer } from '../packs/Plum_BP/scripts/knowledge.js';

test('typed help handles useful questions and admits unsupported topics', () => {
  assert.match(offlineAnswer('How do I make a bed?'), /three matching wool/);
  assert.match(offlineAnswer('Can I breed babies?'), /plum/);
  assert.match(offlineAnswer('Where can I find plums?'), /trees/);
  assert.match(offlineAnswer('How do I grow a tree?'), /sapling/);
  assert.match(offlineAnswer('Explain quantum mechanics'), /does not know/);
});

test('input bounds and formatting cannot inject chat colors or control characters', () => {
  assert.equal(cleanText('§cHello\nfriend'), 'Hello friend');
  assert.equal(cleanText('a'.repeat(1000)).length, 400);
  assert.equal(cleanText(undefined), '');
});
