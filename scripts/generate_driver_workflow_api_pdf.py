#!/usr/bin/env python3
"""
BEMS FARMS — DRIVER WORKFLOW & COMPLETE API SPECIFICATION (PDF GENERATOR)
Publication-grade technical integration blueprint for Mobile App Developers (React Native, Flutter, iOS & Android).
Combines the complete 18-step Order & Delivery Workflow with exact HTTP endpoints, request/response payloads,
authentication, real-time GPS telemetry, item-by-item proof upload, instant commission wallet credit, and 24h bank payout withdrawals.
"""

import sys
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, PageBreak, HRFlowable
)
from reportlab.pdfgen import canvas

# Palette definition
PRIMARY_DARK = colors.HexColor("#0F766E")   # Deep Teal 700
PRIMARY = colors.HexColor("#0D9488")        # Teal 600
PRIMARY_LIGHT = colors.HexColor("#F0FDFA")  # Teal 50
SECONDARY = colors.HexColor("#1E293B")      # Slate 800
SECONDARY_DARK = colors.HexColor("#0F172A") # Slate 900
TEXT_MAIN = colors.HexColor("#334155")      # Slate 700
TEXT_MUTED = colors.HexColor("#64748B")     # Slate 500
BORDER_COL = colors.HexColor("#CBD5E1")     # Slate 300
BORDER_LIGHT = colors.HexColor("#E2E8F0")   # Slate 200
CODE_BG = colors.HexColor("#F8FAFC")        # Slate 50

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
        # Header
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(PRIMARY_DARK)
        self.drawString(36, 758, "BEMS FARMS — DRIVER MOBILE APP API SPECIFICATION & WORKFLOW")
        self.setFont("Helvetica", 7.5)
        self.setFillColor(TEXT_MUTED)
        self.drawRightString(576, 758, "Mobile Developer Integration Guide • Version 2.0")
        
        self.setStrokeColor(BORDER_LIGHT)
        self.setLineWidth(0.75)
        self.line(36, 752, 576, 752)
        
        # Footer
        self.line(36, 36, 576, 36)
        self.setFont("Helvetica", 7.5)
        self.setFillColor(TEXT_MUTED)
        self.drawString(36, 25, "Confidential • Bems Farms Ltd. Logistics & Driver Dispatch Platform")
        self.drawRightString(576, 25, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def build_pdf(filename="BEMS_FARMS_DRIVER_WORKFLOW_AND_API_SPECIFICATION.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=52,
        bottomMargin=48
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=SECONDARY_DARK,
        spaceAfter=2
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=TEXT_MUTED,
        spaceAfter=6
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=13,
        textColor=PRIMARY_DARK,
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11.5,
        textColor=SECONDARY_DARK,
        spaceBefore=5,
        spaceAfter=2,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=TEXT_MAIN
    )

    bold_body_style = ParagraphStyle(
        'BoldBody_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=SECONDARY_DARK
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=6.2,
        leading=7.8,
        textColor=SECONDARY_DARK,
        backColor=CODE_BG,
        borderColor=BORDER_LIGHT,
        borderWidth=0.5,
        borderPadding=3,
        spaceBefore=1,
        spaceAfter=2
    )

    story = []

    # Title & Header
    story.append(Paragraph("🚚 Bems Farms — Driver Mobile App API Specification & Workflow", title_style))
    story.append(Paragraph("Complete Technical Integration Guide for Mobile Engineers (React Native, Flutter, Swift, Kotlin) • End-to-End Delivery Lifecycle", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceAfter=5))

    # Architecture Overview Box
    meta_data = [
        [
            Paragraph("<b>Target Mobile Frameworks:</b> React Native / Flutter / Native iOS & Android", body_style),
            Paragraph("<b>Authentication:</b> JWT Bearer (<code>Authorization: Bearer &lt;token&gt;</code>)", body_style)
        ],
        [
            Paragraph("<b>Production API Base URL:</b> https://api.bemsfarms.com/api/driver", body_style),
            Paragraph("<b>Customer Payment Standard:</b> 100% Paid upfront online (Customer never pays driver)", body_style)
        ],
        [
            Paragraph("<b>Driver Earnings:</b> Instant commission credited to in-app wallet within seconds of delivery", body_style),
            Paragraph("<b>Driver Payouts:</b> Instant withdrawal requests paid to personal bank account within 24 hours", body_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[270, 270])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), PRIMARY_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#99F6E4")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CCFBF1")),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 4))

    # SECTION 1: THE 18-STEP ORDER & DELIVERY WORKFLOW API MAPPING
    story.append(Paragraph("1. Step-by-Step Order & Delivery Workflow API Mapping (18 Steps)", h1_style))
    story.append(Paragraph("This table maps every stage of the active order and delivery flow directly to the specific API calls, background listeners, and status synchronization required on the mobile app.", body_style))
    story.append(Spacer(1, 3))

    flow_rows = [
        [
            Paragraph("<b>#</b>", bold_body_style),
            Paragraph("<b>Workflow Step &amp; Actor</b>", bold_body_style),
            Paragraph("<b>HTTP Method &amp; Endpoint</b>", bold_body_style),
            Paragraph("<b>Mobile App Action / Payload &amp; Sync State</b>", bold_body_style)
        ],
        [
            Paragraph("<b>1</b>", bold_body_style),
            Paragraph("<b>CUSTOMER</b><br/>Browse &amp; Add to Cart", body_style),
            Paragraph("<code>POST /api/orders</code><br/>(Client App)", body_style),
            Paragraph("Customer selects farm items (or uses Chef Bems AI) and proceeds to checkout.", body_style)
        ],
        [
            Paragraph("<b>2</b>", bold_body_style),
            Paragraph("<b>PAYMENT</b><br/>Upfront Online Payment", body_style),
            Paragraph("<code>POST /api/payments/initialize</code><br/>(Monnify / Paystack)", body_style),
            Paragraph("Customer pays 100% upfront via Card/Transfer/USSD. Payment is verified before dispatch.", body_style)
        ],
        [
            Paragraph("<b>3</b>", bold_body_style),
            Paragraph("<b>ORDER CREATED</b><br/>System Validation", body_style),
            Paragraph("<code>POST /api/orders</code><br/>Status: <code>order_placed</code>", body_style),
            Paragraph("Order record created in PostgreSQL database. Customer GPS coordinates and paid status verified.", body_style)
        ],
        [
            Paragraph("<b>4</b>", bold_body_style),
            Paragraph("<b>CUSTOMER: ALL</b><br/>Order Visibility", body_style),
            Paragraph("<code>GET /api/orders</code><br/>(Client App)", body_style),
            Paragraph("Order appears immediately under customer's <b>'All'</b> orders tab.", body_style)
        ],
        [
            Paragraph("<b>5</b>", bold_body_style),
            Paragraph("<b>CUSTOMER: PENDING</b><br/>Pending State", body_style),
            Paragraph("Status: <code>pending</code> / <code>packaging</code>", body_style),
            Paragraph("Order displays in <b>'Pending'</b> tab while awaiting store packaging and driver mapping.", body_style)
        ],
        [
            Paragraph("<b>6</b>", bold_body_style),
            Paragraph("<b>ADMIN / SYSTEM</b><br/>Packaging &amp; Proximity", body_style),
            Paragraph("<code>POST /api/orders/:id/auto-assign-driver</code><br/>(Internal Engine)", body_style),
            Paragraph("Store prints invoice, salesperson packs goods, system computes closest online driver via GPS Haversine.", body_style)
        ],
        [
            Paragraph("<b>7</b>", bold_body_style),
            Paragraph("<b>DRIVER ASSIGNMENT</b><br/>Push Alert Received", body_style),
            Paragraph("<b>Push Notification</b> / FCM / WebSocket<br/><code>GET /api/driver/deliveries</code>", body_style),
            Paragraph("The matched driver receives an instant pop-up notification with order summary and store pickup address.", body_style)
        ],
        [
            Paragraph("<b>8</b>", bold_body_style),
            Paragraph("<b>DRIVER DECISION</b><br/>Accept or Decline", body_style),
            Paragraph("<code>PATCH /api/driver/deliveries/:id/status</code><br/>or <code>/accept</code> / <code>/decline</code>", body_style),
            Paragraph("Driver is presented with modal: <b>Accept</b> or <b>Decline</b> (with countdown timer).", body_style)
        ],
        [
            Paragraph("<b>9A</b>", bold_body_style),
            Paragraph("<b>IF DECLINED</b><br/>Reassign Zone Driver", body_style),
            Paragraph("<code>PATCH .../status</code><br/><code>{\"status\": \"failed\", \"reason\": \"declined\"}</code>", body_style),
            Paragraph("If driver declines (or 10 mins elapse without response), backend automatically dispatches to next closest driver.", body_style)
        ],
        [
            Paragraph("<b>9B</b>", bold_body_style),
            Paragraph("<b>IF ACCEPTED</b><br/>Order Moves to Active", body_style),
            Paragraph("<code>PATCH .../status</code><br/><code>{\"status\": \"accepted\"}</code>", body_style),
            Paragraph("Order moves to driver's <b>'Active'</b> tab. Driver proceeds to store warehouse for pickup.", body_style)
        ],
        [
            Paragraph("<b>10</b>", bold_body_style),
            Paragraph("<b>STATUS SYNC</b><br/>Multi-Party Real-time", body_style),
            Paragraph("<code>GET /api/driver/deliveries</code><br/>Status: <code>awaiting_pickup</code>", body_style),
            Paragraph("Customer sees <b>'Packaging / Driver Assigned'</b>; Driver sees <b>'Active (Store Pickup)'</b>; Admin sees <b>'Assigned'</b>.", body_style)
        ],
        [
            Paragraph("<b>11</b>", bold_body_style),
            Paragraph("<b>DELIVERY / IN TRANSIT</b><br/>Store Pickup &amp; GPS", body_style),
            Paragraph("<code>PATCH .../status</code> <code>{\"status\": \"en_route\"}</code><br/><code>POST /api/driver/location</code>", body_style),
            Paragraph("Driver collects package from store, taps <b>'Confirm Picked Up'</b>. Background GPS streams every 10–15s.", body_style)
        ],
        [
            Paragraph("<b>12</b>", bold_body_style),
            Paragraph("<b>ARRIVAL</b><br/>Destination Reached", body_style),
            Paragraph("<code>PATCH .../status</code><br/><code>{\"status\": \"arrived\"}</code>", body_style),
            Paragraph("Driver arrives at customer location and taps <b>'Arrived at Location'</b>. Customer receives instant alert.", body_style)
        ],
        [
            Paragraph("<b>13</b>", bold_body_style),
            Paragraph("<b>DELIVERY PROOF</b><br/>Mandatory Photo Capture", body_style),
            Paragraph("<code>POST /api/driver/upload/proof</code><br/>(Camera snapshot)", body_style),
            Paragraph("Driver snaps mandatory item-by-item verification photos and package photo via camera before handoff.", body_style)
        ],
        [
            Paragraph("<b>14</b>", bold_body_style),
            Paragraph("<b>CUSTOMER: CONFIRM</b><br/>Inspection Stage", body_style),
            Paragraph("<code>GET /api/orders/:id</code><br/>Status: <code>driver_arrived</code>", body_style),
            Paragraph("Order moves to customer's <b>'Confirm'</b> tab for physical inspection of fresh goods.", body_style)
        ],
        [
            Paragraph("<b>15</b>", bold_body_style),
            Paragraph("<b>CUSTOMER CONFIRMS</b><br/>Delivery Accepted", body_style),
            Paragraph("<code>PATCH /api/orders/:id/confirm</code><br/>(Client App)", body_style),
            Paragraph("Customer verifies items & proof photos, taps <b>'Confirm Delivery'</b>. Unlocks driver completion button.", body_style)
        ],
        [
            Paragraph("<b>16</b>", bold_body_style),
            Paragraph("<b>CUSTOMER: DELIVERED</b><br/>Customer Completion", body_style),
            Paragraph("Status: <code>delivered</code>", body_style),
            Paragraph("Order immediately moves to customer's <b>'Delivered'</b> tab.", body_style)
        ],
        [
            Paragraph("<b>17</b>", bold_body_style),
            Paragraph("<b>DRIVER: FINAL CONFIRM</b><br/>Complete Delivery Action", body_style),
            Paragraph("<code>PATCH .../status</code><br/><code>{\"status\": \"delivered\"}</code>", body_style),
            Paragraph("Driver taps <b>'Complete Delivery'</b> button on mobile app.", body_style)
        ],
        [
            Paragraph("<b>18</b>", bold_body_style),
            Paragraph("<b>DRIVER: HISTORY &amp; WALLET</b><br/>Commission Credited", body_style),
            Paragraph("<code>GET /api/driver/earnings</code><br/><code>POST /api/driver/withdraw</code>", body_style),
            Paragraph("Order moves to Driver <b>'History'</b>. <b>Commission (+₦500.00+) is credited immediately to driver's in-app wallet within seconds</b>, ready for 24h bank payout.", body_style)
        ],
    ]

    t_flow = Table(flow_rows, colWidths=[20, 110, 160, 250])
    t_flow.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 1.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1.5),
        ('LEFTPADDING', (0,0), (-1,-1), 3),
        ('RIGHTPADDING', (0,0), (-1,-1), 3),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_flow)
    story.append(Spacer(1, 6))

    # SECTION 2: COMPLETE DRIVER MOBILE APP API REFERENCE
    story.append(Paragraph("2. Complete Driver Mobile App API Reference & Payloads", h1_style))
    story.append(Paragraph("All endpoints below require <code>Authorization: Bearer &lt;token&gt;</code> unless marked as Public.", body_style))
    story.append(Spacer(1, 3))

    # 2.1 AUTH & PROFILE
    story.append(Paragraph("2.1 Driver Authentication & Profile Management", h2_style))
    
    auth_doc = [
        [Paragraph("<b>Endpoint</b>", bold_body_style), Paragraph("<b>Method &amp; Auth</b>", bold_body_style), Paragraph("<b>Sample Request &amp; Response Payloads</b>", bold_body_style)],
        [
            Paragraph("<b>Driver Login</b><br/><code>/api/driver/auth/login</code>", body_style),
            Paragraph("<font color='#1E40AF'><b>POST</b></font><br/>Public", body_style),
            Paragraph("<b>Request:</b><br/><code>{\"phone\": \"08012345678\", \"password\": \"123456\"}</code><br/><b>Response (200 OK):</b><br/><code>{\"token\": \"eyJhbGci...\", \"driver\": {\"id\": 1, \"name\": \"Ibrahim Musa\", \"wallet_balance\": 16500.00, \"bank_name\": \"GTBank\", \"account_number\": \"0123456789\", \"is_available\": true}}</code>", code_style)
        ],
        [
            Paragraph("<b>Driver Registration</b><br/><code>/api/driver/auth/register</code>", body_style),
            Paragraph("<font color='#1E40AF'><b>POST</b></font><br/>Public", body_style),
            Paragraph("<b>Request:</b><br/><code>{\"name\": \"Ifeanyi Nwachukwu\", \"phone\": \"08031234567\", \"email\": \"ifeanyi@example.com\", \"password\": \"Pass123!\", \"vehicle_type\": \"motorcycle\", \"vehicle_plate\": \"ABA-456-XY\", \"nin_number\": \"12345678901\", \"bank_name\": \"First Bank\", \"account_number\": \"3012345678\", \"account_name\": \"Ifeanyi Nwachukwu\"}</code><br/><b>Response (201 Created):</b> <code>{\"status\": \"success\", \"message\": \"Application under review.\"}</code>", code_style)
        ],
        [
            Paragraph("<b>Get My Profile</b><br/><code>/api/driver/auth/me</code>", body_style),
            Paragraph("<font color='#065F46'><b>GET</b></font><br/>Bearer", body_style),
            Paragraph("<b>Response (200 OK):</b><br/><code>{\"driver\": {\"id\": 1, \"name\": \"Ibrahim Musa\", \"rating\": 4.8, \"total_deliveries\": 128, \"total_earnings\": 64000.00, \"is_available\": true, \"is_on_delivery\": false}}</code>", code_style)
        ],
        [
            Paragraph("<b>Toggle Online Status</b><br/><code>/api/driver/availability</code>", body_style),
            Paragraph("<font color='#92400E'><b>PATCH</b></font><br/>Bearer", body_style),
            Paragraph("<b>Request:</b> <code>{\"is_available\": true}</code><br/><b>Response (200 OK):</b> <code>{\"is_available\": true, \"message\": \"Driver is now ONLINE and ready for orders\"}</code>", code_style)
        ]
    ]
    t_auth = Table(auth_doc, colWidths=[120, 70, 350])
    t_auth.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 3),
        ('RIGHTPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_auth)
    story.append(Spacer(1, 6))

    # 2.2 DELIVERIES & MILESTONES
    story.append(Paragraph("2.2 Active Deliveries, Lifecycle Milestones & Proof of Delivery", h2_style))

    deliv_doc = [
        [Paragraph("<b>Endpoint</b>", bold_body_style), Paragraph("<b>Method &amp; Auth</b>", bold_body_style), Paragraph("<b>Sample Request &amp; Response Payloads</b>", bold_body_style)],
        [
            Paragraph("<b>Get Active Deliveries</b><br/><code>/api/driver/deliveries</code>", body_style),
            Paragraph("<font color='#065F46'><b>GET</b></font><br/>Bearer", body_style),
            Paragraph("<b>Response (200 OK):</b><br/><code>{\"count\": 1, \"deliveries\": [{\"delivery_id\": 42, \"delivery_ref\": \"DEL-2026-0042\", \"delivery_status\": \"assigned\", \"customer_name\": \"Emelda Ejike\", \"customer_phone\": \"08123456789\", \"customer_lat\": 9.0820, \"customer_lng\": 7.4951, \"delivery_address\": \"Plot 12, Gana Street, Maitama\", \"items\": [{\"product_name\": \"Fresh Eggs (Crate of 30)\", \"quantity\": 2, \"unit_price\": 4500}]}]}</code>", code_style)
        ],
        [
            Paragraph("<b>Accept Assignment</b><br/><code>/api/driver/deliveries/:id/status</code>", body_style),
            Paragraph("<font color='#92400E'><b>PATCH</b></font><br/>Bearer", body_style),
            Paragraph("<b>Request:</b> <code>{\"status\": \"accepted\"}</code><br/><b>Response (200 OK):</b> <code>{\"message\": \"Delivery accepted\", \"delivery_status\": \"accepted\"}</code>", code_style)
        ],
        [
            Paragraph("<b>Confirm Pickup (En Route)</b><br/><code>/api/driver/deliveries/:id/status</code>", body_style),
            Paragraph("<font color='#92400E'><b>PATCH</b></font><br/>Bearer", body_style),
            Paragraph("<b>Request:</b> <code>{\"status\": \"en_route\", \"eta_minutes\": 25}</code><br/><b>Response (200 OK):</b> <code>{\"message\": \"Order marked out for delivery\", \"tracking_status\": \"out_for_delivery\"}</code>", code_style)
        ],
        [
            Paragraph("<b>Mark Arrived</b><br/><code>/api/driver/deliveries/:id/status</code>", body_style),
            Paragraph("<font color='#92400E'><b>PATCH</b></font><br/>Bearer", body_style),
            Paragraph("<b>Request:</b> <code>{\"status\": \"arrived\"}</code><br/><b>Response (200 OK):</b> <code>{\"message\": \"Driver arrived at customer location\", \"tracking_status\": \"driver_arrived\"}</code>", code_style)
        ],
        [
            Paragraph("<b>Complete Delivery (POD)</b><br/><code>/api/driver/deliveries/:id/status</code>", body_style),
            Paragraph("<font color='#92400E'><b>PATCH</b></font><br/>Bearer", body_style),
            Paragraph("<b>Request:</b><br/><code>{\"status\": \"delivered\", \"proof_note\": \"Handed to customer.\", \"proof_photo\": \"https://api.bemsfarms.com/uploads/proof_42.jpg\", \"item_proofs\": [{\"item_id\": 210, \"product_name\": \"Fresh Eggs\", \"photo_url\": \"https://.../p1.jpg\", \"verified\": true}]}</code><br/><b>Response (200 OK):</b> <code>{\"message\": \"Delivered successfully. Commission credited to wallet instantly.\"}</code>", code_style)
        ],
        [
            Paragraph("<b>Delivery Failed / Unavailable</b><br/><code>/api/driver/deliveries/:id/status</code>", body_style),
            Paragraph("<font color='#92400E'><b>PATCH</b></font><br/>Bearer", body_style),
            Paragraph("<b>Request:</b> <code>{\"status\": \"failed\", \"failure_reason\": \"Customer phone unreachable after 3 calls.\"}</code><br/><b>Response (200 OK):</b> <code>{\"message\": \"Delivery marked attempted/failed\", \"tracking_status\": \"delivery_attempted\"}</code>", code_style)
        ],
        [
            Paragraph("<b>Delivery History</b><br/><code>/api/driver/deliveries/history</code>", body_style),
            Paragraph("<font color='#065F46'><b>GET</b></font><br/>Bearer", body_style),
            Paragraph("<b>Query Params:</b> <code>?page=1&amp;limit=20&amp;from_date=2026-09-01</code><br/><b>Response (200 OK):</b> <code>{\"total\": 45, \"stats\": {\"total_delivered\": 43, \"total_failed\": 2}, \"deliveries\": [...]}</code>", code_style)
        ]
    ]
    t_deliv = Table(deliv_doc, colWidths=[120, 70, 350])
    t_deliv.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 3),
        ('RIGHTPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_deliv)
    story.append(Spacer(1, 6))

    # 2.3 TELEMETRY, WALLET & WITHDRAWAL
    story.append(Paragraph("2.3 Live GPS Telemetry, In-App Wallet & 24h Bank Payouts", h2_style))

    wallet_doc = [
        [Paragraph("<b>Endpoint</b>", bold_body_style), Paragraph("<b>Method &amp; Auth</b>", bold_body_style), Paragraph("<b>Sample Request &amp; Response Payloads</b>", bold_body_style)],
        [
            Paragraph("<b>Periodic GPS Ping</b><br/><code>/api/driver/location</code>", body_style),
            Paragraph("<font color='#1E40AF'><b>POST</b></font><br/>Bearer", body_style),
            Paragraph("<b>Request (Background stream every 10–15s):</b><br/><code>{\"latitude\": 9.076543, \"longitude\": 7.398621, \"heading\": 182.5, \"speed\": 34.2, \"accuracy\": 5.0}</code><br/><b>Response (201 Created):</b> <code>{\"success\": true, \"recorded_at\": \"2026-09-22T10:45:12Z\"}</code>", code_style)
        ],
        [
            Paragraph("<b>Get Wallet &amp; Earnings</b><br/><code>/api/driver/earnings</code>", body_style),
            Paragraph("<font color='#065F46'><b>GET</b></font><br/>Bearer", body_style),
            Paragraph("<b>Response (200 OK - Updated immediately upon delivery completion):</b><br/><code>{\"wallet\": {\"total_earned\": 64000.00, \"total_paid\": 50000.00, \"available_balance\": 14000.00, \"commission_per_delivery\": 500.00, \"bank_details\": {\"bank_name\": \"GTBank\", \"account_number\": \"0123456789\", \"account_name\": \"Ibrahim Musa\"}}, \"commissions\": [...], \"payouts\": [...]}</code>", code_style)
        ],
        [
            Paragraph("<b>Request Bank Withdrawal (24h SLA)</b><br/><code>/api/driver/withdraw</code>", body_style),
            Paragraph("<font color='#1E40AF'><b>POST</b></font><br/>Bearer", body_style),
            Paragraph("<b>Request (Withdraw accumulated balance to driver's bank):</b><br/><code>{\"amount\": 10000, \"bank_name\": \"GTBank\", \"account_number\": \"0123456789\", \"account_name\": \"Ibrahim Musa\", \"notes\": \"Weekly payout\"}</code><br/><b>Response (201 Created):</b> <code>{\"message\": \"Withdrawal request submitted. Payout will be processed into your bank account within 24 hours.\", \"payout_ref\": \"PAY-MK91-8C3D\", \"remaining_balance\": 4000.00}</code>", code_style)
        ]
    ]
    t_wallet = Table(wallet_doc, colWidths=[120, 70, 350])
    t_wallet.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 3),
        ('RIGHTPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_wallet)
    story.append(Spacer(1, 6))

    # SECTION 3: MOBILE DEVELOPER IMPLEMENTATION CHECKLIST
    story.append(Paragraph("3. Mobile Developer Implementation Checklist & Deep Links", h1_style))
    
    checklist_data = [
        [
            Paragraph("<b>Feature</b>", bold_body_style),
            Paragraph("<b>Mobile Implementation Standard &amp; Code snippet</b>", bold_body_style)
        ],
        [
            Paragraph("<b>Instant Earnings Update</b>", body_style),
            Paragraph("When driver taps 'Complete Delivery' (or receives customer confirmation push), call <code>GET /api/driver/earnings</code> to immediately reflect the new wallet balance on the home screen within seconds.", body_style)
        ],
        [
            Paragraph("<b>Bank Payout Request</b>", body_style),
            Paragraph("Provide a 'Withdraw to Bank' button in the Driver Wallet screen calling <code>POST /api/driver/withdraw</code> with payout notice stating: <i>'Transfers are processed into your bank account within 24 hours.'</i>", body_style)
        ],
        [
            Paragraph("<b>Turn-by-Turn Navigation</b>", body_style),
            Paragraph("Deep link to external GPS apps using customer coordinates (<code>customer_lat</code>, <code>customer_lng</code>):<br/>• <b>Android / Google Maps:</b> <code>geo:${lat},${lng}?q=${lat},${lng}(${customer_name})</code><br/>• <b>iOS / Apple Maps:</b> <code>maps://?daddr=${lat},${lng}</code>", body_style)
        ],
        [
            Paragraph("<b>1-Tap Customer Contact</b>", body_style),
            Paragraph("• <b>Direct Phone Dialer:</b> <code>Linking.openURL(`tel:${customer_phone}`)</code><br/>• <b>WhatsApp Message:</b> <code>Linking.openURL(`https://wa.me/234${customer_phone.replace(/^0/, '')}`)</code>", body_style)
        ],
        [
            Paragraph("<b>Background GPS Streaming</b>", body_style),
            Paragraph("Configure background location task (<code>expo-location</code> / <code>geolocator</code>) to ping <code>POST /api/driver/location</code> every 10–15 seconds with distance filter = 10m when driver is <code>is_available: true</code> or <code>status: en_route</code>.", body_style)
        ],
        [
            Paragraph("<b>Token Storage &amp; Auth Header</b>", body_style),
            Paragraph("Store JWT securely via <code>expo-secure-store</code> / <code>EncryptedSharedPreferences</code> / <code>Keychain</code>. Attach <code>Authorization: Bearer &lt;token&gt;</code> on all Axios / Fetch requests.", body_style)
        ]
    ]
    t_check = Table(checklist_data, colWidths=[130, 410])
    t_check.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 3),
        ('RIGHTPADDING', (0,0), (-1,-1), 3),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_check)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"✅ Generated Comprehensive Driver Workflow & API Specification PDF: {filename}")

if __name__ == "__main__":
    output_filename = "BEMS_FARMS_DRIVER_WORKFLOW_AND_API_SPECIFICATION.pdf"
    if len(sys.argv) > 1:
        output_filename = sys.argv[1]
    build_pdf(output_filename)
