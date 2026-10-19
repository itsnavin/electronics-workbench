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
| IC library | TI NE555P PDIP-8, LM358P PDIP-8, SN74HC00N PDIP-14 only |
| Raspberry Pi | Pi 4 Model B, Pi 5, Zero 2 W; interactive 40-pin header, physical/BCM lookup, power/ground, reserved HAT pins |

Each calculator includes SI unit conversion, validation, plain-language formulas,
worked examples, assumptions and copyable output. Search and hash routes support
direct links without server rewrites.

## Local development

Use Node.js 22+ (24 recommended) and Python 3.10+. There are no npm dependencies
and no install step for the application.

```text
npm test
npm run build
python -m http.server 4173 --directory dist
```

Open http://localhost:4173. Alternatively serve the repository root while editing;
the build copies the six application files to `dist`. Never open modules directly
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
invariants, every supported board and catalog provenance. Chromium tests cover
all tools, desktop and 375px mobile layouts, search, navigation/history, keyboard,
invalid input, stale-result clearing, clipboard success/failure and absence of
unexpected external asset requests. These are software/reference checks, not
physical hardware validation or a complete assistive-technology audit.

## Reference provenance and maintenance

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

To update/add content:

1. Obtain the official manufacturer datasheet for the **exact orderable part and package**.
2. Check pin-1/top-view orientation, every pin/function, recommended operating
   conditions and variant differences. Do not substitute absolute maximum ratings.
3. Update `catalog.js` with sources, document revision, sections and review date;
   update the independent expected data in `tests/catalog.test.js` after verification.
4. For boards, verify the entire header and controller differences from official
   material. Do not add Pico, Compute Modules, or legacy headers by analogy.
5. Run unit/build/browser checks. Check long labels and both desktop/mobile views.

Datasheet URLs may serve newer revisions in future; the recorded revision names
the version actually consulted. Review the source again before changing data.

## Publishing

The public repository is `itsnavin/electronics-workbench`. Enable **Settings →
Pages → Source: GitHub Actions**. `.github/workflows/pages.yml` runs numeric/catalog
tests, builds, runs Chromium UI checks, and only then deploys `dist` from `main`
using the Pages artifact/OIDC flow. Pull requests verify without deploying.
The workflow can also be run manually. No repository secrets are needed.

## Important limitations

- Ideal calculations are estimates, not design certification. Low-voltage DC
  learning only; no mains/high-energy instructions. Power off before wiring.
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
