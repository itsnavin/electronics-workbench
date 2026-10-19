import test from 'node:test';
import assert from 'node:assert/strict';
import { pins, boards, lookup, ics, sources, verified } from '../catalog.js';

const expectedBCM = [null, null, 2, null, 3, null, 4, 14, null, 15, 17, 18, 27, null, 22, 23, null, 24, 10, null, 9, 25, 11, 8, null, 7, 0, 1, 5, null, 6, 12, 13, null, 19, 16, 26, 20, null, 21];

test('all 40 physical pins match the official header diagram', () => {
  assert.equal(pins.length, 40);
  pins.forEach((pin, index) => {
    assert.equal(pin.physical, index + 1);
    assert.equal(pin.bcm, expectedBCM[index]);
  });
  assert.deepEqual(pins.filter(pin => pin.kind === '3v3').map(pin => pin.physical), [1, 17]);
  assert.deepEqual(pins.filter(pin => pin.kind === '5v').map(pin => pin.physical), [2, 4]);
  assert.deepEqual(pins.filter(pin => pin.kind === 'ground').map(pin => pin.physical), [6, 9, 14, 20, 25, 30, 34, 39]);
});

test('power and ground never have GPIO numbers; GPIOs are bijective', () => {
  const gpios = pins.filter(pin => pin.kind === 'gpio');
  assert.equal(gpios.length, 28);
  assert.equal(new Set(gpios.map(pin => pin.bcm)).size, 28);
  assert.deepEqual(gpios.map(pin => pin.bcm).sort((a, b) => a - b), Array.from({ length: 28 }, (_, i) => i));
  pins.filter(pin => pin.kind !== 'gpio').forEach(pin => assert.equal(pin.bcm, null));
  assert.deepEqual(pins.filter(pin => pin.reserved).map(pin => pin.physical), [27, 28]);
});

for (const board of boards) {
  test(`${board.name}: both numbering directions round-trip every GPIO`, () => {
    for (const pin of pins) {
      assert.equal(lookup(board.id, 'physical', pin.physical), pin);
      if (pin.bcm !== null) assert.equal(lookup(board.id, 'bcm', pin.bcm), pin);
    }
    assert.equal(lookup(board.id, 'physical', 11).bcm, 17);
    assert.equal(lookup(board.id, 'bcm', 17).physical, 11);
  });
}

test('invalid lookup never silently falls back to a pin', () => {
  for (const value of ['', ' ', '-1', '0', '41', '100', '1.5', 'abc', 'Infinity', '1e1', '+1']) assert.throws(() => lookup('pi4', 'physical', value));
  for (const value of ['', '-1', '28', '40', '3.3', '0x10']) assert.throws(() => lookup('pi5', 'bcm', value));
  assert.equal(lookup('pi5', 'bcm', '0').physical, 27);
  assert.throws(() => lookup('pico', 'physical', 11));
  assert.throws(() => lookup('pi4', 'wiringpi', 11));
});

test('curated exact package pinouts match manufacturer tables', () => {
  const expected = {
    ne555p: ['GND', 'TRIG', 'OUT', 'RESET', 'CONT', 'THRES', 'DISCH', 'VCC'],
    lm358p: ['OUT1', 'IN1-', 'IN1+', 'V-', 'IN2+', 'IN2-', 'OUT2', 'V+'],
    sn74hc00n: ['1A', '1B', '1Y', '2A', '2B', '2Y', 'GND', '3Y', '3A', '3B', '4Y', '4A', '4B', 'VCC'],
  };
  assert.equal(ics.length, 3);
  for (const ic of ics) {
    assert.deepEqual(ic.pins.map(([name]) => name), expected[ic.id]);
    assert.ok(ic.pins.every(([, description]) => description.length > 3));
    assert.equal(ic.view, 'top');
    assert.match(ic.package, /PDIP-(8|14)/);
  }
  assert.deepEqual(ics.map(ic => ic.supply), [[4.5, 16], [3, 30], [2, 6]]);
});

test('every reference has official provenance and explicit review date', () => {
  assert.match(verified, /^\d{4}-\d{2}-\d{2}$/);
  for (const ic of ics) {
    for (const field of ['name', 'manufacturer', 'package', 'doc', 'revision', 'sections', 'supplyNote', 'note', 'verified']) assert.ok(ic[field], `${ic.id}.${field}`);
    assert.equal(new URL(ic.source).hostname, 'www.ti.com');
    assert.ok(ic.product.endsWith(ic.name));
  }
  for (const board of boards) {
    assert.ok(board.sources.length >= 2);
    assert.equal(board.verified, verified);
    assert.ok(board.sources.every(url => url.startsWith('https://github.com/raspberrypi/documentation/')));
  }
  assert.match(boards.find(board => board.id === 'pi5').note, /RP1/);
  assert.match(boards.find(board => board.id === 'zero2').note, /unpopulated/);
  for (const url of Object.values(sources)) assert.equal(new URL(url).protocol, 'https:');
});
