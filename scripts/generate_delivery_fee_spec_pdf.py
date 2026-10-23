#!/usr/bin/env python3
"""
BEMS FARMS — DELIVERY FEE CALCULATION & CHECKOUT API SPECIFICATION (PDF GENERATOR)
Publication-grade technical documentation for Mobile Engineers (Flutter / React Native / iOS / Android).
Provides 100% parity with the Bems Farms Web Frontend & Backend Architecture.
Covers Haversine distance, KM fee calculation, zone resolution, and API contracts.
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether, PageBreak
)
from reportlab.pdfgen import canvas

# Palette definition (Bems Farms Brand Colors: Forest Green & Emerald)
PRIMARY = colors.HexColor("#143C2D")       # Deep Forest Green
PRIMARY_LIGHT = colors.HexColor("#1E5641") # Medium Forest Green
ACCENT_GREEN = colors.HexColor("#059669")  # Emerald 600
DARK_SLATE = colors.HexColor("#0F172A")    # Slate 900
TEXT_MAIN = colors.HexColor("#334155")     # Slate 700
TEXT_MUTED = colors.HexColor("#64748B")    # Slate 500
BORDER_COL = colors.HexColor("#E2E8F0")    # Slate 200
CODE_BG = colors.HexColor("#F8FAFC")       # Slate 50
HEADER_BG = colors.HexColor("#F1F5F9")     # Slate 100
HIGHLIGHT_BG = colors.HexColor("#ECFDF5")  # Emerald 50
WARN_BG = colors.HexColor("#FEF3C7")       # Amber 100
WARN_TEXT = colors.HexColor("#92400E")     # Amber 800

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
            self.draw_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_decorations(self, page_count):
        self.saveState()
        # Top running header
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(PRIMARY)
        self.drawString(36, 758, "BEMS FARMS — DELIVERY FEE & CHECKOUT API SPECIFICATION")
        self.setFont("Helvetica", 7.5)
        self.setFillColor(TEXT_MUTED)
        self.drawRightString(576, 758, "Web-to-Mobile Parity • Confidential Engineering Reference")
        
        self.setStrokeColor(BORDER_COL)
        self.setLineWidth(0.75)
        self.line(36, 752, 576, 752)
        
        # Bottom running footer
        self.line(36, 36, 576, 36)
        self.setFont("Helvetica", 7.5)
        self.setFillColor(TEXT_MUTED)
        self.drawString(36, 25, "Bems Farms Logistics & Checkout Engine • 100% Consistency Guaranteed")
        self.drawRightString(576, 25, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=50,
        bottomMargin=50
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=PRIMARY,
        alignment=1,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=TEXT_MUTED,
        alignment=1,
        spaceAfter=14
    )

    h1_style = ParagraphStyle(
        'SecH1',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11.5,
        leading=15,
        textColor=PRIMARY,
        spaceBefore=11,
        spaceAfter=5,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SecH2',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=PRIMARY_LIGHT,
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=TEXT_MAIN,
        spaceAfter=5
    )

    bullet_style = ParagraphStyle(
        'BulletItem',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=TEXT_MAIN,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    )

    code_style = ParagraphStyle(
        'CodeSnippet',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7,
        leading=9.5,
        textColor=DARK_SLATE
    )

    th_style = ParagraphStyle(
        'TableHead',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=0
    )

    td_style = ParagraphStyle(
        'TableData',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=TEXT_MAIN
    )

    td_bold = ParagraphStyle(
        'TableDataBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=DARK_SLATE
    )

    story = []

    # ── TITLE & HEADER ────────────────────────────────────────────────────────
    story.append(Spacer(1, 4))
    story.append(Paragraph("BEMS FARMS — DELIVERY FEE & CHECKOUT SPECIFICATION", title_style))
    story.append(Paragraph("Complete Technical Architecture & Parity Guide for Mobile Engineers (Flutter / React Native / Native Mobile)", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceBefore=0, spaceAfter=8))

    # ── 1. OBJECTIVE & EXECUTIVE SUMMARY ──────────────────────────────────────
    story.append(Paragraph("1. Objective & Executive Summary", h1_style))
    story.append(Paragraph(
        "This specification provides the <b>exact mathematical formula, distance algorithms, lookup matrices, "
        "and API payload structures</b> powering checkout and delivery pricing on the Bems Farms web application. "
        "Mobile engineering teams must implement this exact logic to achieve <b>100% parity</b> between mobile and web checkouts, "
        "preventing payment gateway total-mismatch rejections and customer disputes.",
        body_style
    ))

    summary_table_data = [
        [
            Paragraph("<b>Core Requirement</b>", td_bold),
            Paragraph("<b>Web App Implementation</b>", td_bold),
            Paragraph("<b>Mobile App Obligation</b>", td_bold),
        ],
        [
            Paragraph("Delivery Pricing Formula", td_style),
            Paragraph("Base Fee + (Distance KM × Per-KM Rate)", td_style),
            Paragraph("Replicate formula identically; dynamic preview on map selection.", td_style),
        ],
        [
            Paragraph("Distance Determination", td_style),
            Paragraph("Haversine Geodesic (6,371 km radius) to Zone Center", td_style),
            Paragraph("Calculate straight-line km to matched hub before rounding.", td_style),
        ],
        [
            Paragraph("Location Verification", td_style),
            Paragraph("<code>POST /api/locations/verify</code>", td_style),
            Paragraph("Always verify coordinates prior to checkout submission.", td_style),
        ],
        [
            Paragraph("Monnify Checkout Intent", td_style),
            Paragraph("<code>POST /api/orders/checkout-intent</code>", td_style),
            Paragraph("Lock total amount and receive intentId before launching gateway.", td_style),
        ],
        [
            Paragraph("Fallback Standard Fee", td_style),
            Paragraph("₦1,000 (when offline / unverified)", td_style),
            Paragraph("Use ₦1,000 as default initial delivery fee state.", td_style),
        ],
    ]
    t_summary = Table(summary_table_data, colWidths=[120, 200, 220])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_LIGHT),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, HEADER_BG]),
        ('BOX', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COL),
    ]))
    story.append(t_summary)
    story.append(Spacer(1, 8))

    # ── 2. THE DELIVERY FEE PRICING FORMULA ────────────────────────────────────
    story.append(Paragraph("2. Detailed Delivery Fee & Per-KM Calculation", h1_style))
    story.append(Paragraph(
        "Bems Farms employs a hybrid pricing engine defined in <code>server/src/services/pricingService.js</code>. "
        "The formula combines a <b>zone base fee</b> with a <b>distance fee</b> based on map driving kilometers.",
        body_style
    ))

    # Formula Box
    formula_text = (
        "<b>MATHEMATICAL PRICING FORMULA:</b><br/>"
        "&nbsp;&nbsp;<b>Distance Fee (₦)</b> = <code>Math.round(distance_in_km * per_km_rate)</code><br/>"
        "&nbsp;&nbsp;<b>Total Delivery Fee (₦)</b> = <code>base_fee + distance_fee</code><br/>"
        "&nbsp;&nbsp;<b>Customer Total (₦)</b> = <code>cart_subtotal + total_delivery_fee - discount_amount</code><br/>"
        "&nbsp;&nbsp;<b>Driver Commission (₦)</b> = <code>Math.round(total_delivery_fee * 0.70)</code> (70% standard platform split)"
    )
    formula_p = Paragraph(formula_text, ParagraphStyle('Formula', parent=body_style, fontSize=8.5, leading=12, textColor=PRIMARY))
    t_formula = Table([[formula_p]], colWidths=[540])
    t_formula.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), HIGHLIGHT_BG),
        ('BOX', (0,0), (-1,-1), 1, ACCENT_GREEN),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_formula)
    story.append(Spacer(1, 8))

    # ── 3. ZONE MATRIX AND DEFAULT PRICING ─────────────────────────────────────
    story.append(Paragraph("3. Delivery Zone Matrix & Rate Tiers", h1_style))
    story.append(Paragraph(
        "The following master lookup table defines all operational zones, default coordinates, base fees, and per-km rates:",
        body_style
    ))

    zone_table_data = [
        [
            Paragraph("<b>Zone ID</b>", th_style),
            Paragraph("<b>Zone Name / Operational Hub</b>", th_style),
            Paragraph("<b>Base Fee</b>", th_style),
            Paragraph("<b>KM Rate</b>", th_style),
            Paragraph("<b>Pricing Type</b>", th_style),
            Paragraph("<b>Hub Center (Lat, Lng)</b>", th_style),
        ],
        [
            Paragraph("<code>ZONE_TEST</code>", td_bold),
            Paragraph("Test Zone (QA Free Delivery)", td_style),
            Paragraph("₦0", td_style),
            Paragraph("₦0 / km", td_style),
            Paragraph("Flat Free", td_style),
            Paragraph("Any coordinate", td_style),
        ],
        [
            Paragraph("<code>ZONE001</code>", td_bold),
            Paragraph("Umuahia Urban & Metro", td_style),
            Paragraph("₦600", td_style),
            Paragraph("₦80 / km", td_style),
            Paragraph("Base + KM", td_style),
            Paragraph("5.5255° N, 7.4916° E", td_style),
        ],
        [
            Paragraph("<code>ZONE002</code>", td_bold),
            Paragraph("Aba Commercial Metro", td_style),
            Paragraph("₦1,800", td_style),
            Paragraph("₦90 / km", td_style),
            Paragraph("Base + KM", td_style),
            Paragraph("5.1065° N, 7.3667° E", td_style),
        ],
        [
            Paragraph("<code>ZONE003</code>", td_bold),
            Paragraph("Abia Regional Hubs (Ohafia, Arochukwu)", td_style),
            Paragraph("₦2,500", td_style),
            Paragraph("₦60 / km", td_style),
            Paragraph("Base + KM", td_style),
            Paragraph("5.6186° N, 7.8286° E", td_style),
        ],
        [
            Paragraph("<code>ZONE004</code>", td_bold),
            Paragraph("Interstate SE / SS (Rivers, Enugu, Imo)", td_style),
            Paragraph("₦3,500", td_style),
            Paragraph("₦40 / km", td_style),
            Paragraph("Base + KM", td_style),
            Paragraph("5.0000° N, 7.0000° E", td_style),
        ],
        [
            Paragraph("<code>ZONE005</code>", td_bold),
            Paragraph("Nationwide Express (Lagos, Abuja, North)", td_style),
            Paragraph("₦6,000", td_style),
            Paragraph("₦15 / km", td_style),
            Paragraph("Base + KM", td_style),
            Paragraph("9.0765° N, 7.3986° E", td_style),
        ],
        [
            Paragraph("<code>ZONE006</code>", td_bold),
            Paragraph("Bulk Cargo / Export", td_style),
            Paragraph("₦35,000", td_style),
            Paragraph("₦0 / km", td_style),
            Paragraph("Flat Rate", td_style),
            Paragraph("Sea/Airport Cargo Hubs", td_style),
        ],
    ]
    t_zone = Table(zone_table_data, colWidths=[65, 145, 60, 60, 75, 135])
    t_zone.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, HEADER_BG]),
        ('BOX', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COL),
    ]))
    story.append(t_zone)
    story.append(Spacer(1, 8))

    # ── 4. HAVERSINE DISTANCE ALGORITHM ───────────────────────────────────────
    story.append(Paragraph("4. Haversine Distance & Curvature Algorithm", h1_style))
    story.append(Paragraph(
        "Distance is calculated between Customer Geolocation <code>(lat1, lon1)</code> and the Distribution Hub Center <code>(lat2, lon2)</code>:",
        body_style
    ))

    haversine_code = (
        "// Straight-line distance using Haversine formula (km)\n"
        "function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {\n"
        "  const EARTH_RADIUS_KM = 6371;\n"
        "  const dLat = (lat2 - lat1) * (Math.PI / 180);\n"
        "  const dLon = (lon2 - lon1) * (Math.PI / 180);\n"
        "  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +\n"
        "            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *\n"
        "            Math.sin(dLon / 2) * Math.sin(dLon / 2);\n"
        "  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));\n"
        "  return Math.round(EARTH_RADIUS_KM * c * 10) / 10; // Rounded to 1 decimal\n"
        "}"
    )
    t_code1 = Table([[Paragraph(haversine_code.replace('\n', '<br/>').replace(' ', '&nbsp;'), code_style)]], colWidths=[540])
    t_code1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), CODE_BG),
        ('BOX', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_code1)
    story.append(Spacer(1, 8))

    # ── STEP-BY-STEP WORKED EXAMPLE ───────────────────────────────────────────
    story.append(Paragraph("<b>Concrete Worked Calculation Example:</b>", h2_style))
    example_text = (
        "• <b>Customer Address:</b> 10 Library Avenue, Umuahia (Lat: <code>5.5280</code>, Lng: <code>7.4950</code>)<br/>"
        "• <b>Assigned Hub:</b> <code>ZONE001</code> (Center Lat: <code>5.5255</code>, Lng: <code>7.4916</code>)<br/>"
        "• <b>Haversine Distance:</b> <code>6.4 km</code><br/>"
        "• <b>Base Fee:</b> <code>₦600</code> | <b>KM Rate:</b> <code>₦80 / km</code><br/>"
        "• <b>Distance Fee:</b> <code>Math.round(6.4 * 80) = ₦512</code><br/>"
        "• <b>Total Delivery Fee Charged:</b> <code>600 + 512 = ₦1,112</code><br/>"
        "• <b>Driver Payout (70%):</b> <code>Math.round(1112 * 0.70) = ₦778</code>"
    )
    story.append(Paragraph(example_text, bullet_style))
    story.append(Spacer(1, 10))

    # Page break to keep API contracts clean on Page 2
    story.append(PageBreak())

    # ── 5. CHECKOUT WORKFLOW & API CONTRACTS ──────────────────────────────────
    story.append(Paragraph("5. Checkout Workflow & API Contracts", h1_style))
    story.append(Paragraph(
        "The mobile app must follow the 3-step checkout sequence established by the web application:",
        body_style
    ))

    # Step 1
    story.append(Paragraph("Step 1: Location Verification & Zone Mapping", h2_style))
    story.append(Paragraph("Endpoint: <code>POST /api/locations/verify</code>", body_style))
    
    verify_req_code = (
        "// Request Payload\n"
        "{\n"
        '  "latitude": 5.5255,\n'
        '  "longitude": 7.4916,\n'
        '  "address": "10 Library Avenue",\n'
        '  "city": "Umuahia",\n'
        '  "state": "Abia State"\n'
        "}\n\n"
        "// Response Payload (200 OK)\n"
        "{\n"
        '  "verified": true,\n'
        '  "zone": {\n'
        '    "zone_id": "ZONE001",\n'
        '    "zone_name": "Umuahia Urban & Metro",\n'
        '    "delivery_fee": 1112,\n'
        '    "estimated_delivery_time": "30–60 mins",\n'
        '    "match_type": "closest_gps_zone"\n'
        '  }\n'
        "}"
    )
    t_code2 = Table([[Paragraph(verify_req_code.replace('\n', '<br/>').replace(' ', '&nbsp;'), code_style)]], colWidths=[540])
    t_code2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), CODE_BG),
        ('BOX', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_code2)
    story.append(Spacer(1, 6))

    # Step 2
    story.append(Paragraph("Step 2: Monnify Gateway Checkout Intent", h2_style))
    story.append(Paragraph(
        "Prior to invoking the Monnify payment SDK, call <code>POST /api/orders/checkout-intent</code> to register a secured transaction intent and obtain an <code>intentId</code>.",
        body_style
    ))
    intent_code = (
        "// POST /api/orders/checkout-intent Payload\n"
        "{\n"
        '  "items": [\n'
        '    { "product_id": 14, "quantity": 2, "price": 4500 }\n'
        '  ],\n'
        '  "payment_ref": "BF-1718880000000-abcd",\n'
        '  "address": "10 Library Avenue, Umuahia, Abia State",\n'
        '  "city": "Umuahia",\n'
        '  "state": "Abia State",\n'
        '  "latitude": 5.5255,\n'
        '  "longitude": 7.4916,\n'
        '  "zone_id": "ZONE001",\n'
        '  "delivery_fee": 1112,\n'
        '  "coupon_code": "DISCOUNT10"\n'
        "}\n\n"
        "// Response (200 OK)\n"
        '{\n  "intentId": "INTENT-98234-XYZ",\n  "total": 9212\n}'
    )
    t_code3 = Table([[Paragraph(intent_code.replace('\n', '<br/>').replace(' ', '&nbsp;'), code_style)]], colWidths=[540])
    t_code3.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), CODE_BG),
        ('BOX', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_code3)
    story.append(Spacer(1, 6))

    # Step 3
    story.append(Paragraph("Step 3: Final Order Creation (`POST /api/orders`)", h2_style))
    story.append(Paragraph(
        "Executed after successful payment or immediately for Cash on Delivery (COD):",
        body_style
    ))
    final_order_code = (
        "// POST /api/orders Payload\n"
        "{\n"
        '  "items": [{ "product_id": 14, "quantity": 2, "price": 4500 }],\n'
        '  "total": 9212,\n'
        '  "zone_id": "ZONE001",\n'
        '  "delivery_fee": 1112,\n'
        '  "payment_method": "monnify",          // "monnify" or "cod"\n'
        '  "payment_ref": "BF-1718880000000-abcd",\n'
        '  "payment_reference": "BF-1718880000000-abcd",\n'
        '  "transaction_reference": "MNFY|20261022|9988112",\n'
        '  "checkout_intent_id": "INTENT-98234-XYZ",\n'
        '  "address": "10 Library Avenue, Umuahia, Abia State",\n'
        '  "city": "Umuahia",\n'
        '  "state": "Abia State",\n'
        '  "latitude": 5.5255,\n'
        '  "longitude": 7.4916,\n'
        '  "coupon_code": "DISCOUNT10"\n'
        "}\n\n"
        "// Response (201 Created)\n"
        '{\n  "id": "BF-ORD-88219",\n  "status": "pending_admin_processing",\n  "message": "Order placed successfully"\n}'
    )
    t_code4 = Table([[Paragraph(final_order_code.replace('\n', '<br/>').replace(' ', '&nbsp;'), code_style)]], colWidths=[540])
    t_code4.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), CODE_BG),
        ('BOX', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_code4)
    story.append(Spacer(1, 10))

    # ── 6. MOBILE INTEGRATION CHECKLIST ───────────────────────────────────────
    story.append(Paragraph("6. Mobile Engineering Implementation Checklist", h1_style))
    checklist_items = [
        "<b>1. QA Test Zone Mode:</b> Automatically assign ₦0 delivery fee if the user enters 'test' in the address, city, or state field.",
        "<b>2. Offline Fallback Fee:</b> Set initial default state to <code>STANDARD_DELIVERY_FEE = 1000</code> (₦1,000) before coordinates are verified.",
        "<b>3. Zero Discrepancy Total Check:</b> Always calculate <code>Total = Math.max(0, Subtotal + DeliveryFee - Discount)</code>.",
        "<b>4. Intent Lock:</b> Always pass the verified <code>delivery_fee</code> to both <code>/checkout-intent</code> and <code>/orders</code>.",
        "<b>5. Monnify Amount Matching:</b> Ensure the amount sent to the Monnify SDK equals the <code>intent.total</code> exactly to prevent gateway mismatch errors."
    ]
    for chk in checklist_items:
        story.append(Paragraph(f"• {chk}", bullet_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF generated successfully at {filename}")

if __name__ == "__main__":
    out_path = sys.argv[1] if len(sys.argv) > 1 else "BEMS_FARMS_DELIVERY_FEE_AND_CHECKOUT_SPECIFICATION.pdf"
    build_pdf(out_path)
