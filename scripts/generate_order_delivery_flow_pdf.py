#!/usr/bin/env python3
"""
BEMS FARMS — ORDER & DELIVERY FLOW (PDF GENERATOR)
Matches the exact visual styling, tabular structure, and granular role-by-role progression
from Customer Checkout to Admin Processing, Proximity Driver Assignment, Live GPS Transit,
Item Proof Capture, Customer & Driver Confirmation, and Wallet Settlement.
"""

import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, PageBreak
)
from reportlab.pdfgen import canvas

# Theme Palette (Purple / Indigo theme matching the user reference screenshot)
PRIMARY_PURPLE = colors.HexColor("#4F46E5")  # Indigo 600
DARK_PURPLE = colors.HexColor("#312E81")     # Indigo 900
LIGHT_PURPLE = colors.HexColor("#EEF2FF")    # Indigo 50
ACCENT_PURPLE = colors.HexColor("#6366F1")   # Indigo 500
BORDER_COLOR = colors.HexColor("#E0E7FF")    # Indigo 100
TEXT_MAIN = colors.HexColor("#1E293B")       # Slate 800
TEXT_MUTED = colors.HexColor("#64748B")      # Slate 500
SUCCESS_GREEN = colors.HexColor("#059669")   # Emerald 600
AMBER_WARN = colors.HexColor("#D97706")      # Amber 600
RED_ALERT = colors.HexColor("#DC2626")       # Red 600

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
        self.setFillColor(DARK_PURPLE)
        self.drawString(36, 758, "BEMS FARMS — ORDER & DELIVERY WORKFLOW")
        self.setFont("Helvetica", 7.5)
        self.setFillColor(TEXT_MUTED)
        self.drawRightString(576, 758, "Customer → Admin/System → Driver → Delivery Confirmation → Completion")
        
        self.setStrokeColor(BORDER_COLOR)
        self.setLineWidth(0.75)
        self.line(36, 752, 576, 752)
        
        # Bottom running footer
        self.line(36, 36, 576, 36)
        self.setFont("Helvetica", 7.5)
        self.setFillColor(TEXT_MUTED)
        self.drawString(36, 25, "Confidential • Bems Farms Ltd Logistics & Dispatch System")
        self.drawRightString(576, 25, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def generate_pdf(filename="Order_Delivery_Flow.pdf"):
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
        'MainTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0F172A"),
        alignment=1, # Center
        spaceAfter=4
    )

    sub_title_style = ParagraphStyle(
        'SubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=TEXT_MUTED,
        alignment=1, # Center
        spaceAfter=14
    )

    section_heading = ParagraphStyle(
        'SecHead',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11.5,
        leading=15,
        textColor=PRIMARY_PURPLE,
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )

    subsection_heading = ParagraphStyle(
        'SubSecHead',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=DARK_PURPLE,
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True
    )

    cell_num_style = ParagraphStyle(
        'CellNum',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=DARK_PURPLE,
        alignment=1
    )

    cell_actor_style = ParagraphStyle(
        'CellActor',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=DARK_PURPLE
    )

    cell_desc_style = ParagraphStyle(
        'CellDesc',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=TEXT_MAIN
    )

    body_text_style = ParagraphStyle(
        'BodyTxt',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=TEXT_MAIN,
        spaceAfter=4
    )

    bullet_style = ParagraphStyle(
        'BulletTxt',
        parent=body_text_style,
        leftIndent=10,
        firstLineIndent=-6,
        spaceAfter=2
    )

    story = []

    # Title & Header
    story.append(Paragraph("Order & Delivery Flow", title_style))
    story.append(Paragraph("Customer &rarr; Admin/System &rarr; Driver &rarr; Delivery Confirmation &rarr; Completion", sub_title_style))
    story.append(Spacer(1, 4))

    # SECTION 1: DETAILED END-TO-END FLOW (Exact table format from reference)
    story.append(Paragraph("1. Detailed End-to-End Flow", section_heading))

    flow_rows = [
        [
            Paragraph("1", cell_num_style),
            Paragraph("CUSTOMER", cell_actor_style),
            Paragraph("Customer adds products to the cart and proceeds to place the order.", cell_desc_style)
        ],
        [
            Paragraph("2", cell_num_style),
            Paragraph("PAYMENT", cell_actor_style),
            Paragraph("Customer chooses either <b>Pay Immediately</b> (Card, Transfer, USSD via Monnify) or <b>Pay on Delivery</b> (Cash on Delivery).", cell_desc_style)
        ],
        [
            Paragraph("3", cell_num_style),
            Paragraph("ORDER CREATED", cell_actor_style),
            Paragraph("The order is created successfully in the system (status: <code>order_placed</code> / <code>confirmed</code>). Verified GPS coordinates are attached.", cell_desc_style)
        ],
        [
            Paragraph("4", cell_num_style),
            Paragraph("CUSTOMER: ALL", cell_actor_style),
            Paragraph("The newly created order appears under the customer's <b>All</b> orders tab in their web storefront or mobile app.", cell_desc_style)
        ],
        [
            Paragraph("5", cell_num_style),
            Paragraph("CUSTOMER: PENDING", cell_actor_style),
            Paragraph("The order moves/is displayed as <b>Pending</b> while waiting for store packaging, invoice printing, and driver assignment.", cell_desc_style)
        ],
        [
            Paragraph("6", cell_num_style),
            Paragraph("ADMIN / SYSTEM", cell_actor_style),
            Paragraph("Admin receives the order, prints the Sales/Packaging Invoice, salesperson verifies items out of inventory, and system initiates proximity driver routing.", cell_desc_style)
        ],
        [
            Paragraph("7", cell_num_style),
            Paragraph("DRIVER ASSIGNMENT", cell_actor_style),
            Paragraph("The selected closest available driver receives the real-time delivery assignment notification on their Driver Mobile App.", cell_desc_style)
        ],
        [
            Paragraph("8", cell_num_style),
            Paragraph("DRIVER DECISION", cell_actor_style),
            Paragraph("Driver can either <b>Accept</b> or <b>Decline</b> the assignment on their device.", cell_desc_style)
        ],
        [
            Paragraph("9A", cell_num_style),
            Paragraph("IF DECLINED", cell_actor_style),
            Paragraph("If the driver declines (or if <b>10 minutes</b> elapse without response), the system automatically reassigns the order to the next closest available driver in the zone.", cell_desc_style)
        ],
        [
            Paragraph("9B", cell_num_style),
            Paragraph("IF ACCEPTED", cell_actor_style),
            Paragraph("The order becomes <b>Active</b> on the driver's side. The driver proceeds to the store warehouse to collect the packaged produce.", cell_desc_style)
        ],
        [
            Paragraph("10", cell_num_style),
            Paragraph("STATUS SYNC", cell_actor_style),
            Paragraph("At this point, the customer continues to see <b>Pending / Packaging</b>, the driver sees <b>Active (Store Pickup)</b>, and the admin sees <b>Assigned / In Packaging</b>.", cell_desc_style)
        ],
        [
            Paragraph("11", cell_num_style),
            Paragraph("DELIVERY / IN TRANSIT", cell_actor_style),
            Paragraph("Driver confirms pickup from the store (status: <code>en_route</code> / <code>in_transit</code>), streaming GPS coordinates every 10–15s while traveling to the destination.", cell_desc_style)
        ],
        [
            Paragraph("12", cell_num_style),
            Paragraph("ARRIVAL", cell_actor_style),
            Paragraph("Driver reaches destination and taps <b>'Arrived at Location'</b>. Customer receives an instant arrival notification.", cell_desc_style)
        ],
        [
            Paragraph("13", cell_num_style),
            Paragraph("DELIVERY PROOF", cell_actor_style),
            Paragraph("Driver takes a mandatory item-by-item delivery photo snapshot (<code>proof_photos</code> & <code>item_proofs</code>) and uploads it through the app.", cell_desc_style)
        ],
        [
            Paragraph("14", cell_num_style),
            Paragraph("CUSTOMER: CONFIRM", cell_actor_style),
            Paragraph("The system moves the order to the customer's <b>Confirm</b> tab for delivery confirmation and physical inspection.", cell_desc_style)
        ],
        [
            Paragraph("15", cell_num_style),
            Paragraph("CUSTOMER CONFIRMS", cell_actor_style),
            Paragraph("Customer inspects goods, reviews the delivery proof, and taps <b>'Confirm Delivery'</b> (<code>PATCH /api/orders/:id/confirm</code>).", cell_desc_style)
        ],
        [
            Paragraph("16", cell_num_style),
            Paragraph("CUSTOMER: DELIVERED", cell_actor_style),
            Paragraph("The order immediately moves to the customer's <b>Delivered</b> tab.", cell_desc_style)
        ],
        [
            Paragraph("17", cell_num_style),
            Paragraph("DRIVER: FINAL CONFIRMATION", cell_actor_style),
            Paragraph("The driver's <b>Delivered / Complete Delivery</b> action unlocks and becomes available on the mobile app.", cell_desc_style)
        ],
        [
            Paragraph("18", cell_num_style),
            Paragraph("DRIVER: HISTORY & WALLET", cell_actor_style),
            Paragraph("Driver confirms the completed delivery. The order moves from <b>Active</b> to <b>History</b>, and commission is credited immediately to the driver's wallet.", cell_desc_style)
        ],
    ]

    flow_table = Table(flow_rows, colWidths=[32, 125, 383])
    flow_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), LIGHT_PURPLE),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 3.8),
        # Alternating background colors
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(flow_table)
    story.append(Spacer(1, 10))

    story.append(PageBreak())

    # SECTION 2: THREE-SIDED SYNCHRONIZATION MATRIX
    story.append(Paragraph("2. Real-Time State Synchronization Across Roles", section_heading))
    story.append(Paragraph(
        "To ensure zero ambiguity during order progression, the table below maps how each milestone is reflected in real time across the **Customer Portal**, **Driver Mobile App**, and **Admin Operations Dashboard**:",
        body_text_style
    ))

    matrix_rows = [
        [
            Paragraph("Milestone Stage", cell_actor_style),
            Paragraph("Customer Interface", cell_actor_style),
            Paragraph("Driver Mobile App", cell_actor_style),
            Paragraph("Admin / Dispatch Hub", cell_actor_style)
        ],
        [
            Paragraph("<b>1. Order Placed</b>", cell_desc_style),
            Paragraph("<font color='#D97706'><b>Pending</b></font><br/>(All Tab & Pending Tab)", cell_desc_style),
            Paragraph("<i>Not visible yet</i>", cell_desc_style),
            Paragraph("<font color='#2563EB'><b>New Order / Confirmed</b></font><br/>Ready for Invoice Print", cell_desc_style)
        ],
        [
            Paragraph("<b>2. Store Packaging</b>", cell_desc_style),
            Paragraph("<font color='#D97706'><b>Processing / Packaging</b></font><br/>Items being packed", cell_desc_style),
            Paragraph("<i>Not visible yet</i>", cell_desc_style),
            Paragraph("<font color='#D97706'><b>Packaging</b></font><br/>Salesperson verifies stock", cell_desc_style)
        ],
        [
            Paragraph("<b>3. Driver Assigned</b>", cell_desc_style),
            Paragraph("<font color='#D97706'><b>Driver Assigned</b></font><br/>Courier designated", cell_desc_style),
            Paragraph("<font color='#4F46E5'><b>New Request Incoming</b></font><br/>Accept / Decline (10m Timer)", cell_desc_style),
            Paragraph("<font color='#2563EB'><b>Assigned</b></font><br/>Driver assigned via GPS", cell_desc_style)
        ],
        [
            Paragraph("<b>4. Store Pickup / En Route</b>", cell_desc_style),
            Paragraph("<font color='#059669'><b>Out for Delivery</b></font><br/>Live Map Tracking Active", cell_desc_style),
            Paragraph("<font color='#059669'><b>Active Delivery (In Transit)</b></font><br/>Streaming GPS coordinates", cell_desc_style),
            Paragraph("<font color='#0D9488'><b>Out for Delivery / En Route</b></font><br/>Live Fleet Map pin moving", cell_desc_style)
        ],
        [
            Paragraph("<b>5. Doorstep Arrival</b>", cell_desc_style),
            Paragraph("<font color='#7C3AED'><b>Driver Arrived</b></font><br/>Alert: Meet driver at door", cell_desc_style),
            Paragraph("<font color='#7C3AED'><b>Arrived at Location</b></font><br/>Take item-by-item photos", cell_desc_style),
            Paragraph("<font color='#7C3AED'><b>Driver Arrived</b></font><br/>Timestamp recorded", cell_desc_style)
        ],
        [
            Paragraph("<b>6. Proof Uploaded</b>", cell_desc_style),
            Paragraph("<font color='#4F46E5'><b>Confirm Delivery Tab</b></font><br/>Inspect goods & tap Confirm", cell_desc_style),
            Paragraph("<b>POD Uploaded</b><br/>Awaiting customer check", cell_desc_style),
            Paragraph("<b>POD Verified</b><br/>Photos visible on admin ticket", cell_desc_style)
        ],
        [
            Paragraph("<b>7. Customer Confirms</b>", cell_desc_style),
            Paragraph("<font color='#059669'><b>Delivered Tab</b></font><br/>Receipt & rating available", cell_desc_style),
            Paragraph("<font color='#059669'><b>Complete Delivery Unlocked</b></font><br/>Driver taps to finalize", cell_desc_style),
            Paragraph("<font color='#059669'><b>Customer Confirmed</b></font><br/>Delivery completed cleanly", cell_desc_style)
        ],
        [
            Paragraph("<b>8. Final Completion</b>", cell_desc_style),
            Paragraph("<b>Order Archived / History</b><br/>Invoice downloadable", cell_desc_style),
            Paragraph("<font color='#059669'><b>Moved to History Tab</b></font><br/>Wallet credited with commission", cell_desc_style),
            Paragraph("<font color='#059669'><b>Delivered (Completed)</b></font><br/>Driver ledger reconciled", cell_desc_style)
        ],
    ]

    matrix_table = Table(matrix_rows, colWidths=[90, 150, 150, 150])
    matrix_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), LIGHT_PURPLE),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(matrix_table)
    story.append(Spacer(1, 10))

    # SECTION 3: TAB PROGRESSION ON CUSTOMER AND DRIVER APPS
    story.append(Paragraph("3. Customer App & Driver App Tab Navigation Breakdown", section_heading))

    story.append(Paragraph("A. Customer App Order Navigation Tabs", subsection_heading))
    story.append(Paragraph("• <b>All Tab:</b> Displays the customer's entire order history regardless of status.", bullet_style))
    story.append(Paragraph("• <b>Pending Tab:</b> Holds newly placed orders awaiting warehouse invoice printing, packing, or proximity driver routing.", bullet_style))
    story.append(Paragraph("• <b>In-Transit (Track) Tab:</b> Shows live driver GPS marker, vehicle details, estimated arrival time, and route navigation.", bullet_style))
    story.append(Paragraph("• <b>Confirm Tab:</b> Activated when the driver arrives and uploads item photo proofs. Allows customer to physically inspect goods and tap <b>'Confirm Delivery'</b> or <b>'Report Issue'</b>.", bullet_style))
    story.append(Paragraph("• <b>Delivered Tab:</b> Archives fully completed orders with downloadable PDF receipts and driver rating stars.", bullet_style))
    story.append(Spacer(1, 4))

    story.append(Paragraph("B. Driver App Order Navigation Tabs", subsection_heading))
    story.append(Paragraph("• <b>New Dispatches (Popup / Queue):</b> High-priority assignment ticket displaying store address, order items, and delivery zone with Accept / Decline options (10-minute response timer).", bullet_style))
    story.append(Paragraph("• <b>Active Tab:</b> Holds the single order currently assigned to the driver. Guides driver through Store Pickup &rarr; En Route &rarr; Arrived &rarr; Item Photo Capture &rarr; Complete Delivery.", bullet_style))
    story.append(Paragraph("• <b>History Tab:</b> Lists past delivered orders with per-order commission breakdown, pickup/delivery timestamps, and customer feedback.", bullet_style))
    story.append(Paragraph("• <b>Wallet Tab:</b> Displays available commission earnings, dedicated inflow virtual account details, and instant bank withdrawal triggers.", bullet_style))
    story.append(Spacer(1, 10))

    story.append(PageBreak())

    # SECTION 4: EXCEPTION HANDLING & RESOLUTION WORKFLOWS
    story.append(Paragraph("4. Exception Handling & Dispute Resolution Protocols", section_heading))
    story.append(Paragraph(
        "In the event of delivery obstacles or product discrepancies, the system enforces automated standard operating procedures (SOPs):",
        body_text_style
    ))

    exception_rows = [
        [
            Paragraph("Exception Scenario", cell_actor_style),
            Paragraph("Trigger & Detection", cell_actor_style),
            Paragraph("Standard Operating Procedure (SOP) & Financial Resolution", cell_actor_style)
        ],
        [
            Paragraph("<b>1. Customer Unavailable at Destination</b>", cell_desc_style),
            Paragraph("Driver arrives but customer does not answer door or phone calls.", cell_desc_style),
            Paragraph(
                "1. Driver taps <b>'Customer Unavailable'</b> (<code>status: 'delivery_attempted'</code>).<br/>"
                "2. System sends high-priority SMS & Push alerts and starts an automated <b>15-Minute Countdown Timer</b>.<br/>"
                "3. If customer responds within 15 minutes $\\rightarrow$ Delivery proceeds normally.<br/>"
                "4. If timer expires $\\rightarrow$ Attempt counter increments (max 2 attempts). Dispatch Manager receives alert to reschedule or instruct driver to return items to warehouse for restocking.",
                cell_desc_style
            )
        ],
        [
            Paragraph("<b>2. Assigned Driver Fails to Respond (10-Min Timeout)</b>", cell_desc_style),
            Paragraph("Closest mapped driver does not accept or reach store within 10 minutes.", cell_desc_style),
            Paragraph(
                "1. Automated dispatch monitor flags non-response at minute 10.<br/>"
                "2. The system revokes the assignment and auto-routes the delivery ticket to the <b>next closest available driver</b> in the zone.<br/>"
                "3. Driver non-response tally increments for dispatch operations review.",
                cell_desc_style
            )
        ],
        [
            Paragraph("<b>3. Damaged Produce / Wrong Item / Quantity Defect</b>", cell_desc_style),
            Paragraph("Customer identifies issue during physical inspection upon driver arrival.", cell_desc_style),
            Paragraph(
                "1. Customer taps <b>'Report Issue'</b> on their app (<code>POST /api/orders/:id/report</code>) and uploads discrepancy photos.<br/>"
                "2. Dispatch Manager receives dispute ticket in Admin Portal.<br/>"
                "3. Admin compares customer photos against driver's doorstep item snapshots.<br/>"
                "4. <b>Resolution Options:</b><br/>"
                "   • <i>Full / Partial Refund:</i> Recredited to customer wallet or original bank card.<br/>"
                "   • <i>Immediate Replacement:</i> Warehouse packs fresh items and dispatches replacement.<br/>"
                "   • <i>Rejected:</i> Formal audited reason sent to customer if claim is unsubstantiated.",
                cell_desc_style
            )
        ],
        [
            Paragraph("<b>4. Driver Shift & In-Transit Lockout</b>", cell_desc_style),
            Paragraph("Driver attempts to accept multiple concurrent orders.", cell_desc_style),
            Paragraph(
                "• While on active delivery (<code>is_on_delivery = true</code>), the system automatically locks the driver's profile from receiving new order dispatches, ensuring 100% focused doorstep fulfillment.",
                cell_desc_style
            )
        ],
    ]

    exception_table = Table(exception_rows, colWidths=[120, 140, 280])
    exception_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), LIGHT_PURPLE),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(exception_table)
    story.append(Spacer(1, 10))

    # SECTION 5: OPERATIONAL COMPLIANCE SUMMARY
    story.append(Paragraph("5. Driver Wallet & Automated Commission Settlement", section_heading))
    story.append(Paragraph(
        "Upon completing deliveries, driver remuneration is processed seamlessly via the dedicated wallet architecture:",
        body_text_style
    ))
    story.append(Paragraph("• <b>Instant Commission Accrual:</b> Every delivery marked <code>delivered</code> instantly credits the driver's commission balance (₦500 – ₦1,200 depending on zone and vehicle).", bullet_style))
    story.append(Paragraph("• <b>Dedicated Inflow Virtual Account:</b> Drivers are assigned a unique Monnify Virtual Account number (e.g., <code>855XXXXXXX - Monnify / Wema Bank</code>) for direct credits.", bullet_style))
    story.append(Paragraph("• <b>Instant Bank Withdrawal Requests:</b> Drivers initiate balance withdrawals from the mobile app (<code>POST /api/driver/withdraw</code>) to their verified Nigerian bank accounts, disbursed by operations admins via the Payouts Portal.", bullet_style))

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"✅ Successfully generated PDF: {filename}")

if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else "Order_Delivery_Flow.pdf"
    generate_pdf(out_file)
