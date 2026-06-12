import fs from 'fs/promises';
import path from 'path';

const srcDir = path.resolve('../PDF new');
const destRootPdfDir = path.resolve('../PDF');
const destPublicPdfDir = path.resolve('./public/pdf');

const yearRanges = {
  1: '1912-1924',
  2: '1924-1929',
  3: '1930-1945',
  4: '1945-1946',
  5: '1947-1948',
  6: '1949-1950',
  7: '1951-1952',
  8: '1953-1954',
  9: '1954-1955',
  10: '1955-1957',
  11: '7-1957-12-1958',
  12: '1959-1960',
  13: '1961-1962',
  14: '1963-1965',
  15: '1966-1969'
};

async function cleanDir(dirPath) {
  try {
    const files = await fs.readdir(dirPath);
    for (const file of files) {
      if (file.toLowerCase().endsWith('.pdf')) {
        await fs.unlink(path.join(dirPath, file));
      }
    }
    console.log(`Cleaned old PDF files in: ${dirPath}`);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

async function run() {
  await cleanDir(destRootPdfDir);
  await cleanDir(destPublicPdfDir);

  const files = await fs.readdir(srcDir);
  const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

  for (const file of pdfFiles) {
    // Extract volume number from name like "HCM_ Tập 1.pdf"
    // Normalize string to NFC first to handle various Vietnamese accent combinations
    const normalized = file.normalize('NFC');
    const match = normalized.match(/Tập\s+(\d+)/i);
    if (!match) {
      console.warn(`Could not parse volume number from: ${file}`);
      continue;
    }

    const volNum = parseInt(match[1]);
    const range = yearRanges[volNum];
    if (!range) {
      console.warn(`No year range mapping found for volume: ${volNum}`);
      continue;
    }

    const newFilename = `tap${volNum}_${range}.pdf`;
    const srcPath = path.join(srcDir, file);
    
    // Copy to root PDF folder
    const destRootPath = path.join(destRootPdfDir, newFilename);
    await fs.copyFile(srcPath, destRootPath);
    console.log(`Copied: ${file} -> ${destRootPath}`);

    // Copy to public/pdf folder
    const destPublicPath = path.join(destPublicPdfDir, newFilename);
    await fs.copyFile(srcPath, destPublicPath);
    console.log(`Copied: ${file} -> ${destPublicPath}`);
  }

  console.log('PDF migration completed successfully!');
}

run().catch(console.error);
