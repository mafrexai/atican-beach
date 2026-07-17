"""Generate the Atican Beach vector master and a CMYK press PDF.

The artwork is a clean redraw inspired by the supplied raster reference.  It does
not embed the source JPEG.  All illustration elements are paths, polygons,
rectangles, or circles.  The SVG keeps the wordmark editable; the press PDF
embeds Arial Bold so the printer does not need the local font.
"""

from __future__ import annotations

import html
import math
from pathlib import Path

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.colors import CMYKColor


ROOT = Path(__file__).resolve().parents[1]
SVG_OUT = ROOT / "output" / "vector" / "aticanbeach_logo_vector.svg"
PDF_OUT = ROOT / "output" / "pdf" / "aticanbeach_logo_CMYK.pdf"

W, H = 900.0, 1000.0

# Production recipes. RGB values are only screen previews of the CMYK inks.
COLORS = {
    "deep_navy": ("#001E4B", (100, 85, 35, 35)),
    "ocean_blue": ("#0070A8", (100, 55, 15, 5)),
    "aqua": ("#00A6B8", (85, 20, 25, 0)),
    "sea_dark": ("#003C6E", (100, 75, 25, 20)),
    "panel": ("#001017", (100, 80, 40, 85)),
    "sun": ("#F24B1A", (0, 78, 100, 0)),
    "white": ("#FFFFFF", (0, 0, 0, 0)),
}


def rgb(name: str) -> str:
    return COLORS[name][0]


def cmyk(name: str) -> CMYKColor:
    c, m, y, k = COLORS[name][1]
    # CMYKColor uses unit values (0.0-1.0), while our production recipes are
    # stored as printer-friendly percentages.
    return CMYKColor(c / 100, m / 100, y / 100, k / 100)


def fmt(value: float) -> str:
    return f"{value:.2f}".rstrip("0").rstrip(".")


def polygon_d(points: list[tuple[float, float]]) -> str:
    return "M " + " L ".join(f"{fmt(x)} {fmt(y)}" for x, y in points) + " Z"


def frond_points(
    base: tuple[float, float],
    tip: tuple[float, float],
    width: float,
    teeth: int = 9,
    bend: float = 0.0,
) -> list[tuple[float, float]]:
    """Return a tapered, gently curved palm frond silhouette."""
    bx, by = base
    tx, ty = tip
    dx, dy = tx - bx, ty - by
    length = math.hypot(dx, dy)
    ux, uy = dx / length, dy / length
    px, py = -uy, ux
    left: list[tuple[float, float]] = []
    right: list[tuple[float, float]] = []
    for i in range(teeth + 1):
        t = i / teeth
        cx = bx + dx * t + px * bend * math.sin(math.pi * t)
        cy = by + dy * t + py * bend * math.sin(math.pi * t)
        taper = (math.sin(math.pi * min(t * 1.12, 1.0)) ** 0.7) * (1 - 0.32 * t)
        # A smooth lanceolate blade reads more clearly than tiny serrations in
        # large-format output and avoids the crown resembling a maple leaf.
        half = width * taper
        left.append((cx + px * half, cy + py * half))
        right.append((cx - px * half, cy - py * half))
    return left + list(reversed(right))


def svg_polygon(points: list[tuple[float, float]], fill: str) -> str:
    return f'<path d="{polygon_d(points)}" fill="{fill}"/>'


def palm_svg(
    crown: tuple[float, float],
    trunk_bottom: tuple[float, float],
    scale: float,
    fill: str,
) -> list[str]:
    cx, cy = crown
    bx, by = trunk_bottom
    s = scale
    out = []
    # Curved, tapered trunk.
    out.append(
        f'<path d="M {fmt(bx-15*s)} {fmt(by)} '
        f'C {fmt(bx-8*s)} {fmt(by-120*s)}, {fmt(cx-25*s)} {fmt(cy+100*s)}, {fmt(cx-11*s)} {fmt(cy)} '
        f'L {fmt(cx+12*s)} {fmt(cy)} '
        f'C {fmt(cx+4*s)} {fmt(cy+105*s)}, {fmt(bx+18*s)} {fmt(by-120*s)}, {fmt(bx+20*s)} {fmt(by)} Z" fill="{fill}"/>'
    )
    fronds = [
        ((-142, -52), 25, -18),
        ((-112, -98), 24, -22),
        ((-45, -135), 25, -18),
        ((32, -148), 24, 18),
        ((112, -112), 23, 20),
        ((142, -48), 24, 18),
        ((126, 24), 25, 16),
        ((70, 78), 23, 14),
        ((-82, 55), 22, -15),
        ((-135, 12), 23, -16),
    ]
    for (ox, oy), width, bend in fronds:
        pts = frond_points((cx, cy), (cx + ox * s, cy + oy * s), width * 0.55 * s, 12, bend * s)
        out.append(svg_polygon(pts, fill))
    out.append(f'<circle cx="{fmt(cx)}" cy="{fmt(cy)}" r="{fmt(18*s)}" fill="{fill}"/>')
    return out


def draw_polygon(pdf: canvas.Canvas, points: list[tuple[float, float]], color: CMYKColor) -> None:
    p = pdf.beginPath()
    x0, y0 = points[0]
    p.moveTo(x0, H - y0)
    for x, y in points[1:]:
        p.lineTo(x, H - y)
    p.close()
    pdf.setFillColor(color)
    pdf.drawPath(p, fill=1, stroke=0)


def draw_palm(
    pdf: canvas.Canvas,
    crown: tuple[float, float],
    trunk_bottom: tuple[float, float],
    scale: float,
    color: CMYKColor,
) -> None:
    cx, cy = crown
    bx, by = trunk_bottom
    s = scale
    p = pdf.beginPath()
    p.moveTo(bx - 15*s, H - by)
    p.curveTo(bx - 8*s, H-(by-120*s), cx - 25*s, H-(cy+100*s), cx - 11*s, H-cy)
    p.lineTo(cx + 12*s, H-cy)
    p.curveTo(cx + 4*s, H-(cy+105*s), bx + 18*s, H-(by-120*s), bx + 20*s, H-by)
    p.close()
    pdf.setFillColor(color)
    pdf.drawPath(p, fill=1, stroke=0)
    fronds = [
        ((-142, -52), 25, -18), ((-112, -98), 24, -22), ((-45, -135), 25, -18),
        ((32, -148), 24, 18), ((112, -112), 23, 20), ((142, -48), 24, 18),
        ((126, 24), 25, 16), ((70, 78), 23, 14), ((-82, 55), 22, -15),
        ((-135, 12), 23, -16),
    ]
    for (ox, oy), width, bend in fronds:
        pts = frond_points((cx, cy), (cx + ox*s, cy + oy*s), width*0.55*s, 12, bend*s)
        draw_polygon(pdf, pts, color)
    pdf.setFillColor(color)
    pdf.circle(cx, H-cy, 18*s, fill=1, stroke=0)


def build_svg() -> str:
    white = rgb("white")
    elements: list[str] = []
    elements.append(f'<rect width="900" height="1000" fill="{rgb("deep_navy")}"/>')
    elements.append(f'<rect y="150" width="900" height="585" fill="{rgb("ocean_blue")}"/>')
    elements.append(f'<path d="M 0 220 C 180 195 300 238 455 216 C 625 192 760 225 900 202 L 900 500 L 0 500 Z" fill="{rgb("aqua")}"/>')
    elements.append(f'<path d="M 0 338 C 150 304 300 368 455 330 C 635 286 775 360 900 326 L 900 620 L 0 620 Z" fill="{rgb("ocean_blue")}"/>')
    elements.append(f'<path d="M 0 495 C 170 450 290 545 475 496 C 650 450 775 530 900 480 L 900 735 L 0 735 Z" fill="{rgb("sea_dark")}"/>')
    # Clean vector wave accents.
    for d in [
        "M 20 285 C 130 248 220 300 330 270 C 430 242 510 276 600 252",
        "M 355 405 C 475 365 565 420 680 380 C 755 355 825 375 890 350",
        "M 30 570 C 160 530 270 605 395 560 C 485 528 545 542 620 520",
        "M 500 625 C 610 585 740 645 885 600",
    ]:
        elements.append(f'<path d="{d}" fill="none" stroke="{rgb("aqua")}" stroke-width="10" stroke-linecap="round"/>')
    # Sun and the dark reflection cuts from the original mark.
    elements.append(f'<circle cx="630" cy="230" r="112" fill="{rgb("sun")}"/>')
    for d in [
        "M 552 169 C 582 151 608 145 634 143 C 606 156 584 171 560 188 Z",
        "M 682 184 C 715 190 733 198 744 209 C 718 202 699 200 677 201 Z",
        "M 705 246 C 742 239 756 240 768 246 C 744 254 724 259 700 260 Z",
        "M 690 298 C 720 286 740 282 758 285 C 735 299 715 308 686 314 Z",
    ]:
        elements.append(f'<path d="{d}" fill="{rgb("deep_navy")}"/>')
    # Birds.
    elements.append(f'<path d="M 450 88 C 463 78 475 80 486 91 C 497 79 511 76 525 85 C 506 87 495 98 486 112 C 478 99 466 91 450 88 Z" fill="{white}"/>')
    elements.append(f'<path d="M 557 125 C 572 113 586 115 596 128 C 606 116 621 110 637 118 C 617 122 604 134 596 149 C 585 136 572 128 557 125 Z" fill="{white}"/>')
    # Main and secondary palms.
    elements.extend(palm_svg((274, 255), (330, 663), 1.0, white))
    elements.extend(palm_svg((543, 425), (500, 660), 0.62, white))
    # Island and relaxed guest silhouette.
    elements.append(f'<path d="M 176 657 C 254 616 347 628 420 658 C 490 687 578 688 707 640 C 673 680 615 702 548 710 C 434 725 290 716 202 690 C 171 681 154 670 176 657 Z" fill="{white}"/>')
    elements.append(f'<path d="M 590 638 C 620 610 652 592 689 578 C 674 604 660 625 640 648 Z" fill="{white}"/>')
    elements.append(f'<path d="M 628 598 C 610 577 615 551 638 548 C 660 546 668 572 655 590 C 646 601 638 605 628 598 Z" fill="{white}"/>')
    elements.append(f'<path d="M 640 552 C 657 534 674 522 692 516 C 682 540 671 556 654 569 Z" fill="{white}"/>')
    elements.append(f'<path d="M 647 565 C 664 553 684 548 706 548 C 688 563 672 572 652 580 Z" fill="{white}"/>')
    # Wordmark panel and typography.
    elements.append(f'<rect y="735" width="900" height="265" fill="{rgb("panel")}"/>')
    elements.append(f'<text x="450" y="858" text-anchor="middle" fill="{white}" font-family="Arial, Helvetica, sans-serif" font-size="92" font-weight="900" letter-spacing="1">ATICAN BEACH</text>')
    elements.append(f'<text x="450" y="942" text-anchor="middle" fill="{white}" font-family="Arial, Helvetica, sans-serif" font-size="62" font-weight="900" letter-spacing="1">RESORT &amp; HOTEL</text>')

    swatches = "; ".join(f"{name}: C{c} M{m} Y{y} K{k}" for name, (_, (c, m, y, k)) in COLORS.items())
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900mm" height="1000mm" viewBox="0 0 900 1000" role="img" aria-labelledby="title desc">
  <title id="title">Atican Beach Resort and Hotel vector logo</title>
  <desc id="desc">Editable vector redraw. No raster images are embedded. CMYK recipes: {html.escape(swatches)}</desc>
  <metadata>
    Production master: scalable SVG vector artwork. Standard SVG previews in RGB.
    Use the companion CMYK PDF for press output. {html.escape(swatches)}
  </metadata>
  <g shape-rendering="geometricPrecision">
    {chr(10).join(elements)}
  </g>
</svg>
'''


def draw_pdf() -> None:
    # A physical page 900 x 1000 points; entirely scalable vector content.
    pdf = canvas.Canvas(str(PDF_OUT), pagesize=(W, H), pageCompression=1, pdfVersion=(1, 4))
    pdf.setTitle("Atican Beach Resort & Hotel - CMYK Vector Artwork")
    pdf.setAuthor("Atican Beach Resort & Hotel")
    pdf.setSubject("CMYK vector master for large-format printing")

    # Background/ocean layers.
    pdf.setFillColor(cmyk("deep_navy")); pdf.rect(0, 0, W, H, fill=1, stroke=0)
    pdf.setFillColor(cmyk("ocean_blue")); pdf.rect(0, H-735, W, 585, fill=1, stroke=0)
    for path_data, color_name in [
        ([(0,220),(180,195),(300,238),(455,216),(625,192),(760,225),(900,202),(900,500),(0,500)], "aqua"),
        ([(0,338),(150,304),(300,368),(455,330),(635,286),(775,360),(900,326),(900,620),(0,620)], "ocean_blue"),
        ([(0,495),(170,450),(290,545),(475,496),(650,450),(775,530),(900,480),(900,735),(0,735)], "sea_dark"),
    ]:
        # These broad bands intentionally use smooth polygons in the CMYK PDF.
        draw_polygon(pdf, path_data, cmyk(color_name))
    # Wave accents.
    pdf.setStrokeColor(cmyk("aqua")); pdf.setLineWidth(10); pdf.setLineCap(1)
    waves = [
        ((20,285),(130,248),(220,300),(330,270),(430,242),(510,276),(600,252)),
        ((355,405),(475,365),(565,420),(680,380),(755,355),(825,375),(890,350)),
        ((30,570),(160,530),(270,605),(395,560),(485,528),(545,542),(620,520)),
        ((500,625),(610,585),(740,645),(885,600)),
    ]
    for pts in waves:
        p = pdf.beginPath(); p.moveTo(pts[0][0], H-pts[0][1])
        # Smooth Catmull-like visual using connected cubic segments.
        for i in range(1, len(pts), 3):
            chunk = pts[i:i+3]
            if len(chunk) == 3:
                p.curveTo(chunk[0][0],H-chunk[0][1],chunk[1][0],H-chunk[1][1],chunk[2][0],H-chunk[2][1])
            else:
                for x,y in chunk: p.lineTo(x,H-y)
        pdf.drawPath(p, fill=0, stroke=1)

    # Sun and its graphic cuts.
    pdf.setFillColor(cmyk("sun")); pdf.circle(630, H-230, 112, fill=1, stroke=0)
    for pts in [
        [(552,169),(582,151),(608,145),(634,143),(606,156),(584,171),(560,188)],
        [(682,184),(715,190),(733,198),(744,209),(718,202),(699,200),(677,201)],
        [(705,246),(742,239),(756,240),(768,246),(744,254),(724,259),(700,260)],
        [(690,298),(720,286),(740,282),(758,285),(735,299),(715,308),(686,314)],
    ]:
        draw_polygon(pdf, pts, cmyk("deep_navy"))

    # Birds.
    for pts in [
        [(450,88),(463,78),(475,80),(486,91),(497,79),(511,76),(525,85),(506,87),(495,98),(486,112),(478,99),(466,91)],
        [(557,125),(572,113),(586,115),(596,128),(606,116),(621,110),(637,118),(617,122),(604,134),(596,149),(585,136),(572,128)],
    ]:
        draw_polygon(pdf, pts, cmyk("white"))

    draw_palm(pdf, (274,255), (330,663), 1.0, cmyk("white"))
    draw_palm(pdf, (543,425), (500,660), 0.62, cmyk("white"))
    for pts in [
        [(176,657),(254,616),(347,628),(420,658),(490,687),(578,688),(707,640),(673,680),(615,702),(548,710),(434,725),(290,716),(202,690)],
        [(590,638),(620,610),(652,592),(689,578),(674,604),(660,625),(640,648)],
        [(628,598),(610,577),(615,551),(638,548),(660,546),(668,572),(655,590),(646,601)],
        [(640,552),(657,534),(674,522),(692,516),(682,540),(671,556),(654,569)],
        [(647,565),(664,553),(684,548),(706,548),(688,563),(672,572),(652,580)],
    ]:
        draw_polygon(pdf, pts, cmyk("white"))

    # Wordmark. Arial Bold is embedded/subset in the PDF.
    font_path = Path(r"C:\Windows\Fonts\arialbd.ttf")
    font_name = "AticanArialBold"
    if font_path.exists():
        pdfmetrics.registerFont(TTFont(font_name, str(font_path)))
    else:
        font_name = "Helvetica-Bold"
    pdf.setFillColor(cmyk("panel")); pdf.rect(0, 0, W, H-735, fill=1, stroke=0)
    pdf.setFillColor(cmyk("white"))
    pdf.setFont(font_name, 92)
    pdf.drawCentredString(W/2, H-858, "ATICAN BEACH")
    pdf.setFont(font_name, 62)
    pdf.drawCentredString(W/2, H-942, "RESORT & HOTEL")
    pdf.showPage()
    pdf.save()


def main() -> None:
    SVG_OUT.parent.mkdir(parents=True, exist_ok=True)
    PDF_OUT.parent.mkdir(parents=True, exist_ok=True)
    SVG_OUT.write_text(build_svg(), encoding="utf-8")
    draw_pdf()
    print(SVG_OUT)
    print(PDF_OUT)


if __name__ == "__main__":
    main()
