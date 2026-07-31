import sys
import os
import re
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable, Image
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
        self.drawString(54, 800, "Platform Wisuda v2.0 — Executive Operational Workflow Review")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 792, 541, 792)

        # Footer
        self.line(54, 50, 541, 50)
        page_str = f"Halaman {self._pageNumber} dari {page_count}"
        self.drawRightString(541, 38, page_str)
        self.drawString(54, 38, "Dokumen Presentasi Vendor Studio Wisuda Platform © 2026")
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

    primary_color = colors.HexColor("#1A1A2E")
    secondary_color = colors.HexColor("#C59B63")
    dark_text = colors.HexColor("#1E293B")

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
        fontSize=15,
        leading=19,
        textColor=primary_color,
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11.5,
        leading=15,
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

    caption_style = ParagraphStyle(
        'CaptionCustom',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#475569"),
        alignment=1,
        spaceBefore=4,
        spaceAfter=10
    )

    code_style = ParagraphStyle(
        'CodeCustom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0F172A"),
        backColor=colors.HexColor("#F1F5F9"),
        borderColor=colors.HexColor("#CBD5E1"),
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
    story.append(Paragraph("WORKFLOW OPERASIONAL STUDIO<br/>FOTOGRAFI WISUDA v2.0", title_style))
    story.append(Paragraph("Panduan Ringkas, Visual SOP & Presentasi Eksekutif Sistem Operasional Wisuda untuk Review Lapangan & Vendor Sharing", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=secondary_color, spaceBefore=10, spaceAfter=20))
    story.append(Spacer(1, 180))
    story.append(Paragraph("<b>Edisi Dokumen:</b> Executive Vendor Review Edition", body_style))
    story.append(Paragraph("<b>Tanggal Rilis:</b> Juli 2026", body_style))
    story.append(Paragraph("<b>Pengembang System:</b> Google DeepMind Agentic Team (Credit Initial: <b>AMS</b>)", body_style))
    story.append(PageBreak())

    image_map = {
        "📍 TAHAP 3: PASCA PRODUKSI 3-LANGKAH (POST PRODUCTION SOP)": ("DATA/uploads/ss_deliverables.png", "Tangkapan Layar UI: Modul Admin Pasca Produksi (/admin/deliverables) dengan Alur 3-Langkah"),
        "📍 TAHAP 2: CLIENT BOOKING & PENUGASAN FOTOGRAFER": ("DATA/uploads/ss_bookings.png", "Tangkapan Layar UI: Modul Admin Client & Booking (/admin/bookings)"),
        "📍 TAHAP 1: INQUIRY & RESERVASI CLIENT": ("DATA/uploads/ss_inquiries.png", "Tangkapan Layar UI: Modul Admin Inquiries (/admin/inquiries)"),
        "🔒 INTEGRASI GOOGLE DRIVE 3-STEP WIZARD": ("DATA/uploads/ss_settings.png", "Tangkapan Layar UI: Google Drive OAuth Wizard (/admin/settings)"),
        " Simplified Freelance Portal (Fotografer Bebas Ribet)": ("DATA/uploads/ss_freelance_portal.png", "Tangkapan Layar UI: Simplified Freelance Portal (freelance-portal.html)")
    }

    lines = md_text.split('\n')
    in_code_block = False
    code_lines = []
    in_table = False
    table_rows = []

    def flush_table(rows):
        if not rows:
            return
        col_count = len(rows[0])
        col_widths = [483 / col_count] * col_count
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

        if "|" in raw_line and not raw_line.startswith("```"):
            if "---" in raw_line and "|---" in raw_line:
                continue
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

        if raw_line.startswith("# "):
            pass
        elif raw_line.startswith("## "):
            text = raw_line.replace("## ", "").strip()
            story.append(Paragraph(text, h1_style))
            story.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=8))
        elif raw_line.startswith("### "):
            text = raw_line.replace("### ", "").strip()
            story.append(Paragraph(text, h2_style))
            for key, (img_path, caption) in image_map.items():
                if key in text or text in key:
                    if os.path.exists(img_path):
                        story.append(Spacer(1, 4))
                        story.append(Image(img_path, width=480, height=270))
                        story.append(Paragraph(caption, caption_style))
                        story.append(Spacer(1, 4))
                        break
        elif raw_line.startswith("- ") or raw_line.startswith("* "):
            text = raw_line[2:].strip()
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
    print(f"✅ Executive Workflow PDF successfully generated at: {pdf_path}")

if __name__ == "__main__":
    md = "/Users/armansyam/Documents/Project AmsDev/Wisuda/docs/WORKFLOW_OPERASIONAL_STUDIO_WISUDA.md"
    pdf = "/Users/armansyam/Documents/Project AmsDev/Wisuda/docs/WORKFLOW_OPERASIONAL_STUDIO_WISUDA.pdf"
    build_pdf(md, pdf)
