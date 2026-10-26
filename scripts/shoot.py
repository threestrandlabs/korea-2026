#!/usr/bin/env python3
"""Local screenshots + console check. Run: /workspace/.pwvenv/bin/python scripts/shoot.py"""
import pathlib, threading, http.server, functools, socketserver
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT.parent / "screenshots"; OUT.mkdir(exist_ok=True)
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(H, directory=str(ROOT)))
port = srv.server_address[1]; threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{port}/"
errors, shots = [], []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    for name, vp, hash_ in [("mobile-overview", (390, 844), "#overview"), ("mobile-day2", (390, 844), "#d2"),
                            ("mobile-phrases", (390, 844), "#overview"), ("desktop-overview", (1440, 900), "#overview")]:
        ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, device_scale_factor=1)
        pg = ctx.new_page()
        pg.on("pageerror", lambda e, n=name: errors.append(f"{n} pageerror: {e}"))
        pg.on("console", lambda m, n=name: errors.append(f"{n} console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
        pg.on("response", lambda r, n=name: errors.append(f"{n} {r.status}: {r.url}") if r.status >= 400 else None)
        pg.on("requestfailed", lambda r, n=name: errors.append(f"{n} reqfail: {r.url}"))
        pg.goto(BASE + hash_); pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(1200)
        sw = pg.evaluate("document.documentElement.scrollWidth")
        if sw > vp[0]: errors.append(f"{name}: horizontal overflow scrollWidth={sw}")
        if name == "mobile-phrases":
            pg.evaluate("(()=>{const e=[...document.querySelectorAll('h2,h3')].find(h=>/phrase/i.test(h.textContent)); if(e) e.scrollIntoView();})()")
            pg.wait_for_timeout(300); pg.screenshot(path=str(OUT / f"{name}.png"))
        else:
            pg.screenshot(path=str(OUT / f"{name}.png"), full_page=True)
        shots.append(name); ctx.close()
    b.close()
# contact sheet: crop full pages to a max height
H_MAX, pad = 2200, 16
ims = []
for n in shots:
    im = Image.open(OUT / f"{n}.png").convert("RGB")
    w = 390 if im.width <= 400 else 900
    im = im.resize((w, int(im.height * w / im.width)))
    ims.append((n, im.crop((0, 0, w, min(im.height, H_MAX)))))
W = sum(i.width for _, i in ims) + pad * (len(ims) + 1); Hh = max(i.height for _, i in ims) + 40 + pad
sheet = Image.new("RGB", (W, Hh), "white"); d = ImageDraw.Draw(sheet); x = pad
for n, im in ims:
    d.text((x, pad), n, fill="black"); sheet.paste(im, (x, pad + 24)); x += im.width + pad
sheet.save(OUT / "contact.png")
print("shots:", shots); print("errors:", errors or "none")
