export const units = {
  resistance: { ohm: 1, kohm: 1e3, Mohm: 1e6 },
  voltage: { V: 1, mV: 1e-3 },
  current: { A: 1, mA: 1e-3, uA: 1e-6 },
  capacitance: { F: 1, uF: 1e-6, nF: 1e-9, pF: 1e-12 },
};

export function number(value, name = 'Value', allowZero = false) {
  if (String(value).trim() === '') throw new Error(`${name} is required.`);
  const result = Number(value);
  if (!Number.isFinite(result) || (allowZero ? result < 0 : result <= 0)) {
    throw new Error(`${name} must be a finite ${allowZero ? 'non-negative' : 'positive'} number.`);
  }
  return result;
}

export function convert(value, category, unit, name, allowZero = false) {
  if (!Object.hasOwn(units[category] ?? {}, unit)) throw new Error('Choose a valid unit.');
  const input = number(value, name, allowZero);
  const result = finite(input * units[category][unit]);
  if (input > 0 && result === 0) throw new Error('Value is too small for the supported numeric range.');
  return result;
}

function finite(value) {
  if (!Number.isFinite(value) || value < 0) throw new Error('Result is outside the supported numeric range.');
  return value;
}

function positiveResult(value) {
  finite(value);
  if (value === 0) throw new Error('Value is too small for the supported numeric range.');
  return value;
}

export function ohms(solve, a, b) {
  number(a, 'First input'); number(b, 'Second input');
  if (!['voltage', 'current', 'resistance'].includes(solve)) throw new Error('Choose a quantity to solve.');
  const result = positiveResult(solve === 'voltage' ? a * b : a / b);
  const voltage = solve === 'voltage' ? result : a;
  const current = solve === 'current' ? result : solve === 'voltage' ? a : b;
  return { result, power: positiveResult(voltage * current) };
}

export const E12 = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
export const E24 = [1, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2, 2.2, 2.4, 2.7, 3, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];

export function standardAbove(minimum, series = E24) {
  number(minimum, 'Minimum resistance');
  const decade = 10 ** Math.floor(Math.log10(minimum));
  for (const base of [...series, 10]) {
    const candidate = Number((base * decade).toPrecision(15));
    if (candidate >= minimum) return finite(candidate);
  }
  throw new Error('No standard value in the supported numeric range.');
}

export function led(supply, forward, current) {
  number(supply, 'Supply'); number(forward, 'LED forward voltage'); number(current, 'LED current');
  if (supply > 24 || forward > 24 || current > 0.05) throw new Error('This learning tool supports up to 24 V DC and 50 mA only.');
  if (supply <= forward) throw new Error('Supply must exceed LED forward voltage. At zero or negative headroom, a series resistor cannot set the requested current.');
  const headroom = supply - forward;
  const minimum = positiveResult(headroom / current);
  // A 5% E24 resistor may be 5% below its marked nominal resistance.
  const recommended = standardAbove(minimum / 0.95);
  const actualCurrent = headroom / recommended;
  const worstPower = positiveResult(headroom ** 2 / (recommended * 0.95));
  const powerTarget = positiveResult(2 * worstPower);
  const rating = [0.125, 0.25, 0.5, 1, 2, 3, 5].find(value => value >= powerTarget) ?? null;
  return { minimum, recommended, actualCurrent, worstPower, powerTarget, rating };
}

export function network(values, mode) {
  if (!['series', 'parallel'].includes(mode)) throw new Error('Choose series or parallel.');
  if (values.length < 2 || values.length > 20) throw new Error('Enter between 2 and 20 resistors.');
  values.forEach(value => number(value, 'Every resistor'));
  if (mode === 'series') return positiveResult(values.reduce((sum, value) => sum + value, 0));
  const smallest = Math.min(...values);
  return positiveResult(smallest / values.reduce((sum, value) => sum + smallest / value, 0));
}

export function divider(vin, top, bottom, load = null) {
  number(vin, 'Input voltage', true); number(top, 'Top resistor'); number(bottom, 'Bottom resistor');
  if (load !== null) number(load, 'Load resistor');
  const lower = load === null ? bottom : network([bottom, load], 'parallel');
  const ratio = (a, b) => a <= b ? (a / b) / (1 + a / b) : 1 / (1 + b / a);
  return { unloaded: finite(vin * ratio(bottom, top)), output: finite(vin * ratio(lower, top)) };
}

export function rc(resistance, capacitance) {
  number(resistance, 'Resistance'); number(capacitance, 'Capacitance');
  const tau = positiveResult(resistance * capacitance);
  return { tau, fiveTau: positiveResult(5 * tau), cutoff: positiveResult(1 / (2 * Math.PI * tau)) };
}

export function timer(mode, ra, capacitance, rb = null) {
  number(ra, 'RA / R'); number(capacitance, 'Capacitance');
  if (mode === 'mono') {
    const duration = positiveResult(1.1 * ra * capacitance);
    if (duration < 10e-6) throw new Error('NE555P reference: minimum monostable pulse width is 10 us. Choose a larger R or C.');
    return { duration };
  }
  if (mode !== 'astable') throw new Error('Choose a timer mode.');
  number(rb, 'RB');
  const high = positiveResult(Math.LN2 * (ra + rb) * capacitance);
  const low = positiveResult(Math.LN2 * rb * capacitance);
  const frequency = positiveResult(1 / (high + low));
  if (frequency > 100e3) throw new Error('NE555P reference: keep astable frequency at or below 100 kHz to reduce distortion. Choose larger timing components.');
  return { high, low, frequency, duty: finite(high / (high + low) * 100) };
}

export function idealTransformer(solve, known, load = null) {
  const keys = ['vp', 'vs', 'np', 'ns'];
  if (!keys.includes(solve)) throw new Error('Choose a voltage or turns quantity to find.');
  const values = {};
  for (const key of keys.filter(key => key !== solve)) {
    values[key] = number(known[key], key.toUpperCase());
    if (['np', 'ns'].includes(key) && !Number.isSafeInteger(values[key])) throw new Error('Known turn counts must be positive whole numbers within the safe integer range.');
  }
  if (solve === 'vs') values.vs = positiveResult(values.vp * (values.ns / values.np));
  if (solve === 'vp') values.vp = positiveResult(values.vs * (values.np / values.ns));
  if (solve === 'ns') values.ns = positiveResult(values.np * (values.vs / values.vp));
  if (solve === 'np') values.np = positiveResult(values.ns * (values.vp / values.vs));
  const ratio = positiveResult(values.ns / values.np);
  let ip = null, is = null, va = null;
  if (load !== null) {
    if (!['primary', 'secondary'].includes(load.side)) throw new Error('Choose the known current winding.');
    const current = number(load.current, 'RMS current', true);
    if (load.side === 'primary') { ip = current; is = current === 0 ? 0 : positiveResult(current / ratio); }
    else { is = current; ip = current === 0 ? 0 : positiveResult(current * ratio); }
    va = ip === 0 ? 0 : positiveResult(values.vp * ip);
    if (is !== 0) positiveResult(values.vs * is);
  }
  return { ...values, ratio, ip, is, va };
}

export const colors = [
  { name: 'Black', hex: '#171c24', digit: 0, exponent: 0 },
  { name: 'Brown', hex: '#855034', digit: 1, exponent: 1, tolerance: 1 },
  { name: 'Red', hex: '#d93644', digit: 2, exponent: 2, tolerance: 2 },
  { name: 'Orange', hex: '#f88b35', digit: 3, exponent: 3 },
  { name: 'Yellow', hex: '#f6d648', digit: 4, exponent: 4 },
  { name: 'Green', hex: '#208b64', digit: 5, exponent: 5, tolerance: 0.5 },
  { name: 'Blue', hex: '#3378ca', digit: 6, exponent: 6, tolerance: 0.25 },
  { name: 'Violet', hex: '#9558b5', digit: 7, exponent: 7, tolerance: 0.1 },
  { name: 'Grey', hex: '#8b9299', digit: 8, exponent: 8, tolerance: 0.05 },
  { name: 'White', hex: '#ffffff', digit: 9, exponent: 9 },
  { name: 'Gold', hex: '#c5a043', exponent: -1, tolerance: 5 },
  { name: 'Silver', hex: '#b5c2cc', exponent: -2, tolerance: 10 },
];

export function decodeBands(bands) {
  if (![4, 5].includes(bands.length)) throw new Error('Select four or five bands.');
  const chosen = bands.map(name => colors.find(color => color.name === name));
  if (chosen.some(color => !color)) throw new Error('Unknown band color.');
  const digits = chosen.slice(0, -2);
  if (digits[0].digit === 0 || digits.some(color => color.digit === undefined)) throw new Error('Use nonzero first digit and valid digit colors.');
  const multiplier = chosen.at(-2).exponent;
  const tolerance = chosen.at(-1).tolerance;
  if (multiplier === undefined || tolerance === undefined) throw new Error('Invalid multiplier or tolerance color.');
  const significant = digits.reduce((value, color) => value * 10 + color.digit, 0);
  const resistance = significant * 10 ** multiplier;
  return { resistance, tolerance, min: resistance * (1 - tolerance / 100), max: resistance * (1 + tolerance / 100) };
}

export function encodeBands(resistance, count, toleranceName) {
  number(resistance, 'Resistance');
  if (![4, 5].includes(count)) throw new Error('Select four or five bands.');
  const tolerance = colors.find(color => color.name === toleranceName && color.tolerance !== undefined);
  if (!tolerance) throw new Error('Choose a valid tolerance.');
  const digitCount = count - 2;
  for (let exponent = -2; exponent <= 9; exponent++) {
    const significant = resistance / 10 ** exponent;
    const rounded = Math.round(significant);
    if (rounded < 10 ** (digitCount - 1) || rounded >= 10 ** digitCount) continue;
    if (Math.abs(significant - rounded) > 1e-8) continue;
    return [...String(rounded)].map(digit => colors[Number(digit)].name)
      .concat(colors.find(color => color.exponent === exponent).name, toleranceName);
  }
  throw new Error(`Value is not exactly representable with ${count} bands (2 or 3 significant digits and multiplier 0.01 to 1e9). No silent rounding is applied.`);
}

export function format(value, unit = '') {
  finite(value);
  if (value === 0) return `0 ${unit}`.trim();
  const prefixes = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'u'], [1e-9, 'n'], [1e-12, 'p']];
  const [scale, prefix] = prefixes.find(([scale]) => value >= scale) ?? [1, ''];
  return `${Number((value / scale).toPrecision(6))} ${prefix}${unit}`.trim();
}
