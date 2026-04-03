#!/bin/bash
# Build the process book PDF: title page + content + end page
set -e
cd "$(dirname "$0")"

ROOT="$(cd .. && pwd)"

echo "Building title page..."
typst compile --root "$ROOT" title-page.typ title-page.pdf

echo "Building end page..."
typst compile --root "$ROOT" end-page.typ end-page.pdf

echo "Building content..."
pandoc process-book-full.md \
  week1.md week2.md week3.md week4.md week5.md week6.md week7.md week8.md \
  peer-assessment.md \
  -o process-book-content.pdf \
  --pdf-engine=xelatex \
  -V mainfont="Courier New" \
  -V mainfontoptions="Scale=0.85" \
  -V monofont="Courier New" \
  --resource-path=..

echo "Merging..."
pdfunite title-page.pdf process-book-content.pdf end-page.pdf process-book.pdf

# Cleanup
rm -f title-page.pdf end-page.pdf process-book-content.pdf

echo "Done: process-book.pdf"
