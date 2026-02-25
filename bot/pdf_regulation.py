"""Generate a regulation plan PDF for a vehicle."""
from io import BytesIO
from typing import List

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os


# Headers as Paragraphs (white text on dark header row)
def _register_font() -> str:
    """
    Register a font with Cyrillic support if available.
    Returns the font name to use.
    """
    # Common path for DejaVu on Debian/Ubuntu (installed via fonts-dejavu-core)
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                pdfmetrics.registerFont(TTFont("DejaVuSans", path))
                return "DejaVuSans"
            except Exception:
                # Fall back to default if registration fails
                break
    return "Helvetica"


_FONT_NAME = _register_font()


_header_style = ParagraphStyle(
    name="TabHeader",
    fontSize=9,
    fontName=_FONT_NAME,
    textColor=colors.white,
    alignment=0,
)
_header_center = ParagraphStyle(
    name="TabHeaderCenter",
    parent=_header_style,
    alignment=1,
)
HEADERS = [
    Paragraph("<b>Послуга / робота</b>", _header_style),
    Paragraph("<b>Кожні (км)</b>", _header_center),
    Paragraph("<b>Останній раз (км)</b>", _header_center),
    Paragraph("<b>Наступний раз (км)</b>", _header_center),
]


def build_regulation_pdf(car_number: str, plan: List[dict]) -> BytesIO:
    """
    Build a clear, readable PDF with regulation plan table.
    plan: list of dicts with title, every_km, notify_before_km, last_done_km, next_due_km.
    """
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        name="RegTitle",
        parent=styles["Heading1"],
        fontSize=18,
        spaceAfter=2 * mm,
        textColor=colors.HexColor("#1a1a1a"),
        fontName=_FONT_NAME,
    )
    subtitle_style = ParagraphStyle(
        name="RegSubtitle",
        parent=styles["Normal"],
        fontSize=12,
        spaceAfter=6 * mm,
        textColor=colors.HexColor("#444"),
        fontName=_FONT_NAME,
    )
    hint_style = ParagraphStyle(
        name="RegHint",
        parent=styles["Normal"],
        fontSize=8,
        spaceAfter=4 * mm,
        textColor=colors.HexColor("#666"),
        fontName=_FONT_NAME,
    )

    story = []
    story.append(Paragraph("Регламент обслуговування авто", title_style))
    story.append(Paragraph(f"Номер авто: {car_number}", subtitle_style))
    story.append(
        Paragraph(
            "Кожні (км) — через який пробіг виконувати роботу; "
            "Останній раз / Наступний раз — пробіг при останньому виконанні та наступний плановий.",
            hint_style,
        )
    )

    data = [HEADERS]
    for row in plan:
        last_km = str(row["last_done_km"]) if row["last_done_km"] is not None else "—"
        next_km = str(row["next_due_km"]) if row["next_due_km"] is not None else "—"
        data.append([
            row["title"],
            str(row["every_km"]),
            last_km,
            next_km,
        ])

    col_widths = [95 * mm, 28 * mm, 35 * mm, 35 * mm]
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), _FONT_NAME, 10),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("FONTNAME", (0, 1), (-1, -1), _FONT_NAME, 9),
                ("FONTSIZE", (0, 1), (-1, -1), 9),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2c3e50")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("ALIGN", (0, 0), (0, -1), "LEFT"),
                ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#bdc3c7")),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [colors.white, colors.HexColor("#ecf0f1")],
                ),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LINEBELOW", (0, 0), (-1, 0), 1.5, colors.HexColor("#2c3e50")),
            ]
        )
    )
    story.append(t)
    story.append(Spacer(1, 6 * mm))
    story.append(
        Paragraph(
            "Документ згенеровано ботом Fleet Management. "
            "Зберігайте для контролю термінів обслуговування.",
            hint_style,
        )
    )
    doc.build(story)
    buf.seek(0)
    return buf
