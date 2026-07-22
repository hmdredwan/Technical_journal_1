# backend/core/utils/pdf_utils.py
import io
import os
from PyPDF2 import PdfReader, PdfWriter
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

def add_header_to_pdf(original_pdf_path, paper_title, authors, volume_number, issue_number):
    """
    Add a custom header image to the first page of a PDF
    Returns the modified PDF as bytes
    """
    try:
        # Read the original PDF
        existing_pdf = PdfReader(open(original_pdf_path, 'rb'))
        output = PdfWriter()
        
        # Get first page dimensions
        first_page = existing_pdf.pages[0]
        page_width = float(first_page.mediabox.width)
        page_height = float(first_page.mediabox.height)
        
        # Create header PDF
        packet = io.BytesIO()
        c = canvas.Canvas(packet, pagesize=(page_width, page_height))
        
        # Path to header image (from frontend public folder)
        # You'll need to serve this file or copy it to backend media
        header_image_path = os.path.join(settings.BASE_DIR, '..', 'frontend', 'public', 'images', 'journal-header.png')
        
        # Alternative: Copy image to backend media folder
        if not os.path.exists(header_image_path):
            header_image_path = os.path.join(settings.MEDIA_ROOT, 'headers', 'journal-header.png')
        
        if os.path.exists(header_image_path):
            # Header dimensions
            header_height = 100
            logo_width = page_width * 0.8
            logo_height = 70
            
            # Calculate position to center the image
            x = (page_width - logo_width) / 2
            y = page_height - header_height
            
            # Add logo image
            img = ImageReader(header_image_path)
            c.drawImage(img, x, y, width=logo_width, height=logo_height, preserveAspectRatio=True)
            
            # Add journal name text
            c.setFont("Helvetica-Bold", 12)
            c.setFillColorRGB(0.2, 0.4, 0.7)  # Blue color
            c.drawCentredString(page_width/2, y - 20, "RESEARCH REVIEW INTERNATIONAL")
            
            # Add article title (truncated if too long)
            c.setFont("Helvetica", 9)
            c.setFillColorRGB(0.3, 0.3, 0.3)
            title = paper_title[:80] + "..." if len(paper_title) > 80 else paper_title
            c.drawCentredString(page_width/2, y - 35, title)
            
            # Add authors
            c.setFont("Helvetica", 8)
            authors_text = authors[:100] + "..." if len(authors) > 100 else authors
            c.drawCentredString(page_width/2, y - 48, authors_text)
            
            # Add issue info
            c.setFont("Helvetica", 8)
            c.setFillColorRGB(0.5, 0.5, 0.5)
            issue_text = f"Volume {volume_number}, Issue {issue_number}"
            c.drawCentredString(page_width/2, y - 61, issue_text)
            
            # Add a decorative line
            c.setStrokeColorRGB(0.2, 0.4, 0.7)
            c.setLineWidth(1)
            c.line(x, y - 68, x + logo_width, y - 68)
        
        c.save()
        
        # Merge the header with the first page
        packet.seek(0)
        header_pdf = PdfReader(packet)
        
        if len(header_pdf.pages) > 0:
            header_page = header_pdf.pages[0]
            first_page.merge_page(header_page)
        
        output.add_page(first_page)
        
        # Add remaining pages
        for i in range(1, len(existing_pdf.pages)):
            output.add_page(existing_pdf.pages[i])
        
        # Write to bytes buffer
        output_buffer = io.BytesIO()
        output.write(output_buffer)
        output_buffer.seek(0)
        
        return output_buffer.getvalue()
        
    except Exception as e:
        print(f"Error adding header to PDF: {e}")
        # Return original PDF if header addition fails
        with open(original_pdf_path, 'rb') as f:
            return f.read()