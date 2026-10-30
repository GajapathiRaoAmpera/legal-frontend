import sys
from docx import Document
d = Document()
d.add_heading("Master Services Agreement", 0)
d.add_paragraph("This Master Services Agreement is entered into between Acme Software Ltd (\"Supplier\") and Northwind Traders Inc (\"Customer\").")
for h, t in [
    ("1. Services", "Supplier shall provide the services described in each Order Form."),
    ("2. Fees", "Customer shall pay all fees within thirty (30) days of invoice."),
    ("3. Term and Renewal", "This Agreement shall automatically renew for successive twelve (12) month periods unless either party gives written notice of non-renewal at least ninety (90) days before the end of the then-current term."),
    ("4. Limitation of Liability", "Customer's liability under this Agreement shall be unlimited. Supplier's aggregate liability shall not exceed the fees paid in the one (1) month preceding the claim."),
    ("5. Indemnification", "Customer shall indemnify, defend and hold harmless Supplier and its affiliates from any and all claims, losses and damages arising out of or relating to this Agreement. Supplier has no indemnification obligations."),
    ("6. Intellectual Property", "Customer hereby assigns to Supplier all right, title and interest in any and all intellectual property created, conceived or developed by Customer, whether or not related to the Services."),
    ("7. Governing Law", "This Agreement is governed by the laws of England and Wales."),
]:
    d.add_heading(h, level=1)
    d.add_paragraph(t)
d.save(sys.argv[1])
