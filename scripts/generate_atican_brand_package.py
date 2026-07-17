"""Build the Atican Beach Resort & Hotel master brand asset package.

This is a manual vector reconstruction based solely on the supplied 579x641
compressed reference. No source pixels are embedded in any vector master.
"""

from __future__ import annotations

import csv
import math
import re
import shutil
import struct
import subprocess
from pathlib import Path

from PIL import Image
from pypdf import PdfReader
from reportlab.lib.colors import CMYKColor
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas
from reportlab.pdfbase.ttfonts import TTFontFile


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "output" / "ATICAN BRAND ASSETS"
TMP = ROOT / "tmp" / "pdfs" / "atican-brand"
SOURCE = Path(r"C:\Users\User\Downloads\WhatsApp Image 2026-07-14 at 2.31.34 PM.jpeg")
FONT = Path(r"C:\Windows\Fonts\arialbd.ttf")
POPPLER = Path(r"C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin\pdftoppm.exe")

W, H = 579.0, 641.0

# RGB samples are measured/normalized from the supplied JPEG. CMYK conversions
# are production approximations; Pantone matches require a physical swatch proof.
COLORS = {
    "sky":       {"hex": "#034D78", "rgb": (3, 77, 120),  "cmyk": (98, 64, 33, 15), "pantone": "PANTONE 7692 C approx."},
    "ocean":     {"hex": "#02337F", "rgb": (2, 51, 127),  "cmyk": (100, 78, 15, 3), "pantone": "PANTONE 2945 C approx."},
    "cobalt":    {"hex": "#0055A4", "rgb": (0, 85, 164),  "cmyk": (100, 67, 0, 6),  "pantone": "PANTONE 300 C approx."},
    "aqua":      {"hex": "#00A6C7", "rgb": (0, 166, 199), "cmyk": (84, 13, 20, 0),  "pantone": "PANTONE 3125 C approx."},
    "deep_blue": {"hex": "#001B53", "rgb": (0, 27, 83),   "cmyk": (100, 90, 25, 35),"pantone": "PANTONE 2767 C approx."},
    "shore":     {"hex": "#062D38", "rgb": (6, 45, 56),   "cmyk": (90, 50, 50, 55), "pantone": "PANTONE 5463 C approx."},
    "panel":     {"hex": "#071919", "rgb": (7, 25, 25),   "cmyk": (85, 55, 55, 85), "pantone": "PANTONE Black 6 C approx."},
    "sun":       {"hex": "#F0400B", "rgb": (240, 64, 11), "cmyk": (0, 85, 100, 0),  "pantone": "PANTONE 172 C approx."},
    "white":     {"hex": "#FFFFFF", "rgb": (255,255,255), "cmyk": (0, 0, 0, 0),     "pantone": "Opaque White"},
    "black":     {"hex": "#000000", "rgb": (0,0,0),       "cmyk": (0, 0, 0, 100),   "pantone": "PANTONE Black C approx."},
    "gold":      {"hex": "#B58A2A", "rgb": (181,138,42),  "cmyk": (25, 35, 95, 12), "pantone": "PANTONE 7555 C approx."},
    "gray1":     {"hex": "#D7D7D7", "rgb": (215,215,215), "cmyk": (0, 0, 0, 16),    "pantone": "Cool Gray 2 C approx."},
    "gray2":     {"hex": "#707070", "rgb": (112,112,112), "cmyk": (0, 0, 0, 56),    "pantone": "Cool Gray 10 C approx."},
}


def hx(name: str) -> str:
    return COLORS[name]["hex"]


def ink(name: str) -> CMYKColor:
    c, m, y, k = COLORS[name]["cmyk"]
    return CMYKColor(c/100, m/100, y/100, k/100)


def esc(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ---------------------------------------------------------------------------
# TrueType outline extraction. This keeps the master wordmark as vector paths.
# ---------------------------------------------------------------------------

class TrueTypeOutliner:
    def __init__(self, path: Path):
        self.path = path
        self.data = path.read_bytes()
        self.ttf = TTFontFile(str(path))
        self.units = self.ttf.unitsPerEm
        self.glyf = self.ttf.table["glyf"]["offset"]
        head = self.ttf.table["head"]["offset"]
        self.loca_format = struct.unpack_from(">h", self.data, head + 50)[0]
        loca = self.ttf.table["loca"]["offset"]
        count = self.ttf.numGlyphs + 1
        if self.loca_format == 0:
            self.offsets = [v * 2 for v in struct.unpack_from(f">{count}H", self.data, loca)]
        else:
            self.offsets = list(struct.unpack_from(f">{count}I", self.data, loca))

    def advance(self, char: str) -> float:
        return float(self.ttf.charWidths.get(ord(char), 500.0)) / 1000.0 * self.units

    def glyph_index(self, char: str) -> int:
        return int(self.ttf.charToGlyph.get(ord(char), 0))

    def contours(self, char: str):
        gid = self.glyph_index(char)
        start, end = self.offsets[gid], self.offsets[gid + 1]
        if start == end:
            return []
        pos = self.glyf + start
        n_contours = struct.unpack_from(">h", self.data, pos)[0]
        if n_contours <= 0:
            # All characters used by this wordmark are simple glyphs in Arial Bold.
            return []
        pos += 10
        ends = list(struct.unpack_from(f">{n_contours}H", self.data, pos)); pos += 2*n_contours
        instruction_len = struct.unpack_from(">H", self.data, pos)[0]; pos += 2 + instruction_len
        point_count = ends[-1] + 1
        flags = []
        while len(flags) < point_count:
            flag = self.data[pos]; pos += 1
            flags.append(flag)
            if flag & 0x08:
                repeat = self.data[pos]; pos += 1
                flags.extend([flag] * repeat)
        xs, x = [], 0
        for flag in flags:
            if flag & 0x02:
                delta = self.data[pos]; pos += 1
                x += delta if flag & 0x10 else -delta
            elif not (flag & 0x10):
                x += struct.unpack_from(">h", self.data, pos)[0]; pos += 2
            xs.append(x)
        ys, y = [], 0
        for flag in flags:
            if flag & 0x04:
                delta = self.data[pos]; pos += 1
                y += delta if flag & 0x20 else -delta
            elif not (flag & 0x20):
                y += struct.unpack_from(">h", self.data, pos)[0]; pos += 2
            ys.append(y)
        points = [(xs[i], ys[i], bool(flags[i] & 1)) for i in range(point_count)]
        out, first = [], 0
        for last in ends:
            out.append(points[first:last+1])
            first = last + 1
        return out

    @staticmethod
    def segments(contour):
        if not contour:
            return []
        first, last = contour[0], contour[-1]
        if first[2]:
            start = first
            seq = contour[1:]
        elif last[2]:
            start = last
            seq = contour[:-1]
        else:
            start = ((first[0]+last[0])/2, (first[1]+last[1])/2, True)
            seq = contour[:]
        segs = [("M", start[0], start[1])]
        i = 0
        while i < len(seq):
            p = seq[i]
            if p[2]:
                segs.append(("L", p[0], p[1])); i += 1
            else:
                nxt = seq[i+1] if i+1 < len(seq) else start
                if nxt[2]:
                    segs.append(("Q", p[0], p[1], nxt[0], nxt[1])); i += 2
                else:
                    mid = ((p[0]+nxt[0])/2, (p[1]+nxt[1])/2)
                    segs.append(("Q", p[0], p[1], mid[0], mid[1])); i += 1
        segs.append(("Z",))
        return segs


OUTLINER = TrueTypeOutliner(FONT)


def text_layout(text: str, font_size: float, tracking: float, center_x: float, baseline: float):
    scale = font_size / OUTLINER.units
    width = sum(OUTLINER.advance(ch)*scale for ch in text) + tracking * max(0, len(text)-1)
    x = center_x - width/2
    layout = []
    for ch in text:
        if ch != " ":
            layout.append((ch, x, baseline, scale))
        x += OUTLINER.advance(ch)*scale + tracking
    return layout


def glyph_svg(ch: str, x: float, baseline: float, scale: float, color: str) -> str:
    pieces = []
    for contour in OUTLINER.contours(ch):
        commands = []
        for seg in OUTLINER.segments(contour):
            if seg[0] in ("M", "L"):
                commands.append(f"{seg[0]} {seg[1]:.2f} {seg[2]:.2f}")
            elif seg[0] == "Q":
                commands.append(f"Q {seg[1]:.2f} {seg[2]:.2f} {seg[3]:.2f} {seg[4]:.2f}")
            else:
                commands.append("Z")
        pieces.append(" ".join(commands))
    d = " ".join(pieces)
    return f'<path d="{d}" transform="translate({x:.3f} {baseline:.3f}) scale({scale:.7f} {-scale:.7f})" fill="{color}"/>'


# ---------------------------------------------------------------------------
# Reconstructed vector geometry.
# ---------------------------------------------------------------------------

def frond_path(base, tip, width, bend=0.0, nodes=10):
    bx, by = base; tx, ty = tip
    dx, dy = tx-bx, ty-by
    length = math.hypot(dx,dy); ux,uy = dx/length,dy/length; px,py=-uy,ux
    left, right = [], []
    for i in range(nodes+1):
        t = i/nodes
        cx = bx + dx*t + px*bend*math.sin(math.pi*t)
        cy = by + dy*t + py*bend*math.sin(math.pi*t)
        envelope = math.sin(math.pi*min(1, t*1.08))**0.62 * (1-0.45*t)
        tooth = 1.0 if i in (0,nodes) or i%2 else 0.62
        # The supplied mark uses broad, feathered white palm silhouettes. The
        # width factor restores that mass while the alternating envelope keeps
        # a hand-cut serrated edge instead of a smooth spear shape.
        hw = width*1.75*envelope*tooth
        left.append((cx+px*hw,cy+py*hw)); right.append((cx-px*hw,cy-py*hw))
    pts = left + list(reversed(right))
    return "M " + " L ".join(f"{x:.2f} {y:.2f}" for x,y in pts) + " Z"


MAIN_TRUNK = "M 188 421 C 187 343 173 258 157 157 C 153 141 158 126 164 126 C 176 171 194 253 214 420 Z"
SMALL_TRUNK = "M 231 426 C 248 365 273 306 307 265 C 314 256 321 251 327 254 C 310 286 279 349 251 428 Z"

MAIN_FRONDS = [
    ((160,128),(80,89),8,-8), ((160,128),(104,52),9,-9), ((160,128),(149,20),10,-10),
    ((160,128),(226,24),9,10), ((160,128),(216,78),9,8), ((160,128),(284,75),9,10),
    ((160,128),(304,111),9,8), ((160,128),(276,162),10,8), ((160,128),(263,227),9,7),
    ((160,128),(220,196),8,5), ((160,128),(194,229),8,4), ((160,128),(151,218),8,-3),
    ((160,128),(112,211),8,-5), ((160,128),(84,236),7,-7), ((160,128),(84,176),9,-8),
    ((160,128),(74,125),9,-9),
]

SMALL_FRONDS = [
    ((323,255),(272,220),6,-5), ((323,255),(300,218),7,-5), ((323,255),(337,210),7,5),
    ((323,255),(384,225),7,6), ((323,255),(415,269),7,7), ((323,255),(390,288),7,6),
    ((323,255),(377,345),7,5), ((323,255),(348,333),6,4), ((323,255),(324,366),7,3),
    ((323,255),(296,351),7,-4), ((323,255),(270,333),7,-5), ((323,255),(255,302),7,-6),
    ((323,255),(267,269),7,-6),
]

ISLAND = "M 137 418 C 157 392 184 393 211 400 C 242 410 267 431 299 439 C 333 447 370 436 402 414 C 419 402 433 395 443 398 C 427 419 407 432 384 440 C 335 458 268 459 206 449 C 169 443 142 433 137 418 Z"
PERSON = "M 368 397 C 373 388 381 382 389 380 C 386 374 385 368 389 363 C 394 357 402 359 405 365 C 408 371 405 377 400 381 C 410 382 420 382 431 378 C 425 386 417 392 407 396 C 402 406 394 414 384 418 L 367 414 C 374 408 378 402 382 396 C 376 399 372 400 368 397 Z"
ARM = "M 397 365 C 404 356 409 347 412 336 C 416 345 415 355 409 366 Z"

SUN_SLASHES = [
    "M 302 80 C 319 67 336 62 352 61 C 338 70 324 79 310 91 Z",
    "M 371 67 C 391 70 403 76 414 84 C 397 79 385 78 368 79 Z",
    "M 394 102 C 420 98 433 99 446 103 C 427 111 410 114 391 115 Z",
    "M 397 145 C 421 139 437 139 449 143 C 431 152 414 157 394 158 Z",
    "M 384 174 C 406 165 425 162 440 164 C 422 177 405 184 383 187 Z",
]

BIRDS = [
    "M 260 48 C 267 43 273 44 278 50 C 283 44 289 42 296 45 C 288 48 282 54 278 61 C 274 55 268 51 260 48 Z",
    "M 304 58 C 313 50 321 51 327 58 C 333 51 342 48 350 52 C 340 55 332 62 327 70 C 321 63 314 59 304 58 Z",
    "M 290 91 C 298 84 306 85 311 92 C 317 86 324 84 332 88 C 323 91 316 97 311 104 C 306 98 300 94 290 91 Z",
]


def palm_paths(fronds):
    return [frond_path(*args) for args in fronds]


MAIN_PALM = [MAIN_TRUNK] + palm_paths(MAIN_FRONDS)
SMALL_PALM = [SMALL_TRUNK] + palm_paths(SMALL_FRONDS)


OCEAN_LAYERS = [
    ("M 0 115 L 579 115 L 579 164 C 470 152 383 163 290 155 C 194 147 104 161 0 151 Z", "deep_blue"),
    ("M 0 149 C 96 134 191 159 289 146 C 389 133 480 158 579 142 L 579 205 C 471 188 386 205 290 193 C 191 182 96 201 0 188 Z", "cobalt"),
    ("M 0 184 C 80 167 166 196 252 179 C 351 160 454 199 579 169 L 579 233 C 472 217 383 240 279 221 C 178 203 92 236 0 215 Z", "aqua"),
    ("M 0 208 C 99 194 184 225 278 207 C 389 184 476 229 579 201 L 579 270 C 483 245 385 274 284 252 C 190 232 92 263 0 244 Z", "ocean"),
    ("M 0 244 C 81 221 174 259 261 239 C 364 216 457 261 579 229 L 579 303 C 467 277 377 310 275 286 C 177 263 89 303 0 278 Z", "cobalt"),
    ("M 0 278 C 91 251 183 291 276 271 C 375 249 477 290 579 263 L 579 332 C 472 310 386 339 281 319 C 181 299 93 333 0 313 Z", "deep_blue"),
    ("M 0 309 C 88 286 181 321 270 305 C 371 286 464 323 579 294 L 579 362 C 481 339 389 370 285 350 C 183 331 92 368 0 348 Z", "ocean"),
    ("M 0 349 C 96 322 189 362 279 344 C 381 323 470 365 579 338 L 579 403 C 478 381 388 410 287 390 C 185 370 91 406 0 386 Z", "cobalt"),
    ("M 0 386 C 96 359 185 399 276 379 C 378 358 473 402 579 371 L 579 441 C 474 416 382 449 280 427 C 181 406 91 441 0 422 Z", "deep_blue"),
    ("M 0 423 C 103 396 190 439 285 416 C 387 392 479 442 579 407 L 579 468 C 478 448 383 473 283 454 C 185 435 91 467 0 451 Z", "ocean"),
    ("M 0 458 C 95 439 184 466 276 450 C 381 431 475 469 579 443 L 579 488 L 0 488 Z", "shore"),
]

FOAM_LINES = [
    "M 16 176 C 87 157 140 184 207 170 C 266 157 319 172 370 161",
    "M 244 225 C 327 204 389 232 472 211 C 514 201 548 202 572 196",
    "M 14 287 C 81 269 145 297 215 280 C 280 263 339 287 397 271",
    "M 178 347 C 245 328 306 351 369 335 C 429 320 491 337 560 319",
    "M 23 407 C 90 389 151 413 218 397 C 278 382 331 403 386 388",
    "M 288 452 C 369 434 432 455 503 440 C 532 434 553 433 570 428",
]


def path_tokens(d: str):
    return re.findall(r"[MLCQZmlcqz]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?", d)


def svg_path_pdf(pdf: canvas.Canvas, d: str, color: CMYKColor, page_h=H, stroke=False, width=1.0):
    t = path_tokens(d); i=0; cmd=None; cx=cy=0.0
    p = pdf.beginPath()
    while i < len(t):
        if t[i].isalpha(): cmd=t[i].upper(); i+=1
        if cmd == "M":
            cx,cy=float(t[i]),float(t[i+1]); i+=2; p.moveTo(cx,page_h-cy); cmd="L"
        elif cmd == "L":
            cx,cy=float(t[i]),float(t[i+1]); i+=2; p.lineTo(cx,page_h-cy)
        elif cmd == "C":
            x1,y1,x2,y2,x3,y3=map(float,t[i:i+6]); i+=6
            p.curveTo(x1,page_h-y1,x2,page_h-y2,x3,page_h-y3); cx,cy=x3,y3
        elif cmd == "Q":
            qx,qy,x2,y2=map(float,t[i:i+4]); i+=4
            c1x=cx+2*(qx-cx)/3; c1y=cy+2*(qy-cy)/3
            c2x=x2+2*(qx-x2)/3; c2y=y2+2*(qy-y2)/3
            p.curveTo(c1x,page_h-c1y,c2x,page_h-c2y,x2,page_h-y2); cx,cy=x2,y2
        elif cmd == "Z":
            p.close(); cmd=None
        else:
            raise ValueError(f"Unsupported path command in {d}")
    if stroke:
        pdf.setStrokeColor(color); pdf.setLineWidth(width); pdf.setLineCap(1)
        pdf.drawPath(p,fill=0,stroke=1)
    else:
        pdf.setFillColor(color); pdf.drawPath(p,fill=1,stroke=0,fillMode=1)


def draw_outlined_text(pdf, text, size, tracking, center_x, baseline, color, page_h=H):
    pdf.setFillColor(color)
    for ch,x,base,scale in text_layout(text,size,tracking,center_x,baseline):
        p=pdf.beginPath()
        for contour in OUTLINER.contours(ch):
            cx=cy=0.0
            for seg in OUTLINER.segments(contour):
                if seg[0]=="M": cx,cy=seg[1],seg[2]; p.moveTo(x+cx*scale,page_h-(base-cy*scale))
                elif seg[0]=="L": cx,cy=seg[1],seg[2]; p.lineTo(x+cx*scale,page_h-(base-cy*scale))
                elif seg[0]=="Q":
                    qx,qy,ex,ey=seg[1:]
                    c1x=cx+2*(qx-cx)/3; c1y=cy+2*(qy-cy)/3
                    c2x=ex+2*(qx-ex)/3; c2y=ey+2*(qy-ey)/3
                    p.curveTo(x+c1x*scale,page_h-(base-c1y*scale),x+c2x*scale,page_h-(base-c2y*scale),x+ex*scale,page_h-(base-ey*scale)); cx,cy=ex,ey
                else: p.close()
        pdf.drawPath(p,fill=1,stroke=0,fillMode=1)


def draw_logo_pdf(pdf, variant="primary", page_h=H):
    full_bg = variant in ("primary","monochrome","reverse")
    if variant == "primary":
        pdf.setFillColor(ink("sky")); pdf.rect(0,page_h-115,W,115,fill=1,stroke=0)
        pdf.setFillColor(ink("ocean")); pdf.rect(0,page_h-488,W,373,fill=1,stroke=0)
        for d,c in OCEAN_LAYERS: svg_path_pdf(pdf,d,ink(c),page_h)
        for d in FOAM_LINES: svg_path_pdf(pdf,d,ink("aqua"),page_h,True,2.2)
        panel="panel"; mark="white"; sun="sun"; slash="panel"; text="white"
    elif variant == "monochrome":
        pdf.setFillColor(ink("gray2")); pdf.rect(0,page_h-488,W,488,fill=1,stroke=0)
        for d,_ in OCEAN_LAYERS: svg_path_pdf(pdf,d,ink("gray2"),page_h)
        panel="black"; mark="white"; sun="gray1"; slash="black"; text="white"
    elif variant == "reverse":
        pdf.setFillColor(ink("deep_blue")); pdf.rect(0,0,W,page_h,fill=1,stroke=0)
        panel=None; mark="white"; sun="sun"; slash="deep_blue"; text="white"
    elif variant == "black":
        panel=None; mark=sun=slash=text="black"
    elif variant == "white":
        panel=None; mark=sun=slash=text="white"
    elif variant == "gold":
        panel=None; mark=sun=slash=text="gold"
    elif variant == "transparent":
        panel=None; mark="deep_blue"; sun="sun"; slash="deep_blue"; text="deep_blue"
    else: raise ValueError(variant)

    pdf.setFillColor(ink(sun)); pdf.circle(362,page_h-128,82,fill=1,stroke=0)
    for d in SUN_SLASHES: svg_path_pdf(pdf,d,ink(slash),page_h)
    for d in BIRDS+MAIN_PALM+SMALL_PALM+[ISLAND,PERSON,ARM]: svg_path_pdf(pdf,d,ink(mark),page_h)
    if panel:
        pdf.setFillColor(ink(panel)); pdf.rect(0,0,W,page_h-488,fill=1,stroke=0)
    draw_outlined_text(pdf,"ATICAN BEACH",52,0.7,W/2,554,ink(text),page_h)
    draw_outlined_text(pdf,"RESORT & HOTEL",42,0.15,W/2,612,ink(text),page_h)


def svg_logo(variant="primary"):
    full = []
    if variant == "primary":
        full += [f'<rect width="579" height="115" fill="{hx("sky")}"/>', f'<rect y="115" width="579" height="373" fill="{hx("ocean")}"/>']
        full += [f'<path d="{d}" fill="{hx(c)}"/>' for d,c in OCEAN_LAYERS]
        full += [f'<path d="{d}" fill="none" stroke="{hx("aqua")}" stroke-width="2.2" stroke-linecap="round"/>' for d in FOAM_LINES]
        panel="panel"; mark="white"; sun="sun"; slash="panel"; text="white"
    elif variant == "monochrome":
        full += [f'<rect width="579" height="488" fill="{hx("gray2")}"/>']
        full += [f'<path d="{d}" fill="{hx("gray2")}"/>' for d,_ in OCEAN_LAYERS]
        panel="black"; mark="white"; sun="gray1"; slash="black"; text="white"
    elif variant == "reverse":
        full += [f'<rect width="579" height="641" fill="{hx("deep_blue")}"/>']
        panel=None; mark="white"; sun="sun"; slash="deep_blue"; text="white"
    elif variant == "black": panel=None; mark=sun=slash=text="black"
    elif variant == "white": panel=None; mark=sun=slash=text="white"
    elif variant == "gold": panel=None; mark=sun=slash=text="gold"
    elif variant == "transparent": panel=None; mark="deep_blue"; sun="sun"; slash="deep_blue"; text="deep_blue"
    else: raise ValueError(variant)
    full.append(f'<circle cx="362" cy="128" r="82" fill="{hx(sun)}"/>')
    full += [f'<path d="{d}" fill="{hx(slash)}"/>' for d in SUN_SLASHES]
    full += [f'<path d="{d}" fill="{hx(mark)}"/>' for d in BIRDS+MAIN_PALM+SMALL_PALM+[ISLAND,PERSON,ARM]]
    if panel: full.append(f'<rect y="488" width="579" height="153" fill="{hx(panel)}"/>')
    for args in [("ATICAN BEACH",52,0.7,W/2,554),("RESORT & HOTEL",42,0.15,W/2,612)]:
        for ch,x,b,s in text_layout(*args): full.append(glyph_svg(ch,x,b,s,hx(text)))
    meta = "; ".join(f'{k}: {v["hex"]}, RGB {v["rgb"]}, CMYK {v["cmyk"]}, {v["pantone"]}' for k,v in COLORS.items() if k in ("sky","ocean","aqua","deep_blue","panel","sun","white"))
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="579mm" height="641mm" viewBox="0 0 579 641" role="img" aria-labelledby="title desc">
<title id="title">Atican Beach Resort and Hotel - {esc(variant.title())}</title>
<desc id="desc">Manual vector reconstruction. No raster images, live fonts, clipping masks, or embedded bitmaps. {esc(meta)}</desc>
<metadata>Reconstruction V1.0. Source reference 579x641 JPEG. SVG previews in RGB; use CMYK PDF/EPS for press.</metadata>
<g shape-rendering="geometricPrecision">{''.join(full)}</g>
</svg>'''


def build_pdf(path: Path, variant="primary"):
    path.parent.mkdir(parents=True,exist_ok=True)
    pdf=canvas.Canvas(str(path),pagesize=(W,H),pageCompression=1,pdfVersion=(1,4))
    pdf.setTitle(f"Atican Beach Resort & Hotel - {variant.title()} Vector Master")
    pdf.setAuthor("Atican Beach Resort & Hotel")
    pdf.setSubject("Manual CMYK vector reconstruction V1.0")
    draw_logo_pdf(pdf,variant,H); pdf.showPage(); pdf.save()


def ps_setcolor(name):
    c,m,y,k=COLORS[name]["cmyk"]; return f"{c/100:.4f} {m/100:.4f} {y/100:.4f} {k/100:.4f} setcmykcolor"


def ps_path(d: str):
    t=path_tokens(d); i=0; cmd=None; cx=cy=0.0; out=[]
    while i<len(t):
        if t[i].isalpha(): cmd=t[i].upper(); i+=1
        if cmd=="M": cx,cy=float(t[i]),float(t[i+1]);i+=2;out.append(f"{cx:.3f} {H-cy:.3f} moveto");cmd="L"
        elif cmd=="L": cx,cy=float(t[i]),float(t[i+1]);i+=2;out.append(f"{cx:.3f} {H-cy:.3f} lineto")
        elif cmd=="C":
            x1,y1,x2,y2,x3,y3=map(float,t[i:i+6]);i+=6;out.append(f"{x1:.3f} {H-y1:.3f} {x2:.3f} {H-y2:.3f} {x3:.3f} {H-y3:.3f} curveto");cx,cy=x3,y3
        elif cmd=="Q":
            qx,qy,ex,ey=map(float,t[i:i+4]);i+=4;c1x=cx+2*(qx-cx)/3;c1y=cy+2*(qy-cy)/3;c2x=ex+2*(qx-ex)/3;c2y=ey+2*(qy-ey)/3;out.append(f"{c1x:.3f} {H-c1y:.3f} {c2x:.3f} {H-c2y:.3f} {ex:.3f} {H-ey:.3f} curveto");cx,cy=ex,ey
        elif cmd=="Z": out.append("closepath");cmd=None
    return "\n".join(out)


def ps_text(text,size,tracking,center_x,baseline):
    out=[]
    for ch,x,b,s in text_layout(text,size,tracking,center_x,baseline):
        for contour in OUTLINER.contours(ch):
            cx=cy=0.0
            for seg in OUTLINER.segments(contour):
                if seg[0]=="M": cx,cy=seg[1],seg[2];out.append(f"{x+cx*s:.3f} {H-(b-cy*s):.3f} moveto")
                elif seg[0]=="L": cx,cy=seg[1],seg[2];out.append(f"{x+cx*s:.3f} {H-(b-cy*s):.3f} lineto")
                elif seg[0]=="Q":
                    qx,qy,ex,ey=seg[1:];c1x=cx+2*(qx-cx)/3;c1y=cy+2*(qy-cy)/3;c2x=ex+2*(qx-ex)/3;c2y=ey+2*(qy-ey)/3
                    out.append(f"{x+c1x*s:.3f} {H-(b-c1y*s):.3f} {x+c2x*s:.3f} {H-(b-c2y*s):.3f} {x+ex*s:.3f} {H-(b-ey*s):.3f} curveto");cx,cy=ex,ey
                else: out.append("closepath")
    return "\n".join(out)


def build_eps(path: Path, ai=False):
    path.parent.mkdir(parents=True,exist_ok=True)
    out=["%!PS-Adobe-3.0 EPSF-3.0","%%BoundingBox: 0 0 579 641","%%HiResBoundingBox: 0 0 579 641","%%Title: Atican Beach Resort & Hotel Master Vector","%%Creator: Atican Reconstruction V1.0"]
    if ai: out += ["%%AI5_FileFormat 3.0","%%DocumentProcessColors: Cyan Magenta Yellow Black"]
    out += ["%%Pages: 1","%%EndComments","gsave"]
    out += [ps_setcolor("sky"),"0 526 579 115 rectfill",ps_setcolor("ocean"),"0 153 579 373 rectfill"]
    for d,c in OCEAN_LAYERS: out += ["newpath",ps_path(d),ps_setcolor(c),"eofill"]
    for d in FOAM_LINES: out += ["newpath",ps_path(d),ps_setcolor("aqua"),"2.2 setlinewidth 1 setlinecap stroke"]
    out += [ps_setcolor("sun"),"newpath 362 513 82 0 360 arc fill"]
    for d in SUN_SLASHES: out += ["newpath",ps_path(d),ps_setcolor("panel"),"eofill"]
    for d in BIRDS+MAIN_PALM+SMALL_PALM+[ISLAND,PERSON,ARM]: out += ["newpath",ps_path(d),ps_setcolor("white"),"eofill"]
    out += [ps_setcolor("panel"),"0 0 579 153 rectfill",ps_setcolor("white"),"newpath",ps_text("ATICAN BEACH",52,0.7,W/2,554),"eofill","newpath",ps_text("RESORT & HOTEL",42,0.15,W/2,612),"eofill","grestore","showpage","%%EOF"]
    path.write_text("\n".join(out),encoding="ascii",errors="ignore")


def draw_logo_scaled(pdf,x,y,w,h,variant="primary"):
    pdf.saveState(); pdf.translate(x,y); pdf.scale(w/W,h/H); draw_logo_pdf(pdf,variant,H); pdf.restoreState()


def build_guidelines(path: Path):
    PW,PH=landscape(A4); pdf=canvas.Canvas(str(path),pagesize=(PW,PH),pageCompression=1)
    def title(text,sub=None):
        pdf.setFillColor(ink("deep_blue"));pdf.setFont("Helvetica-Bold",26);pdf.drawString(42,PH-56,text)
        if sub: pdf.setFillColor(ink("gray2"));pdf.setFont("Helvetica",10);pdf.drawString(44,PH-74,sub)
    def footer(n):
        pdf.setStrokeColor(ink("gray1"));pdf.line(42,30,PW-42,30);pdf.setFillColor(ink("gray2"));pdf.setFont("Helvetica",8);pdf.drawString(42,17,"ATICAN BEACH RESORT & HOTEL - BRAND RECONSTRUCTION V1.0");pdf.drawRightString(PW-42,17,str(n))
    # Cover
    pdf.setFillColor(ink("deep_blue"));pdf.rect(0,0,PW,PH,fill=1,stroke=0);pdf.setFillColor(ink("sun"));pdf.rect(0,0,18,PH,fill=1,stroke=0)
    draw_logo_scaled(pdf,64,92,300,332,"primary");pdf.setFillColor(ink("white"));pdf.setFont("Helvetica-Bold",28);pdf.drawString(405,330,"MASTER VECTOR");pdf.drawString(405,292,"BRAND GUIDELINES")
    pdf.setFillColor(ink("aqua"));pdf.setFont("Helvetica-Bold",14);pdf.drawString(407,248,"RECONSTRUCTION SPECIFICATION V1.0")
    pdf.setFillColor(ink("white"));pdf.setFont("Helvetica",10);pdf.drawString(407,215,"Corporate identity production manual");pdf.drawString(407,198,"Digital, print, environmental and merchandise use")
    pdf.showPage()
    # Master
    title("01  Master identity","The primary portrait lockup preserves the supplied composition and hierarchy.")
    draw_logo_scaled(pdf,54,74,290,321,"primary")
    pdf.setFillColor(ink("panel"));pdf.setFont("Helvetica-Bold",13);pdf.drawString(392,430,"PRIMARY MASTER")
    body=["Use the full-colour master whenever the original ocean setting is appropriate.","All master lettering is converted to vector outlines.","No raster images, clipping masks or embedded bitmap layers are used.","Keep the artwork proportional. Never stretch, rotate, crop or rearrange elements."]
    pdf.setFont("Helvetica",10);y=404
    for line in body: pdf.drawString(392,y,line);y-=25
    pdf.setStrokeColor(ink("sun"));pdf.setLineWidth(1.5);pdf.rect(42,58,314,349,fill=0,stroke=1)
    pdf.setFillColor(ink("gray2"));pdf.setFont("Helvetica-Bold",10);pdf.drawString(392,274,"CLEAR SPACE")
    pdf.setFont("Helvetica",9);pdf.drawString(392,256,"Minimum clear space = the cap-height of the letter A (X) on every side.")
    pdf.drawString(392,239,"Do not place text, trim edges or competing graphics inside this zone.")
    pdf.setFont("Helvetica-Bold",10);pdf.drawString(392,202,"MINIMUM SIZE")
    pdf.setFont("Helvetica",9);pdf.drawString(392,184,"Print full lockup: 30 mm wide minimum.");pdf.drawString(392,168,"Digital full lockup: 180 px wide minimum.");pdf.drawString(392,152,"Below 48 px, use the approved favicon crop without wordmark.")
    footer(2);pdf.showPage()
    # Colours
    title("02  Official colours","Values are normalized from the supplied compressed artwork; Pantone matches are visual approximations.")
    names=["sun","sky","ocean","cobalt","aqua","deep_blue","panel","white"]
    x0,y0=52,438
    for i,name in enumerate(names):
        col=i%4;row=i//4;x=x0+col*194;y=y0-row*190
        pdf.setFillColor(ink(name));pdf.rect(x,y,154,64,fill=1,stroke=0)
        v=COLORS[name];c,m,yy,k=v["cmyk"];r,g,b=v["rgb"]
        pdf.setFillColor(ink("panel"));pdf.setFont("Helvetica-Bold",10);pdf.drawString(x,y-18,name.replace("_"," ").upper())
        pdf.setFont("Helvetica",8);pdf.drawString(x,y-34,f'HEX {v["hex"]}   RGB {r}/{g}/{b}');pdf.drawString(x,y-48,f"CMYK {c}/{m}/{yy}/{k}");pdf.drawString(x,y-62,v["pantone"])
    pdf.setFillColor(ink("gray2"));pdf.setFont("Helvetica",8);pdf.drawString(52,66,"Always proof Pantone and CMYK output against a calibrated physical swatch and the printer's substrate/profile.")
    footer(3);pdf.showPage()
    # Variations
    title("03  Approved variations","Select the version that preserves maximum contrast and recognition.")
    variants=[("PRIMARY","primary","white"),("REVERSE","reverse","white"),("BLACK","black","white"),("GOLD","gold","white")]
    for i,(label,var,bg) in enumerate(variants):
        x=48+(i%2)*390;y=314-(i//2)*238
        pdf.setFillColor(ink(bg));pdf.rect(x,y,350,190,fill=1,stroke=0)
        if var in ("black","gold"):
            # Give transparent variants a neutral proof background.
            pdf.setStrokeColor(ink("gray1"));pdf.rect(x,y,350,190,fill=0,stroke=1)
        draw_logo_scaled(pdf,x+90,y+15,170,188,var)
        pdf.setFillColor(ink("panel"));pdf.setFont("Helvetica-Bold",9);pdf.drawString(x,y-15,label)
    footer(4);pdf.showPage()
    # Usage
    title("04  Correct and incorrect usage","Brand consistency depends on preserving geometry, contrast and hierarchy.")
    pdf.setFillColor(ink("deep_blue"));pdf.roundRect(48,292,350,216,8,fill=1,stroke=0);draw_logo_scaled(pdf,142,304,162,180,"reverse")
    pdf.setFillColor(ink("aqua"));pdf.setFont("Helvetica-Bold",11);pdf.drawString(48,270,"CORRECT: approved reverse artwork on brand navy")
    bad=["Do not stretch or condense.","Do not recolour individual elements.","Do not add effects, shadows or outlines.","Do not alter typography or spacing.","Do not place on low-contrast imagery.","Do not crop the full lockup except for the favicon asset."]
    pdf.setFillColor(ink("sun"));pdf.setFont("Helvetica-Bold",44);pdf.drawString(450,448,"X")
    pdf.setFillColor(ink("panel"));pdf.setFont("Helvetica-Bold",13);pdf.drawString(506,463,"PROHIBITED")
    pdf.setFont("Helvetica",10);y=430
    for line in bad: pdf.drawString(450,y,"- "+line);y-=31
    footer(5);pdf.showPage()
    # Production
    title("05  Production and accessibility","Use the master format suited to the reproduction process.")
    cols=[
        (52,"PRINT","Use CMYK PDF or EPS. Confirm bleed in the final layout, not in the logo file. For signage and wraps, scale the vector master. For embroidery, digitize from the Black or White version and proof stitch density."),
        (298,"DIGITAL","Use SVG where supported. Use PNG for social, email and booking platforms. Use the favicon package below 48 px. Keep sufficient contrast against backgrounds and preserve clear space."),
        (544,"ACCESSIBILITY","Maintain at least 4.5:1 contrast for adjacent text in applications. The logo wordmark is artwork, not a replacement for accessible HTML text. Include the business name as alt text."),
    ]
    for x,head,body in cols:
        pdf.setFillColor(ink("sun"));pdf.rect(x,427,208,42,fill=1,stroke=0);pdf.setFillColor(ink("white"));pdf.setFont("Helvetica-Bold",12);pdf.drawString(x+14,443,head)
        pdf.setFillColor(ink("panel"));pdf.setFont("Helvetica",9);words=body.split();line="";y=405
        for word in words:
            test=(line+" "+word).strip()
            if pdf.stringWidth(test,"Helvetica",9)>190:
                pdf.drawString(x,y,line);y-=15;line=word
            else: line=test
        if line: pdf.drawString(x,y,line)
    pdf.setFillColor(ink("deep_blue"));pdf.roundRect(52,90,700,110,8,fill=1,stroke=0);pdf.setFillColor(ink("white"));pdf.setFont("Helvetica-Bold",11);pdf.drawString(70,170,"RECONSTRUCTION PROVENANCE")
    note="The only supplied authority was a 579 x 641 compressed JPEG. Geometry, font identity, photographic ocean detail and spot inks cannot be recovered as original mathematical data from that file. This V1.0 package is a manual production reconstruction and must be approved by the trademark owner before designation as the permanent legal master."
    pdf.setFont("Helvetica",8.5);words=note.split();line="";y=149
    for word in words:
        test=(line+" "+word).strip()
        if pdf.stringWidth(test,"Helvetica",8.5)>662: pdf.drawString(70,y,line);y-=14;line=word
        else: line=test
    if line: pdf.drawString(70,y,line)
    footer(6);pdf.showPage();pdf.save()


def write_readme():
    text="""ATICAN BEACH RESORT & HOTEL - MASTER BRAND ASSETS V1.0

Primary source: supplied 579 x 641 WhatsApp JPEG.
Construction: manual vector reconstruction; no source raster is embedded.

PRESS
- Use Master Logo/Print PDF for CMYK commercial printing.
- EPS and the EPS-based Illustrator-compatible .AI file retain editable paths.
- Standard SVG is RGB by specification; CMYK recipes are embedded in metadata and documented in the brand guide.
- Add bleed only in the final banner/sign/layout document, not to the logo master.

IMPORTANT APPROVAL NOTE
The low-resolution compressed source cannot reveal the original font file, original Bezier nodes, source photograph, ICC profile or legal Pantone specification. This reconstruction must be reviewed and approved by the trademark owner and production printer before being declared the permanent legal master.
"""
    (PACKAGE/"README.txt").write_text(text,encoding="utf-8")


def render_png(pdf: Path, target: Path, width: int):
    target.parent.mkdir(parents=True,exist_ok=True)
    prefix=target.with_suffix("")
    subprocess.run([str(POPPLER),"-png","-singlefile","-scale-to-x",str(width),"-scale-to-y","-1",str(pdf),str(prefix)],check=True)
    produced=prefix.with_suffix(".png")
    if produced != target: produced.replace(target)


def build_icon_pdf(path: Path):
    size=512;pdf=canvas.Canvas(str(path),pagesize=(size,size),pageCompression=1)
    pdf.setFillColor(ink("deep_blue"));pdf.rect(0,0,size,size,fill=1,stroke=0)
    pdf.saveState();pdf.translate(-20,-5);pdf.scale(0.9,0.9)
    pdf.setFillColor(ink("sun"));pdf.circle(390,512-140,90,fill=1,stroke=0)
    for d in SUN_SLASHES: svg_path_pdf(pdf,d,ink("deep_blue"),512)
    for d in MAIN_PALM+[ISLAND]: svg_path_pdf(pdf,d,ink("white"),512)
    pdf.restoreState();pdf.showPage();pdf.save()


def build_white_key_pdf(path: Path):
    """Proof pure-white artwork over magenta for lossless alpha recovery."""
    pdf=canvas.Canvas(str(path),pagesize=(W,H),pageCompression=1)
    pdf.setFillColor(CMYKColor(0,1,0,0));pdf.rect(0,0,W,H,fill=1,stroke=0)
    draw_logo_pdf(pdf,"white",H);pdf.showPage();pdf.save()


def validate():
    master_svg=PACKAGE/"Master Logo"/"SVG"/"Atican_Beach_Master_Full_Colour.svg"
    data=master_svg.read_text(encoding="utf-8")
    if "<image" in data or "data:image" in data or "<text" in data: raise RuntimeError("Master SVG contains prohibited raster/live-text content")
    pdf=PdfReader(str(PACKAGE/"Master Logo"/"Print PDF"/"Atican_Beach_Master_CMYK.pdf"))
    stream=pdf.pages[0].get_contents().get_data()
    if stream.count(b" k") < 20: raise RuntimeError("CMYK operators missing")


def main():
    if PACKAGE.exists(): shutil.rmtree(PACKAGE)
    PACKAGE.mkdir(parents=True);TMP.mkdir(parents=True,exist_ok=True)
    master_svg=PACKAGE/"Master Logo"/"SVG"/"Atican_Beach_Master_Full_Colour.svg"
    master_svg.parent.mkdir(parents=True);master_svg.write_text(svg_logo("primary"),encoding="utf-8")
    master_pdf=PACKAGE/"Master Logo"/"Print PDF"/"Atican_Beach_Master_CMYK.pdf";build_pdf(master_pdf,"primary")
    build_eps(PACKAGE/"Master Logo"/"EPS"/"Atican_Beach_Master_CMYK.eps")
    build_eps(PACKAGE/"Master Logo"/"AI"/"Atican_Beach_Master_Illustrator_Compatible.ai",ai=True)

    variations={"Black":"black","White":"white","Gold":"gold","Monochrome":"monochrome","Reverse":"reverse","Transparent Background":"transparent"}
    for folder,var in variations.items():
        base=PACKAGE/folder;base.mkdir(parents=True)
        (base/f"Atican_Beach_{folder.replace(' ','_')}.svg").write_text(svg_logo(var),encoding="utf-8")
        build_pdf(base/f"Atican_Beach_{folder.replace(' ','_')}.pdf",var)

    # Primary PNGs at requested widths.
    for size in (500,1000,2000,4000,8000):
        render_png(master_pdf,PACKAGE/"PNG"/str(size)/f"Atican_Beach_Primary_{size}px.png",size)
    im=Image.open(PACKAGE/"PNG"/"8000"/"Atican_Beach_Primary_8000px.png").convert("RGB")
    jpg=PACKAGE/"JPG"/"Atican_Beach_Primary_8000px.jpg";jpg.parent.mkdir(parents=True);im.save(jpg,"JPEG",quality=95,subsampling=0,optimize=True,dpi=(300,300));im.close()

    # Variation proofs, 2000 px. Transparent version is navy/orange on alpha.
    for folder,var in variations.items():
        base=PACKAGE/folder;pdf=base/f"Atican_Beach_{folder.replace(' ','_')}.pdf"
        png=base/f"Atican_Beach_{folder.replace(' ','_')}_2000px.png";render_png(pdf,png,2000)
        if var == "white":
            key_pdf=TMP/"white_alpha_key.pdf";build_white_key_pdf(key_pdf);render_png(key_pdf,png,2000)
            keyed=Image.open(png).convert("RGB");_,alpha,_=keyed.split()
            white=Image.new("L",keyed.size,255)
            Image.merge("RGBA",(white,white,white,alpha)).save(png,optimize=True)
        if var in ("black","gold","transparent"):
            rgba=Image.open(png).convert("RGBA");pix=rgba.load()
            for yy in range(rgba.height):
                for xx in range(rgba.width):
                    r,g,b,a=pix[xx,yy]
                    if r>250 and g>250 and b>250: pix[xx,yy]=(255,255,255,0)
            rgba.save(png,optimize=True)

    # Favicon crop.
    icon_pdf=TMP/"Atican_Favicon_Master.pdf";build_icon_pdf(icon_pdf)
    icon512=PACKAGE/"Favicon Package"/"favicon-512x512.png";render_png(icon_pdf,icon512,512)
    icon=Image.open(icon512).convert("RGBA")
    for size in (16,32,48,64,180,192): icon.resize((size,size),Image.Resampling.LANCZOS).save(PACKAGE/"Favicon Package"/f"favicon-{size}x{size}.png",optimize=True)
    icon.save(PACKAGE/"Favicon Package"/"favicon.ico",format="ICO",sizes=[(16,16),(32,32),(48,48),(64,64)])
    (PACKAGE/"Favicon Package"/"favicon.svg").write_text(svg_logo("reverse"),encoding="utf-8")

    guide=PACKAGE/"Brand Guidelines"/"Atican_Beach_Brand_Guidelines_V1.0.pdf";guide.parent.mkdir(parents=True);build_guidelines(guide)
    with (PACKAGE/"Brand Guidelines"/"Official_Colour_Specifications.csv").open("w",newline="",encoding="utf-8-sig") as f:
        w=csv.writer(f);w.writerow(["Colour","HEX","RGB","CMYK","Pantone approximation"])
        for name,v in COLORS.items(): w.writerow([name.replace("_"," ").title(),v["hex"],"/".join(map(str,v["rgb"])),"/".join(map(str,v["cmyk"])),v["pantone"]])
    write_readme();validate()
    print(PACKAGE)


if __name__=="__main__": main()
