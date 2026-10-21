import test from 'node:test';
import assert from 'node:assert/strict';
import { convert, number, ohms, standardAbove, E12, E24, led, network, divider, rc, timer, idealTransformer, colors, decodeBands, encodeBands, format } from '../calculators.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= Math.max(1e-12, Math.abs(expected) * 1e-10), `${actual} != ${expected}`);

test('finite positive input validation and explicit zero allowance', () => {
  for (const input of ['', ' ', 'abc', 'NaN', Infinity, -1, 0, '1e999']) assert.throws(() => number(input));
  assert.equal(number(0, 'Voltage', true), 0);
  assert.equal(number(' 1e3 '), 1000);
});

test('every supported unit converts to SI', () => {
  for (const [category, unit, input, expected] of [
    ['resistance', 'ohm', 2, 2], ['resistance', 'kohm', 2, 2000], ['resistance', 'Mohm', 2, 2e6],
    ['voltage', 'V', 2, 2], ['voltage', 'mV', 2000, 2],
    ['current', 'A', 2, 2], ['current', 'mA', 2, 0.002], ['current', 'uA', 2, 2e-6],
    ['capacitance', 'F', 2, 2], ['capacitance', 'uF', 2, 2e-6],
    ['capacitance', 'nF', 2, 2e-9], ['capacitance', 'pF', 2, 2e-12],
  ]) close(convert(input, category, unit), expected);
  assert.throws(() => convert(1, 'resistance', 'V'));
  assert.throws(() => convert(1e308, 'resistance', 'Mohm'));
  assert.throws(() => convert(5e-324, 'current', 'uA'), /too small/);
});

test("Ohm's law solves all three quantities and power", () => {
  const voltage = ohms('voltage', 0.01, 1000);
  close(voltage.result, 10); close(voltage.power, 0.1);
  close(ohms('current', 10, 1000).result, 0.01);
  close(ohms('current', 10, 1000).power, 0.1);
  close(ohms('resistance', 10, 0.01).result, 1000);
  assert.throws(() => ohms('power', 2, 3));
  assert.throws(() => ohms('current', 10, 0));
  assert.throws(() => ohms('voltage', 1e308, 1e308));
  assert.throws(() => ohms('voltage', 1e-300, 1e-300));
});

test('E24 and E12 rounding is upward, including decade boundaries', () => {
  for (const series of [E12, E24]) {
    for (let decade = -3; decade < 9; decade++) {
      for (const base of series) {
        const nominal = Number((base * 10 ** decade).toPrecision(15));
        assert.equal(standardAbove(nominal, series), nominal);
        const above = standardAbove(nominal * 1.000001, series);
        assert.ok(above >= nominal * 1.000001);
        assert.ok(above <= nominal * 1.3);
      }
    }
  }
  assert.equal(standardAbove(300), 300);
  assert.equal(standardAbove(301), 330);
  assert.equal(standardAbove(991), 1000);
  assert.throws(() => standardAbove(0));
});

test('LED recommendation respects resistor tolerance and derating margin', () => {
  const result = led(5, 2, 0.01);
  close(result.minimum, 300);
  assert.equal(result.recommended, 330);
  close(result.actualCurrent, 3 / 330);
  close(result.worstPower, 9 / (330 * 0.95));
  assert.equal(result.rating, 0.125);
  assert.ok(result.rating >= 2 * result.worstPower);
  for (const supply of [3.3, 5, 12, 24]) {
    for (const current of [0.001, 0.01, 0.02, 0.05]) {
      const r = led(supply, 2, current);
      assert.ok(r.recommended >= r.minimum);
      assert.ok((supply - 2) / (0.95 * r.recommended) <= current);
      assert.ok(r.rating >= r.powerTarget);
    }
  }
});

test('LED visibly invalid headroom, unsafe scope and invalid input', () => {
  for (const args of [[2, 2, 0.01], [1.9, 2, 0.01], [25, 2, 0.01], [5, 2, 0.051], [5, 2, 0], [5, -1, 0.01]]) {
    assert.throws(() => led(...args));
  }
});

test('resistor networks, unequal values and input boundaries', () => {
  close(network([100, 100], 'series'), 200);
  close(network([100, 100], 'parallel'), 50);
  close(network([100, 200, 300], 'parallel'), 600 / 11);
  close(network([1e308, 1e308], 'parallel'), 5e307);
  for (const values of [[], [100], [100, 0], [100, -1], [100, NaN], Array(21).fill(10)]) assert.throws(() => network(values, 'series'));
  assert.throws(() => network([1, 2], 'unknown'));
  assert.throws(() => network([1e308, 1e308], 'series'));
});

test('divider calculates unloaded and loaded output, including zero input', () => {
  close(divider(5, 10000, 10000).output, 2.5);
  const loaded = divider(5, 10000, 10000, 10000);
  close(loaded.unloaded, 2.5); close(loaded.output, 5 / 3);
  assert.equal(divider(0, 1, 1).output, 0);
  close(divider(5, 1e308, 1e308).output, 2.5);
  for (const args of [[5, 0, 1], [5, 1, -1], [5, 1, 1, 0], [-5, 1, 1]]) assert.throws(() => divider(...args));
});

test('RC time constant and cutoff use actual SI units', () => {
  const result = rc(convert(10, 'resistance', 'kohm'), convert(10, 'capacitance', 'uF'));
  close(result.tau, 0.1); close(result.fiveTau, 0.5); close(result.cutoff, 1.5915494309189535);
  close(rc(1000, 1e-9).tau, 1e-6);
  assert.throws(() => rc(0, 1));
  assert.throws(() => rc(1, -1));
  assert.throws(() => rc(1e308, 1e308));
});

test('standard 555 astable and monostable formulas', () => {
  const astable = timer('astable', 10000, 10e-6, 10000);
  close(astable.high, Math.LN2 * 0.2); close(astable.low, Math.LN2 * 0.1);
  close(astable.frequency, 4.808983469629878);
  close(astable.duty, 200 / 3);
  close(timer('mono', 10000, 10e-6).duration, 0.11);
  for (const ra of [1000, 10000, 100000]) for (const rb of [1000, 10000, 100000]) {
    const value = timer('astable', ra, 1e-6, rb);
    assert.ok(value.duty > 50 && value.duty < 100);
    close(value.frequency * (value.high + value.low), 1);
  }
});

test('555 rejects physically unsupported timing and nonpositive components', () => {
  assert.throws(() => timer('mono', 1, 1e-9), /10 us/);
  assert.throws(() => timer('astable', 1000, 1e-12, 1000), /100 kHz/);
  assert.throws(() => timer('astable', 1000, 1e-6, 0));
  assert.throws(() => timer('mono', -1, 1e-6));
  assert.throws(() => timer('invalid', 1000, 1e-6));
});

test('4 and 5 band reference examples and tolerance ranges', () => {
  assert.deepEqual(decodeBands(['Brown', 'Black', 'Red', 'Gold']), { resistance: 1000, tolerance: 5, min: 950, max: 1050 });
  const five = decodeBands(['Brown', 'Black', 'Black', 'Brown', 'Brown']);
  assert.equal(five.resistance, 1000); assert.equal(five.tolerance, 1);
  close(five.min, 990); close(five.max, 1010);
  close(decodeBands(['Yellow', 'Violet', 'Silver', 'Silver']).resistance, 0.47);
});

test('all multipliers and tolerances round-trip for both band counts', () => {
  for (const count of [4, 5]) {
    for (const multiplier of colors.filter(color => color.exponent !== undefined)) {
      for (const tolerance of colors.filter(color => color.tolerance !== undefined)) {
        const bands = count === 4 ? ['Red', 'Violet', multiplier.name, tolerance.name] : ['Red', 'Violet', 'Black', multiplier.name, tolerance.name];
        const decoded = decodeBands(bands);
        assert.deepEqual(encodeBands(decoded.resistance, count, tolerance.name), bands);
        assert.ok(decoded.min < decoded.resistance && decoded.max > decoded.resistance);
      }
    }
  }
});

test('band constraints reject invalid choices and nonrepresentable values', () => {
  for (const bands of [
    ['Black', 'Black', 'Red', 'Gold'], ['Gold', 'Black', 'Red', 'Gold'],
    ['Brown', 'Black', 'Red', 'White'], ['Brown', 'Black', 'None', 'Gold'], ['Brown', 'Black'],
  ]) assert.throws(() => decodeBands(bands));
  for (const value of [0, -1, 0.001, 1234, 1e15]) assert.throws(() => encodeBands(value, 4, 'Gold'));
  assert.throws(() => encodeBands(1000, 6, 'Gold'));
  assert.throws(() => encodeBands(1000, 4, 'Black'));
  assert.deepEqual(encodeBands(4700, 4, 'Gold'), ['Yellow', 'Violet', 'Red', 'Gold']);
});

test('engineering formatting is finite and unit-aware', () => {
  assert.equal(format(1000, 'ohm'), '1 kohm');
  assert.equal(format(0.01, 'A'), '10 mA');
  assert.equal(format(10e-6, 'F'), '10 uF');
  assert.equal(format(0, 'V'), '0 V');
  assert.throws(() => format(Infinity));
});

test('Vishay 20143 independent five-band vectors, including fractional multipliers', () => {
  for (const [bands, resistance, tolerance, min, max] of [
    [['Yellow', 'Violet', 'Black', 'Brown', 'Brown'], 4700, 1, 4653, 4747],
    [['Red', 'Red', 'Black', 'Gold', 'Brown'], 22, 1, 21.78, 22.22],
    [['Brown', 'Black', 'Black', 'Silver', 'Red'], 1, 2, 0.98, 1.02],
    [['Blue', 'Grey', 'Black', 'Red', 'Blue'], 68000, 0.25, 67830, 68170],
    [['Brown', 'Black', 'Black', 'Black', 'Grey'], 100, 0.05, 99.95, 100.05],
    [['White', 'White', 'White', 'White', 'Silver'], 999e9, 10, 899.1e9, 1098.9e9],
  ]) {
    const result = decodeBands(bands);
    close(result.resistance, resistance); close(result.tolerance, tolerance);
    close(result.min, min); close(result.max, max);
    assert.deepEqual(encodeBands(resistance, 5, bands[4]), bands);
  }
  for (const invalid of [
    ['Black', 'Red', 'Red', 'Brown', 'Brown'],
    ['Brown', 'Gold', 'Red', 'Brown', 'Brown'],
    ['Brown', 'Black', 'Silver', 'Brown', 'Brown'],
    ['Brown', 'Black', 'Red', 'Brown', 'Black'],
    ['Brown', 'Black', 'Red', 'Brown', 'Orange'],
    ['Brown', 'Black', 'Red', 'Brown', 'Yellow'],
    ['Brown', 'Black', 'Red', 'Brown', 'White'],
  ]) assert.throws(() => decodeBands(invalid));
});

test('supported color roles independently match the manufacturer table', () => {
  const expected = [
    ['Black', 0, 0, undefined], ['Brown', 1, 1, 1], ['Red', 2, 2, 2],
    ['Orange', 3, 3, undefined], ['Yellow', 4, 4, undefined], ['Green', 5, 5, 0.5],
    ['Blue', 6, 6, 0.25], ['Violet', 7, 7, 0.1], ['Grey', 8, 8, 0.05],
    ['White', 9, 9, undefined], ['Gold', undefined, -1, 5], ['Silver', undefined, -2, 10],
  ];
  assert.deepEqual(colors.map(c => [c.name, c.digit, c.exponent, c.tolerance]), expected);
});

test('ideal transformer solves all four unknowns from independent low-voltage vectors', () => {
  for (const [solve, known, expected] of [
    ['vs', { vp: 12, np: 600, ns: 300 }, 6],
    ['vp', { vs: 6, np: 600, ns: 300 }, 12],
    ['ns', { vp: 12, vs: 6, np: 600 }, 300],
    ['np', { vp: 12, vs: 6, ns: 300 }, 600],
    ['vs', { vp: 3, np: 100, ns: 400 }, 12],
    ['ns', { vp: 12, vs: 5, np: 100 }, 125 / 3],
    ['np', { vp: 5, vs: 12, ns: 100 }, 125 / 3],
  ]) {
    const result = idealTransformer(solve, known);
    close(result[solve], expected);
    assert.equal(result.ip, null); assert.equal(result.is, null); assert.equal(result.va, null);
  }
});

test('transformer current directions conserve ideal apparent power, with units and zero-load limit', () => {
  const known = { vp: convert(12000, 'voltage', 'mV'), np: 600, ns: 300 };
  for (const load of [
    { side: 'secondary', current: convert(200, 'current', 'mA') },
    { side: 'primary', current: convert(100000, 'current', 'uA') },
  ]) {
    const result = idealTransformer('vs', known, load);
    close(result.ip, 0.1); close(result.is, 0.2); close(result.va, 1.2);
  }
  const up = idealTransformer('vp', { vs: 12, np: 100, ns: 400 }, { side: 'secondary', current: 0.05 });
  close(up.vp, 3); close(up.ip, 0.2); close(up.va, 0.6);
  for (const side of ['primary', 'secondary']) {
    const result = idealTransformer('vs', known, { side, current: 0 });
    assert.equal(result.ip, 0); assert.equal(result.is, 0); assert.equal(result.va, 0);
  }
});

test('transformer rejects missing, nonphysical and unrepresentable inputs explicitly', () => {
  const known = { vp: 12, np: 600, ns: 300 };
  assert.throws(() => idealTransformer('bad', known));
  for (const value of ['', ' ', -1, 0, NaN, Infinity]) {
    for (const key of ['vp', 'np', 'ns']) assert.throws(() => idealTransformer('vs', { ...known, [key]: value }));
  }
  assert.throws(() => idealTransformer('vs', { np: 600, ns: 300 }));
  for (const key of ['np', 'ns']) for (const value of [0.5, 600.1, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => idealTransformer('vs', { ...known, [key]: value }), /whole numbers/);
  }
  for (const current of ['', -1, Infinity, NaN]) assert.throws(() => idealTransformer('vs', known, { side: 'secondary', current }));
  assert.throws(() => idealTransformer('vs', known, { side: 'unknown', current: 1 }));
  assert.throws(() => idealTransformer('vs', { vp: 1e308, np: 1, ns: 100 }));
  assert.throws(() => idealTransformer('vs', { vp: 5e-324, np: 100, ns: 1 }));
  assert.throws(() => idealTransformer('vs', known, { side: 'primary', current: 1e308 }));
  assert.throws(() => idealTransformer('vs', known, { side: 'secondary', current: 5e-324 }));
});

test('transformer ratios and currents preserve identities over step-up and step-down cases', () => {
  for (const vp of [0.5, 3, 12, 24]) for (const np of [1, 100, 600]) for (const ns of [1, 50, 300, 1200]) {
    const result = idealTransformer('vs', { vp, np, ns }, { side: 'secondary', current: 0.125 });
    close(result.vs / vp, ns / np);
    close(result.ip / result.is, ns / np);
    close(result.vp * result.ip, result.vs * result.is);
    close(idealTransformer('vp', { vs: result.vs, np, ns }).vp, vp);
    close(idealTransformer('np', { vp, vs: result.vs, ns }).np, np);
    close(idealTransformer('ns', { vp, vs: result.vs, np }).ns, ns);
  }
});
