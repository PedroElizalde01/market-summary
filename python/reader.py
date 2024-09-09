import sys
import os
import json
import PyPDF2
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.lex_rank import LexRankSummarizer
import nltk
import ssl

JSON_FILE = "summaries.json"

def download_nltk_data():
    try:
        _create_unverified_https_context = ssl._create_unverified_context
    except AttributeError:
        pass
    else:
        ssl._create_default_https_context = _create_unverified_https_context

    print("Downloading necessary NLTK data...")
    nltk.download('punkt', quiet=True)
    nltk.download('punkt_tab', quiet=True)

def summarize_pdf(file_path, num_sentences=5):
    if not os.path.exists(file_path):
        print(f"Error: The file '{file_path}' does not exist.")
        return None

    if not file_path.lower().endswith('.pdf'):
        print(f"Error: The file '{file_path}' is not a PDF file.")
        return None

    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ''
            for page in pdf_reader.pages:
                text += page.extract_text()

        parser = PlaintextParser.from_string(text, Tokenizer("english"))
        summarizer = LexRankSummarizer()

        summary = summarizer(parser.document, sentences_count=num_sentences)

        summary_text = " ".join(str(sentence) for sentence in summary)
        return summary_text
    except Exception as e:
        print(f"An error occurred while processing the PDF: {str(e)}")
        return None

def update_json(file_path, summary):
    if os.path.exists(JSON_FILE):
        with open(JSON_FILE, 'r') as f:
            data = json.load(f)
    else:
        data = []

    # Check if the file has already been summarized
    for item in data:
        if item['file_name'] == os.path.basename(file_path):
            item['summary'] = summary
            break
    else:
        # If the file hasn't been summarized before, add a new entry
        data.append({
            'file_name': os.path.basename(file_path),
            'summary': summary
        })

    with open(JSON_FILE, 'w') as f:
        json.dump(data, f, indent=2)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python script.py <path_to_pdf_file>")
        sys.exit(1)

    file_path = sys.argv[1]
    num_sentences = 5

    download_nltk_data()
    summary = summarize_pdf(file_path, num_sentences)
    
    if summary:
        update_json(file_path, summary)
        print(f"Summary of {file_path} has been added/updated in {JSON_FILE}")
    else:
        print("Failed to generate summary.")