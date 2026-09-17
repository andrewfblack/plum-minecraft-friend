import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanText, offlineAnswer } from '../packs/Plum_BP/scripts/knowledge.js';

test('typed help handles useful questions and admits unsupported topics', () => {
  assert.match(offlineAnswer('How do I make a bed?'), /three matching wool/);
  assert.match(offlineAnswer('How do I grow a baby Plum?'), /plum/);
  assert.match(offlineAnswer('How do I make Plum sit?'), /sit/);
  assert.match(offlineAnswer('How do I make Plum follow again?'), /empty hand|follow/);
  assert.match(offlineAnswer('How do I carry my friend?'), /Fruit Basket/);
  assert.match(offlineAnswer('What is a Fruit Basket for?'), /three sticks in the bucket shape/);
  assert.match(offlineAnswer('Where can I find plums?'), /trees/);
  assert.match(offlineAnswer('How do I grow a tree?'), /sapling/);
  assert.match(offlineAnswer('Explain quantum mechanics'), /does not know/);
});

test('apple answers about Applezon and friend care, not healing', () => {
  assert.match(offlineAnswer('how do I shop at applezon?', 'apple'), /one apple fruit pays for one delivery/);
  assert.match(offlineAnswer('can Apple heal me?', 'apple'), /do NOT grant healing/);
  assert.match(offlineAnswer('how do I care for Apple?', 'apple'), /Tame me with an apple/);
  assert.match(offlineAnswer('carry me in a basket?', 'apple'), /Fruit Basket/);
  assert.match(offlineAnswer('where can I find apples?', 'apple'), /trees/);
  assert.match(offlineAnswer('How do I make a bed?', 'apple'), /three matching wool/);
});

test('blueberry answers about collecting and his portable chest, not healing', () => {
  assert.match(offlineAnswer('how do I open your chest?', 'blueberry'), /empty hand/);
  assert.match(offlineAnswer('my chest is full?', 'blueberry'), /full/);
  assert.match(offlineAnswer('can you pick up my drops?', 'blueberry'), /Dropped items within four blocks/);
  assert.match(offlineAnswer('how do I care for Blueberry?', 'blueberry'), /Tame me with a blueberry/);
  assert.match(offlineAnswer('does Blueberry heal me?', 'blueberry'), /do NOT grant healing/);
  assert.match(offlineAnswer('where can I find blueberries?', 'blueberry'), /trees/);
  assert.match(offlineAnswer('How do I make Blueberry sit?', 'blueberry'), /Sit or stand/);
  assert.match(offlineAnswer('How do I make a bed?', 'blueberry'), /three matching wool/);
});

test('input bounds and formatting cannot inject chat colors or control characters', () => {
  assert.equal(cleanText('§cHello\nfriend'), 'Hello friend');
  assert.equal(cleanText('a'.repeat(1000)).length, 400);
  assert.equal(cleanText(undefined), '');
});
