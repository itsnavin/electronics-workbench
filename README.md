# Electronics Workbench

**One static website for practical electronics learning.**

Live: https://itsnavin.github.io/electronics-workbench/

No account, backend, analytics, hardware access, runtime dependencies, or third-party
assets. All calculations run in the browser. GitHub Pages provides static hosting.

## Tools

| Tool | Coverage |
| --- | --- |
| Resistor colors | 4/5 bands, both directions, valid choices, tolerance ranges; rejects unrepresentable values without rounding |
| Ohm's law | Voltage, current, resistance and dissipated power |
| LED resistor | Up to 24 V DC / 50 mA, positive headroom, upward E24 recommendation allowing -5% resistor tolerance, nominal current and power margin |
| Resistor networks | 2 to 20 positive resistances, series or parallel |
| Voltage divider | Unloaded result and optional resistive loading |
| Capacitor / RC | Time constant, five time constants, first-order cutoff |
| 555 | Standard astable and monostable, output-high duty cycle; NE555P timing scope |
| Ideal transformer | Solve primary/secondary RMS voltage or turns; optional known primary/secondary load current, other current and apparent power in VA |
| Multimeter guides | Safe isolated-component screening for resistor, capacitor and diode families; procedures, normal/suspect/ambiguous readings and instrument limitations |
| IC library | TI NE555P PDIP-8, LM358P PDIP-8, SN74HC00N PDIP-14 only |
| Raspberry Pi | Pi 4 Model B, Pi 5, Zero 2 W; interactive 40-pin header, physical/BCM lookup, power/ground, reserved HAT pins |
| Ethernet cable reference | Selectable T568A/T568B, numbered contact-side 8P8C plug, wire names/pairs, straight-through/crossover, Gigabit and PoE cautions |
| IPv4 subnet calculator | CIDR or contiguous mask, network/wildcard/broadcast, host slots/range, /31 and /32 semantics, optional gateway assessment, binary view and copy |

Electronics calculators include SI unit conversion, validation, plain-language formulas,
worked examples, assumptions and copyable output. Search and hash routes support
direct links without server rewrites.

New reference locations:
[Ethernet colors](https://itsnavin.github.io/electronics-workbench/#ethernet) and
[IPv4 subnet calculator](https://itsnavin.github.io/electronics-workbench/#subnet).

## Local development

Use Node.js 22+ (24 recommended) and Python 3.10+. There are no npm dependencies
and no install step for the application.

```text
npm test
npm run build
python -m http.server 4173 --directory dist
```

Open http://localhost:4173. Alternatively serve the repository root while editing;
the build copies the eight application files to `dist`. Never open modules directly
with a `file:` URL.

Browser tests require Playwright (development/CI only):

```text
python -m pip install playwright==1.64.0
python -m playwright install chromium
npm run test:ui
```

On Linux CI, use `python -m playwright install --with-deps chromium`.
`tests/browser.py` starts/stops its own local server for `dist`; it does not leave
a process running. To test an already deployed site, set `LIVE_URL` to its base
URL, including the repository path. Set `UI_ARTIFACT_DIR` to override the
`test-results` screenshot directory.

If host-installed HTTP filtering injects scripts or resets localhost responses,
`UI_FILE_TRANSPORT=1` makes Playwright serve the exact built assets in-process for
local UI diagnostics. It cannot be combined with `LIVE_URL`. CI and deployment
verification use real HTTP/HTTPS, not this diagnostic transport.

The unit suite checks reference values, boundaries, every unit, resistor rounding
across decades, all multiplier/tolerance round trips, complete GPIO mapping
invariants, every supported board and catalog provenance. Network tests cover
both Ethernet standards' eight pin/color/pair mappings and orientation labels,
IPv4 known vectors (/0, /1, /20, /24, /30, /31, /32), all 33 mask/prefix round trips,
and 3,300 deterministic address/prefix property cases. Chromium tests cover
all tools, desktop and 375px mobile layouts, search, navigation/history, keyboard,
invalid input, stale-result clearing, clipboard success/failure and absence of
unexpected external asset requests. These are software/reference checks, not
physical hardware validation or a complete assistive-technology audit.

## Reference provenance and maintenance

### Component guides, five-band review and transformer theory (reviewed 2026-10-21)

Direct links: [multimeter guides](https://itsnavin.github.io/electronics-workbench/#multimeter),
[five-band resistor tool](https://itsnavin.github.io/electronics-workbench/#calculators/resistor)
and [ideal transformer](https://itsnavin.github.io/electronics-workbench/#calculators/transformer).
`guides.js` stores the original condensed component guidance and linked provenance:

- Fluke's [resistance](https://www.fluke.com/en-us/learn/blog/digital-multimeters/how-to-measure-resistance),
  [capacitance](https://www.fluke.com/en-us/learn/blog/digital-multimeters/how-to-measure-capacitance)
  and [diode](https://www.fluke.com/en-us/learn/blog/digital-multimeters/how-to-test-diodes)
  guides support isolated measurements, mode selection, range/lead effects and
  ordinary silicon forward/reverse checks. Illustrative silicon readings are not
  universal limits. Component-type caveats deliberately require the actual
  datasheet and meter manual, especially LEDs, Schottky, Zener/TVS and bridges.
  We do not repeat a universal capacitor discharge resistor/time, or the diode
  article's questionable fixed "shorted" voltage; no such universal rules apply.
- [Tektronix / Keithley application note 315](https://www.tek.com/en/documents/application-note/315-capacitor-leakage-measurements-using-model-6517a-electrometer)
  explains leakage/insulation measurement as distinct from capacitance, including
  dielectric/environment/test-condition dependence. Its energized test setups
  are **not** reproduced; advanced tests require qualified personnel/equipment.
- [Vishay dielectric comparison, document 40301, revision 19-Nov-2025](https://www.vishay.com/docs/40301/capacitordielectriccomparison.pdf)
  distinguishes ESR, dielectric absorption, polarization, temperature and DC-bias
  behavior across common capacitor families. The app gives qualitative caveats,
  not universal limits or a health diagnosis from this comparison chart.
- [Vishay document 20143, revision 28-Aug-2009](https://www.vishay.com/docs/20143/colorcod.pdf)
  independently confirms the existing supported five-band arithmetic and color
  roles; no arithmetic correction was needed. Three significant digits are
  followed by multiplier and tolerance. Added independent examples include
  yellow-violet-black-brown-brown = 4700 ohm +/-1% (4653–4747 ohm) and
  red-red-black-gold-brown = 22 ohm +/-1%. Allowed digits, all multipliers and
  tolerances now have a separate expected-table test, not just encode/decode
  round trips. If tolerance-band spacing/orientation is ambiguous, do not guess.
- [OpenStax College Physics 2e, 23.7](https://openstax.org/books/college-physics-2e/pages/23-7-transformers)
  supports changing magnetic flux and ideal voltage/turns/current relationships.
  Original worked example: 12 V RMS, 600:300 turns gives 6 V RMS;
  200 mA secondary corresponds to 100 mA primary and 1.2 VA, not extra power.

Meter guides distinguish fixed/variable/low-ohm/sensor resistors, common polarized
and nonpolar capacitor families, and ordinary/LED/Schottky/Zener/TVS/bridge diodes.
High-energy/supercapacitor/mains capacitor work is explicitly out of scope.
Capacitance within tolerance does not establish ESR/leakage health; diode mode
does not certify reverse breakdown or rated-current performance.

Transformer input voltages are positive RMS magnitudes, known turns positive
whole numbers and optional known current nonnegative. Solved fractional turns
remain an ideal number, never silently rounded. AC voltage/turns ratios alone
cannot supply absolute turn counts without one known winding count. The optional
current can be known on either winding; the other current and apparent power are
calculated, not rated limits. RMS volts times RMS amps is VA; real watts equal
that number only at unity power factor. The ideal no-load zero-current result
omits real magnetizing/loss current. There is no DC experiment, construction
procedure, wire/core sizing or isolation/safety certification.

Added regression coverage includes all four unknowns, both current directions,
unit conversions, zero load, step-up/down conservation identities, fractional
turns and invalid/overflow/underflow boundaries. Browser checks cover guides,
keyboard/search/deep links, all transformer modes, unit changes, validation,
stale results, copy and 375px layouts. To maintain these learning references,
recheck the linked source and exact meter/part conditions, keep safety boundaries
visible, and update `guides.js`, related examples and independent tests together.

The data in `catalog.js` records manufacturer, orderable part, package, source,
document ID/revision, relevant sections and review date. Reviewed 2026-10-19:

| Part | Official source | Pin / supply evidence |
| --- | --- | --- |
| TI NE555P / P PDIP-8 | [SLFS022K, March 2026](https://www.ti.com/lit/ds/symlink/ne555.pdf) | Section 4 / Table 4-1, 5.3; timing 6.3.1/6.3.2 |
| TI LM358P / P PDIP-8 | [SLOS068AB, October 2024](https://www.ti.com/lit/ds/symlink/lm358.pdf) | Figure 4-1 / Table 4-1, 5.3; LM358 is 3–30 V, not LM358B's 36 V |
| TI SN74HC00N / N PDIP-14 | [SCLS181H, August 2021](https://www.ti.com/lit/ds/symlink/sn74hc00.pdf) | Section 5 / Table 5-1, 6.3 |

Raspberry Pi pin data was transcribed from its
[official documentation source](https://github.com/raspberrypi/documentation/blob/master/documentation/asciidoc/computers/raspberry-pi/gpio-on-raspberry-pi.adoc)
and [official 40-pin diagram](https://github.com/raspberrypi/documentation/blob/master/documentation/asciidoc/computers/raspberry-pi/images/GPIO-Pinout-Diagram-2.png).
Pi 5's controller distinction follows the official
[RP1 documentation](https://github.com/raspberrypi/documentation/blob/master/documentation/asciidoc/computers/io-controllers/rp1.adoc).
The main raspberrypi.com documentation/product host returned HTTP 403 to the
automated fetcher; its first-party repository was accessible and inspected instead.
libgpiod readthedocs links returned 404; version-specific discovery syntax was
verified against the upstream maintainer's
[current help source](https://github.com/brgl/libgpiod/blob/master/tools/gpioinfo.c)
and [1.6 help source](https://github.com/brgl/libgpiod/blob/v1.6.x/tools/gpioinfo.c).
Only factual pin/function data and brief explanations are included; diagrams in
the application are original SVG/CSS, not copied datasheet images.

### Ethernet and IPv4 sources (reviewed 2026-10-20)

`catalog.js` stores Ethernet color sequences, pair numbers, orientation and links:

- [trueCABLE T568A/T568B reference](https://www.truecable.com/blogs/cable-academy/t568a-vs-t568b):
  exact eight-wire sequences and orange/green pair exchange.
- [trueCABLE plug orientation](https://www.truecable.com/blogs/cable-academy/how-to-terminate-an-unshielded-pass-through-rj45-connector):
  contact side is opposite the retaining latch. Our original diagram looks down
  at that side, nose away/up and cable toward you/down, pin 1 left.
- [Cisco connector and cable specifications](https://www.cisco.com/en/US/docs/switches/lan/catalyst2960/hardware/installation/guide_/higcable_ps6406_TSD_Products_Installation_Guide_Chapter.html):
  two-pair 10/100 versus four-pair 1000BASE-T, different crossover requirements,
  and device-specific auto-MDIX. The text does not generalize this older switch's
  cabling/configuration rules to every modern device.
- [Fluke split-pair identification](https://www.flukenetworks.com/knowledge-base/linkiq/split-pair-identification):
  continuity alone does not establish correct pair integrity.

`subnet.js` uses exact Number integer arithmetic within the 32-bit unsigned address
space (no signed JavaScript bitwise operations). It links
[RFC 4632](https://www.rfc-editor.org/rfc/rfc4632.html),
[RFC 3021](https://www.rfc-editor.org/rfc/rfc3021.html),
[RFC 1918](https://www.rfc-editor.org/rfc/rfc1918.html) and the
[IANA special-purpose registry](https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml).
The /31 model assumes a supporting point-to-point link; /32 means one host/route.
RFC 1918 checks are exact; other scope labels cover only selected common blocks,
not the evolving full registry. Scope describes the input address, not its whole
calculated subnet. No category claims allocation, routability or reachability.

### Gateway information

The actual configured default gateway **cannot be calculated from IP/mask** or
discovered by this static site. An optional user-entered gateway is checked for
IPv4 syntax, conventional subnet/host membership, equality with the local address,
and selected non-unicast/special-use ranges. Arithmetic passes are labeled as
plausible only, never detected or reachable. Invalid gateway input does not hide
otherwise valid subnet arithmetic, and the copied result includes the gateway
assessment and unknown-configured-gateway disclaimer.

Outside-subnet gateways are conditional: explicit host/on-link routes or
point-to-point configurations may be exceptions. /31 can use its other endpoint
on a supporting link; /32 has no distinct in-subnet peer but may use explicit
routes. First/last-host conventions are shown only for a wholly RFC1918 /0-/30
subnet with a conventional local host address, excluding that local address.
They are examples, not router assignments or recommendations. No candidates
are shown for /0, /31, /32, public or selected special-use contexts.

Help describes router/DHCP/Ubuntu connection details and read-only Linux
`ip route show default` and `ip route get <destination>` inspection. The latter
asks the kernel for a selected route, not a ping or scan. Policy routing, VPNs,
multiple defaults and routes without `via` need actual configuration context.
Source reviewed 2026-10-20:
[ip-route manual](https://man7.org/linux/man-pages/man8/ip-route.8.html).
The Ubuntu help host returned HTTP 503 during reference retrieval; GUI directions
are intentionally generic and note version-dependent labels.
Gateway tests cover unknown input, malformed octets, self/network/broadcast
addresses, off-subnet conditional cases, /0-/31-/32 and special-use boundaries,
plus desktop/mobile entry and copy output.

To update/add content:

1. Obtain the official manufacturer datasheet for the **exact orderable part and package**.
2. Check pin-1/top-view orientation, every pin/function, recommended operating
   conditions and variant differences. Do not substitute absolute maximum ratings.
3. Update `catalog.js` with sources, document revision, sections and review date;
   update the independent expected data in `tests/catalog.test.js` after verification.
4. For boards, verify the entire header and controller differences from official
   material. Do not add Pico, Compute Modules, or legacy headers by analogy.
5. Run unit/build/browser checks. Check long labels and both desktop/mobile views.

For Ethernet updates, recheck every wire color, pair assignment and plug view
against manufacturer material; never infer a jack's punch-down positions from a
plug drawing. For IPv4 changes, maintain strict parsers, contiguous-mask validation,
unsigned arithmetic and explicit /31-/32 rules; add independent vectors/properties
before altering the calculation. Update the review date and linked sources.

Datasheet URLs may serve newer revisions in future; the recorded revision names
the version actually consulted. Review the source again before changing data.

## Publishing

The public repository is `itsnavin/electronics-workbench`. Enable **Settings →
Pages → Source: GitHub Actions**. `.github/workflows/pages.yml` runs numeric/catalog
tests, builds, runs Chromium UI checks, and only then deploys `dist` from `main`
using the Pages artifact/OIDC flow. Pull requests verify without deploying.
The workflow can also be run manually. No repository secrets are needed.

## Important limitations

- Ideal calculations are estimates, not design certification. Practical circuits
  cover low-voltage DC; transformer AC theory is educational, not construction.
  No mains/high-energy instructions. Power off before wiring.
- Resistor band encoding supports nonzero, exactly representable 4/5-band values,
  with multipliers 0.01 through 1e9. No zero-ohm jumper or absent tolerance band.
- LED sizing assumes fixed supply/forward voltage. At least twice calculated
  dissipation is only a starting power-rating margin; ambient temperature,
  enclosure, mounting and the part's derating curve still determine suitability.
- A divider is not a regulated supply; loading changes the result. RC estimates
  omit leakage/parasitics/tolerance. 555 uses standard topologies, not diode
  modifications; positive astable resistances imply >50% output-high duty.
  NE555P astable estimates above 100 kHz and monostable pulses below 10 us are
  rejected per the referenced device discussion. Other component limits remain
  application-specific.
- IC references apply only to the named TI packages. Supply compatibility does
  not mean input/output logic compatibility.
- GPIO is 3.3 V logic, **not 5 V tolerant**. 5V rails and grounds never get GPIO
  numbers. No direct motors/relays/high-current loads; consult official board
  electrical limits rather than a generalized current claim.
- Physical numbers, BCM logical labels, chip-local Linux offsets, old global
  sysfs integers and wiringPi numbers are different conventions. Pi 5 uses RP1.
  The app never guesses a gpiochip index, runtime global number, active function
  or live hardware state. It provides only read-only discovery guidance.
- Ethernet diagrams are information only, not TIA certification or a substitute
  for a tester. Preserve original twisted pairs; 10BASE-T/100BASE-TX use two data
  pairs, 1000BASE-T uses all four. A-to-B is not a universal Gigabit crossover.
  Auto-MDI-X is device/configuration dependent. Jacket colors prove nothing.
  Disconnect both ends from powered equipment/PoE injectors before termination
  or passive testing, and use equipment with appropriate ratings.
- IPv4 only; no IPv6, scanning, ping, configuration or reachability checks.
  CIDR input is a whole number 0-32 without a slash. IPv4 and mask octets must be
  canonical decimal without leading zeros. Inactive prefix/mask fields stay
  synchronized after valid edits; invalid input clears results and has no
  silently restored subnet when switching modes. Host counts are arithmetic
  slots, not a guarantee addresses in special-use blocks can be assigned.
