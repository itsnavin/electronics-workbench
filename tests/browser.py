"""End-to-end checks against dist/, or LIVE_URL, with no web app dependencies."""
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import os
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = Path(os.environ.get("UI_ARTIFACT_DIR", ROOT / "test-results"))


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


@contextmanager
def site():
    remote = os.environ.get("LIVE_URL")
    if remote:
        yield remote.rstrip("/") + "/"
        return
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT / "dist")))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}/"
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


def run():
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    with site() as base, sync_playwright() as p:
        browser = p.chromium.launch(channel="chromium")
        context = browser.new_context(viewport={"width": 1440, "height": 1000})
        context.grant_permissions(["clipboard-read", "clipboard-write"])
        if os.environ.get("UI_FILE_TRANSPORT") == "1":
            if os.environ.get("LIVE_URL"):
                raise RuntimeError("File transport is only for local dist checks.")
            # Optional isolation from host HTTP-injecting software; CI uses real HTTP.
            def serve_file(route):
                name = route.request.url.removeprefix(base).split("?")[0].split("#")[0] or "index.html"
                if name not in {"index.html", "styles.css", "app.js", "calculators.js", "catalog.js", "subnet.js"}:
                    raise RuntimeError(f"Unexpected asset request: {name}")
                route.fulfill(path=str(ROOT / "dist" / name))
            context.route(base + "**", serve_file)
        page = context.new_page()
        errors, failed, external = [], [], []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("response", lambda response: failed.append(response.url) if response.status >= 400 else None)
        page.on("request", lambda request: external.append(request.url) if not request.url.startswith(base) else None)

        def go(route):
            page.goto(base + "#" + route)
            expect(page.locator("h1")).to_be_visible()

        def calculate():
            page.get_by_role("button", name="Calculate", exact=False).click()

        go("home")
        expect(page.get_by_role("navigation", name="Main navigation")).to_be_visible()
        page.screenshot(path=str(ARTIFACTS / "desktop-home.png"), full_page=True)
        page.keyboard.press("Tab")
        expect(page.get_by_role("link", name="Skip to tools")).to_be_focused()
        page.keyboard.press("Enter")
        # Skip links target main, without accidentally replacing the routed view.
        expect(page.locator("main")).to_be_focused()
        page.get_by_label("Search calculators and references").fill("LM358")
        expect(page.locator("#search-results a")).to_have_count(1)
        page.get_by_label("Search calculators and references").fill("no-such-tool")
        expect(page.locator("#search-count")).to_contain_text("No matching")
        print("PASS overview, search, keyboard skip link")

        go("calculators/resistor")
        expect(page.locator("#calc-result")).to_contain_text("1 kohm")
        expect(page.locator("#band-0 option[value=Black]")).to_have_count(0)
        expect(page.locator("#band-3 option[value=White]")).to_have_count(0)
        page.get_by_label("Band count").select_option("5")
        expect(page.locator("#band-form select")).to_have_count(5)
        page.get_by_label("Direction").select_option("write")
        page.get_by_label("Nominal resistance", exact=True).fill("4.7")
        page.get_by_role("button", name="Find colors").click()
        expect(page.locator("#calc-result")).to_contain_text("Yellow / Violet / Black / Brown / Brown")
        page.get_by_label("Nominal resistance", exact=True).fill("1.2345")
        page.get_by_role("button", name="Find colors").click()
        expect(page.locator("#calc-error")).to_contain_text("not exactly representable")
        expect(page.locator("#calc-result")).to_be_empty()
        print("PASS resistor directions, valid choices and rejection")

        go("calculators/ohm")
        expect(page.locator("#calc-result")).to_contain_text("10 V")
        page.get_by_role("button", name="Copy result").click()
        expect(page.locator("#copy-status")).to_contain_text("Copied")
        first_copy = page.evaluate("navigator.clipboard.readText()")
        page.get_by_role("button", name="Copy result").click()
        assert page.evaluate("navigator.clipboard.readText()") == first_copy
        assert "Copied" not in first_copy and "Copy result" not in first_copy
        page.get_by_label("Find", exact=True).select_option("current")
        calculate()
        expect(page.locator("#calc-result")).to_contain_text("10 mA")
        page.get_by_label("Find", exact=True).select_option("resistance")
        calculate()
        expect(page.locator("#calc-result")).to_contain_text("1 kohm")
        page.locator("#a").fill("")
        calculate()
        expect(page.locator("#calc-error")).to_contain_text("required")
        expect(page.locator("#calc-result")).to_be_empty()
        print("PASS Ohm modes and blank input")

        go("calculators/led")
        expect(page.locator("#calc-result")).to_contain_text("330 ohm")
        page.locator("#supply").fill("2")
        calculate()
        expect(page.locator("#calc-error")).to_contain_text("Supply must exceed")
        page.locator("#supply").fill("1")
        calculate()
        expect(page.locator("#calc-error")).to_contain_text("Supply must exceed")
        page.locator("#supply").fill("5")
        page.locator("#current").fill("-1")
        calculate()
        expect(page.locator("#calc-error")).to_contain_text("positive")
        print("PASS LED headroom and invalid current")

        go("calculators/network")
        expect(page.locator("#calc-result")).to_contain_text("50 ohm")
        page.locator("#mode").select_option("series")
        calculate()
        expect(page.locator("#calc-result")).to_contain_text("200 ohm")
        page.locator("#values").fill("100,,200")
        calculate()
        expect(page.locator("#calc-error")).to_contain_text("required")
        go("calculators/divider")
        expect(page.locator("#calc-result")).to_contain_text("2.5 V")
        page.locator("#loaded").select_option("yes")
        calculate()
        expect(page.locator("#calc-result")).to_contain_text("1.66667 V")
        go("calculators/rc")
        expect(page.locator("#calc-result")).to_contain_text("100 ms")
        page.locator("#capacitance-unit").select_option("nF")
        calculate()
        expect(page.locator("#calc-result")).to_contain_text("100 us")
        go("calculators/timer")
        expect(page.locator("#calc-result")).to_contain_text("66.67%")
        page.locator("#mode").select_option("mono")
        expect(page.locator("#rb-field")).to_be_hidden()
        calculate()
        expect(page.locator("#calc-result")).to_contain_text("110 ms")
        print("PASS networks, loaded divider, RC units and timer modes")

        go("ic")
        expect(page.locator("tbody tr")).to_have_count(8)
        expect(page.locator(".chip-pin.first")).to_contain_text("GND")
        page.get_by_label("Search the IC library").fill("NAND")
        expect(page.locator("#ic-list button")).to_have_count(1)
        page.locator("#ic-list button").click()
        expect(page.locator("tbody tr")).to_have_count(14)
        expect(page.locator("h2")).to_contain_text("SN74HC00N")
        expect(page.get_by_role("link", name="Official TI datasheet")).to_have_attribute("href", "https://www.ti.com/lit/ds/symlink/sn74hc00.pdf")
        print("PASS sourced IC catalog, search, top view and routing")

        go("gpio")
        expect(page.locator(".pin")).to_have_count(40)
        expect(page.locator("#pin-result")).to_contain_text("BCM 17")
        expect(page.locator('[data-pin="11"]')).to_have_attribute("aria-pressed", "true")
        page.locator("#board").select_option("pi5")
        expect(page.locator("#board-note")).to_contain_text("RP1")
        page.locator("#scheme").select_option("bcm")
        page.locator("#pin-number").fill("17")
        page.get_by_role("button", name="Find pin").click()
        expect(page.locator("#pin-result")).to_contain_text("Physical pin 11")
        page.locator('[data-pin="2"]').click()
        expect(page.locator("#pin-result")).to_contain_text("No BCM number")
        page.locator('[data-pin="27"]').focus()
        page.keyboard.press("Enter")
        expect(page.locator("#pin-result")).to_contain_text("Reserved for HAT")
        page.locator("#pin-number").fill("41")
        page.get_by_role("button", name="Find pin").click()
        expect(page.locator("#pin-error")).to_contain_text("1 to 40")
        expect(page.locator("#pin-result")).to_be_empty()
        expect(page.locator('.pin[aria-pressed="true"]')).to_have_count(0)
        page.locator("#pin-number").fill("1.5")
        page.get_by_role("button", name="Find pin").click()
        expect(page.locator("#pin-error")).to_contain_text("whole pin number")
        page.locator("#board").select_option("zero2")
        expect(page.locator("#board-note")).to_contain_text("unpopulated")
        page.locator('[data-pin="11"]').click()
        page.get_by_role("button", name="Copy result").click()
        expect(page.locator("#copy-status")).to_contain_text("Copied")
        assert "physical 11 = BCM 17" in page.evaluate("navigator.clipboard.readText()")
        page.evaluate("Object.defineProperty(navigator, 'clipboard', {configurable:true, value: {writeText: () => Promise.reject(new Error('Denied'))}})")
        page.get_by_role("button", name="Copy result").click()
        expect(page.locator("#copy-status")).to_contain_text("Copy failed")
        page.screenshot(path=str(ARTIFACTS / "desktop-gpio.png"), full_page=True)
        print("PASS all boards, bidirectional lookup, power/reserved pins, invalid input, keyboard and copy success/failure")

        go("home")
        page.get_by_label("Search calculators and references").fill("T568")
        expect(page.locator("#search-results a")).to_have_count(1)
        page.locator("#search-results a").click()
        expect(page.locator("h1")).to_contain_text("Eight contacts")
        expected_wires = {
            "T568A": ["White/Green", "Green", "White/Orange", "Blue", "White/Blue", "Orange", "White/Brown", "Brown"],
            "T568B": ["White/Orange", "Orange", "White/Green", "Blue", "White/Blue", "Green", "White/Brown", "Brown"],
        }
        for standard, colors in expected_wires.items():
            page.get_by_label("Wiring standard").select_option(standard)
            expect(page.locator("#plug-title")).to_contain_text(standard)
            expect(page.locator(".wire-contact b")).to_have_text([str(i) for i in range(1, 9)])
            for index, color in enumerate(colors):
                expect(page.locator(f'[data-wire-pin="{index+1}"] td').first).to_have_text(color)
            expect(page.locator("#plug-orientation")).to_contain_text("latch hidden underneath")
            expect(page.locator("#plug-orientation")).to_contain_text("Pin 1 is left")
            expect(page.locator(".plug-cable")).to_contain_text("TOWARD YOU")
        page.get_by_label("Wiring standard").focus()
        page.keyboard.press("ArrowUp")
        expect(page.get_by_label("Wiring standard")).to_have_value("T568A")
        page.screenshot(path=str(ARTIFACTS / "desktop-ethernet.png"), full_page=True)
        print("PASS Ethernet A/B all eight colors, pair data, orientation, search and keyboard")

        go("subnet")
        expect(page.locator("#subnet-summary")).to_contain_text("192.168.1.0/24")
        page.locator("#ip-prefix").fill("31")
        page.get_by_role("button", name="Calculate subnet").click()
        expect(page.locator("#subnet-summary")).to_contain_text("RFC 3021")
        expect(page.locator("#subnet-summary")).to_contain_text("192.168.1.10 to 192.168.1.11")
        page.get_by_label("Define subnet using").select_option("mask")
        expect(page.locator("#ip-mask")).to_have_value("255.255.255.254")
        page.locator("#ip-mask").fill("255.255.255.255")
        page.get_by_role("button", name="Calculate subnet").click()
        expect(page.locator("#subnet-summary")).to_contain_text("single-host")
        page.get_by_label("Define subnet using").select_option("prefix")
        expect(page.locator("#ip-prefix")).to_have_value("32")
        for prefix, expected in [("0", "4,294,967,296"), ("1", "2,147,483,648")]:
            page.locator("#ip-prefix").fill(prefix)
            page.get_by_role("button", name="Calculate subnet").click()
            expect(page.locator("#subnet-summary")).to_contain_text(expected)
        page.locator("#ip-address").fill("255.999.1.1")
        page.get_by_role("button", name="Calculate subnet").click()
        expect(page.locator("#subnet-error")).to_contain_text("four decimal")
        expect(page.locator("#subnet-result")).to_be_empty()
        page.locator("#ip-address").fill("200.123.45.67")
        page.locator("#ip-prefix").fill("24abc")
        page.get_by_role("button", name="Calculate subnet").click()
        expect(page.locator("#subnet-error")).to_contain_text("whole number")
        page.get_by_label("Define subnet using").select_option("mask")
        expect(page.locator("#ip-mask")).to_have_value("")
        page.locator("#ip-mask").fill("255.0.255.0")
        page.get_by_role("button", name="Calculate subnet").click()
        expect(page.locator("#subnet-error")).to_contain_text("contiguous")
        expect(page.locator("#subnet-result")).to_be_empty()
        page.locator("#ip-mask").fill("255.255.240.0")
        page.locator("#ip-mask").press("Enter")
        expect(page.locator("#subnet-summary")).to_contain_text("200.123.32.0/20")
        page.get_by_text("Binary view / 20 network bits", exact=False).click()
        expect(page.locator(".binary").first).to_have_text("11001000.01111011.00101101.01000011")
        # Reload to restore the real clipboard after the deliberate failure stub.
        page.reload()
        expect(page.locator("#subnet-summary")).to_contain_text("192.168.1.0/24")
        page.get_by_role("button", name="Copy result").click()
        expect(page.locator("#copy-status")).to_contain_text("Copied")
        assert "192.168.1.0/24" in page.evaluate("navigator.clipboard.readText()")
        page.screenshot(path=str(ARTIFACTS / "desktop-subnet.png"), full_page=True)
        print("PASS IPv4 masks/prefixes, /0 /1 /31 /32, invalid inputs, unsigned values, binary, Enter and copy")

        for route in ["home", "calculators/resistor", "calculators/ohm", "calculators/led", "calculators/network",
                      "calculators/divider", "calculators/rc", "calculators/timer", "ic/lm358p", "ic/sn74hc00n", "gpio", "ethernet", "subnet", "about"]:
            page.set_viewport_size({"width": 375, "height": 812})
            go(route)
            assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), f"Horizontal overflow: {route}"
            assert page.locator("main h1").count() == 1
            assert page.locator("input:not([id]), select:not([id])").count() == 0
            if route in ["ethernet", "subnet"]:
                if route == "ethernet":
                    page.get_by_label("Wiring standard").select_option("T568A")
                    expect(page.locator('[data-wire-pin="1"] td').first).to_have_text("White/Green")
                else:
                    page.locator("#ip-prefix").fill("31")
                    page.locator("#ip-prefix").press("Enter")
                    expect(page.locator("#subnet-summary")).to_contain_text("RFC 3021")
                page.screenshot(path=str(ARTIFACTS / f"mobile-{route}.png"), full_page=True)
        go("gpio")
        page.locator('[data-pin="11"]').click()
        expect(page.locator("#pin-result")).to_contain_text("BCM 17")
        page.screenshot(path=str(ARTIFACTS / "mobile-gpio.png"), full_page=True)
        go("calculators/not-real")
        expect(page.locator("h1")).to_contain_text("not on this bench")
        go("unknown")
        expect(page.locator("h1")).to_contain_text("not on this bench")
        go("gpio")
        page.get_by_role("link", name="Overview", exact=True).click()
        expect(page.locator("h1")).to_contain_text("Less guesswork")
        page.go_back()
        expect(page.locator("h1")).to_contain_text("Right pin")
        assert not errors, errors
        assert not failed, failed
        assert not external, external
        print("PASS 375px mobile layouts, unknown routes, back navigation, no JS/network errors or third-party requests")
        browser.close()


if __name__ == "__main__":
    run()
