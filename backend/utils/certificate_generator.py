import os
from fpdf import FPDF
from datetime import datetime
from typing import Optional
import uuid

class CertificateGenerator:
    def __init__(self, logo_path: Optional[str] = None):
        self.logo_path = logo_path

    def generate(
        self,
        student_name: str,
        course_title: str,
        completion_date: datetime,
        certificate_id: str,
        academy_name: str,
        output_path: str
    ) -> str:
        """
        Generate a PDF certificate and save it to the output_path.
        """
        pdf = FPDF(orientation="L", unit="mm", format="A4")
        pdf.add_page()
        
        # Border
        pdf.set_line_width(2)
        pdf.rect(10, 10, 277, 190)
        pdf.set_line_width(0.5)
        pdf.rect(12, 12, 273, 186)

        # Content
        pdf.set_font("Helvetica", "B", 30)
        pdf.set_y(40)
        pdf.cell(0, 20, "CERTIFICATE OF COMPLETION", ln=True, align="C")
        
        pdf.set_font("Helvetica", "", 18)
        pdf.set_y(70)
        pdf.cell(0, 10, "This is to certify that", ln=True, align="C")
        
        pdf.set_font("Helvetica", "B", 36)
        pdf.set_y(85)
        pdf.cell(0, 20, student_name, ln=True, align="C")
        
        pdf.set_font("Helvetica", "", 18)
        pdf.set_y(110)
        pdf.cell(0, 10, "has successfully completed the course", ln=True, align="C")
        
        pdf.set_font("Helvetica", "B", 24)
        pdf.set_y(125)
        pdf.cell(0, 15, course_title, ln=True, align="C")
        
        pdf.set_font("Helvetica", "", 14)
        pdf.set_y(150)
        date_str = completion_date.strftime("%B %d, %Y")
        pdf.cell(0, 10, f"Issued on {date_str} by {academy_name}", ln=True, align="C")
        
        # Academy Logo (if available)
        if self.logo_path and os.path.exists(self.logo_path):
            try:
                pdf.image(self.logo_path, x=133, y=15, w=30)
            except Exception as e:
                print(f"Failed to include logo in certificate: {e}")

        # ID at the bottom
        pdf.set_font("Helvetica", "I", 10)
        pdf.set_y(185)
        pdf.cell(0, 10, f"Certificate ID: {certificate_id}", ln=True, align="C")

        pdf.output(output_path)
        return output_path

def generate_pdf_certificate(
    student_name: str,
    course_title: str,
    completion_date: datetime,
    certificate_id: str,
    academy_name: str,
    logo_path: Optional[str] = None
) -> bytes:
    """
    Generate a PDF certificate and return the raw bytes.
    """
    pdf = FPDF(orientation="L", unit="mm", format="A4")
    pdf.add_page()
    
    # Simple Elegant Border
    # Outer Border
    pdf.set_draw_color(90, 90, 90) # Dark gray
    pdf.set_line_width(1.5)
    pdf.rect(10, 10, 277, 190)
    
    # Inner border
    pdf.set_draw_color(150, 150, 150) # Light gray
    pdf.set_line_width(0.5)
    pdf.rect(13, 13, 271, 184)

    # Background (optional subtle texture/color could go here)

    # Header
    pdf.set_font("Helvetica", "B", 35)
    pdf.set_text_color(40, 40, 40)
    pdf.set_y(45)
    pdf.cell(0, 20, "CERTIFICATE OF COMPLETION", ln=True, align="C")
    
    # Subtitle
    pdf.set_font("Helvetica", "", 16)
    pdf.set_text_color(100, 100, 100)
    pdf.set_y(70)
    pdf.cell(0, 10, "This is to certify that", ln=True, align="C")
    
    # Student Name
    pdf.set_font("Helvetica", "B", 42)
    pdf.set_text_color(0, 0, 0)
    pdf.set_y(85)
    pdf.cell(0, 20, student_name, ln=True, align="C")
    
    # Divider
    pdf.set_draw_color(239, 68, 68) # Primary color (red-ish)
    pdf.set_line_width(1)
    pdf.line(100, 105, 197, 105)
    
    # Text
    pdf.set_font("Helvetica", "", 16)
    pdf.set_text_color(100, 100, 100)
    pdf.set_y(115)
    pdf.cell(0, 10, "has successfully completed the course", ln=True, align="C")
    
    # Course Title
    pdf.set_font("Helvetica", "B", 26)
    pdf.set_text_color(40, 40, 40)
    pdf.set_y(128)
    pdf.cell(0, 15, course_title, ln=True, align="C")
    
    # Date and Academy
    pdf.set_font("Helvetica", "", 14)
    pdf.set_text_color(120, 120, 120)
    pdf.set_y(155)
    date_str = completion_date.strftime("%B %d, %Y")
    pdf.cell(0, 10, f"Issued on {date_str}", ln=True, align="C")
    pdf.cell(0, 10, f"By {academy_name}", ln=True, align="C")
    
    # Logo
    if logo_path and os.path.exists(logo_path):
        try:
            # Center logo at the top
            pdf.image(logo_path, x=133, y=18, w=30)
        except Exception as e:
            print(f"Failed to include logo in certificate: {e}")

    # Footnote / ID
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(180, 180, 180)
    pdf.set_y(182)
    pdf.cell(0, 10, f"Certificate Verification ID: {certificate_id}", ln=True, align="C")
    pdf.cell(0, 5, "Scan to verify or visit our portal for validation.", ln=True, align="C")

    # Return bytes
    return pdf.output()
