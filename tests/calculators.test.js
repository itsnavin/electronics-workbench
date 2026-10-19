import test from 'node:test';
import assert from 'node:assert/strict';
import { convert, number, ohms, standardAbove, E12, E24, led, network, divider, rc, timer, colors, decodeBands, encodeBands, format } from '../calculators.js';

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
