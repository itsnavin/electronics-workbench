export const learningReferences = {
  resistance: { title: 'Fluke: measuring resistance', url: 'https://www.fluke.com/en-us/learn/blog/digital-multimeters/how-to-measure-resistance' },
  capacitance: { title: 'Fluke: measuring capacitance', url: 'https://www.fluke.com/en-us/learn/blog/digital-multimeters/how-to-measure-capacitance' },
  diode: { title: 'Fluke: diode-test principles and lead polarity', url: 'https://www.fluke.com/en-us/learn/blog/digital-multimeters/how-to-test-diodes' },
  color: { title: 'Vishay color code, document 20143, revision 28-Aug-2009', url: 'https://www.vishay.com/docs/20143/colorcod.pdf' },
  transformer: { title: 'OpenStax College Physics 2e, 23.7: ideal transformer equations', url: 'https://openstax.org/books/college-physics-2e/pages/23-7-transformers' },
  leakage: { title: 'Tektronix / Keithley application note 315: capacitor leakage is a separate measurement', url: 'https://www.tek.com/en/documents/application-note/315-capacitor-leakage-measurements-using-model-6517a-electrometer' },
  dielectrics: { title: 'Vishay capacitor dielectric comparison, document 40301, revision 19-Nov-2025', url: 'https://www.vishay.com/docs/40301/capacitordielectriccomparison.pdf' },
};
export const learningReviewed = '2026-10-21';
export const meterSafety = 'Only disconnected, de-energized, isolated low-energy components. Remove batteries and other supplies. Capacitors can retain or regain charge after disconnection. Before handling or changing to resistance, capacitance or diode mode, stored energy must have been removed by the manufacturer-approved procedure and absence of voltage verified with appropriately rated equipment by someone competent to do so. Recheck as instructed by the equipment procedure. If voltage, energy or discharge method is unknown, stop and seek qualified help. Do not short capacitor terminals with a tool. No live mains probing, appliance power-supply servicing or high-energy capacitor work is covered.';

export const meterGuides = [
  {
    id: 'resistor', name: 'Resistors', search: 'resistor resistance ohms potentiometer multimeter continuity test',
    mode: 'Resistance / ohms (not just the continuity buzzer)',
    steps: [
      'Start only after the shared isolation and stored-energy precautions are satisfied. Identify the part value and tolerance from markings or its datasheet; use the color-code tool for supported axial resistors.',
      'Use the meter manual: black lead in COM and red in the voltage/resistance input, never the current input. Select ohms and a suitable range. Check the leads together; lead/contact resistance matters for small values.',
      'Remove the component, or disconnect at least one lead where safe and appropriate, to remove parallel circuit paths. Measure across its two terminals without touching exposed metal with your fingers.',
      'Wait for a stable reading; read the ohm/kohm/Mohm annunciator carefully. Compare against the marked tolerance range and the meter accuracy/resolution, not an exact nominal value alone.',
    ],
    types: [
      ['Fixed carbon / metal film / wirewound', 'Ordinary ohms measurement is useful; wirewound inductance and temperature can affect application behavior. Resistance does not establish power rating.'],
      ['Low-ohm shunt / zero-ohm link', 'Lead/contact resistance can dominate. Use REL only as the meter manual allows; precision low-ohm work often needs four-wire equipment. A link may legitimately read near zero.'],
      ['Potentiometer / trimmer', 'Outer terminals approximate total resistance; wiper-to-end changes with position. Isolated testing can reveal jumps or open spots. Do not move a circuit calibration setting without recording it.'],
      ['Thermistor / LDR', 'Resistance intentionally varies with temperature or light. Compare at the datasheet conditions; a varying reading is not automatically a fault.'],
      ['SMD / networks / fusible resistors', 'Identify the exact marking and pinout. Multi-pin networks are not always independent two-terminal resistors. A replacement must match required safety/type ratings, not just ohms.'],
    ],
    readings: [
      ['Near expected range', 'Consistent with its DC resistance at this temperature, allowing for meter uncertainty; not proof of wattage or reliability under load.'],
      ['OL / overrange', 'Could be an open part, wrong range, or poor contact. Check meter range/leads and isolated connections before concluding failure.'],
      ['Unexpectedly low', 'First exclude parallel paths and lead errors. A genuinely near-zero fixed resistor may be shorted, but a shunt/link is meant to be low.'],
      ['High / unstable / out of tolerance', 'Inspect contacts and avoid finger leakage; verify temperature and component type. Persistent disagreement beyond measurement uncertainty suggests drift or damage.'],
    ],
    limits: 'A continuity beep only means resistance is below the meter-specific threshold; it does not measure the correct resistor value. A DMM does not certify power handling, high-voltage insulation or intermittent behavior in service.',
    refs: ['resistance', 'color'],
  },
  {
    id: 'capacitor', name: 'Capacitors', search: 'capacitor capacitance electrolytic ceramic film tantalum ESR leakage multimeter test',
    mode: 'Capacitance (F), if supported by the meter and its range',
    steps: [
      'Identify capacitance, tolerance, polarity and voltage rating from the part/datasheet. Bulging, leakage, cracked casing or vent damage are warning signs; do not energize a suspect part.',
      'Follow the shared stored-energy precautions before touching or isolating anything. Being unplugged does not mean discharged. This guide gives no universal discharge time, resistor value or improvised discharge method.',
      'With the component confirmed de-energized and safely isolated, use COM and the manual-specified capacitance input. Select capacitance mode, not ohms or current. Follow the manual for polarized parts and lead polarity.',
      'Measure out of circuit, allow the reading to settle, and compare with the specified tolerance plus meter error. For very small values, lead capacitance may dominate; use the manual-approved open-lead REL compensation if available.',
    ],
    types: [
      ['Ceramic / film (usually nonpolar)', 'Normally no polarity in this measurement; small pF values can be below DMM resolution. Ceramic capacitance may depend on temperature and DC bias; test conditions matter.'],
      ['Aluminum electrolytic (polarized unless marked bipolar)', 'Observe the identified polarity. Capacitance can look normal despite high ESR or excess leakage. Do not infer polarity from shape alone.'],
      ['Tantalum / polymer', 'Confirm the exact type, polarity markings and meter compatibility. A polarity mark on one family need not mean the same thing on another.'],
      ['Bipolar electrolytic', 'Do not assume every electrolytic is polarized. Use its datasheet and meter instructions; capacitance alone still does not measure ESR or leakage at rated voltage.'],
      ['Supercapacitor / motor / mains / high-energy capacitor', 'Outside this beginner procedure. Large stored energy, special voltage limits and long measurement times need appropriate equipment and qualified procedures. Do not attempt hazardous discharge or live tests.'],
    ],
    readings: [
      ['Capacitance within specified tolerance', 'Only a capacitance screening pass at the meter test conditions; it cannot certify overall capacitor health.'],
      ['Very low / zero compared with marking', 'May indicate lost capacitance/open connection, but also check range, units, leads and the meter minimum resolution.'],
      ['OL / unstable / cannot settle', 'May be beyond range, poor contact, leakage or a fault. OL in capacitance mode is not uniquely an open capacitor. Consult the meter manual.'],
      ['Persistent low resistance in a separate ohms check', 'Can suggest a short on an isolated, discharged part, but charging behavior and meter characteristics complicate interpretation. A brief beep or changing resistance is not an ESR/leakage test.'],
    ],
    limits: 'A standard DMM cannot test all capacitors fully. ESR needs a suitable ESR/LCR instrument with appropriate frequency; leakage/insulation at working voltage needs a controlled, rated test by qualified personnel. Do not improvise such tests. An ohms charging transient cannot reliably determine capacitance or certify a capacitor as good.',
    refs: ['capacitance', 'resistance', 'leakage', 'dielectrics'],
  },
  {
    id: 'diode', name: 'Diodes', search: 'diode LED Schottky Zener bridge rectifier multimeter anode cathode test',
    mode: 'Diode test (display normally shows forward voltage in volts)',
    steps: [
      'Satisfy the shared de-energized/isolation precautions and identify anode/cathode from the exact datasheet. Many axial rectifiers mark the cathode with a band; package-specific markings vary.',
      'Use black in COM, red in the manual-specified voltage/diode input. Select diode mode, not the current jack. Isolate the diode or at least one terminal where appropriate to avoid parallel paths.',
      'For a typical DMM diode mode, red to anode and black to cathode forward-biases the diode. Record the voltage; then reverse the leads and record again. Confirm your meter polarity in its manual.',
      'Compare both directions with the part type, datasheet test conditions and meter capability. No single forward-voltage threshold applies to every diode.',
    ],
    types: [
      ['Silicon signal / rectifier', 'Common silicon junctions often show about 0.5 to 0.8 V forward at a DMM test current and OL reverse. This is illustrative, not a universal acceptance range.'],
      ['Schottky / germanium', 'Often lower forward drop than silicon PN junctions. Reverse leakage and readings depend on type and temperature; use actual specifications.'],
      ['LED (including white / blue)', 'Higher forward voltage may exceed meter compliance. OL both ways or no glow can be an instrument limit, not an open LED. Multi-die LEDs may need different equipment.'],
      ['Zener / TVS', 'Forward checking may resemble a diode, but a DMM normally cannot establish reverse breakdown/clamping voltage. Bidirectional TVS can read OL both ways even when normal. No high-voltage breakdown test is provided.'],
      ['Bridge rectifier / diode array', 'Follow the exact pinout and test its individual accessible junction paths; one pair of terminals does not test every junction. Internal paths can change readings.'],
    ],
    readings: [
      ['Forward drop and OL in reverse', 'Consistent with one-way low-current junction behavior for a suitable diode/meter combination, not a complete health certificate.'],
      ['Near zero in both directions', 'Suggests a short after excluding parallel paths, wrong mode and probe errors. A low Schottky forward drop alone is not a short.'],
      ['OL in both directions', 'May indicate an open ordinary diode, poor contact or insufficient meter test voltage (especially LEDs/series junctions). Check type and meter capability first.'],
      ['Conduction in both directions / unexpected values', 'Could be leakage/damage or internal/circuit paths. Isolate and compare to the datasheet; do not declare a fault from one in-circuit reading.'],
    ],
    limits: 'DMM diode mode does not certify reverse-voltage rating, Zener/TVS breakdown, leakage at operating voltage, switching speed or current handling. Ohms/continuity modes are not universal substitutes for diode mode. This guide contains no live or breakdown-voltage probing.',
    refs: ['diode'],
  },
];
