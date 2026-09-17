import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanText, offlineAnswer } from '../packs/Plum_BP/scripts/knowledge.js';

test('typed help handles useful questions and admits unsupported topics', () => {
  assert.match(offlineAnswer('How do I make a bed?'), /three matching wool/);
  assert.match(offlineAnswer('How do I grow a baby Plum?'), /plum/);
  assert.match(offlineAnswer('Where can I find plums?'), /trees/);
  assert.match(offlineAnswer('How do I grow a tree?'), /sapling/);
  assert.match(offlineAnswer('Explain quantum mechanics'), /does not know/);
});

test('apple answers about Applezon and friend care, not healing', () => {
  assert.match(offlineAnswer('how do I shop at applezon?', 'apple'), /one apple fruit pays for one delivery/);
  assert.match(offlineAnswer('can Apple heal me?', 'apple'), /do NOT grant healing/);
  assert.match(offlineAnswer('how do I care for Apple?', 'apple'), /Tame me with an apple/);
  assert.match(offlineAnswer('where can I find apples?', 'apple'), /trees/);
  assert.match(offlineAnswer('How do I make a bed?', 'apple'), /three matching wool/);
});

test('input bounds and formatting cannot inject chat colors or control characters', () => {
  assert.equal(cleanText('§cHello\nfriend'), 'Hello friend');
  assert.equal(cleanText('a'.repeat(1000)).length, 400);
  assert.equal(cleanText(undefined), '');
});
