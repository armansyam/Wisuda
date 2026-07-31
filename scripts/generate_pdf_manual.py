import sys
import os
import re
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            return  # Skip cover page

        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header
        self.drawString(54, 800, "Platform Wisuda v2.0 — Master Encyclopedic Manual")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 792, 541, 792)

        # Footer
        self.line(54, 50, 541, 50)
        page_str = f"Halaman {self._pageNumber} dari {page_count}"
        self.drawRightString(541, 38, page_str)
        self.drawString(54, 38, "Dokumentasi Resmi Studio Wisuda Platform © 2026")
        self.restoreState()

def build_pdf(md_path, pdf_path):
    with open(md_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=60
    )

    styles = getSampleStyleSheet()

    # Custom styles matching navy & gold aesthetic
    primary_color = colors.HexColor("#1A1A2E")
    secondary_color = colors.HexColor("#C59B63")
    dark_text = colors.HexColor("#1E293B")
    accent_bg = colors.HexColor("#F8FAFC")

    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=30,
        textColor=primary_color,
        spaceAfter=15
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=secondary_color,
        spaceAfter=30
    )

    h1_style = ParagraphStyle(
        'Heading1Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=primary_color,
        spaceBefore=18,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#2563EB"),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=dark_text,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletCustom',
        parent=body_style,
        leftIndent=15,
        spaceAfter=4
    )

    code_style = ParagraphStyle(
        'CodeCustom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0F172A"),
        backColor=colors.HexColor("#F1F5F9"),
        borderColor=colors.HexColor("#E2E8F0"),
        borderWidth=0.5,
        borderPadding=6,
        spaceBefore=6,
        spaceAfter=8
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.white
    )

    table_body_style = ParagraphStyle(
        'TableBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=dark_text
    )

    story = []

    # --- COVER PAGE ---
    story.append(Spacer(1, 40))
    story.append(Paragraph("BUKU PANDUAN MASTER ENSIKLOPEDIS<br/>PLATFORM WISUDA v2.0", title_style))
    story.append(Paragraph("Spesifikasi Lengkap Arsitektur, Skema Database, Workflow SOP, Integrasi Google Drive, Media Handling, API Endpoints & Troubleshooting", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=secondary_color, spaceBefore=10, spaceAfter=20))
    story.append(Spacer(1, 200))
    story.append(Paragraph("<b>Versi Dokumen:</b> 2.0.0 — Production Edition", body_style))
    story.append(Paragraph("<b>Tanggal Rilis:</b> 31 Juli 2026", body_style))
    story.append(Paragraph("<b>Pengembang System:</b> Google DeepMind Agentic Team (Credit Initial: <b>AMS</b>)", body_style))
    story.append(PageBreak())

    # Parse Markdown blocks
    lines = md_text.split('\n')
    in_code_block = False
    code_lines = []
    in_table = False
    table_rows = []

    def flush_table(rows):
        if not rows:
            return
        col_count = len(rows[0])
        # Determine column widths for A4 (width ~483pt printable)
        width_per_col = 483 / col_count
        col_widths = [width_per_col] * col_count

        formatted_table_data = []
        for r_idx, row in enumerate(rows):
            formatted_row = []
            for cell in row:
                st = table_header_style if r_idx == 0 else table_body_style
                formatted_row.append(Paragraph(cell.strip(), st))
            formatted_table_data.append(formatted_row)

        t = Table(formatted_table_data, colWidths=col_widths)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), primary_color),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(Spacer(1, 6))
        story.append(t)
        story.append(Spacer(1, 6))

    for line in lines:
        raw_line = line.strip()

        # Handle Code Block
        if raw_line.startswith("```"):
            if in_code_block:
                code_text = "\n".join(code_lines).replace("<", "&lt;").replace(">", "&gt;")
                story.append(Paragraph(code_text.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))
                code_lines = []
                in_code_block = False
            else:
                if in_table:
                    flush_table(table_rows)
                    table_rows = []
                    in_table = False
                in_code_block = True
            continue

        if in_code_block:
            code_lines.append(line)
            continue

        # Handle Tables
        if "|" in raw_line and not raw_line.startswith("```"):
            if "---" in raw_line and "|---" in raw_line:
                continue # Skip markdown table separator
            cols = [c.strip() for c in raw_line.split("|")[1:-1]]
            if cols:
                in_table = True
                table_rows.append(cols)
                continue

        if in_table:
            flush_table(table_rows)
            table_rows = []
            in_table = False

        if not raw_line:
            continue

        # Handle Headings
        if raw_line.startswith("# "):
            pass # Title handled in cover
        elif raw_line.startswith("## "):
            text = raw_line.replace("## ", "").strip()
            story.append(Paragraph(text, h1_style))
            story.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=8))
        elif raw_line.startswith("### "):
            text = raw_line.replace("### ", "").strip()
            story.append(Paragraph(text, h2_style))
        elif raw_line.startswith("- ") or raw_line.startswith("* "):
            text = raw_line[2:].strip()
            # Clean markdown bold/italic
            text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
            text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
            story.append(Paragraph(f"• {text}", bullet_style))
        else:
            text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', raw_line)
            text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
            story.append(Paragraph(text, body_style))

    if in_table:
        flush_table(table_rows)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"✅ PDF Master Manual successfully generated at: {pdf_path}")

if __name__ == "__main__":
    md = "/Users/armansyam/Documents/Project AmsDev/Wisuda/docs/DOKUMENTASI_UTAMA_PLATFORM_WISUDA.md"
    pdf = "/Users/armansyam/Documents/Project AmsDev/Wisuda/docs/DOKUMENTASI_UTAMA_PLATFORM_WISUDA.pdf"
    build_pdf(md, pdf)
