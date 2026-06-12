import fs from 'fs/promises';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { tcvn3ToUnicode, fixVietnameseSpacing } from '../src/utils/tcvn3.js';

// Set up the worker for pdfjs
const outputJson = path.resolve('./public/searchIndex.json');

async function extractTextFromPDF(pdfPath, tapNumber, boSach) {
  const data = new Uint8Array(await fs.readFile(pdfPath));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdfDocument = await loadingTask.promise;
  const numPages = pdfDocument.numPages;
  
  let isDoublePage = false;
  if (numPages > 0) {
    try {
      const firstPage = await pdfDocument.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1.0 });
      isDoublePage = viewport.width > viewport.height;
      console.log(`[${boSach.toUpperCase()}] Tap ${tapNumber}: width=${viewport.width.toFixed(1)}, height=${viewport.height.toFixed(1)} -> isDoublePage=${isDoublePage}`);
    } catch (e) {
      console.error(`Error detecting page dimensions for Tap ${tapNumber}:`, e.message);
    }
  }
  
  let bookIndex = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Smart join: only insert a space when items are actually on different words.
    // PDF.js provides `hasEOL` (end-of-line) and the item's own `width` for spacing.
    // We also check if the next item starts with a lowercase letter that cannot start
    // a new word in TCVN3 context (those letters are part of the same syllable).
    let rawText = '';
    const items = textContent.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const str = item.str || '';
      if (!str) continue;

      if (i === 0) {
        rawText += str;
        continue;
      }

      // hasEOL means there's a line break after this item — always add a space before next
      const prevItem = items[i - 1];
      const prevHasEOL = prevItem.hasEOL;

      // Check the horizontal gap: if the next item starts very close to where previous ended,
      // they are likely the same word (e.g. "N" + "guyễn").
      // item.transform[4] is the x position, item.width is the width
      const prevX = (prevItem.transform?.[4] || 0) + (prevItem.width || 0);
      const currX = item.transform?.[4] || 0;
      // Gap in PDF units — if currX is very close to prevX (within 1 unit), no space needed
      const gap = currX - prevX;
      const isContiguous = !prevHasEOL && gap >= -2 && gap <= 2;

      if (isContiguous) {
        rawText += str; // same word — no space
      } else {
        rawText += ' ' + str; // different word or line — add space
      }
    }
    
    // TCVN3 to Unicode, then fix any remaining syllable-internal spaces
    const unicodeText = fixVietnameseSpacing(tcvn3ToUnicode(rawText));

    if (unicodeText.trim()) {
        bookIndex.push({
            boSach: boSach,
            tap: tapNumber,
            trang: pageNum,
            text: unicodeText,
            isDoublePage: isDoublePage
        });
    }
  }
  
  return bookIndex;
}

async function build() {
  console.log('Building search index...');
  
  let fullIndex = [];
  
  // Index new set
  const newPdfDir = path.resolve('../PDF/new');
  try {
    const files = await fs.readdir(newPdfDir);
    const pdfFiles = files.filter(f => f.endsWith('.pdf'));
    for (const file of pdfFiles) {
      const match = file.match(/tap(\d+)_/i);
      if (match) {
          const tapNumber = parseInt(match[1]);
          const indexData = await extractTextFromPDF(path.join(newPdfDir, file), tapNumber, 'new');
          fullIndex = fullIndex.concat(indexData);
      }
    }
  } catch (e) {
    console.error('Error reading PDF/new folder:', e.message);
  }

  // Index old set
  const oldPdfDir = path.resolve('../PDF/old');
  try {
    const files = await fs.readdir(oldPdfDir);
    const pdfFiles = files.filter(f => f.endsWith('.pdf'));
    for (const file of pdfFiles) {
      const match = file.match(/tap(\d+)_/i);
      if (match) {
          const tapNumber = parseInt(match[1]);
          const indexData = await extractTextFromPDF(path.join(oldPdfDir, file), tapNumber, 'old');
          fullIndex = fullIndex.concat(indexData);
      }
    }
  } catch (e) {
    console.error('Error reading PDF/old folder:', e.message);
  }
  
  await fs.mkdir(path.dirname(outputJson), { recursive: true });
  await fs.writeFile(outputJson, JSON.stringify(fullIndex), 'utf-8');
  console.log(`Successfully built index with ${fullIndex.length} pages indexed.`);
}

build().catch(console.error);
