import * as calc from './calculators.js';
import { boards, pins, lookup, ics, sources, verified } from './catalog.js';

const main = document.querySelector('main');
const $ = selector => main.querySelector(selector);
const resistanceUnits = [['ohm', 'ohm'], ['kohm', 'kohm'], ['Mohm', 'Mohm']];
const voltageUnits = [['V', 'V'], ['mV', 'mV']];
const currentUnits = [['mA', 'mA'], ['A', 'A'], ['uA', 'uA']];
const capacitanceUnits = [['uF', 'uF'], ['nF', 'nF'], ['pF', 'pF'], ['F', 'F']];
const tools = [
  { id: 'resistor', name: 'Resistor color code', tag: '01 / COMPONENTS', description: 'Read 4 or 5 bands, or turn a resistance into colors.' },
  { id: 'ohm', name: "Ohm's law", tag: '02 / FUNDAMENTALS', description: 'Connect voltage, current, resistance, and power.' },
  { id: 'led', name: 'LED resistor', tag: '03 / LOW-VOLTAGE DC', description: 'Size a series resistor with tolerance and power margin.' },
  { id: 'network', name: 'Series & parallel', tag: '04 / RESISTANCE', description: 'Find one equivalent resistance for a resistor network.' },
  { id: 'divider', name: 'Voltage divider', tag: '05 / VOLTAGE', description: 'Explore an unloaded divider and what a load changes.' },
  { id: 'rc', name: 'Capacitor & RC', tag: '06 / TIME & FILTERS', description: 'Find charging time and a first-order filter cutoff.' },
  { id: 'timer', name: '555 timer', tag: '07 / TIMING', description: 'Estimate standard astable or monostable timing.' },
];

const intro = (eyebrow, title, text) => `<div class="page-intro"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${text}</p></div>`;
const safety = `<div class="strip"><strong>Small circuits. Careful connections.</strong> Ideal models for learning, not a safety approval. Use low-voltage DC only. Power off before wiring. No mains or high-energy projects.</div>`;
const options = (items, selected) => items.map(([value, label]) => `<option value="${value}"${String(value) === String(selected) ? ' selected' : ''}>${label}</option>`).join('');
const select = (id, title, items, selected) => `<div><label for="${id}"><span>${title}</span></label><select id="${id}" name="${id}">${options(items, selected)}</select></div>`;
const quantity = (id, title, value, unitOptions, selected = unitOptions[0][0]) => `<div><label for="${id}"><span>${title}</span></label><div class="quantity"><input id="${id}" name="${id}" type="number" step="any" value="${value}" required><select id="${id}-unit" aria-label="${title} unit">${options(unitOptions, selected)}</select></div></div>`;
const textField = (id, title, value, placeholder = '') => `<label for="${id}"><span>${title}</span><input id="${id}" name="${id}" value="${value}" placeholder="${placeholder}" required></label>`;
const explanation = (formula, text, example) => `<div class="explanation"><h3>How it works</h3><code class="formula">${formula}</code><p>${text}</p><p class="example"><strong>Try this:</strong> ${example}</p></div>`;
const copyButton = `<button class="secondary copy" type="button" id="copy-result">Copy result</button><span id="copy-status" class="muted" role="status"></span>`;

function circuitSvg(kind = 'divider') {
  const body = kind === 'divider'
    ? `<path d="M75 20v15m0 40v20m0 40v20m0-60h100"/><rect x="63" y="35" width="24" height="40"/><rect x="63" y="95" width="24" height="40"/><text x="95" y="60">R top</text><text x="95" y="125">R bottom</text><text x="180" y="100">V out</text><text x="15" y="18">V in</text><path d="M60 155h30m-23 7h16m-11 6h6"/>`
    : `<path d="M20 75h40m55 0h55m25 0h75"/><rect x="60" y="63" width="55" height="24"/><path d="m170 58 25 17-25 17zm25 0v34m-12-44 14-14m-5 2 5-2-2 6m-3 17 14-14"/><text x="60" y="48">R series</text><text x="168" y="120">LED</text><text x="12" y="105">+</text><text x="247" y="105">GND</text>`;
  return `<svg class="diagram" viewBox="0 0 310 180" role="img" aria-label="${kind === 'divider' ? 'Two resistors in series: output between them, bottom to ground' : 'Low-voltage supply, resistor, and forward-biased LED in series'}"><g stroke="currentColor" fill="none" stroke-width="2">${body.replaceAll('<text ', '<text stroke="none" fill="currentColor" font-family="monospace" font-size="13" ')}</g></svg>`;
}

function home() {
  main.innerHTML = `<section class="hero"><div><div class="eyebrow">Your bench, a little smarter</div><h1>Less guesswork.<br>More <em>making.</em></h1><p>From your first resistor to your next Raspberry Pi project. Practical calculators, clear pinouts, and the explanations behind them.</p><div class="actions"><a class="button" href="#calculators">Open the toolbox &rarr;</a><a class="button secondary" href="#gpio">Find a GPIO pin</a></div><p class="muted" style="margin-top:18px">No account. No tracking. Just electronics.</p></div>
    <div class="hero-board"><svg viewBox="0 0 400 235" role="img" aria-label="Original illustration of a resistor, integrated circuit, and header on a workbench"><g fill="none" stroke="#365b50" stroke-width="2"><path d="M0 40h90v55h90m40 0h85V30h95M0 185h95v-60h100m35 20h70v65h100M160 0v50h60m-60 125v60"/><circle cx="90" cy="40" r="5"/><circle cx="300" cy="210" r="5"/></g><g stroke="#aec7bf" stroke-width="4"><path d="M10 95h65m100 0h40M25 145h50m100 0h40"/></g><rect x="75" y="76" width="100" height="38" rx="15" fill="#d7c6a5"/><path d="M96 77v36" stroke="#855034" stroke-width="9"/><path d="M114 77v36" stroke="#171c24" stroke-width="9"/><path d="M133 77v36" stroke="#d93644" stroke-width="9"/><path d="M156 77v36" stroke="#c5a043" stroke-width="7"/><rect x="75" y="133" width="100" height="25" rx="8" fill="#14202b" stroke="#78e2bd"/><text x="98" y="150" fill="#78e2bd" font-family="monospace" font-size="13">1 kohm</text><g stroke="#a2b6c1" stroke-width="5"><path d="M228 70h16m-16 20h16m-16 20h16m-16 20h16m70-60h16m-16 20h16m-16 20h16m-16 20h16"/></g><rect x="244" y="55" width="70" height="90" rx="6" fill="#09131e" stroke="#67847b"/><path d="M268 55a11 11 0 0 0 22 0" fill="none" stroke="#67847b"/><circle cx="255" cy="72" r="3" fill="#f0c175"/><text x="255" y="108" fill="#9bb5aa" font-family="monospace" font-size="11">NE555P</text><g fill="#f0c175"><circle cx="348" cy="173" r="5"/><circle cx="368" cy="173" r="5"/><circle cx="348" cy="192" r="5"/><circle cx="368" cy="192" r="5"/><circle cx="348" cy="211" r="5"/><circle cx="368" cy="211" r="5"/></g></svg><div class="board-caption"><span>REFERENCE / CALCULATE / UNDERSTAND</span><span>REV 01</span></div></div></section>
    <section aria-labelledby="explore-title"><div class="section-heading"><h2 id="explore-title">A place for every little question.</h2><p>Three toolsheds. One workbench.</p></div><div class="cards">
    <a class="card card-link" href="#calculators"><span class="tag">01 / CALCULATE</span><span class="arrow" aria-hidden="true">&nearr;</span><h3>Electronics calculators</h3><p>Seven everyday tools. Units, worked examples, and no mystery numbers.</p></a>
    <a class="card card-link" href="#ic"><span class="tag">02 / REFERENCE</span><span class="arrow" aria-hidden="true">&nearr;</span><h3>Inside the IC</h3><p>Three carefully sourced TI packages, with orientation and pin functions.</p></a>
    <a class="card card-link" href="#gpio"><span class="tag">03 / CONNECT</span><span class="arrow" aria-hidden="true">&nearr;</span><h3>Raspberry Pi GPIO</h3><p>Physical pin or BCM? Find the right connection on three supported boards.</p></a></div></section>${safety}
    <section><div class="section-heading"><h2>What are you working on?</h2></div><label class="search" for="tool-search"><span>Search calculators and references</span><input id="tool-search" type="search" placeholder="Try resistor, LED, GPIO, or LM358"></label><div class="cards" id="search-results"></div><p id="search-count" class="muted" role="status"></p></section>`;
  const entries = [...tools.map(tool => ({ ...tool, url: `#calculators/${tool.id}` })),
    ...ics.map(ic => ({ name: ic.name, description: `${ic.category} / ${ic.package}`, url: `#ic/${ic.id}` })),
    { name: 'Raspberry Pi GPIO', description: 'Pi 4 Model B, Pi 5, Zero 2 W physical pin and BCM lookup', url: '#gpio' }];
  function filter() {
    const term = $('#tool-search').value.trim().toLowerCase();
    const results = entries.filter(entry => `${entry.name} ${entry.description}`.toLowerCase().includes(term));
    $('#search-results').innerHTML = results.map(entry => `<a class="card card-link" href="${entry.url}"><h3>${entry.name}</h3><p>${entry.description}</p></a>`).join('');
    $('#search-count').textContent = results.length ? `${results.length} tools and references` : 'No matching tool. Try a component name or GPIO.';
  }
  $('#tool-search').addEventListener('input', filter);
  filter();
}

function calculators(id = 'resistor') {
  const tool = tools.find(tool => tool.id === id);
  if (!tool) return notFound();
  main.innerHTML = `${intro('Calculate / understand', 'Make the numbers make sense.', 'Ideal circuit models, practical units, and a little explanation at every step.')}<div class="workspace"><nav class="sidebar" aria-label="Calculator navigation"><small>THE TOOLBOX</small>${tools.map(item => `<a href="#calculators/${item.id}"${item.id === id ? ' aria-current="page"' : ''}>${item.name}</a>`).join('')}</nav><section class="card"><div class="tool-head"><div><h2>${tool.name}</h2><p>${tool.description}</p></div><span class="tool-id">${tool.tag.split(' / ')[0]} / 07</span></div><div id="tool-content"></div></section></div>${safety}`;
  if (id === 'resistor') return resistor();
  const content = $('#tool-content');
  const config = {
    ohm: {
      fields: select('solve', 'Find', [['voltage', 'Voltage'], ['current', 'Current'], ['resistance', 'Resistance']], 'voltage') + '<div id="ohm-inputs" class="wide form-grid" style="margin:0"></div>',
      info: explanation('V = I x R; I = V / R; R = V / I; P = V x I', 'Voltage is the push, current is the flow, and resistance limits that flow. Power is the rate at which electrical energy is converted to heat or other energy. This tool uses positive DC magnitudes and ideal resistors.', '10 mA through 1 kohm needs 10 V and dissipates 0.1 W.'),
    },
    led: {
      fields: quantity('supply', 'DC supply voltage (up to 24 V)', 5, voltageUnits) + quantity('forward', 'LED forward voltage', 2, voltageUnits) + quantity('current', 'Target LED current (up to 50 mA)', 10, currentUnits),
      diagram: circuitSvg('led'),
      info: explanation('R minimum = (V supply - V LED) / I; P = (V supply - V LED)^2 / R', 'The resistor drops the voltage the LED does not use. Recommendation is the next E24 value above R minimum / 0.95, allowing for a -5% resistor tolerance. Current shown is nominal; LED forward voltage, supply variation, and temperature still change it. Not a constant-current driver or a direct GPIO load recommendation.', '5 V supply, 2 V LED, 10 mA: 300 ohm minimum; 330 ohm recommended, about 9.09 mA nominal. Power selection uses at least twice the calculated worst-tolerance dissipation. Read the resistor derating curve for ambient temperature, enclosure and mounting; a wattage number never guarantees thermal safety.'),
    },
    network: {
      fields: select('mode', 'Connection', [['series', 'Series'], ['parallel', 'Parallel']], 'parallel') + select('list-unit', 'Unit for every resistor', resistanceUnits, 'ohm') + `<div class="wide">${textField('values', 'Resistors, comma-separated (2 to 20)', '100, 100', '100, 220, 470')}</div>`,
      info: explanation('Series: add R values. Parallel: 1 / R total = 1 / R1 + 1 / R2 + ...', 'Series resistors share the same current. Parallel resistors share the same voltage. These are ideal positive resistances, not short circuits or open circuits. Commas separate resistors, not thousands.', '100 ohm and 100 ohm give 200 ohm in series or 50 ohm in parallel.'),
    },
    divider: {
      fields: quantity('vin', 'Input DC voltage', 5, voltageUnits) + quantity('top', 'R top (input to output)', 10, resistanceUnits, 'kohm') + quantity('bottom', 'R bottom (output to ground)', 10, resistanceUnits, 'kohm') +
      `<label for="loaded"><span>Include a resistive load?</span><select id="loaded"><option value="no">No - unloaded</option><option value="yes">Yes - load to ground</option></select></label><div id="load-field" class="wide" hidden>${quantity('load', 'Load resistance (output to ground)', 10, resistanceUnits, 'kohm')}</div>`,
      diagram: circuitSvg(),
      info: explanation('V out = V in x R bottom / (R top + R bottom)', 'This assumes no current drawn from the midpoint. A load to ground acts in parallel with R bottom and pulls the output lower. Not a regulated power supply; do not power a board or substantial load from a divider. No protection or level-shifter safety is implied.', '5 V with 10 kohm on top and bottom produces 2.5 V unloaded. A 10 kohm load lowers it to about 1.667 V.'),
    },
    rc: {
      fields: quantity('resistance', 'Resistance', 10, resistanceUnits, 'kohm') + quantity('capacitance', 'Capacitance', 10, capacitanceUnits),
      info: explanation('Time constant tau = R x C; cutoff = 1 / (2 x pi x R x C)', 'For an initially empty ideal capacitor charged through one resistor from a voltage step: one time constant reaches about 63.2% of the final voltage; five reach about 99.3%. Discharge leaves 36.8% after one tau. Cutoff applies to a first-order RC filter, with an ideal source and no extra load.', '10 kohm and 10 uF: tau = 100 ms; five tau = 500 ms; cutoff about 1.592 Hz. Capacitor tolerance, leakage and source resistance affect real timing.'),
    },
    timer: {
      fields: select('mode', 'Standard 555 topology', [['astable', 'Astable oscillator'], ['mono', 'Monostable one-shot']], 'astable') + quantity('ra', 'RA (astable) / R (monostable)', 10, resistanceUnits, 'kohm') + `<div id="rb-field">${quantity('rb', 'RB (astable only)', 10, resistanceUnits, 'kohm')}</div>` + quantity('capacitance', 'Timing capacitance', 10, capacitanceUnits),
      info: explanation('Astable: high = ln(2) x (RA + RB) x C; low = ln(2) x RB x C; f = 1 / (high + low). Monostable: t ~= 1.1 x R x C.', 'Standard astable topology: RA from VCC to DISCH (pin 7), RB from DISCH to tied TRIG/THRES (pins 2/6), C from that timing node to GND. With positive RA and RB, output-high duty cycle is strictly above 50%; this is not a diode-modified circuit. Monostable uses R from VCC to tied THRES/DISCH (6/7), C to ground and a separate short low trigger on pin 2. NE555P scope: astable at most 100 kHz, monostable at least 10 us. TRIG must return high at least 10 us before timing ends. Pulse estimate assumes valid trigger/reset conditions. Follow the datasheet for the full circuit, decoupling, and timing component constraints.', 'RA = RB = 10 kohm and C = 10 uF: about 4.809 Hz and 66.7% high duty. Monostable R = 10 kohm, C = 10 uF: about 110 ms. Component tolerance/leakage and discharge limits affect real timing. <a href="#ic/ne555p">See the exact NE555P reference.</a>'),
    },
  }[id];
  content.innerHTML = `${config.diagram ?? ''}<form id="calculator-form" novalidate><div class="form-grid">${config.fields}</div><button class="primary" type="submit">Calculate &rarr;</button></form><div class="error" id="calc-error" role="alert"></div><div class="result" id="calc-result" role="status" aria-live="polite"></div>${config.info}`;
  const value = key => $(`#${key}`).value;
  const q = (key, category, zero = false) => calc.convert(value(key), category, value(`${key}-unit`), $(`label[for="${key}"]`).textContent, zero);
  const form = $('#calculator-form');
  function clear() { $('#calc-result').replaceChildren(); $('#calc-error').textContent = ''; }
  if (id === 'ohm') {
    function ohmFields() {
      const mode = value('solve');
      $('#ohm-inputs').innerHTML = mode === 'voltage'
        ? quantity('a', 'Current', 10, currentUnits) + quantity('b', 'Resistance', 1, resistanceUnits, 'kohm')
        : quantity('a', 'Voltage', 10, voltageUnits) + (mode === 'current' ? quantity('b', 'Resistance', 1, resistanceUnits, 'kohm') : quantity('b', 'Current', 10, currentUnits));
      clear();
    }
    $('#solve').addEventListener('change', ohmFields); ohmFields();
  }
  if (id === 'divider') $('#loaded').addEventListener('change', () => { $('#load-field').hidden = value('loaded') !== 'yes'; });
  if (id === 'timer') $('#mode').addEventListener('change', () => { $('#rb-field').hidden = value('mode') === 'mono'; });
  form.addEventListener('input', clear);
  form.addEventListener('change', clear);
  form.addEventListener('submit', event => {
    event.preventDefault(); clear();
    try {
      let output;
      if (id === 'ohm') {
        const solve = value('solve');
        const result = calc.ohms(solve, q('a', solve === 'voltage' ? 'current' : 'voltage'), q('b', solve === 'resistance' ? 'current' : 'resistance'));
        output = `<span class="big">${calc.format(result.result, { voltage: 'V', current: 'A', resistance: 'ohm' }[solve])}</span><p>Ideal dissipated power: ${calc.format(result.power, 'W')}</p>`;
      } else if (id === 'led') {
        const result = calc.led(q('supply', 'voltage'), q('forward', 'voltage'), q('current', 'current'));
        output = `<span class="big">${calc.format(result.recommended, 'ohm')} / E24, 5%</span><p>Minimum actual resistance: ${calc.format(result.minimum, 'ohm')}<br>Nominal current with recommended resistor: ${calc.format(result.actualCurrent, 'A')}<br>Worst -5% tolerance dissipation: ${calc.format(result.worstPower, 'W')}<br>${result.rating ? `Starting power-rating candidate: ${result.rating} W` : `No candidate up to 5 W; required margin target: ${calc.format(result.powerTarget, 'W')}`}</p><p>At least 2x calculated dissipation is only a starting margin, not thermal safety approval. Check ambient derating and actual component data. Supply and LED forward voltage are assumed fixed.</p>`;
      } else if (id === 'network') {
        const values = value('values').split(',').map(item => calc.convert(item, 'resistance', value('list-unit'), 'Each resistor'));
        output = `<span class="big">${calc.format(calc.network(values, value('mode')), 'ohm')}</span><p>Equivalent ${value('mode')} resistance for ${values.length} ideal resistors.</p>`;
      } else if (id === 'divider') {
        const result = calc.divider(q('vin', 'voltage', true), q('top', 'resistance'), q('bottom', 'resistance'), value('loaded') === 'yes' ? q('load', 'resistance') : null);
        output = `<span class="big">${calc.format(result.output, 'V')}</span><p>${value('loaded') === 'yes' ? 'Loaded' : 'Unloaded'} output. Unloaded reference: ${calc.format(result.unloaded, 'V')}.</p>`;
      } else if (id === 'rc') {
        const result = calc.rc(q('resistance', 'resistance'), q('capacitance', 'capacitance'));
        output = `<span class="big">${calc.format(result.tau, 's')} / one tau</span><p>Five tau (99.3% charged): ${calc.format(result.fiveTau, 's')}<br>RC filter cutoff: ${calc.format(result.cutoff, 'Hz')}</p>`;
      } else if (id === 'timer') {
        const result = calc.timer(value('mode'), q('ra', 'resistance'), q('capacitance', 'capacitance'), value('mode') === 'astable' ? q('rb', 'resistance') : null);
        output = value('mode') === 'mono' ? `<span class="big">${calc.format(result.duration, 's')}</span><p>Approximate one-shot pulse width.</p>` : `<span class="big">${calc.format(result.frequency, 'Hz')}</span><p>High: ${calc.format(result.high, 's')} / Low: ${calc.format(result.low, 's')}<br>Output-high duty cycle: ${result.duty.toFixed(2)}%</p>`;
      }
      $('#calc-result').innerHTML = `<div id="result-content">${output}</div>${copyButton}`;
      wireCopy(() => $('#result-content').innerText);
    } catch (error) { $('#calc-error').textContent = error.message; }
  });
  form.requestSubmit();
}

function resistor() {
  $('#tool-content').innerHTML = `<div class="form-grid">${select('band-count', 'Band count', [[4, '4 bands (2 digits)'], [5, '5 bands (3 digits)']], 4)}${select('resistor-mode', 'Direction', [['read', 'Colors to resistance'], ['write', 'Resistance to colors']], 'read')}</div><div id="resistor-work"></div>
    ${explanation('Resistance = significant digits x multiplier; range = nominal +/- tolerance', 'Read from the end opposite the separated tolerance band. The first 2 digits (4-band) or 3 digits (5-band) form a number, then the multiplier scales it. A first black digit is not valid for these nonzero codes. Gold is x0.1 or +/-5%; silver is x0.01 or +/-10%. Zero-ohm jumpers and unbanded tolerance are outside this tool.', 'Brown, black, red, gold = 10 x 100 = 1 kohm, +/-5%, or 950 to 1050 ohm. Five-band brown, black, black, brown, brown = 1 kohm +/-1%.')}`;
  function setup() {
    const count = Number($('#band-count').value);
    const read = $('#resistor-mode').value === 'read';
    const defaults = count === 4 ? ['Brown', 'Black', 'Red', 'Gold'] : ['Brown', 'Black', 'Black', 'Brown', 'Brown'];
    const bandFields = defaults.map((name, index) => {
      const title = index < count - 2 ? `Digit ${index + 1}` : index === count - 2 ? 'Multiplier' : 'Tolerance';
      const choices = calc.colors.filter(color => index < count - 2 ? color.digit !== undefined && (index !== 0 || color.digit !== 0) : index === count - 2 ? color.exponent !== undefined : color.tolerance !== undefined);
      return select(`band-${index}`, title, choices.map(color => [color.name, `${color.name}${index === count - 1 ? ` (${color.tolerance}%)` : ''}`]), name);
    }).join('');
    $('#resistor-work').innerHTML = `<form id="band-form" novalidate>${read ? `<div class="band-grid">${bandFields}</div>` : `<div class="form-grid">${quantity('encode-value', 'Nominal resistance', 1, resistanceUnits, 'kohm')}${select('encode-tolerance', 'Tolerance band', calc.colors.filter(color => color.tolerance !== undefined).map(color => [color.name, `${color.name} (${color.tolerance}%)`]), count === 4 ? 'Gold' : 'Brown')}</div>`}<button type="submit" class="primary" style="margin-top:20px">${read ? 'Read bands' : 'Find colors'} &rarr;</button></form><div class="error" id="calc-error" role="alert"></div><div class="result" id="calc-result" role="status"></div>`;
    const form = $('#band-form');
    form.addEventListener('input', () => { $('#calc-result').replaceChildren(); $('#calc-error').textContent = ''; });
    form.addEventListener('submit', event => {
      event.preventDefault(); $('#calc-result').replaceChildren(); $('#calc-error').textContent = '';
      try {
        const bands = read ? defaults.map((_, i) => $(`#band-${i}`).value) : calc.encodeBands(calc.convert($('#encode-value').value, 'resistance', $('#encode-value-unit').value, 'Resistance'), count, $('#encode-tolerance').value);
        const result = calc.decodeBands(bands);
        $('#calc-result').innerHTML = `<span class="big">${calc.format(result.resistance, 'ohm')} +/-${result.tolerance}%</span><div class="resistor" role="img" aria-label="${bands.join(', ')}"><span class="lead"></span><div class="resistor-body">${bands.map(name => `<span class="band" style="background:${calc.colors.find(color => color.name === name).hex}"></span>`).join('')}</div><span class="lead"></span></div><p>${bands.join(' / ')}<br>Expected tolerance range: ${calc.format(result.min, 'ohm')} to ${calc.format(result.max, 'ohm')}.</p>${copyButton}`;
        wireCopy(() => `${count}-band: ${bands.join(', ')}. ${calc.format(result.resistance, 'ohm')} +/-${result.tolerance}%; ${calc.format(result.min, 'ohm')} to ${calc.format(result.max, 'ohm')}.`);
      } catch (error) { $('#calc-error').textContent = error.message; }
    });
    form.requestSubmit();
  }
  $('#band-count').addEventListener('change', setup);
  $('#resistor-mode').addEventListener('change', setup);
  setup();
}

function wireCopy(text) {
  $('#copy-result').addEventListener('click', async () => {
    const status = $('#copy-status');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard is unavailable.');
      await navigator.clipboard.writeText(text());
      status.textContent = ' Copied.';
    } catch {
      status.textContent = ' Copy failed. Select the result text and copy manually.';
    }
  });
}

function icLibrary(id = 'ne555p') {
  const ic = ics.find(item => item.id === id);
  if (!ic) return notFound();
  main.innerHTML = `${intro('Reference / exact packages', 'Know what each leg does.', 'A small, curated library, not a universal pinout database. Match the manufacturer, full part number, and package before connecting anything.')}
    <label class="search" for="ic-search"><span>Search the IC library</span><input type="search" id="ic-search" placeholder="Part number or function"></label>
    <div class="catalog-grid" id="ic-list"></div><p id="ic-count" class="muted" role="status"></p>
    <article class="card"><div class="tool-head"><div><div class="eyebrow">${ic.manufacturer} / ${ic.package}</div><h2>${ic.name}</h2><p>${ic.category}</p></div><span class="tool-id">TOP VIEW</span></div>
    <div class="ic-layout"><div><p class="muted">Look down on the package from the component side, with the notch at the top. Pin 1 is upper left; count down the left, then up the right (counterclockwise). A bottom view is mirrored.</p><div class="chip-diagram" role="img" aria-label="${ic.name} top view, notch up, pin 1 upper left">${chip(ic)}</div><p class="source-line">Original diagram, transcribed from ${ic.doc}, ${ic.sections}. Confirm the package marking and pin-1 dot/notch on your actual part.</p><div class="strip"><strong>Supply is not signal compatibility.</strong> ${ic.supplyNote}</div><p style="margin-top:18px">${ic.note}</p></div>
    <div><table><caption class="muted">Pin functions / ${ic.name} ${ic.package}</caption><thead><tr><th scope="col">Pin</th><th scope="col">Label</th><th scope="col">Function</th></tr></thead><tbody>${ic.pins.map(([label, detail], index) => `<tr><th scope="row">${index + 1}</th><td>${label}</td><td>${detail}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="source-line"><a href="${ic.source}">Official TI datasheet (PDF)</a> &middot; <a href="${ic.product}">Exact orderable part</a><br>${ic.doc}, revision ${ic.revision}; checked ${ic.verified}. Datasheets may change. Recommended operating conditions are not absolute maximum ratings. Read the full datasheet before design.</div></article>${safety}`;
  function filter() {
    const term = $('#ic-search').value.toLowerCase().trim();
    const matches = ics.filter(item => `${item.name} ${item.category} ${item.package}`.toLowerCase().includes(term));
    $('#ic-list').innerHTML = matches.map(item => `<button class="card" data-ic="${item.id}" aria-pressed="${item.id === id}"><strong>${item.name}</strong><span>${item.category}<br>${item.package}</span></button>`).join('');
    $('#ic-count').textContent = matches.length ? `${matches.length} exact packages. Reference below: ${ic.name}.` : `No matches in this curated library. Reference below remains ${ic.name}.`;
    main.querySelectorAll('[data-ic]').forEach(button => button.addEventListener('click', () => { location.hash = `ic/${button.dataset.ic}`; }));
  }
  $('#ic-search').addEventListener('input', filter); filter();
}

function chip(ic) {
  const half = ic.pins.length / 2;
  let html = `<div class="chip-body" style="grid-row:1 / span ${half}"><span class="notch"></span></div>`;
  for (let row = 0; row < half; row++) {
    html += `<div class="chip-pin left${row === 0 ? ' first' : ''}" style="grid-column:1;grid-row:${row + 1}">${ic.pins[row][0]} <b>${row + 1}</b></div><div class="chip-pin" style="grid-column:3;grid-row:${row + 1}"><b>${ic.pins.length - row}</b> ${ic.pins[ic.pins.length - row - 1][0]}</div>`;
  }
  return html;
}

function gpio() {
  main.innerHTML = `${intro('Connect / Raspberry Pi', 'Right pin. Right number.', 'A 40-pin header reference for Pi 4 Model B, Pi 5, and Zero 2 W. Physical position and BCM logical number are different things. This browser cannot detect or control your board.')}
    <div class="gpio-layout"><section><div class="header-board"><div class="header-label"><span>PIN 1 / SQUARE PAD / 3V3</span><span>COMPONENT-SIDE VIEW</span></div><div class="pin-header" aria-label="40-pin header, odd pins left, even pins right">${pins.map(pin => `<button type="button" class="pin" data-pin="${pin.physical}" data-kind="${pin.kind}" data-reserved="${pin.reserved}" aria-pressed="false" aria-label="Physical ${pin.physical}: ${pin.label}${pin.reserved ? ', reserved HAT ID' : ''}"><b>${pin.physical}</b><span>${pin.label}${pin.reserved ? ' *' : ''}</span></button>`).join('')}</div><div class="legend"><span>GPIO</span><span class="power">Power</span><span class="ground">Ground</span><span class="reserved">* HAT ID</span></div></div>
    <p class="muted" style="margin-top:16px"><strong>Orientation:</strong> This is a header-only view, not a board silhouette. Look from the component side and rotate your board so the pin-1 end is at the top and the odd-numbered row is on the left. Pin 1 is the 3V3 square-pad corner; pin 2 is beside it. Verify using the official board diagram before wiring; never infer orientation from USB port location. Bottom/solder-side views are mirrored.</p></section>
    <section class="card"><h2>Find your connection</h2>${select('board', 'Your board', boards.map(board => [board.id, board.name]), 'pi4')}<p class="muted" id="board-note" style="margin-top:12px"></p>
    <form id="pin-form" novalidate><div class="form-grid">${select('scheme', 'I know the...', [['physical', 'Physical header pin (1-40)'], ['bcm', 'BCM logical number (0-27)']], 'physical')}${textField('pin-number', 'Pin number', '11')}</div><button class="primary" type="submit">Find pin &rarr;</button></form><div class="error" id="pin-error" role="alert"></div><div id="pin-result" class="result pin-detail" role="status"></div>
    <div class="strip"><strong>3.3 V logic. Never 5 V tolerant.</strong> The 5V pins are power rails, not logic. Power off before wiring. Never connect motors, relays, or high-current loads directly to GPIO. Use an appropriate driver and consult board-specific official electrical limits; there is no single safe current limit for all boards.</div></section></div>
    <details open><summary>BCM is not a Linux global GPIO number</summary><p>Physical pin 11 maps to the familiar BCM logical label GPIO17 on all three supported boards. On Pi 5, RP1 provides the header GPIO. The logical label is still called BCM17 by many libraries; it does not mean a BCM2712 GPIO register address.</p><p>Linux character-device GPIO uses a <strong>gpiochip device plus a chip-local line offset/name</strong>. Neither a chip index nor a deprecated sysfs global GPIO integer is a physical pin number. Chip enumeration depends on kernel, firmware and configuration. wiringPi uses a separate, legacy numbering scheme and is not supported here. Never reuse a number from one scheme in another.</p><p>To discover your actual board, run these <strong>read-only</strong> commands yourself in its terminal (not in this website):</p><pre>gpiodetect
gpioinfo --version
gpioinfo --help
gpioinfo</pre><p>Match the controller label (for example an RP1 pin controller on Pi 5), inspect line names such as GPIO17 if provided, and record that chip's local offset. Labels and names vary; confirm with the board/kernel documentation. Do not assume a chip index, line name, or offset from this page. libgpiod 1.x commonly uses <code>gpioinfo gpiochipN</code>; 2.x uses <code>gpioinfo -c gpiochipN</code> to select a chip. Replace N only after discovery and follow the installed help. These list metadata, not voltage or wiring correctness; access permissions may be needed. No pin-driving commands are included.</p><p><a href="${sources.rp1}">Official RP1 explanation</a> &middot; <a href="${sources.gpiod}">libgpiod current help source</a> &middot; <a href="${sources.gpiodV1}">1.x help source</a></p></details>
    <p class="source-line">Header mapping and common potential functions: <a href="${sources.gpio}">Official Raspberry Pi GPIO guide</a> (<a href="${sources.gpioSource}">official source mirror</a>, <a href="${sources.gpioDiagram}">header diagram</a>). Checked ${verified}. Only the three listed boards are supported; no legacy 26-pin, Compute Module, or Pico mapping.</p>`;
  const clear = () => {
    $('#pin-result').replaceChildren(); $('#pin-error').textContent = '';
    main.querySelectorAll('[data-pin]').forEach(button => button.setAttribute('aria-pressed', 'false'));
  };
  function show(pin) {
    clear();
    main.querySelector(`[data-pin="${pin.physical}"]`).setAttribute('aria-pressed', 'true');
    const board = boards.find(board => board.id === $('#board').value);
    const detail = pin.bcm === null ? 'No BCM number. This is a fixed power or ground pin, not programmable GPIO.' : `${pin.reserved ? 'Reserved for HAT identification EEPROM. Avoid general-purpose use. ' : ''}Potential function: ${pin.potential}. Alternate functions depend on board configuration, pin multiplexing, overlays, and enabled peripherals; they are not guaranteed active.`;
    $('#pin-result').innerHTML = `<h3>Physical pin ${pin.physical}</h3><span class="big">${pin.bcm === null ? pin.label : `BCM ${pin.bcm}`}</span><p>${detail}</p><p class="muted">${board.name} / ${board.controller}<br>Linux gpiochip / line: discover on the board, not inferred here.</p>${copyButton}`;
    wireCopy(() => `${board.name}: physical ${pin.physical} = ${pin.bcm === null ? pin.label + ' (no GPIO number)' : `BCM ${pin.bcm}`}. ${detail} Reference only; verify actual hardware.`);
  }
  function submit(event) {
    event?.preventDefault(); clear();
    try { show(lookup($('#board').value, $('#scheme').value, $('#pin-number').value)); }
    catch (error) { $('#pin-error').textContent = error.message; }
  }
  function boardNote() { $('#board-note').textContent = boards.find(board => board.id === $('#board').value).note; }
  $('#pin-form').addEventListener('submit', submit);
  $('#pin-form').addEventListener('input', clear);
  $('#pin-form').addEventListener('change', clear);
  $('#board').addEventListener('change', () => { boardNote(); submit(); });
  main.querySelectorAll('[data-pin]').forEach(button => button.addEventListener('click', () => {
    $('#scheme').value = 'physical'; $('#pin-number').value = button.dataset.pin;
    show(lookup($('#board').value, 'physical', button.dataset.pin));
  }));
  boardNote(); submit();
}

function about() {
  main.innerHTML = `<article class="about">${intro('Read before connecting', 'A reference, not a guarantee.', 'A transparent, small workbench for learning C, embedded systems, Linux, and practical electronics.')}
    <h2>What this app does (and does not do)</h2><p>All calculations and lookups happen in your browser. There is no backend, account, analytics, hardware detection, GPIO access, or remote control. GitHub Pages serves the static files and may maintain its normal hosting logs. Clipboard access happens only when you press Copy. No third-party fonts, scripts, images, or APIs are loaded.</p>
    <h2>Safe scope</h2><p>Use these ideal models for low-voltage DC learning only, not mains or high-energy construction. Disconnect power before wiring. Check polarity, tolerances, input limits, real component data, and power derating. Do not connect high-current loads directly to GPIO. A calculated resistor power-rating candidate is not a guarantee of thermal safety.</p>
    <h2>Curated, package-specific IC references</h2><p>Only the listed exact Texas Instruments parts/packages are covered. Pin diagrams are original visualizations of factual pin tables; no datasheet diagrams are copied. Verify the package and marking on the part in front of you. Recommended supply ranges do not imply signal-level compatibility, and absolute maximum ratings are not normal operating conditions.</p>
    <ul>${ics.map(ic => `<li><a href="${ic.source}">${ic.name} / ${ic.package}</a>: ${ic.doc}, ${ic.revision}; ${ic.sections}. Checked ${ic.verified}. <a href="${ic.product}">Orderable part</a>.</li>`).join('')}</ul>
    <h2>Raspberry Pi provenance</h2><p>The three supported boards use the standard 40-pin header. The official header diagram and GPIO documentation were checked from Raspberry Pi's own repository because automated access to its documentation web host returned HTTP 403. Board notes explicitly distinguish Pi 5 RP1 and Zero 2 W's unpopulated header. No Linux gpiochip number or deprecated global integer is claimed.</p><ul><li><a href="${sources.gpioSource}">Official GPIO documentation source</a> and <a href="${sources.gpioDiagram}">official pinout diagram</a>, checked ${verified}.</li><li><a href="${sources.rp1}">Official RP1 I/O controller documentation</a>, checked ${verified}.</li><li><a href="${sources.gpiod}">libgpiod reference</a>: consult your installed version's help for command syntax. Linux line metadata is not live electrical validation.</li></ul>
    <h2>Calculator assumptions</h2><p>Resistor bands support exactly representable 4/5-band nonzero values; no zero-ohm or no-tolerance codes. Ohm's law, networks, and dividers assume ideal resistors and DC magnitudes. LED sizing assumes a fixed supply and LED drop, with an E24 recommendation accounting for 5% resistor tolerance, not LED/supply variation. RC models assume ideal step response. 555 estimates use the standard datasheet topologies, not diode-modified oscillators. Every tool includes its own worked example and limits.</p><p><a href="https://github.com/itsnavin/electronics-workbench">Source, tests, content maintenance and publishing instructions</a></p></article>`;
}

function notFound() {
  main.innerHTML = `${intro('Not found', 'That tool is not on this bench.', 'The link does not match a supported calculator or part. Nothing has been guessed.')}<a class="button" href="#home">Return to overview</a>`;
}

function route(focus = true) {
  const [section = 'home', id, ...extra] = location.hash.slice(1).split('/').filter(Boolean);
  main.replaceChildren();
  const known = ['home', 'calculators', 'ic', 'gpio', 'about'].includes(section);
  if (extra.length || (id && !['calculators', 'ic'].includes(section)) || !known) notFound();
  else if (section === 'home') home();
  else if (section === 'calculators') calculators(id);
  else if (section === 'ic') icLibrary(id);
  else if (section === 'gpio') gpio();
  else about();
  document.querySelectorAll('[data-nav]').forEach(link => {
    if (link.dataset.nav === section) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.title = `${main.querySelector('h1')?.textContent ?? 'Electronics'} | Electronics Workbench`;
  if (focus) { main.focus({ preventScroll: true }); window.scrollTo(0, 0); }
}
window.addEventListener('hashchange', () => route());
document.querySelector('.skip').addEventListener('click', event => {
  event.preventDefault();
  main.focus();
});
route(false);
