import fs from 'fs/promises';
import path from 'path';

const newSrcDir = path.resolve('../PDF new');
const rootPdfDir = path.resolve('../PDF');
const rootPublicPdfDir = path.resolve('./public/pdf');

const destNewPdf = path.join(rootPdfDir, 'new');
const destOldPdf = path.join(rootPdfDir, 'old');
const destNewPublic = path.join(rootPublicPdfDir, 'new');
const destOldPublic = path.join(rootPublicPdfDir, 'old');

const newYearRanges = {
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

const oldYearRanges = {
  1: '1919-1924',
  2: '1924-1930',
  3: '1930-1945',
  4: '1945-1946',
  5: '1947-1949',
  6: '1950-1952',
  7: '1953-1955',
  8: '1955-1957',
  9: '1958-1959',
  10: '1960-1962',
  11: '1963-1965',
  12: '1966-1969'
};

async function recreateDir(dirPath) {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (e) {}
  await fs.mkdir(dirPath, { recursive: true });
}

async function run() {
  // Create folders
  await recreateDir(destNewPdf);
  await recreateDir(destOldPdf);
  await recreateDir(destNewPublic);
  await recreateDir(destOldPublic);

  // 1. Process new PDFs (15 volumes)
  const newFiles = await fs.readdir(newSrcDir);
  const newPdfFiles = newFiles.filter(f => f.toLowerCase().endsWith('.pdf'));

  for (const file of newPdfFiles) {
    const normalized = file.normalize('NFC');
    const match = normalized.match(/Tập\s+(\d+)/i);
    if (!match) continue;
    const volNum = parseInt(match[1]);
    const range = newYearRanges[volNum];
    if (!range) continue;

    const newFilename = `tap${volNum}_${range}.pdf`;
    const srcPath = path.join(newSrcDir, file);

    await fs.copyFile(srcPath, path.join(destNewPdf, newFilename));
    await fs.copyFile(srcPath, path.join(destNewPublic, newFilename));
    console.log(`Copied New Vol ${volNum} -> ${newFilename}`);
  }

  // 2. Process old PDFs (12 volumes, currently restored in rootPdfDir)
  const rootFiles = await fs.readdir(rootPdfDir);
  // We look for files starting with "tap" and containing old year ranges
  for (const file of rootFiles) {
    const match = file.match(/tap(\d+)_/i);
    if (!match) continue;
    const volNum = parseInt(match[1]);
    const range = oldYearRanges[volNum];
    if (!range) continue;

    // Check if the filename contains the old year range to differentiate it from untracked new files in the root
    if (file.includes(range)) {
      const filename = `tap${volNum}_${range}.pdf`;
      const srcPath = path.join(rootPdfDir, file);

      await fs.copyFile(srcPath, path.join(destOldPdf, filename));
      await fs.copyFile(srcPath, path.join(destOldPublic, filename));
      console.log(`Copied Old Vol ${volNum} -> ${filename}`);
    }
  }

  // 3. Clean up the root PDF and public/pdf folders
  const cleanRootFiles = await fs.readdir(rootPdfDir);
  for (const file of cleanRootFiles) {
    if (file.toLowerCase().endsWith('.pdf')) {
      await fs.unlink(path.join(rootPdfDir, file));
    }
  }
  const cleanPublicFiles = await fs.readdir(rootPublicPdfDir);
  for (const file of cleanPublicFiles) {
    if (file.toLowerCase().endsWith('.pdf')) {
      await fs.unlink(path.join(rootPublicPdfDir, file));
    }
  }

  console.log('PDF organization finished successfully!');
}

run().catch(console.error);
