#!/usr/bin/env python3
"""
BEMS FARMS — COMPLETE END-TO-END ORDER TO DELIVERY WORKFLOW SPECIFICATION (PDF GENERATOR)
Publication-grade technical & operational documentation detailing the full journey
from customer browsing, geocoding & payment authorization to warehouse packaging,
proximity dispatch, live GPS streaming, doorstep verification, POD capture, and dispute resolution.
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

# Palette definition
PRIMARY = colors.HexColor("#0D9488")      # Teal 600
PRIMARY_DARK = colors.HexColor("#115E59") # Teal 800
EMERALD = colors.HexColor("#059669")      # Emerald 600
SECONDARY = colors.HexColor("#0F172A")    # Slate 900
ACCENT = colors.HexColor("#D97706")       # Amber 600
TEXT_MAIN = colors.HexColor("#334155")    # Slate 700
BORDER_COL = colors.HexColor("#E2E8F0")   # Slate 200
CODE_BG = colors.HexColor("#F8FAFC")      # Slate 50
SUCCESS = colors.HexColor("#10B981")      # Emerald 500
DANGER = colors.HexColor("#EF4444")       # Red 500

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
        # Top Header Bar (skip first page header if desired, or show on all)
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(PRIMARY_DARK)
        self.drawString(36, 758, "BEMS FARMS — END-TO-END ORDER TO DELIVERY WORKFLOW SPECIFICATION")
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawRightString(576, 758, "Official System Architecture & Logistics Blueprint • 2026")
        
        self.setStrokeColor(BORDER_COL)
        self.setLineWidth(0.75)
        self.line(36, 752, 576, 752)
        
        # Bottom Footer Bar
        self.line(36, 38, 576, 38)
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(36, 26, "Confidential • Bems Farms Ltd — Logistics & Dispatch Control Systems")
        self.drawRightString(576, 26, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def build_pdf(filename="BEMS_FARMS_ORDER_TO_DELIVERY_WORKFLOW_SPECIFICATION.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=PRIMARY_DARK,
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#475569"),
        spaceAfter=14
    )

    h1_style = ParagraphStyle(
        'SecH1',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=SECONDARY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SecH2',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=PRIMARY_DARK,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=TEXT_MAIN,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    )

    badge_style = ParagraphStyle(
        'BadgeText',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9,
        textColor=colors.white
    )

    code_style = ParagraphStyle(
        'CodeText',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#0F172A")
    )

    table_header_style = ParagraphStyle(
        'THeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0F172A")
    )

    table_body_style = ParagraphStyle(
        'TBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=TEXT_MAIN
    )

    story = []

    # Title Banner Block
    banner_data = [
        [
            Paragraph("BEMS FARMS — COMPLETE ORDER TO DELIVERY WORKFLOW", title_style),
        ],
        [
            Paragraph("Comprehensive Technical & Operational Architecture Blueprint • From Client Checkout to Doorstep Handover, Item-by-Item Verification & Dispute Resolution", subtitle_style)
        ]
    ]
    banner_table = Table(banner_data, colWidths=[540])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F0FDFA")),
        ('BOX', (0,0), (-1,-1), 1.5, PRIMARY),
        ('PADDING', (0,0), (-1,-1), 12),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 10))

    # Document Metadata Card
    meta_data = [
        [
            Paragraph("<b>Target Audience:</b> Engineering, Dispatch, Store Operations, Mobile Dev", table_body_style),
            Paragraph("<b>System Core:</b> Node.js / Express / PostgreSQL", table_body_style),
            Paragraph("<b>Status:</b> Production Active (v2.0)", table_body_style)
        ],
        [
            Paragraph("<b>Client Channels:</b> Web, Mobile App, Chef Bems AI", table_body_style),
            Paragraph("<b>Dispatch Mechanism:</b> Automated GPS Proximity (Haversine)", table_body_style),
            Paragraph("<b>POD Standard:</b> Item-by-Item Photo Snapshot", table_body_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[180, 180, 180])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 0.75, BORDER_COL),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # Executive Summary / Overview
    story.append(Paragraph("1. Executive Summary & Core Topology", h1_style))
    story.append(Paragraph(
        "The Bems Farms logistics lifecycle guarantees reliable, transparent, and auditable farm-to-doorstep food delivery. "
        "The architecture synchronizes four synchronized layers: the <b>Client Storefront / Mobile App</b>, the <b>Chef Bems AI Culinary Assistant</b>, "
        "the <b>Admin & Warehouse Operations Hub</b>, and the <b>Driver Mobile Application</b>. Every order flows through distinct stages with strict "
        "geocoding verification, payment reconciliation, inventory reservation, proximity driver matching with 10-minute fallback timers, "
        "live GPS streaming, item-by-item photo capture, and instantaneous commission wallet credit.",
        body_style
    ))

    # Flow Topology Summary Table
    topo_data = [
        [
            Paragraph("Stage", table_header_style),
            Paragraph("Responsible Actor", table_header_style),
            Paragraph("Key System Trigger / API Endpoint", table_header_style),
            Paragraph("Status Mutation", table_header_style)
        ],
        [
            Paragraph("<b>1. Checkout & Payment</b>", table_body_style),
            Paragraph("Customer / Chef Bems AI", table_body_style),
            Paragraph("<code>POST /api/orders</code><br/><code>POST /api/orders/checkout-intent</code>", code_style),
            Paragraph("<font color='#059669'><b>confirmed / order_placed</b></font>", table_body_style)
        ],
        [
            Paragraph("<b>2. Store Packing</b>", table_body_style),
            Paragraph("Store Admin / Kitchen Staff", table_body_style),
            Paragraph("Packing invoice printed; warehouse stock deduction", table_body_style),
            Paragraph("<font color='#D97706'><b>packaging / packed_ready</b></font>", table_body_style)
        ],
        [
            Paragraph("<b>3. Auto-Dispatch</b>", table_body_style),
            Paragraph("Proximity Dispatch Engine", table_body_style),
            Paragraph("Haversine nearest driver match (10-min timeout)", table_body_style),
            Paragraph("<font color='#2563EB'><b>assigned (driver_assigned)</b></font>", table_body_style)
        ],
        [
            Paragraph("<b>4. Store Pickup</b>", table_body_style),
            Paragraph("Assigned Driver", table_body_style),
            Paragraph("<code>PATCH /api/driver/deliveries/:id/status</code> (en_route)", code_style),
            Paragraph("<font color='#0D9488'><b>en_route (in_transit)</b></font>", table_body_style)
        ],
        [
            Paragraph("<b>5. Live Transit & GPS</b>", table_body_style),
            Paragraph("Driver Device & Background Service", table_body_style),
            Paragraph("<code>POST /api/driver/location</code> (Every 10-15s)", code_style),
            Paragraph("is_on_delivery=true (Locked Unavailable)", table_body_style)
        ],
        [
            Paragraph("<b>6. Doorstep Arrival</b>", table_body_style),
            Paragraph("Driver at Customer Location", table_body_style),
            Paragraph("<code>PATCH /api/driver/deliveries/:id/status</code> (arrived)", code_style),
            Paragraph("<font color='#7C3AED'><b>arrived (driver_arrived)</b></font>", table_body_style)
        ],
        [
            Paragraph("<b>7. Item Verification & POD</b>", table_body_style),
            Paragraph("Driver & Customer", table_body_style),
            Paragraph("Item-by-item snapshot upload: <code>proof_photos</code>", code_style),
            Paragraph("Physical goods verification", table_body_style)
        ],
        [
            Paragraph("<b>8. Delivery Completion</b>", table_body_style),
            Paragraph("Customer & Driver Confirmation", table_body_style),
            Paragraph("<code>PATCH /api/orders/:id/confirm</code><br/><code>PATCH /api/driver/deliveries/:id/status</code>", code_style),
            Paragraph("<font color='#059669'><b>delivered (Wallet Credited)</b></font>", table_body_style)
        ],
    ]
    topo_table = Table(topo_data, colWidths=[90, 110, 200, 140])
    topo_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COL),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(topo_table)
    story.append(Spacer(1, 12))

    # Phase 1: Client Order Placement & Checkout Details
    story.append(Paragraph("2. Phase 1: Customer Order Placement & Checkout", h1_style))
    story.append(Paragraph(
        "The order journey begins on the <b>Customer Web Storefront</b>, the <b>Customer Mobile App</b>, or through conversational recipe staging with the <b>Chef Bems AI Assistant</b>. "
        "All ordering paths adhere to the following mandatory validation constraints:",
        body_style
    ))
    story.append(Paragraph("• <b>Mandatory Verified Delivery Coordinates:</b> Customers must select a geocoded address from live OpenStreetMap search suggestions or drop an exact pin using the interactive map modal (<code>VerifiedLocationModal</code>). The system requires valid <code>latitude</code> and <code>longitude</code> before checkout initialization.", bullet_style))
    story.append(Paragraph("• <b>Cart Staging & Inventory Reservation:</b> When ordering via Chef Bems AI, ingredients are staged via <code>POST /api/ai/cart/webhook</code> and claimed on page reload. Live stock checks prevent over-ordering.", bullet_style))
    story.append(Paragraph("• <b>Server-Side Price Recomputation:</b> Client-supplied prices and discounts are never trusted. The server recalculates totals directly against the <code>products</code> table and active coupon rules in a Postgres transaction lock.", bullet_style))
    story.append(Paragraph("• <b>Payment Gateway Authorization:</b> For Monnify/Card/Transfer orders, a <code>checkout_intent</code> is locked. Monnify transactions are verified server-to-server before committing the order record.", bullet_style))
    story.append(Paragraph("• <b>Cash on Delivery (COD) Support:</b> For COD orders, the order is created with status <code>pending</code> and payment status <code>unpaid</code>, with the payment amount collected physically upon delivery.", bullet_style))
    story.append(Spacer(1, 10))

    # Phase 2: Warehouse Packaging & Sales Checkout
    story.append(Paragraph("3. Phase 2: Store Processing, Packing & Warehouse Checkout", h1_style))
    story.append(Paragraph(
        "Once payment is confirmed, operations transition to the store warehouse or kitchen fulfillment team:",
        body_style
    ))
    story.append(Paragraph("• <b>1. Order Receipt & Sales Invoice:</b> The Store Admin receives the new order in the Admin Dashboard, inspects the line items, and prints the official packing and sales invoice.", bullet_style))
    story.append(Paragraph("• <b>2. Status Transition to Packaging:</b> The order status moves to <code>packaging</code> / <code>packed_ready</code>.", bullet_style))
    story.append(Paragraph("• <b>3. Warehouse Inventory Checkout:</b> The Delivery Manager hands the printed invoice and physical goods to the Salesperson, who verifies payment clearance and checks the items out of inventory, decrementing batch balances.", bullet_style))
    story.append(Paragraph("• <b>4. Dispatch Engine Trigger:</b> Once marked packaged and verified, the automated proximity dispatching subsystem is immediately invoked.", bullet_style))
    story.append(Spacer(1, 10))

    # Phase 3: Proximity Auto-Dispatch & 10-Min Response Timeout
    story.append(Paragraph("4. Phase 3: Proximity Auto-Dispatch & Driver Assignment", h1_style))
    story.append(Paragraph(
        "The automated dispatch engine (<code>dispatchEngine.js</code>) utilizes geospatial calculations to route deliveries to the closest available driver:",
        body_style
    ))
    story.append(Paragraph("• <b>Haversine Distance Matching:</b> The engine queries all approved drivers with <code>status = 'active'</code>, <code>driver_availability.is_available = true</code>, and <code>is_on_delivery = false</code>. It computes the geodesic distance between the store warehouse (default: <code>lat: 5.1065, lng: 7.3667</code>) and each driver's most recent GPS coordinates in <code>driver_locations</code>.", bullet_style))
    story.append(Paragraph("• <b>Assignment Creation:</b> The closest driver is assigned, creating a <code>deliveries</code> record (<code>status: 'assigned'</code>), updating <code>orders.status = 'driver_assigned'</code>, and dispatching a high-priority in-app alert via <code>driver_notifications</code>.", bullet_style))
    story.append(Paragraph("• <b>10-Minute Response Timeout & Auto-Reassignment:</b> If the assigned driver does not accept or reach the store within <b>10 minutes</b>, the system automatically marks the driver assignment timed out, increments their non-response tally, and re-routes the order to the next closest available driver in the zone.", bullet_style))
    story.append(Paragraph("• <b>Manual Admin Override:</b> Dispatch managers can manually reassign the delivery to any specific driver if required via <code>PATCH /api/admin/deliveries/:id/reassign</code>.", bullet_style))
    story.append(Spacer(1, 10))

    # Phase 4: Store Pickup, Transit & GPS Streaming
    story.append(Paragraph("5. Phase 4: Driver Store Pickup & Live Transit", h1_style))
    story.append(Paragraph(
        "The driver navigates to the store and commences the delivery run:",
        body_style
    ))
    story.append(Paragraph("• <b>Store Arrival & Package Collection:</b> The driver presents their assignment screen, collects the packaged items and invoice, and taps <b>'Confirm Picked Up'</b> (<code>PATCH /api/driver/deliveries/:id/status</code> with <code>status: 'en_route'</code>).", bullet_style))
    story.append(Paragraph("• <b>In-Transit Lock:</b> The system sets <code>driver_availability.is_on_delivery = true</code> and <code>orders.tracking_status = 'out_for_delivery'</code>. While on active delivery, the driver is automatically excluded from receiving new order dispatches.", bullet_style))
    story.append(Paragraph("• <b>Periodic GPS Streaming:</b> While on transit, the driver's mobile app streams GPS location pings (<code>latitude</code>, <code>longitude</code>, <code>heading</code>, <code>speed</code>) every <b>10–15 seconds</b> via <code>POST /api/driver/location</code>.", bullet_style))
    story.append(Paragraph("• <b>Customer Live Tracking:</b> The customer can view the driver moving in real-time on the map at <code>/track-order/:trackingCode</code>, with updated ETAs.", bullet_style))
    story.append(Spacer(1, 10))

    # Phase 5: Doorstep Arrival, Item Snapshot & Verification
    story.append(Paragraph("6. Phase 5: Doorstep Arrival & Item-by-Item Verification", h1_style))
    story.append(Paragraph(
        "Upon arriving at the customer's delivery destination, the driver performs mandatory handover checks:",
        body_style
    ))
    story.append(Paragraph("• <b>1. Doorstep Arrival Ping:</b> The driver taps <b>'Arrived at Location'</b> (<code>status: 'arrived'</code>). The system stamps <code>deliveries.arrived_at</code> and triggers an immediate push notification and SMS to the customer.", bullet_style))
    story.append(Paragraph("• <b>2. Mandatory Item-by-Item Snapshots:</b> To ensure complete proof of delivery and prevent missing item disputes, the driver uses the Driver App camera to capture a photo of each item/bundle delivered. Photos are saved in <code>proof_photos</code> and <code>item_proofs</code>.", bullet_style))
    story.append(Paragraph("• <b>3. Customer Physical Inspection:</b> The customer verifies the packaged items against their order invoice in the presence of the driver.", bullet_style))
    story.append(Spacer(1, 10))

    # Phase 6: Outcomes & Dispute Resolution
    story.append(Paragraph("7. Phase 6: Delivery Outcomes & Dispute Resolution", h1_style))
    story.append(Paragraph(
        "Depending on the result of the customer inspection, the delivery concludes in one of three standardized paths:",
        body_style
    ))

    # Outcomes Table
    outcome_data = [
        [
            Paragraph("Outcome Scenario", table_header_style),
            Paragraph("System & Operational Actions", table_header_style),
            Paragraph("Financial & Inventory Settlement", table_header_style)
        ],
        [
            Paragraph("<b>Scenario A: Successful Delivery</b><br/>(All Goods Correct)", table_body_style),
            Paragraph(
                "1. Customer taps <b>'Confirm Delivery'</b> on their app (<code>PATCH /api/orders/:id/confirm</code>).<br/>"
                "2. Driver clicks <b>'Complete Delivery'</b> (<code>status: 'delivered'</code>).<br/>"
                "3. System sets <code>orders.status = 'delivered'</code> and <code>deliveries.delivered_at = NOW()</code>.",
                table_body_style
            ),
            Paragraph(
                "• Driver commission (e.g. ₦500 – ₦1,200) is instantly credited to <code>drivers.total_earnings</code> and recorded in <code>driver_commissions</code>.<br/>"
                "• Driver availability resets to <code>is_on_delivery = false</code>, ready for next dispatch.",
                table_body_style
            )
        ],
        [
            Paragraph("<b>Scenario B: Customer Unavailable</b><br/>(No Answer at Door/Phone)", table_body_style),
            Paragraph(
                "1. Driver taps <b>'Customer Unavailable'</b> (<code>status: 'delivery_attempted'</code>).<br/>"
                "2. System sends urgent SMS/Push alerts & starts a <b>15-Minute Countdown</b>.<br/>"
                "3. If customer reaches out within 15 mins $\\rightarrow$ Delivery is completed.<br/>"
                "4. If timer expires $\\rightarrow$ Attempt counter increments (max 2 attempts).",
                table_body_style
            ),
            Paragraph(
                "• Dispatch Manager receives alert in Admin Portal.<br/>"
                "• Admin either schedules a re-delivery window or directs the driver to return items to warehouse.<br/>"
                "• Returned items are checked back into inventory.",
                table_body_style
            )
        ],
        [
            Paragraph("<b>Scenario C: Issue / Dispute Reported</b><br/>(Damage, Missing Item, Defect)", table_body_style),
            Paragraph(
                "1. Customer taps <b>'Report Issue'</b> on their app (<code>POST /api/orders/:id/report</code>) and uploads photos of discrepancy.<br/>"
                "2. Delivery Manager receives high-priority dispute ticket in Admin Portal.<br/>"
                "3. Admin reviews customer photos against the driver's POD item snapshots.",
                table_body_style
            ),
            Paragraph(
                "• <b>Full/Partial Refund:</b> Credited to customer wallet or original bank account.<br/>"
                "• <b>Replacement Dispatch:</b> Store dispatches replacement immediately via another courier.<br/>"
                "• Returned damaged goods are logged under lost/damaged inventory ledger.",
                table_body_style
            )
        ],
    ]
    outcome_table = Table(outcome_data, colWidths=[120, 220, 200])
    outcome_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COL),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(outcome_table)
    story.append(Spacer(1, 14))

    # Driver Commission & Wallet System Summary
    story.append(Paragraph("8. Driver Wallet & Automated Commission Payouts", h1_style))
    story.append(Paragraph(
        "Upon completing deliveries, driver earnings are managed through an automated ledger and bank payout system:",
        body_style
    ))
    story.append(Paragraph("• <b>Real-Time Commission Accrual:</b> Every successfully delivered order immediately credits the driver's wallet with their per-drop commission (configured per zone and vehicle type).", bullet_style))
    story.append(Paragraph("• <b>Dedicated Inflow Virtual Account:</b> Each driver receives a dedicated Monnify Virtual Account (e.g. <code>855XXXXXXX - Monnify / Wema Bank</code>) for direct credits and earnings tracking.", bullet_style))
    story.append(Paragraph("• <b>Self-Service Bank Withdrawals:</b> Drivers can request instant withdrawals from their mobile wallet (<code>POST /api/driver/withdraw</code>) to their personal Nigerian bank account. Withdrawals are processed and disbursed via the Admin Payouts Manager.", bullet_style))
    story.append(Spacer(1, 14))

    # Summary Verification Checklist
    story.append(Paragraph("9. Operational Verification & Compliance Checklist", h1_style))
    
    check_data = [
        [
            Paragraph("Checklist Item", table_header_style),
            Paragraph("Standard Requirement", table_header_style),
            Paragraph("Enforcement Layer", table_header_style)
        ],
        [
            Paragraph("<b>Address Geocoding</b>", table_body_style),
            Paragraph("Mandatory valid GPS latitude & longitude coordinates", table_body_style),
            Paragraph("Frontend validateForm & Backend Zod Order Schema", table_body_style)
        ],
        [
            Paragraph("<b>Driver Availability Lock</b>", table_body_style),
            Paragraph("Unverified/Suspended drivers cannot toggle online; in-transit drivers locked", table_body_style),
            Paragraph("<code>PATCH /api/driver/availability</code> & <code>dispatchEngine</code>", table_body_style)
        ],
        [
            Paragraph("<b>Dispatch Timeout</b>", table_body_style),
            Paragraph("10-Minute non-response threshold triggers auto-reassignment to next driver", table_body_style),
            Paragraph("Backend Cron / Dispatch Engine Timer", table_body_style)
        ],
        [
            Paragraph("<b>Proof of Delivery (POD)</b>", table_body_style),
            Paragraph("Item-by-item photo capture uploaded to <code>proof_photos</code>", table_body_style),
            Paragraph("Driver Mobile App Camera & Multipart KYC/POD Endpoint", table_body_style)
        ],
        [
            Paragraph("<b>Double Confirmation</b>", table_body_style),
            Paragraph("Both customer and driver confirmation required for clean status closing", table_body_style),
            Paragraph("<code>/orders/:id/confirm</code> & <code>/driver/deliveries/:id/status</code>", table_body_style)
        ],
    ]
    check_table = Table(check_data, colWidths=[130, 230, 180])
    check_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COL),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(check_table)

    # Build Document using NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"✅ Successfully generated PDF: {filename}")

if __name__ == "__main__":
    output_pdf = sys.argv[1] if len(sys.argv) > 1 else "BEMS_FARMS_ORDER_TO_DELIVERY_WORKFLOW_SPECIFICATION.pdf"
    build_pdf(output_pdf)
