const fs = require('fs').promises;
const pdf = require('pdf-parse');
const natural = require('natural');
const keywordExtractor = require("keyword-extractor");

const JSON_FILE = 'summaries.json';

const TfIdf = natural.TfIdf;
const tokenizer = new natural.WordTokenizer();

function simpleSentenceTokenizer(text) {
    // This simple tokenizer splits sentences based on common sentence-ending punctuation
    return text.match(/[^\.!\?]+[\.!\?]+/g) || [];
}

function extractKeywords(text, lang, numKeywords = 10) {
    return keywordExtractor.extract(text, {
        language: lang === 'es' ? "spanish" : "english",
        remove_digits: true,
        return_changed_case: true,
        remove_duplicates: true
    }).slice(0, numKeywords);
}

function scoreSentences(sentences, tfidf) {
    return sentences.map(sentence => {
        const words = tokenizer.tokenize(sentence);
        const score = words.reduce((sum, word) => sum + tfidf.tfidf(word, 0), 0);
        return { sentence, score };
    });
}

function generateSummary(text, lang, numSentences) {
    const tfidf = new TfIdf();
    tfidf.addDocument(text);

    const sentences = simpleSentenceTokenizer(text);
    const scoredSentences = scoreSentences(sentences, tfidf);

    scoredSentences.sort((a, b) => b.score - a.score);
    const topSentences = scoredSentences.slice(0, numSentences);
    topSentences.sort((a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence));

    return topSentences.map(item => item.sentence).join(' ');
}

async function summarizePDF(filePath, numSentences, lang) {
    try {
        const dataBuffer = await fs.readFile(filePath);
        const data = await pdf(dataBuffer);
        
        console.log(`Processing in ${lang === 'es' ? 'Spanish' : 'English'}`);

        const summary = generateSummary(data.text, lang, numSentences);
        const keywords = extractKeywords(data.text, lang);
        
        return { summary, keywords, lang };
    } catch (error) {
        console.error(`Error processing PDF: ${error.message}`);
        return null;
    }
}

async function updateJSON(filePath, summary, keywords, lang) {
    try {
        let data = [];
        try {
            const fileContent = await fs.readFile(JSON_FILE, 'utf8');
            data = JSON.parse(fileContent);
        } catch (error) {
            // File doesn't exist or is empty, start with an empty array
        }

        const fileName = filePath.split('/').pop();
        const existingIndex = data.findIndex(item => item.name === fileName);

        if (existingIndex !== -1) {
            data[existingIndex] = { name: fileName, summary, keywords, lang };
        } else {
            data.push({ name: fileName, summary, keywords, lang });
        }

        await fs.writeFile(JSON_FILE, JSON.stringify(data, null, 2));
        console.log(`Summary and keywords of ${fileName} have been added/updated in ${JSON_FILE}`);
    } catch (error) {
        console.error(`Error updating JSON: ${error.message}`);
    }
}

async function main() {
    const filePath = process.argv[2];
    const numSentences = parseInt(process.argv[3]) || 5;
    const language = process.argv[4] || 'en';

    if (!filePath) {
        console.log("Usage: node script.js <path_to_pdf_file> [number_of_sentences] [language]");
        console.log("Language options: 'en' for English, 'es' for Spanish");
        process.exit(1);
    }

    if (language !== 'en' && language !== 'es') {
        console.log("Invalid language option. Use 'en' for English or 'es' for Spanish.");
        process.exit(1);
    }

    const result = await summarizePDF(filePath, numSentences, language);
    if (result) {
        await updateJSON(filePath, result.summary, result.keywords, result.lang);
    } else {
        console.log("Failed to generate summary and keywords.");
    }
}

main();