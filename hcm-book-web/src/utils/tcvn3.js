// Standalone optimized TCVN3 to Unicode converter
// Generated automatically for maximum performance and correctness.

const TCVN3_TO_UNICODE_MAP = {
  "¡»": "Ằ",
  "¡½": "Ẵ",
  "¡¼": "Ẳ",
  "¡¾": "Ắ",
  "¡Æ": "Ặ",
  "¦÷": "Ữ",
  "¦ö": "Ử",
  "¦õ": "Ừ",
  "¦ø": "Ứ",
  "¦ù": "Ự",
  "¤å": "Ồ",
  "¤æ": "Ổ",
  "¤ç": "Ỗ",
  "¤é": "Ộ",
  "¤è": "Ố",
  "¢Ç": "Ầ",
  "¢É": "Ẫ",
  "¢È": "Ẩ",
  "¢Ê": "Ấ",
  "¢Ë": "Ậ",
  "£Ó": "Ể",
  "£Ò": "Ề",
  "£Ô": "Ễ",
  "£Ö": "Ệ",
  "£Õ": "Ế",
  "¥ê": "Ờ",
  "¥ë": "Ở",
  "¥í": "Ớ",
  "¥ì": "Ỡ",
  "¥î": "Ợ",
  "A·": "Ã",
  "A¶": "Ả",
  "A¸": "Á",
  "A¹": "Ạ",
  "Aµ": "À",
  "EÐ": "É",
  "EÌ": "È",
  "EÎ": "Ẻ",
  "EÏ": "Ẽ",
  "EÑ": "Ẹ",
  "I×": "Ì",
  "IØ": "Ỉ",
  "IÜ": "Ĩ",
  "IÝ": "Í",
  "IÞ": "Ị",
  "Oá": "Ỏ",
  "Oâ": "Õ",
  "Oä": "Ọ",
  "Oã": "Ó",
  "Oß": "Ò",
  "Uï": "Ù",
  "Uñ": "Ủ",
  "Uó": "Ú",
  "Uò": "Ũ",
  "Uô": "Ụ",
  "Yú": "Ỳ",
  "Yû": "Ỷ",
  "Yü": "Ỹ",
  "Yý": "Ý",
  "Yþ": "Ỵ",
  "­": "ư",
  "¡": "Ă",
  "·": "ã",
  "«": "ô",
  "»": "ằ",
  "§": "Đ",
  "¶": "ả",
  "¨": "ă",
  "¸": "á",
  "©": "â",
  "®": "đ",
  "÷": "ữ",
  "×": "ì",
  "¬": "ơ",
  "¦": "Ư",
  "¤": "Ô",
  "¢": "Â",
  "£": "Ê",
  "¥": "Ơ",
  "¹": "ạ",
  "½": "ẵ",
  "¼": "ẳ",
  "¾": "ắ",
  "ª": "ê",
  "á": "ỏ",
  "â": "õ",
  "å": "ồ",
  "ä": "ọ",
  "ã": "ó",
  "æ": "ổ",
  "Æ": "ặ",
  "ç": "ỗ",
  "Ç": "ầ",
  "Ð": "é",
  "é": "ộ",
  "É": "ẫ",
  "è": "ố",
  "È": "ẩ",
  "ê": "ờ",
  "Ê": "ấ",
  "ë": "ở",
  "Ë": "ậ",
  "í": "ớ",
  "ì": "ỡ",
  "Ì": "è",
  "î": "ợ",
  "Î": "ẻ",
  "ï": "ù",
  "Ï": "ẽ",
  "ñ": "ủ",
  "Ñ": "ẹ",
  "ó": "ú",
  "Ó": "ể",
  "ò": "ũ",
  "Ò": "ề",
  "ô": "ụ",
  "Ô": "ễ",
  "ö": "ử",
  "Ö": "ệ",
  "õ": "ừ",
  "Õ": "ế",
  "ø": "ứ",
  "Ø": "ỉ",
  "ß": "ò",
  "ú": "ỳ",
  "ù": "ự",
  "û": "ỷ",
  "ü": "ỹ",
  "Ü": "ĩ",
  "ý": "ý",
  "Ý": "í",
  "þ": "ỵ",
  "Þ": "ị",
  "μ": "à",
  "µ": "à"
};

const TCVN3_REGEX = new RegExp("¡»|¡½|¡¼|¡¾|¡Æ|¦÷|¦ö|¦õ|¦ø|¦ù|¤å|¤æ|¤ç|¤é|¤è|¢Ç|¢É|¢È|¢Ê|¢Ë|£Ó|£Ò|£Ô|£Ö|£Õ|¥ê|¥ë|¥í|¥ì|¥î|A·|A¶|A¸|A¹|Aµ|EÐ|EÌ|EÎ|EÏ|EÑ|I×|IØ|IÜ|IÝ|IÞ|Oá|Oâ|Oä|Oã|Oß|Uï|Uñ|Uó|Uò|Uô|Yú|Yû|Yü|Yý|Yþ|­|¡|·|«|»|§|¶|¨|¸|©|®|÷|×|¬|¦|¤|¢|£|¥|¹|½|¼|¾|ª|á|â|å|ä|ã|æ|Æ|ç|Ç|Ð|é|É|è|È|ê|Ê|ë|Ë|í|ì|Ì|î|Î|ï|Ï|ñ|Ñ|ó|Ó|ò|Ò|ô|Ô|ö|Ö|õ|Õ|ø|Ø|ß|ú|ù|û|ü|Ü|ý|Ý|þ|Þ|μ|µ", 'g');

const DIACRITIC_VOWELS = "àáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵăâđêôơưÀÁẢÃẠẰẮẲẴẶẦẤẨẪẬÈÉẺẼẸỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌỒỐỔỖỘỜỚỞỠỢÙÚỦŨỤỪỨỬỮỰỲÝỶỸỸĂÂĐÊÔƠƯ";
const TONE_VOWELS = "àáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵÀÁẢÃẠẰẮẲẴẶẦẤẨẪẬÈÉẺẼẸỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌỒỐỔỖỘỜỚỞỠỢÙÚỦŨỤỪỨỬỮỰỲÝỶỸỸ";
const VIET_LETTERS = "a-zA-ZăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵĂÂĐÊÔƠƯÀÁẢÃẠẰẮẲẴẶẦẤẨẪẬÈÉẺẼẸỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌỒỐỔỖỘỜỚỞỠỢÙÚỦŨỤỪỨỬỮỰỲÝỶỸỸ";

const ONSET_CLUSTERS = "ngh|gh|gi|kh|ng|nh|ph|qu|th|tr|ch|[bdđglmnpqrsvxhktc]";
// Use lookbehind to ensure the onset cluster is NOT preceded by any Vietnamese letter.
const P1_onset = new RegExp('(?<![' + VIET_LETTERS + '])(' + ONSET_CLUSTERS + ')\\s+([' + TONE_VOWELS + '])', 'gi');

const DIPHTHONGS = {
  'o': new Set('àáảãạ'),
  'O': new Set('ÀÁẢÃẠ'),
  'u': new Set('àáảãạèéẻẽẹỳýỷỹỵâấầẩẫậêếềểễệ'),
  'U': new Set('ÀÁẢÃẠÈÉẺẼẸỲÝỶỸỴÂẤẦẨẪẬÊẾỀỂỄỆ'),
  'i': new Set('êếềểễệ'),
  'I': new Set('ÊẾỀỂỄỆ'),
  'y': new Set('êếềểễệ'),
  'Y': new Set('ÊẾỀỂỄỆ'),
  'ư': new Set('ơớờởỡợ'),
  'Ư': new Set('ƠỚỜỞỠỢ')
};

// Match any plain vowel candidate followed by space and any diacritic/tonal/base vowel.
// The callback will decide whether to collapse based on the DIPHTHONGS map.
const P1_diphthong = new RegExp('([ouiyưƯOUIY])\\s+([' + DIACRITIC_VOWELS + '])', 'g');

const P2a = new RegExp('([' + DIACRITIC_VOWELS + '])\\s+([cmnptghouyiaeOUIAECMNPTGHY])(?![a-zA-Z\u0103\u00e2\u0111\u00ea\u00f4\u01a1\u01b0\u00e0\u00e1\u1ea3\u00e3\u1ea1\u1eb1\u1eaf\u1eb3\u1eb5\u1eb7\u1ea7\u1ea5\u1ea9\u1eab\u1ead\u00e8\u00e9\u1ebb\u1ebd\u1eb9\u1ec1\u1ebf\u1ec3\u1ec5\u1ec7\u00ec\u00ed\u1ec9\u0129\u1ecb\u00f2\u00f3\u1ecf\u00f5\u1ecd\u1ed3\u1ed1\u1ed5\u1ed7\u1ed9\u1edd\u1edb\u1edf\u1ee1\u1ee3\u00f9\u00fa\u1ee7\u0169\u1ee5\u1eeb\u1ee9\u1eed\u1eef\u1ef1\u1ef3\u00fd\u1ef7\u1ef9\u1ef5\u0102\u00c2\u0110\u00ca\u00d4\u01a0\u01af\u00c0\u00c1\u1ea2\u00c3\u1ea0\u1eb0\u1eae\u1eb2\u1eb4\u1eb6\u1ea6\u1ea4\u1ea8\u1eaa\u1eac\u00c8\u00c9\u1eba\u1ebc\u1eb8\u1ec0\u1ebe\u1ec2\u1ec4\u1ec6\u00cc\u00cd\u1ec8\u0128\u1eca\u00d2\u00d3\u1ece\u00d5\u1ecc\u1ed2\u1ed0\u1ed4\u1ed6\u1ed8\u1edc\u1eda\u1ede\u1ee0\u1ee2\u00d9\u00da\u1ee6\u0168\u1ee4\u1eea\u1ee8\u1eec\u1eee\u1ef0\u1ef2\u00dd\u1ef6\u1ef8\u1ef8])', 'g');
const P2b = new RegExp('([' + DIACRITIC_VOWELS + '])\\s+(ng|nh|ch)(?![a-zA-ZăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵĂÂĐÊÔƠƯÀÁẢÃẠẰẮẲẴẶẦẤẨẪẬÈÉẺẼẸỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌỒỐỔỖỘỜỚỞỠỢÙÚỦŨỤỪỨỬỮỰỲÝỶỸỸ])', 'gi');
const P3 = /\b([A-ZĂÂĐÊÔƠƯ]{1,2}) ([a-zăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ][a-zA-ZăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵĂÂĐÊÔƠƯ]*)/g;

/**
 * Collapses invalid spaces introduced within Vietnamese syllables during PDF.js extraction.
 * e.g., "to à n" -> "toàn", "v à o" -> "vào", "ng à y" -> "ngày", "b à" -> "bà",
 *       "N guyễn" -> "Nguyễn", "Hoà ng" -> "Hoàng", "thà nh" -> "thành".
 *
 * @param {string} text - The input text.
 * @returns {string} Text with corrected spacing.
 */
export function fixVietnameseSpacing(text) {
  if (!text) return '';
  let result = text;

  // Run the replacements
  result = result.replace(P3, '$1$2');
  result = result.replace(P1_onset, '$1$2');
  result = result.replace(P1_diphthong, (match, p1, p2) => {
    const set = DIPHTHONGS[p1];
    if (set && set.has(p2)) {
      return p1 + p2;
    }
    return match;
  });
  result = result.replace(P2b, '$1$2');
  result = result.replace(P2a, '$1$2');

  // Run a second pass to handle nested splits
  result = result.replace(P3, '$1$2');
  result = result.replace(P1_onset, '$1$2');
  result = result.replace(P1_diphthong, (match, p1, p2) => {
    const set = DIPHTHONGS[p1];
    if (set && set.has(p2)) {
      return p1 + p2;
    }
    return match;
  });
  result = result.replace(P2b, '$1$2');
  result = result.replace(P2a, '$1$2');

  return result;
}

/**
 * Attempts to insert spaces at Vietnamese syllable boundaries in text where
 * words have been concatenated without spaces (e.g., from PDF text layer copy-paste).
 *
 * Example: "Sựtàn" → "Sự tàn", "chủnghĩa" → "chủ nghĩa", "Hoàng" → "Hoàng" (unchanged).
 *
 * Algorithm: after each tonal vowel, try to find the optimal split point by
 * checking if (optional coda) + (valid onset cluster) + (vowel) follows. If so,
 * insert a space between the coda and the onset to separate the two syllables.
 *
 * @param {string} text - Input text (may have stuck Vietnamese syllables).
 * @returns {string} Text with syllable-boundary spaces inserted.
 */
export function splitVietnameseSyllables(text) {
  if (!text) return text;

  // Tonal vowels: Vietnamese vowels that carry an explicit tone mark (all 5 non-ngang tones)
  const TONAL = new Set('àáảãạắằẳẵặấầẩẫậèéẻẽẹếềểễệìíỉĩịòóỏõọốồổỗộớờởỡợùúủũụứừửữựỳýỷỹỵÀÁẢÃẠẮẰẲẴẶẤẦẨẪẬÈÉẺẼẸẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌỐỒỔỖỘỚỜỞỠỢÙÚỦŨỤỨỪỬỮỰỲÝỶỸỴ');
  // All vowels (including base vowels without explicit tone marks)
  const VOWELS = new Set('aăâeêioôơuưyAĂÂEÊIOÔƠUƯY' + [...TONAL].join(''));
  // Valid consonant codas
  const CODA2 = new Set(['ng', 'nh', 'ch']);
  const CODA1 = new Set([...'cmnptoiuy']);
  // Consonants set for boundary check
  const CONSONANTS = new Set([...'bcdđghklmnpqrstvxBCDĐGHKLMNPQRSTVX']);
  const VALID_DIGRAPHS = new Set(['tr', 'th', 'ch', 'ph', 'nh', 'ng', 'kh', 'gh', 'gi', 'qu', 'TR', 'TH', 'CH', 'PH', 'NH', 'NG', 'KH', 'GH', 'GI', 'QU']);

  const ONSET_END_RE = /(ngh|gh|gi|kh|ng|nh|ph|qu|th|tr|ch|[bdđglmnprsvxhktc])$/i;

  function toFlatVowel(c) {
    const map = {
      'à':'a','á':'a','ả':'a','ã':'a','ạ':'a','ă':'ă','ắ':'ă','ằ':'ă','ẳ':'ă','ẵ':'ă','ặ':'ă','â':'â','ấ':'â','ầ':'â','ẩ':'â','ẫ':'â','ậ':'â',
      'è':'e','é':'e','ẻ':'e','ẽ':'e','ẹ':'e','ê':'ê','ế':'ê','ề':'ê','ể':'ê','ễ':'ê','ệ':'ê',
      'ì':'i','í':'i','ỉ':'i','ĩ':'i','ị':'i',
      'ò':'o','ó':'o','ỏ':'o','õ':'o','ọ':'o','ô':'ô','ố':'ô','ồ':'ô','ổ':'ô','ỗ':'ô','ộ':'ô','ơ':'ơ','ớ':'ơ','ờ':'ơ','ở':'ơ','ỡ':'ơ','ợ':'ơ',
      'ù':'u','ú':'u','ủ':'u','ũ':'u','ụ':'u','ư':'ư','ứ':'ư','ừ':'ư','ử':'ư','ữ':'ư','ự':'ư',
      'ỳ':'y','ý':'y','ỷ':'y','ỹ':'y','ỵ':'y',
      'À':'a','Á':'a','Ả':'a','Ã':'a','Ạ':'a','Ă':'ă','Ắ':'ă','Ằ':'ă','Ả':'ă','Ẵ':'ă','Ặ':'ă','Â':'â','Ấ':'â','Ầ':'â','Ẩ':'â','Ẫ':'â','Ậ':'â',
      'È':'e','É':'e','Ẻ':'e','Ẽ':'e','Ẹ':'e','Ê':'ê','Ế':'ê','Ề':'ê','Ể':'ê','Ễ':'ê','Ệ':'ê',
      'Ì':'i','Í':'i','Ỉ':'i','Ĩ':'i','Ị':'i',
      'Ò':'o','Ó':'o','Ỏ':'o','Õ':'o','Ọ':'o','Ô':'ô','Ố':'ô','Ồ':'ô','Ổ':'ô','Ỗ':'ô','Ộ':'ô','Ơ':'ơ','Ớ':'ơ','Ờ':'ơ','Ở':'ơ','Ỡ':'ơ','Ợ':'ơ',
      'Ù':'u','Ú':'u','Ủ':'u','Ũ':'u','Ụ':'u','Ư':'ư','Ứ':'ư','Ừ':'ư','Ử':'ư','Ữ':'ư','Ự':'ư',
      'Ỳ':'y','Ý':'y','Ỷ':'y','Ỹ':'y','Ỵ':'y'
    };
    return map[c] || c.toLowerCase();
  }

  function isValidVowelSequence(v1, v2) {
    const pair = toFlatVowel(v1) + toFlatVowel(v2);
    const VALID_PAIRS = new Set([
      'ia', 'iê', 'ya', 'yê', 'ua', 'uô', 'uơ', 'uy', 'ươ',
      'oa', 'oe', 'uâ', 'uê', 'ui', 'uô', 'uơ', 'ưu', 'ươ', 'oai', 'oay', 'oao', 'oeo', 'uây'
    ]);
    return VALID_PAIRS.has(pair);
  }

  let splitPoints = new Set();

  // Rule 1: Scan for TONAL vowels backwards
  for (let i = 0; i < text.length; i++) {
    if (TONAL.has(text[i])) {
      let v_first = i;
      while (v_first > 0 && VOWELS.has(text[v_first - 1]) && isValidVowelSequence(text[v_first - 1], text[v_first])) {
        v_first--;
      }

      const sub = text.slice(0, v_first);
      const m = sub.match(ONSET_END_RE);
      let onsetStart = v_first;
      if (m) {
        let proposedOnset = m[0];
        let isDigraphSplit = false;
        if (proposedOnset.toLowerCase() === 'h' && sub.endsWith('nh')) isDigraphSplit = true;
        if (proposedOnset.toLowerCase() === 'g' && sub.endsWith('ng')) isDigraphSplit = true;
        if (proposedOnset.toLowerCase() === 'h' && sub.endsWith('ch')) isDigraphSplit = true;

        if (!isDigraphSplit) {
          onsetStart = sub.length - proposedOnset.length;
        }
      }

      if (onsetStart > 0) {
        const prevChar = text[onsetStart - 1];
        if (prevChar !== ' ' && prevChar !== '-') {
          if (VOWELS.has(prevChar) || CODA1.has(prevChar) || CODA2.has(text.slice(onsetStart - 2, onsetStart))) {
            splitPoints.add(onsetStart);
          }
        }
      }
    }
  }

  // Rule 2: Consonant-Consonant boundary check
  for (let i = 0; i < text.length - 1; i++) {
    const c1 = text[i];
    const c2 = text[i + 1];
    if (CONSONANTS.has(c1) && CONSONANTS.has(c2)) {
      const pair = (c1 + c2).toLowerCase();
      let isDigraph = VALID_DIGRAPHS.has(pair);
      if (pair === 'ng' && text[i + 2]?.toLowerCase() === 'h') {
        isDigraph = true;
      }
      
      if (!isDigraph) {
        splitPoints.add(i + 1);
      }
    }
  }

  // Build the result string
  let result = '';
  for (let i = 0; i < text.length; i++) {
    if (splitPoints.has(i)) {
      result += ' ';
    }
    result += text[i];
  }

  return result.replace(/\s+/g, ' ').trim();
}

/**
 * Converts TCVN3 (ABC) encoded string to Unicode.
 * Highly optimized, O(N) single-pass conversion.
 * Does not throw on invalid inputs.
 * 
 * @param {string} text - The input TCVN3 text.
 * @returns {string} Converted Unicode text.
 */
export function tcvn3ToUnicode(text) {
  if (!text) return '';
  const cleaned = text.replace(/\s*\u2212/g, 'ư');
  const converted = cleaned.replace(TCVN3_REGEX, (match) => TCVN3_TO_UNICODE_MAP[match] || match).normalize('NFC');
  return fixVietnameseSpacing(converted);
}

/**
 * Loại bỏ dấu tiếng Việt phục vụ cho tìm kiếm mờ (Fuzzy Search)
 * 
 * @param {string} str - Chuỗi tiếng Việt cần bỏ dấu.
 * @returns {string} Chuỗi không dấu ở dạng chữ thường.
 */
export function removeVietnameseTones(str) {
  if (!str) return '';
  // Chuẩn hóa NFD để tách các dấu tiếng Việt tổ hợp
  let result = str.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
  result = result.replace(/đ/g, "d").replace(/Đ/g, "D");
  // Thay thế triệt để các ký tự có dấu phổ biến khác đề phòng lỗi chuẩn hóa NFD
  result = result.replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a");
  result = result.replace(/[èéẹẻẽêềếệểễ]/g, "e");
  result = result.replace(/[ìíịỉĩ]/g, "i");
  result = result.replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o");
  result = result.replace(/[ùúụủũưừứựửữ]/g, "u");
  result = result.replace(/[ỳýỵỷỹ]/g, "y");
  return result.toLowerCase();
}
