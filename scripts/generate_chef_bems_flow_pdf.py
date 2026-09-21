#!/usr/bin/env python3
"""
BEMS FARMS — CHEF BEMS VISUAL FLOWCHART & WEBHOOK GUIDE
Crystal-clear, high-impact 1-page visual flowchart explaining how normal chat
leads to Add-to-Cart, with zero technical jargon.
"""

import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.pdfgen import canvas

# Theme Palette
PRIMARY = colors.HexColor("#0D9488")      # Teal 600
PRIMARY_DARK = colors.HexColor("#0F766E") # Teal 700
NAVY = colors.HexColor("#0F172A")         # Slate 900
SLATE_TEXT = colors.HexColor("#334155")   # Slate 700
BORDER_LIGHT = colors.HexColor("#CBD5E1") # Slate 300

# Step Colors
STEP1_BG = colors.HexColor("#EFF6FF")     # Blue 50
STEP1_BORDER = colors.HexColor("#93C5FD") # Blue 300
STEP1_TITLE = colors.HexColor("#1D4ED8")  # Blue 700

STEP2_BG = colors.HexColor("#FEFCE8")     # Yellow 50
STEP2_BORDER = colors.HexColor("#FDE047") # Yellow 300
STEP2_TITLE = colors.HexColor("#A16207")  # Yellow 700

STEP3_BG = colors.HexColor("#FFF7ED")     # Orange 50
STEP3_BORDER = colors.HexColor("#FDBA74") # Orange 300
STEP3_TITLE = colors.HexColor("#C2410C")  # Orange 700

STEP4_BG = colors.HexColor("#ECFDF5")     # Green 50
STEP4_BORDER = colors.HexColor("#86EFAC") # Green 300
STEP4_TITLE = colors.HexColor("#15803D")  # Green 700

class CleanCanvas(canvas.Canvas):
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
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(PRIMARY_DARK)
        self.drawString(36, 758, "BEMS FARMS — CHEF BEMS CHAT & ADD-TO-CART FLOWCHART")
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawRightString(576, 758, "Visual Process Chart")
        
        self.setStrokeColor(BORDER_LIGHT)
        self.setLineWidth(0.75)
        self.line(36, 752, 576, 752)

        self.line(36, 32, 576, 32)
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(36, 22, "© 2026 Bems Farms Ltd. • Chef Bems AI Assistant")
        self.drawRightString(576, 22, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def build_pdf(filename="BEMS_FARMS_CHEF_BEMS_ADD_TO_CART_FLOW.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=50,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=PRIMARY_DARK,
        spaceAfter=2
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=SLATE_TEXT,
        spaceAfter=5
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=13,
        textColor=NAVY,
        spaceBefore=5,
        spaceAfter=3,
        keepWithNext=True
    )

    card_title_style = ParagraphStyle(
        'CardTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11
    )

    card_body_style = ParagraphStyle(
        'CardBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=SLATE_TEXT
    )

    arrow_style = ParagraphStyle(
        'ArrowStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=14,
        textColor=PRIMARY_DARK,
        alignment=1
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=6.5,
        leading=8.5,
        textColor=NAVY,
        backColor=colors.HexColor("#F8FAFC"),
        borderColor=BORDER_LIGHT,
        borderWidth=0.5,
        borderPadding=3,
        spaceBefore=1,
        spaceAfter=1
    )

    story = []

    # Title Banner
    story.append(Paragraph("👨‍🍳 Chef Bems: Normal Chat to Add-to-Cart Flowchart", title_style))
    story.append(Paragraph("A simple visual map showing how customer conversations naturally turn into grocery orders.", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceAfter=5))

    # WEBHOOK ADDRESS BANNER
    wb_data = [
        [
            Paragraph("<b>Target n8n Webhook:</b>", ParagraphStyle('WbT', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=PRIMARY_DARK)),
            Paragraph("<code>https://n8n.srv1987482.hstgr.cloud/webhook/chef-bems</code>", ParagraphStyle('WbC', fontName='Courier-Bold', fontSize=8, leading=10, textColor=NAVY))
        ]
    ]
    t_wb = Table(wb_data, colWidths=[130, 410])
    t_wb.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F0FDFA")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#99F6E4")),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_wb)
    story.append(Spacer(1, 5))

    # THE 4-STEP VISUAL CHART
    story.append(Paragraph("The 4-Step Conversational Shopping Journey", h1_style))

    # STEP 1 CARD
    step1_rows = [
        [
            Paragraph("<font color='#1D4ED8'><b>STEP 1: CUSTOMER STARTS CHATTING (EXPLORATION)</b></font>", ParagraphStyle('S1T', parent=card_title_style, textColor=STEP1_TITLE)),
            Paragraph("<font color='#64748B'>Cart: <b>🛒 Empty (0 items)</b></font>", ParagraphStyle('S1C', fontName='Helvetica-Bold', fontSize=7.5, leading=9.5, alignment=2))
        ],
        [
            Paragraph("<b>Customer Action:</b> Opens chat and asks general cooking questions:<br/>"
                      "<i>'What healthy Nigerian soup can I cook for someone managing blood sugar?'</i><br/>"
                      "<b>Chef Bems Answer:</b> Gives friendly culinary advice:<br/>"
                      "<i>'I recommend Okro Soup or Afang Soup! They are packed with fiber and have a low glycemic index. Which would you like to prepare?'</i>", card_body_style),
            Paragraph("<b>Status:</b><br/>"
                      "• Normal conversation<br/>"
                      "• Advice & suggestions only<br/>"
                      "• Nothing in cart yet", ParagraphStyle('S1S', fontName='Helvetica', fontSize=7, leading=9, textColor=STEP1_TITLE))
        ]
    ]
    t_s1 = Table(step1_rows, colWidths=[410, 130])
    t_s1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), STEP1_BG),
        ('BOX', (0,0), (-1,-1), 1, STEP1_BORDER),
        ('LINEBELOW', (0,0), (-1,0), 0.5, STEP1_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_s1)
    story.append(Spacer(1, 1))

    # ARROW 1
    story.append(Paragraph("⬇ <i>Customer continues chatting and asks for adjustments</i> ⬇", arrow_style))
    story.append(Spacer(1, 1))

    # STEP 2 CARD
    step2_rows = [
        [
            Paragraph("<font color='#A16207'><b>STEP 2: RECIPE REFINEMENT & FAMILY SIZING (DISCUSSION)</b></font>", ParagraphStyle('S2T', parent=card_title_style, textColor=STEP2_TITLE)),
            Paragraph("<font color='#64748B'>Cart: <b>🛒 Empty (0 items)</b></font>", ParagraphStyle('S2C', fontName='Helvetica-Bold', fontSize=7.5, leading=9.5, alignment=2))
        ],
        [
            Paragraph("<b>Customer Action:</b> Asks for portions, substitutions, and steps:<br/>"
                      "<i>'How do I make the Okro Soup for 5 people? Can I use fresh Catfish instead of beef?'</i><br/>"
                      "<b>Chef Bems Answer:</b> Customizes the recipe steps and portion quantities:<br/>"
                      "<i>'Yes! Fresh Catfish goes great with Okro and Ugu leaves. For 5 people, you will need 1kg Okro, 2 Catfish, Palm Oil, and Ugu. Here is the step-by-step cooking guide...'</i>", card_body_style),
            Paragraph("<b>Status:</b><br/>"
                      "• Chat memory active<br/>"
                      "• Portions adjusted for 5<br/>"
                      "• Ingredients finalized", ParagraphStyle('S2S', fontName='Helvetica', fontSize=7, leading=9, textColor=STEP2_TITLE))
        ]
    ]
    t_s2 = Table(step2_rows, colWidths=[410, 130])
    t_s2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), STEP2_BG),
        ('BOX', (0,0), (-1,-1), 1, STEP2_BORDER),
        ('LINEBELOW', (0,0), (-1,0), 0.5, STEP2_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_s2)
    story.append(Spacer(1, 1))

    # ARROW 2
    story.append(Paragraph("⬇ <i>Customer decides to buy and says 'Add to cart'</i> ⬇", arrow_style))
    story.append(Spacer(1, 1))

    # STEP 3 CARD
    step3_rows = [
        [
            Paragraph("<font color='#C2410C'><b>STEP 3: CUSTOMER TRIGGERS 'ADD TO CART' (BUYING INTENT)</b></font>", ParagraphStyle('S3T', parent=card_title_style, textColor=STEP3_TITLE)),
            Paragraph("<font color='#EA580C'><b>⚡ Intent Detected</b></font>", ParagraphStyle('S3C', fontName='Helvetica-Bold', fontSize=7.5, leading=9.5, alignment=2))
        ],
        [
            Paragraph("<b>Customer Action:</b> Expresses buying intent in normal English:<br/>"
                      "<i>'Awesome! Please add all those ingredients to my cart now.'</i><br/>"
                      "<b>AI System Detection:</b><br/>"
                      "Timi's n8n AI detects the request to purchase and attaches the 4 grocery products to the response.", card_body_style),
            Paragraph("<b>Products Selected:</b><br/>"
                      "1. Fresh Okro (1kg)<br/>"
                      "2. Fresh Catfish (2kg)<br/>"
                      "3. Red Palm Oil (1L)<br/>"
                      "4. Fresh Ugu (2 bunches)", ParagraphStyle('S3S', fontName='Helvetica', fontSize=7, leading=9, textColor=STEP3_TITLE))
        ]
    ]
    t_s3 = Table(step3_rows, colWidths=[410, 130])
    t_s3.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), STEP3_BG),
        ('BOX', (0,0), (-1,-1), 1, STEP3_BORDER),
        ('LINEBELOW', (0,0), (-1,0), 0.5, STEP3_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_s3)
    story.append(Spacer(1, 1))

    # ARROW 3
    story.append(Paragraph("⬇ <i>Website automatically loads the items into the shopping cart</i> ⬇", arrow_style))
    story.append(Spacer(1, 1))

    # STEP 4 CARD
    step4_rows = [
        [
            Paragraph("<font color='#15803D'><b>STEP 4: AUTOMATIC CART LOAD & CHECKOUT READY</b></font>", ParagraphStyle('S4T', parent=card_title_style, textColor=STEP4_TITLE)),
            Paragraph("<font color='#16A34A'><b>🛒 4 Items in Cart (₦13,500)</b></font>", ParagraphStyle('S4C', fontName='Helvetica-Bold', fontSize=7.5, leading=9.5, alignment=2))
        ],
        [
            Paragraph("<b>What the Customer Sees on Screen:</b><br/>"
                      "1. Chef Bems replies: <i>'I have added all 4 fresh ingredients for Okro Soup to your shopping cart!'</i><br/>"
                      "2. A green notification toast slides in: <b>'✨ 4 items added to your cart!'</b><br/>"
                      "3. The shopping cart icon at the top of the website instantly updates from <b>🛒 0</b> to <b>🛒 4</b>.<br/>"
                      "4. Customer can open their cart drawer or tap <b>'Checkout'</b> to complete payment.", card_body_style),
            Paragraph("<b>Result:</b><br/>"
                      "• Zero manual searching<br/>"
                      "• All items in cart<br/>"
                      "• Ready for payment!", ParagraphStyle('S4S', fontName='Helvetica', fontSize=7, leading=9, textColor=STEP4_TITLE))
        ]
    ]
    t_s4 = Table(step4_rows, colWidths=[410, 130])
    t_s4.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), STEP4_BG),
        ('BOX', (0,0), (-1,-1), 1, STEP4_BORDER),
        ('LINEBELOW', (0,0), (-1,0), 0.5, STEP4_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_s4)
    story.append(Spacer(1, 5))

    # SIMPLE FORMAT SUMMARY (FOR TIMI)
    story.append(Paragraph("Summary: What Timi's n8n AI Returns When Customer Says 'Add to Cart'", h1_style))
    simple_json = """{
  "reply": "I have added all 4 fresh ingredients for Okro Soup directly into your shopping cart!",
  "action": "AUTO_ADD_TO_CART",
  "recipeBundle": {
    "recipe_name": "Nutritious Okro Soup (Serves 5)",
    "servings": 5,
    "items": [
      { "name": "Fresh Okro", "quantity": 1, "unit": "1kg", "price": 2500 },
      { "name": "Fresh Catfish", "quantity": 2, "unit": "1kg", "price": 6200 },
      { "name": "Pure Palm Oil", "quantity": 1, "unit": "1 Litre", "price": 2800 },
      { "name": "Fresh Ugu Leaves", "quantity": 2, "unit": "1 bunch", "price": 2000 }
    ]
  }
}"""
    story.append(Paragraph(simple_json.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))

    doc.build(story, canvasmaker=CleanCanvas)
    print(f"✅ Generated Solid Flowchart PDF successfully: {filename}")

if __name__ == "__main__":
    out = "BEMS_FARMS_CHEF_BEMS_ADD_TO_CART_FLOW.pdf"
    if len(sys.argv) > 1:
        out = sys.argv[1]
    build_pdf(out)
