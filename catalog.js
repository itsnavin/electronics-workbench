export const verified = '2026-10-19';
export const ethernet = {
  verified: '2026-10-20',
  orientation: 'Contact-side view of the plug: gold contacts facing you, latch hidden underneath, mating nose pointing up/away, cable entry down/toward you. Pin 1 is left; pin 8 is right. Not a socket/front-on or latch-side view.',
  sources: [
    { title: 'trueCABLE: T568A vs T568B (wire color sequences)', url: 'https://www.truecable.com/blogs/cable-academy/t568a-vs-t568b' },
    { title: 'trueCABLE: plug contact/latch orientation', url: 'https://www.truecable.com/blogs/cable-academy/how-to-terminate-an-unshielded-pass-through-rj45-connector' },
    { title: 'Cisco: two-pair and four-pair cabling, auto-MDIX', url: 'https://www.cisco.com/en/US/docs/switches/lan/catalyst2960/hardware/installation/guide_/higcable_ps6406_TSD_Products_Installation_Guide_Chapter.html' },
    { title: 'Fluke Networks: split-pair identification and tester limitations', url: 'https://www.flukenetworks.com/knowledge-base/linkiq/split-pair-identification' },
  ],
  standards: {
    T568A: ['White/Green', 'Green', 'White/Orange', 'Blue', 'White/Blue', 'Orange', 'White/Brown', 'Brown'],
    T568B: ['White/Orange', 'Orange', 'White/Green', 'Blue', 'White/Blue', 'Green', 'White/Brown', 'Brown'],
  },
};

export function ethernetPins(standard) {
  if (!Object.hasOwn(ethernet.standards, standard)) throw new Error('Choose T568A or T568B.');
  const pairs = { Blue: 1, Orange: 2, Green: 3, Brown: 4 };
  const hex = { Blue: '#387dcc', Orange: '#ef923d', Green: '#39976c', Brown: '#96623e' };
  return ethernet.standards[standard].map((color, i) => {
    const pairColor = color.split('/').at(-1);
    return { pin: i + 1, color, pairColor, pair: pairs[pairColor], hex: hex[pairColor], striped: color.startsWith('White/') };
  });
}
export const sources = {
  gpio: 'https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#gpio',
  gpioSource: 'https://github.com/raspberrypi/documentation/blob/master/documentation/asciidoc/computers/raspberry-pi/gpio-on-raspberry-pi.adoc',
  gpioDiagram: 'https://github.com/raspberrypi/documentation/blob/master/documentation/asciidoc/computers/raspberry-pi/images/GPIO-Pinout-Diagram-2.png',
  rp1: 'https://github.com/raspberrypi/documentation/blob/master/documentation/asciidoc/computers/io-controllers/rp1.adoc',
  gpiod: 'https://github.com/brgl/libgpiod/blob/master/tools/gpioinfo.c',
  gpiodV1: 'https://github.com/brgl/libgpiod/blob/v1.6.x/tools/gpioinfo.c',
};

export const boards = [
  { id: 'pi4', name: 'Raspberry Pi 4 Model B', controller: 'BCM2711', note: 'Standard populated 40-pin header. GPIO is provided by BCM2711.' },
  { id: 'pi5', name: 'Raspberry Pi 5', controller: 'RP1', note: 'The 40-pin connector keeps the familiar BCM logical labels, but GPIO is provided by the RP1 I/O controller, not the BCM2712 CPU. Legacy direct-register libraries may not work.' },
  { id: 'zero2', name: 'Raspberry Pi Zero 2 W', controller: 'RP3A0 / BCM2837 family', note: 'Same 40-pin mapping. The standard Zero 2 W has unpopulated header holes; check whether headers have been fitted. Do not assume a soldered connector.' },
].map(board => ({ ...board, sources: [sources.gpioSource, sources.gpioDiagram, ...(board.id === 'pi5' ? [sources.rp1] : [])], verified }));

const gpioNumbers = {
  3: 2, 5: 3, 7: 4, 8: 14, 10: 15, 11: 17, 12: 18, 13: 27, 15: 22,
  16: 23, 18: 24, 19: 10, 21: 9, 22: 25, 23: 11, 24: 8, 26: 7, 27: 0,
  28: 1, 29: 5, 31: 6, 32: 12, 33: 13, 35: 19, 36: 16, 37: 26, 38: 20, 40: 21,
};
const functions = {
  2: 'I2C SDA', 3: 'I2C SCL', 14: 'UART TX', 15: 'UART RX',
  10: 'SPI0 MOSI', 9: 'SPI0 MISO', 11: 'SPI0 SCLK', 8: 'SPI0 CE0', 7: 'SPI0 CE1',
  0: 'HAT ID_SD (reserved)', 1: 'HAT ID_SC (reserved)',
};
export const pins = Array.from({ length: 40 }, (_, index) => {
  const physical = index + 1;
  const bcm = gpioNumbers[physical] ?? null;
  const kind = bcm !== null ? 'gpio' : [1, 17].includes(physical) ? '3v3' : [2, 4].includes(physical) ? '5v' : 'ground';
  return { physical, bcm, kind, label: bcm !== null ? `GPIO ${bcm}` : kind === 'ground' ? 'GND' : kind === '3v3' ? '3V3 power' : '5V power',
    potential: functions[bcm] ?? 'General-purpose digital I/O', reserved: physical === 27 || physical === 28 };
});

export function lookup(boardId, scheme, value) {
  if (!boards.some(board => board.id === boardId)) throw new Error('Choose a supported board.');
  if (!['physical', 'bcm'].includes(scheme)) throw new Error('Choose physical or BCM numbering.');
  if (!/^\d+$/.test(String(value).trim())) throw new Error('Enter a whole pin number, not a decimal, sign, or empty value.');
  const n = Number(value);
  const pin = pins.find(pin => scheme === 'physical' ? pin.physical === n : pin.bcm === n);
  if (!pin) throw new Error(scheme === 'physical' ? 'Physical pin must be from 1 to 40.' : 'BCM number must be from 0 to 27 on these headers.');
  return pin;
}

export const ics = [
  {
    id: 'ne555p', name: 'NE555P', manufacturer: 'Texas Instruments', package: 'P / PDIP-8', category: 'Precision timer',
    doc: 'SLFS022K', revision: 'March 2026', sections: 'Section 4, Table 4-1; Sections 5.3, 6.3.1, 6.3.2, 7.2',
    source: 'https://www.ti.com/lit/ds/symlink/ne555.pdf',
    product: 'https://www.ti.com/product/NE555/part-details/NE555P',
    supply: [4.5, 16], supplyNote: 'Recommended VCC: 4.5 to 16 V; NE555 ambient 0 to 70 C. Timing specifications have additional test conditions; this is not a 3.3 V timer.',
    note: 'Bipolar 555, not a CMOS 555. RESET is active low. Output is not guaranteed rail-to-rail or Raspberry Pi compatible. Supply decoupling and timing component leakage matter.',
    pins: [
      ['GND', 'Ground reference'], ['TRIG', 'Starts timing below the trigger threshold'],
      ['OUT', 'Timer output'], ['RESET', 'Active-low reset'],
      ['CONT', 'Comparator threshold control'], ['THRES', 'Ends timing above the threshold'],
      ['DISCH', 'Discharges the timing capacitor'], ['VCC', 'Positive supply'],
    ],
  },
  {
    id: 'lm358p', name: 'LM358P', manufacturer: 'Texas Instruments', package: 'P / PDIP-8', category: 'Dual operational amplifier',
    doc: 'SLOS068AB', revision: 'October 2024', sections: 'Figure 4-1, Table 4-1; Section 5.3',
    source: 'https://www.ti.com/lit/ds/symlink/lm358.pdf',
    product: 'https://www.ti.com/product/LM358/part-details/LM358P',
    supply: [3, 30], supplyNote: 'Recommended total supply V+ minus V-: 3 to 30 V for LM358 (not the 36 V LM358B). Ambient 0 to 70 C.',
    note: 'Not rail-to-rail. Recommended common-mode input range is V- to V+ minus 2 V; output swing depends on load. Not a direct substitute for every dual op amp or comparator.',
    pins: [
      ['OUT1', 'Amplifier 1 output'], ['IN1-', 'Amplifier 1 inverting input'],
      ['IN1+', 'Amplifier 1 non-inverting input'], ['V-', 'Lowest supply; ground for single supply'],
      ['IN2+', 'Amplifier 2 non-inverting input'], ['IN2-', 'Amplifier 2 inverting input'],
      ['OUT2', 'Amplifier 2 output'], ['V+', 'Highest supply'],
    ],
  },
  {
    id: 'sn74hc00n', name: 'SN74HC00N', manufacturer: 'Texas Instruments', package: 'N / PDIP-14', category: 'Quad 2-input NAND',
    doc: 'SCLS181H', revision: 'August 2021', sections: 'Section 5, Table 5-1; Section 6.3',
    source: 'https://www.ti.com/lit/ds/symlink/sn74hc00.pdf',
    product: 'https://www.ti.com/product/SN74HC00/part-details/SN74HC00N',
    supply: [2, 6], supplyNote: 'Recommended VCC: 2 to 6 V. SN74 ambient -40 to 85 C. Input thresholds depend on VCC.',
    note: 'Each output is low only when both inputs of its gate are high. Do not leave CMOS inputs floating. HC is not HCT; a 3.3 V signal is not automatically a valid high at a 5 V supply.',
    pins: [
      ['1A', 'Gate 1 input A'], ['1B', 'Gate 1 input B'], ['1Y', 'Gate 1 output'],
      ['2A', 'Gate 2 input A'], ['2B', 'Gate 2 input B'], ['2Y', 'Gate 2 output'],
      ['GND', 'Ground'], ['3Y', 'Gate 3 output'], ['3A', 'Gate 3 input A'],
      ['3B', 'Gate 3 input B'], ['4Y', 'Gate 4 output'], ['4A', 'Gate 4 input A'],
      ['4B', 'Gate 4 input B'], ['VCC', 'Positive supply'],
    ],
  },
].map(ic => ({ ...ic, verified, view: 'top' }));
