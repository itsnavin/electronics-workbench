import test from 'node:test';
import assert from 'node:assert/strict';
import { learningReferences, learningReviewed, meterGuides, meterSafety } from '../guides.js';

test('all three guides provide procedures, type distinctions, interpretations and reviewed provenance', () => {
  assert.deepEqual(meterGuides.map(guide => guide.id), ['resistor', 'capacitor', 'diode']);
  assert.match(learningReviewed, /^\d{4}-\d{2}-\d{2}$/);
  for (const guide of meterGuides) {
    assert.ok(guide.steps.length >= 4);
    assert.ok(guide.types.length >= 5);
    assert.ok(guide.readings.length >= 4);
    assert.ok(guide.limits.length > 100);
    for (const key of guide.refs) assert.ok(learningReferences[key]);
    for (const row of [...guide.types, ...guide.readings]) assert.equal(row.length, 2);
  }
  for (const source of Object.values(learningReferences)) {
    const url = new URL(source.url);
    assert.equal(url.protocol, 'https:');
    assert.ok(['www.fluke.com', 'www.vishay.com', 'openstax.org', 'www.tek.com'].includes(url.hostname));
    assert.ok(source.title.length > 20);
  }
});

test('shared safety and measurement limitations remain explicit', () => {
  for (const phrase of ['disconnected', 'de-energized', 'isolated low-energy', 'retain or regain charge', 'absence of voltage verified', 'manufacturer-approved', 'stop and seek qualified help', 'No live mains probing']) {
    assert.ok(meterSafety.includes(phrase), phrase);
  }
  const capacitor = meterGuides.find(guide => guide.id === 'capacitor');
  assert.match(capacitor.limits, /ESR/);
  assert.match(capacitor.limits, /leakage\/insulation/);
  assert.match(capacitor.limits, /cannot test all capacitors/);
  const diode = meterGuides.find(guide => guide.id === 'diode');
  assert.match(diode.limits, /breakdown/);
  assert.ok(diode.types.some(row => row[0].includes('LED') && row[1].includes('meter compliance')));
  assert.ok(diode.types.some(row => row[0].includes('Zener') && row[1].includes('Bidirectional TVS')));
  assert.match(meterGuides[0].limits, /continuity beep/i);
});
