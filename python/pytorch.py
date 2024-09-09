import PyPDF2
from transformers import pipeline
import torch

def extract_text_from_pdf(pdf_path):
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text()
    return text

def summarize_text(text, max_length=150, min_length=50):
    summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
    summary = summarizer(text, max_length=max_length, min_length=min_length, do_sample=False)
    return summary[0]['summary_text']

def process_pdf(pdf_path):
    text = extract_text_from_pdf(pdf_path)
    
    summary = summarize_text(text)
    
    return summary

pdf_path = "../resources/Frankenstein.pdf"
summary = process_pdf(pdf_path)
print(summary)