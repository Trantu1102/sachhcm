import { useState, useCallback, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  Book, Search, Menu, X, ChevronLeft, ChevronRight, 
  ZoomIn, ZoomOut, Sun, Moon, FileText, Copy, Check, BookOpen, Keyboard,
  Star, List, Bookmark, Filter, Clock
} from 'lucide-react';
import { tcvn3ToUnicode, fixVietnameseSpacing, splitVietnameseSyllables, removeVietnameseTones } from './utils/tcvn3.js';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
// searchIndex.json will be loaded asynchronously via fetch at runtime to keep JS bundle light

// Configure pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Upgraded volumes list containing historical years details
const VOLUMES_NEW = Array.from({ length: 15 }, (_, i) => {
  const years = [
    '1912 - 1924', '1924 - 1929', '1930 - 1945', '1945 - 1946', '1947 - 1948', '1949 - 1950',
    '1951 - 1952', '1953 - 1954', '1954 - 1955', '1955 - 1957', '7/1957 - 12/1958', '1959 - 1960',
    '1961 - 1962', '1963 - 1965', '1966 - 1969'
  ][i];
  const safeFilename = years.replace(/\s+/g, '').replace(/\//g, '-');
  return {
    id: i + 1,
    title: `Tập ${i + 1}`,
    years,
    file: `/pdf/new/tap${i + 1}_${safeFilename}.pdf`
  };
});

const VOLUMES_OLD = Array.from({ length: 12 }, (_, i) => {
  const years = [
    '1919 - 1924', '1924 - 1930', '1930 - 1945', '1945 - 1946', '1947 - 1949', '1950 - 1952',
    '1953 - 1955', '1955 - 1957', '1958 - 1959', '1960 - 1962', '1963 - 1965', '1966 - 1969'
  ][i];
  return {
    id: i + 1,
    title: `Tập ${i + 1}`,
    years,
    file: `/pdf/old/tap${i + 1}_${years.replace(/\s+/g, '')}.pdf`
  };
});

// DOM helper to highlight an exact Vietnamese phrase across split PDF text spans
function highlightPhraseInDOM(container, query) {
  const spans = container.querySelectorAll('[role="presentation"]');
  if (!spans || spans.length === 0) return;

  // Restore original text first
  spans.forEach(span => {
    const originalHtml = span.getAttribute('data-original-html');
    if (originalHtml !== null) {
      span.innerHTML = originalHtml;
    } else {
      span.setAttribute('data-original-html', span.innerHTML);
    }
  });

  const cleanQuery = query ? query.normalize('NFC').trim().toLowerCase().replace(/\s*\u2212\s*/g, 'ư') : '';
  if (!cleanQuery || cleanQuery.length < 2) {
    return;
  }

  // Bỏ dấu chuỗi truy vấn để tạo các từ không dấu
  const cleanQueryNoTones = removeVietnameseTones(cleanQuery);
  const words = cleanQueryNoTones.split(/[\s,.-]+/).filter(w => w.length > 0);
  if (words.length === 0) return;

  // Build full text and map character positions to spans
  let fullText = '';
  const spanPositions = [];

  spans.forEach((span, spanIdx) => {
    const text = span.textContent || '';
    for (let i = 0; i < text.length; i++) {
      spanPositions.push({ spanIdx, offset: i });
    }
    fullText += text;
  });

  // Bỏ dấu fullText của tài liệu để so khớp không dấu
  const fullTextNoTones = removeVietnameseTones(fullText);

  // Create search regex for exact phrase (use * to support stuck words)
  const escapedWords = words.map(w => w.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
  const regexPattern = escapedWords.join('[\\s\\-,.()\'"“”„«»!?;:\\[\\]{}/\\\\<>#*@&%+=~_|]{0,12}');
  
  let regex;
  try {
    regex = new RegExp(regexPattern, 'gi');
  } catch (e) {
    console.error("Regex creation error in highlightPhraseInDOM:", e);
    return;
  }

  // Find all matches in fullTextNoTones
  let match;
  const highlightsBySpan = Array.from({ length: spans.length }, () => []);

  while ((match = regex.exec(fullTextNoTones)) !== null) {
    const start = match.index;
    const end = regex.lastIndex;
    for (let k = start; k < end; k++) {
      const pos = spanPositions[k];
      if (pos) {
        highlightsBySpan[pos.spanIdx].push(pos.offset);
      }
    }
  }

  // Apply highlights to each span
  spans.forEach((span, spanIdx) => {
    const text = span.textContent || '';
    const offsets = highlightsBySpan[spanIdx];
    if (offsets.length === 0) return;

    offsets.sort((a, b) => a - b);

    let newHtml = '';
    let inMark = false;

    for (let i = 0; i < text.length; i++) {
      const shouldHighlight = offsets.includes(i);
      if (shouldHighlight && !inMark) {
        newHtml += `<mark class="search-highlight">`;
        inMark = true;
      } else if (!shouldHighlight && inMark) {
        newHtml += `</mark>`;
        inMark = false;
      }
      
      const char = text[i];
      if (char === '<') newHtml += '&lt;';
      else if (char === '>') newHtml += '&gt;';
      else if (char === '&') newHtml += '&amp;';
      else newHtml += char;
    }

    if (inMark) {
      newHtml += `</mark>`;
    }

    span.innerHTML = newHtml;
  });
}

// Highlight helper for reading panel (escapes HTML and inserts tags safely)
function highlightQueryInText(text, query) {
  if (!text) return '';
  
  const cleanQuery = query ? query.normalize('NFC').trim().toLowerCase().replace(/\s*\u2212\s*/g, 'ư') : '';
  if (!cleanQuery || cleanQuery.length < 2) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  const normText = text.normalize('NFC').toLowerCase();
  
  // Bỏ dấu chuỗi truy vấn và loại bỏ ký tự đặc biệt
  const cleanQueryNoTones = removeVietnameseTones(cleanQuery);
  const cleanQueryNoSpace = cleanQueryNoTones.replace(/[^a-z0-9]/g, '');
  if (cleanQueryNoSpace.length < 2) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Bỏ dấu văn bản gốc
  const normTextNoTones = removeVietnameseTones(normText);

  let textNoSpace = '';
  const mapIndices = [];
  for (let i = 0; i < text.length; i++) {
    const char = normTextNoTones[i];
    const isSeparator = /[^a-z0-9]/.test(char);
    if (!isSeparator) {
      textNoSpace += char;
      mapIndices.push(i);
    }
  }

  const matches = [];
  let pos = textNoSpace.indexOf(cleanQueryNoSpace);
  while (pos !== -1) {
    const startGoc = mapIndices[pos];
    const endGoc = mapIndices[pos + cleanQueryNoSpace.length - 1] + 1;
    matches.push({ start: startGoc, end: endGoc });
    pos = textNoSpace.indexOf(cleanQueryNoSpace, pos + 1);
  }

  if (matches.length === 0) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  let result = '';
  let lastIdx = 0;
  matches.sort((a, b) => a.start - b.start);
  
  matches.forEach(m => {
    if (m.start < lastIdx) return;
    
    const before = text.substring(lastIdx, m.start);
    result += before
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const matchText = text.substring(m.start, m.end);
    result += `<mark class="text-highlight">` + 
      matchText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;') + 
      `</mark>`;

    lastIdx = m.end;
  });

  const after = text.substring(lastIdx);
  result += after
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return result;
}

// Extract context snippets around matched search keywords to avoid showing full long page texts
function extractSnippets(text, query, maxLength = 160) {
  if (!text) return [];
  
  const cleanQuery = query ? query.normalize('NFC').trim().toLowerCase().replace(/\s*\u2212\s*/g, 'ư') : '';
  if (!cleanQuery || cleanQuery.length < 2) {
    return [{ text: text, isSnippet: false }];
  }

  const normText = text.normalize('NFC').toLowerCase();
  
  // Bỏ dấu chuỗi truy vấn và loại bỏ ký tự đặc biệt
  const cleanQueryNoTones = removeVietnameseTones(cleanQuery);
  const cleanQueryNoSpace = cleanQueryNoTones.replace(/[^a-z0-9]/g, '');
  if (cleanQueryNoSpace.length < 2) {
    return [{ text: text, isSnippet: false }];
  }

  // Bỏ dấu văn bản gốc
  const normTextNoTones = removeVietnameseTones(normText);

  let textNoSpace = '';
  const mapIndices = [];
  for (let i = 0; i < text.length; i++) {
    const char = normTextNoTones[i];
    const isSeparator = /[^a-z0-9]/.test(char);
    if (!isSeparator) {
      textNoSpace += char;
      mapIndices.push(i);
    }
  }

  const matches = [];
  let pos = textNoSpace.indexOf(cleanQueryNoSpace);
  while (pos !== -1) {
    const startGoc = mapIndices[pos];
    const endGoc = mapIndices[pos + cleanQueryNoSpace.length - 1] + 1;
    matches.push({ start: startGoc, end: endGoc });
    pos = textNoSpace.indexOf(cleanQueryNoSpace, pos + 1);
  }

  if (matches.length === 0) {
    return [{ text: text, isSnippet: false }];
  }

  const mergedRanges = [];
  let currentRange = null;

  matches.forEach(m => {
    const start = Math.max(0, m.start - maxLength);
    const end = Math.min(text.length, m.end + maxLength);

    if (!currentRange) {
      currentRange = { start, end };
    } else if (start <= currentRange.end) {
      currentRange.end = Math.max(currentRange.end, end);
    } else {
      mergedRanges.push(currentRange);
      currentRange = { start, end };
    }
  });
  if (currentRange) {
    mergedRanges.push(currentRange);
  }

  return mergedRanges.map(range => {
    let startIdx = range.start;
    let endIdx = range.end;

    if (startIdx > 0) {
      while (startIdx < text.length && text[startIdx] !== ' ' && text[startIdx] !== '\n') {
        startIdx++;
      }
    }
    if (endIdx < text.length) {
      while (endIdx > startIdx && text[endIdx] !== ' ' && text[endIdx] !== '\n') {
        endIdx--;
      }
    }

    let snippetText = text.substring(startIdx, endIdx).trim();
    const prefix = startIdx > 0 ? '... ' : '';
    const suffix = endIdx < text.length ? ' ...' : '';
    
    return {
      text: prefix + snippetText + suffix,
      isSnippet: true
    };
  });
}

// Extract exact matched text strings for copying highlighted text only
function extractExactMatches(text, query) {
  if (!text) return '';
  
  const cleanQuery = query ? query.normalize('NFC').trim().toLowerCase().replace(/\s*\u2212\s*/g, 'ư') : '';
  if (!cleanQuery || cleanQuery.length < 2) {
    return text;
  }

  const normText = text.normalize('NFC').toLowerCase();
  const cleanQueryNoSpace = cleanQuery.replace(/[\s\-,.()'"“”„«»!?;:\[\]{}\/\\<>#*@&%+=~_|]+/g, '');
  if (cleanQueryNoSpace.length < 2) return '';

  let textNoSpace = '';
  const mapIndices = [];
  for (let i = 0; i < text.length; i++) {
    const char = normText[i];
    const isSeparator = /[\s\-,.()'"“”„«»!?;:\[\]{}\/\\<>#*@&%+=~_|]/.test(char);
    if (!isSeparator) {
      textNoSpace += char;
      mapIndices.push(i);
    }
  }

  const matches = [];
  let pos = textNoSpace.indexOf(cleanQueryNoSpace);
  while (pos !== -1) {
    const startGoc = mapIndices[pos];
    const endGoc = mapIndices[pos + cleanQueryNoSpace.length - 1] + 1;
    matches.push({ start: startGoc, end: endGoc });
    pos = textNoSpace.indexOf(cleanQueryNoSpace, pos + 1);
  }

  if (matches.length > 0) {
    return matches.map(m => text.substring(m.start, m.end).trim()).join('\n');
  }
  
  return '';
}

function PageItem({ pageNumber, width, customTextRenderer, onVisible, pageAspectRatio, searchQuery, isActive }) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    // Observer for rendering the PDF page to prevent memory crashes when scrolling far
    const renderObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          setIsVisible(false); // Unload page when far out of viewport
        }
      },
      {
        root: null,
        rootMargin: '1200px 0px 1200px 0px',
        threshold: 0
      }
    );

    // Observer for tracking the current active page
    const activeObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onVisible(pageNumber);
        }
      },
      {
        root: null,
        rootMargin: '0px 0px 0px 0px',
        threshold: 0.5
      }
    );

    if (containerRef.current) {
      renderObserver.observe(containerRef.current);
      activeObserver.observe(containerRef.current);
    }

    return () => {
      renderObserver.disconnect();
      activeObserver.disconnect();
    };
  }, [pageNumber, onVisible]);

  useEffect(() => {
    if (!containerRef.current) return;
    const textLayer = containerRef.current.querySelector('.react-pdf__Page__textContent');
    if (textLayer && textLayer.children.length > 0) {
      highlightPhraseInDOM(textLayer, searchQuery);
    }
  }, [searchQuery]);

  const estimatedHeight = width ? width * pageAspectRatio : 600;

  useEffect(() => {
    if (isActive && isVisible && searchQuery) {
      const timer = setTimeout(() => {
        if (!containerRef.current) return;
        const firstHighlight = containerRef.current.querySelector('.search-highlight');
        if (firstHighlight) {
          const scrollContainer = firstHighlight.closest('.overflow-auto');
          if (scrollContainer) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const highlightRect = firstHighlight.getBoundingClientRect();
            const targetScrollTop = scrollContainer.scrollTop + (highlightRect.top - containerRect.top) - (containerRect.height / 2);
            scrollContainer.scrollTo({
              top: targetScrollTop,
              behavior: 'smooth'
            });
          }
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isActive, isVisible, searchQuery]);

  const skeletonPlaceholder = (
    <div 
      className="shimmer-skeleton w-full flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-900/40 rounded border border-dashed border-neutral-200 dark:border-neutral-800" 
      style={{ height: `${estimatedHeight}px` }}
    >
      <div className="flex flex-col items-center gap-3 animate-pulse opacity-75">
        <BookOpen className="w-8 h-8 text-neutral-300 dark:text-neutral-700 animate-pulse" />
        <span className="text-xs text-neutral-450 dark:text-neutral-500 font-semibold">Đang tải trang {pageNumber}...</span>
      </div>
    </div>
  );

  return (
    <div
      id={`page_${pageNumber}`}
      ref={containerRef}
      className={`bg-white dark:bg-dark-surface transition-all duration-300 w-fit flex-shrink-0 flex justify-center relative mb-6 border rounded ${
        isActive 
          ? 'border-primary/50 dark:border-red-500/50 ring-2 ring-primary/10 dark:ring-red-500/10 shadow-lg scale-[1.005]' 
          : 'border-neutral-200/50 dark:border-dark-border shadow-md'
      }`}
      style={{
        width: width ? `${width}px` : '100%',
        minWidth: width ? `${width}px` : '100%',
        minHeight: `${estimatedHeight}px`
      }}
    >
      {isVisible ? (
        <Page
          key={pageNumber}
          pageNumber={pageNumber}
          width={width}
          renderTextLayer={true}
          renderAnnotationLayer={true}
          customTextRenderer={customTextRenderer}
          onRenderTextLayerSuccess={() => {
            const textLayer = containerRef.current?.querySelector('.react-pdf__Page__textContent');
            if (textLayer) {
              highlightPhraseInDOM(textLayer, searchQuery);
              if (isActive && searchQuery) {
                setTimeout(() => {
                  const firstHighlight = textLayer.querySelector('.search-highlight');
                  if (firstHighlight) {
                    const scrollContainer = firstHighlight.closest('.overflow-auto');
                    if (scrollContainer) {
                      const containerRect = scrollContainer.getBoundingClientRect();
                      const highlightRect = firstHighlight.getBoundingClientRect();
                      const targetScrollTop = scrollContainer.scrollTop + (highlightRect.top - containerRect.top) - (containerRect.height / 2);
                      scrollContainer.scrollTo({
                        top: targetScrollTop,
                        behavior: 'smooth'
                      });
                    }
                  }
                }, 100);
              }
            }
          }}
          loading={skeletonPlaceholder}
        />
      ) : (
        <div className="w-full bg-white dark:bg-dark-surface flex items-center justify-center rounded border border-neutral-200/50 dark:border-dark-border" style={{ height: `${estimatedHeight}px` }}>
          <div className="flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500 font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-700 animate-ping" />
            Chuẩn bị trang {pageNumber}...
          </div>
        </div>
      )}
    </div>
  );
}
export default function App() {
  // Fix theme to light
  const theme = 'light';

  // Parse hash parameters for Deep Linking
  const getHashParams = () => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#/?')) {
      const params = new URLSearchParams(hash.substring(2));
      return {
        set: params.get('set'),
        vol: params.get('vol') ? parseInt(params.get('vol')) : null,
        page: params.get('page') ? parseInt(params.get('page')) : null,
        q: params.get('q') || ''
      };
    }
    return {};
  };

  const initialParams = getHashParams();

  const [currentBookSet, setCurrentBookSet] = useState(() => {
    return initialParams.set || localStorage.getItem('hcm_book_current_set') || 'new';
  });

  const VOLUMES = currentBookSet === 'new' ? VOLUMES_NEW : VOLUMES_OLD;

  const [currentVolume, setCurrentVolume] = useState(() => {
    const savedSet = initialParams.set || localStorage.getItem('hcm_book_current_set') || 'new';
    const targetVolumes = savedSet === 'new' ? VOLUMES_NEW : VOLUMES_OLD;
    const volId = initialParams.vol || parseInt(localStorage.getItem('hcm_book_current_vol'));
    if (volId) {
      const vol = targetVolumes.find(v => v.id === volId);
      if (vol) return vol;
    }
    return targetVolumes[0];
  });

  const [pageNumber, setPageNumber] = useState(() => {
    return initialParams.page || (localStorage.getItem('hcm_book_page') ? parseInt(localStorage.getItem('hcm_book_page')) : 1);
  });

  const [numPages, setNumPages] = useState(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isTextPanelOpen, setIsTextPanelOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // New states for Sidebar Tabs, Search Scope, Bookmarks, and History
  const [activeSidebarTab, setActiveSidebarTab] = useState('volumes'); // 'volumes', 'toc', 'bookmarks'
  const [searchScope, setSearchScope] = useState('all'); // 'all', 'current_vol'
  const [bookmarks, setBookmarks] = useState(() => {
    const saved = localStorage.getItem('hcm_book_bookmarks');
    return saved ? JSON.parse(saved) : [];
  });
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('hcm_book_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Toast notifications for session restore
  const [showRestoreToast, setShowRestoreToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Jump page input states
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [pageInputVal, setPageInputVal] = useState('1');

  const [searchQuery, setSearchQuery] = useState(initialParams.q || '');
  const [searchResults, setSearchResults] = useState([]);
  const [searchIndex, setSearchIndex] = useState([]);
  const [isIndexLoading, setIsIndexLoading] = useState(true);

  // Load search index dynamically at startup
  useEffect(() => {
    fetch('/searchIndex.json')
      .then(res => res.json())
      .then(data => {
        const normalized = data.map(item => {
          const cleanText = fixVietnameseSpacing(item.text || '');
          const textNormalized = cleanText.normalize('NFC').toLowerCase();
          const textNoTones = removeVietnameseTones(textNormalized);
          const textNoSpaces = textNoTones.replace(/[^a-z0-9]/g, '');
          return {
            ...item,
            text: cleanText,
            textNormalized,
            textNoTones,
            textNoSpaces
          };
        });
        setSearchIndex(normalized);
        setIsIndexLoading(false);
      })
      .catch(err => {
        console.error("Lỗi tải cơ sở dữ liệu tra cứu:", err);
        setIsIndexLoading(false);
      });
  }, []);

  const [containerWidth, setContainerWidth] = useState(800);
  const [zoom, setZoom] = useState(1.0);
  const [pageAspectRatio, setPageAspectRatio] = useState(0.707);
  
  const isCurrentVolumeDoublePage = searchIndex.some(
    item => item.boSach === currentBookSet && item.tap === currentVolume.id && item.isDoublePage
  );

  const handleSwitchBookSet = (set) => {
    setCurrentBookSet(set);
    const targetVolumes = set === 'new' ? VOLUMES_NEW : VOLUMES_OLD;
    setCurrentVolume(targetVolumes[0]);
    setPageNumber(1);
    localStorage.setItem('hcm_book_current_set', set);
    localStorage.setItem('hcm_book_current_vol', '1');
    localStorage.setItem('hcm_book_page', '1');
  };
  
  const containerRef = useRef(null);
  const pdfAreaRef = useRef(null);
  const isComposingRef = useRef(false);
  const isJumpingRef = useRef(false);

  const handlePageVisible = useCallback((pageNum) => {
    if (isJumpingRef.current) return;
    setPageNumber(pageNum);
  }, []);

  // Synchronize theme class on <html> element
  useEffect(() => {
    document.documentElement.classList.remove('theme-sepia', 'theme-dark', 'dark');
    document.documentElement.classList.add('theme-light');
  }, []);

  // Synchronize jump page input value and save page to localStorage
  useEffect(() => {
    const displayVal = isCurrentVolumeDoublePage ? (pageNumber * 2).toString() : pageNumber.toString();
    setPageInputVal(displayVal);
    if (pageNumber > 0) {
      localStorage.setItem('hcm_book_page', pageNumber.toString());
    }
  }, [pageNumber, isCurrentVolumeDoublePage]);

  // Sync current volume to localStorage
  useEffect(() => {
    localStorage.setItem('hcm_book_current_vol', currentVolume.id.toString());
  }, [currentVolume]);

  // Sync URL hash (Deep Linking)
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('set', currentBookSet);
    params.set('vol', currentVolume.id);
    params.set('page', pageNumber);
    if (searchQuery && searchQuery.trim().length >= 2) {
      params.set('q', searchQuery);
    }
    const newHash = `/?${params.toString()}`;
    if (window.location.hash !== `#${newHash}`) {
      window.history.replaceState(null, '', `#${newHash}`);
    }
  }, [currentBookSet, currentVolume.id, pageNumber, searchQuery]);

  // Auto save history when navigating to a new page
  useEffect(() => {
    if (pageNumber > 0 && currentVolume) {
      setHistory(prev => {
        const newItem = { id: Date.now(), set: currentBookSet, volId: currentVolume.id, volTitle: currentVolume.title, page: pageNumber, q: searchQuery, timestamp: Date.now() };
        const filtered = prev.filter(item => !(item.set === currentBookSet && item.volId === currentVolume.id && item.page === pageNumber));
        const newHistory = [newItem, ...filtered].slice(0, 15);
        localStorage.setItem('hcm_book_history', JSON.stringify(newHistory));
        return newHistory;
      });
    }
  }, [currentBookSet, currentVolume.id, pageNumber]);

  const toggleBookmark = () => {
    const isBookmarked = bookmarks.some(b => b.set === currentBookSet && b.volId === currentVolume.id && b.page === pageNumber);
    let newBookmarks;
    if (isBookmarked) {
      newBookmarks = bookmarks.filter(b => !(b.set === currentBookSet && b.volId === currentVolume.id && b.page === pageNumber));
    } else {
      newBookmarks = [{ id: Date.now(), set: currentBookSet, volId: currentVolume.id, volTitle: currentVolume.title, page: pageNumber, q: searchQuery, timestamp: Date.now() }, ...bookmarks];
    }
    setBookmarks(newBookmarks);
    localStorage.setItem('hcm_book_bookmarks', JSON.stringify(newBookmarks));
  };

  const jumpToLocation = (set, volId, page, q = '') => {
    if (q) {
      setSearchQuery(q);
      if (q.trim().length >= 2) {
        runSearch(q);
      }
    } else {
      setSearchQuery('');
      setSearchResults([]);
    }

    if (set !== currentBookSet) {
      handleSwitchBookSet(set);
    }
    const targetVolumes = set === 'new' ? VOLUMES_NEW : VOLUMES_OLD;
    const vol = targetVolumes.find(v => v.id === volId);
    if (vol && vol.id !== currentVolume.id) {
      setCurrentVolume(vol);
      setTimeout(() => {
        setPageNumber(page);
        jumpToPage(page);
      }, 600);
    } else {
      setPageNumber(page);
      jumpToPage(page);
    }
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  // Show session restore message on initial load
  useEffect(() => {
    const savedVolId = localStorage.getItem('hcm_book_current_vol');
    const savedPage = localStorage.getItem('hcm_book_page');
    if (savedVolId || savedPage) {
      const volId = savedVolId ? parseInt(savedVolId) : 1;
      const page = savedPage ? parseInt(savedPage) : 1;
      if (volId > 1 || page > 1) {
        setToastMessage(`Đã khôi phục phiên đọc trước: Tập ${volId} — Trang ${page}`);
        setShowRestoreToast(true);
        setTimeout(() => setShowRestoreToast(false), 4000);
      }
    }
  }, []);

  // Handle Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when user is typing in search or jump page inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = Math.min(numPages || pageNumber, pageNumber + 1);
        setPageNumber(next);
        jumpToPage(next);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = Math.max(1, pageNumber - 1);
        setPageNumber(prev);
        jumpToPage(prev);
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setIsTextPanelOpen(prev => !prev);
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        setZoom(z => Math.min(2.0, z + 0.1));
      } else if (e.key === '-') {
        e.preventDefault();
        setZoom(z => Math.max(0.4, z - 0.1));
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numPages, pageNumber]);

  useEffect(() => {
    const updateWidth = () => {
      const w = document.documentElement.clientWidth;
      const isMobile = w < 1024;
      const sidebarOffset = (isSidebarOpen && !isMobile) ? 320 : 0;
      const textPanelOffset = (isTextPanelOpen && !isMobile) ? 450 : 0;
      const padding = isMobile ? 24 : 80;
      const remainingWidth = w - sidebarOffset - textPanelOffset - padding;
      setContainerWidth(Math.max(300, Math.min(remainingWidth, 850)));
    };
    window.addEventListener('resize', updateWidth);
    updateWidth();
    return () => window.removeEventListener('resize', updateWidth);
  }, [isSidebarOpen, isTextPanelOpen]);

  useEffect(() => {
    // Reset page only if currentVolume changes due to explicit user click (checked via DOM or stack check)
    // When volume changes, reset page number to 1 unless it matches the initial restored session
    const savedVolId = localStorage.getItem('hcm_book_current_vol');
    const savedPage = localStorage.getItem('hcm_book_page');
    if (savedVolId && parseInt(savedVolId) === currentVolume.id && savedPage) {
      // Keep restored page
    } else {
      setPageNumber(1);
    }
    
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      containerRef.current.scrollLeft = 0;
    }
  }, [currentVolume]);

  const jumpToPage = (targetPage) => {
    const element = document.getElementById(`page_${targetPage}`);
    if (element) {
      isJumpingRef.current = true;
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        isJumpingRef.current = false;
      }, 850);
    }
  };

  const handlePageSubmit = (e) => {
    e.preventDefault();
    const val = parseInt(pageInputVal);
    const maxVal = isCurrentVolumeDoublePage ? numPages * 2 : numPages;
    if (!isNaN(val) && val >= 1 && val <= maxVal) {
      const pdfPage = isCurrentVolumeDoublePage ? Math.ceil(val / 2) : val;
      setPageNumber(pdfPage);
      jumpToPage(pdfPage);
    } else {
      setPageInputVal(isCurrentVolumeDoublePage ? (pageNumber * 2).toString() : pageNumber.toString());
    }
    setIsEditingPage(false);
  };

  const onDocumentLoadSuccess = async (pdf) => {
    setNumPages(pdf.numPages);
    
    // Restore exact page from localStorage session if matches current volume
    const savedVolId = localStorage.getItem('hcm_book_current_vol');
    const savedPage = localStorage.getItem('hcm_book_page');
    const targetPage = (savedVolId && parseInt(savedVolId) === currentVolume.id && savedPage) 
      ? parseInt(savedPage) 
      : 1;

    if (targetPage >= 1 && targetPage <= pdf.numPages) {
      setPageNumber(targetPage);
      setTimeout(() => {
        jumpToPage(targetPage);
      }, 400);
    } else {
      setPageNumber(1);
    }

    try {
      const firstPage = await pdf.getPage(1);
      const { width, height } = firstPage.getViewport({ scale: 1.0 });
      setPageAspectRatio(height / width);
    } catch (e) {
      console.error("Error getting page aspect ratio:", e);
    }
  };

  const runSearch = (rawQuery) => {
    setSearchQuery(rawQuery);
    const cleanedQuery = rawQuery.replace(/\s*\u2212\s*/g, 'ư');
    const queryClean = cleanedQuery.normalize('NFC').toLowerCase().trim();

    if (queryClean.length < 2) {
      setSearchResults([]);
      return;
    }

    const queryNoTones = removeVietnameseTones(queryClean);
    const queryNoSpaces = queryNoTones.replace(/[^a-z0-9]/g, '');

    const results = [];
    for (let i = 0; i < searchIndex.length; i++) {
      const item = searchIndex[i];
      if (item.boSach !== currentBookSet) continue;
      if (searchScope === 'current_vol' && item.tap !== currentVolume.id) continue;
      let score = 0;

      if (item.textNormalized.includes(queryClean)) {
        score = 3; // Khớp chính xác có dấu
      } else if (item.textNoTones.includes(queryNoTones)) {
        score = 2; // Khớp không dấu
      } else if (item.textNoSpaces.includes(queryNoSpaces)) {
        score = 1; // Khớp dính chữ / lệch khoảng trắng
      }

      if (score > 0) {
        results.push({
          ...item,
          score
        });
      }
    }

    // Sắp xếp theo: Score giảm dần, Tập tăng dần, Trang tăng dần
    results.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (a.tap !== b.tap) {
        return a.tap - b.tap;
      }
      return a.trang - b.trang;
    });

    setSearchResults(results.slice(0, 50));
  };


  useEffect(() => {
    if (searchQuery && searchQuery.trim().length >= 2) {
      runSearch(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchScope]);
  const handleSearch = (e) => {
    if (isComposingRef.current) {
      setSearchQuery(e.target.value);
      return;
    }
    runSearch(e.target.value);
  };

  const handleCompositionEnd = (e) => {
    isComposingRef.current = false;
    runSearch(e.target.value);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = (e.clipboardData || window.clipboardData).getData('text');
    if (!pastedText) return;
    const query = splitVietnameseSyllables(pastedText.normalize('NFC').trim());
    e.target.value = query;
    runSearch(query);
  };

  const navigateToResult = (result) => {
    const targetSet = result.boSach || 'new';
    if (targetSet !== currentBookSet) {
      setCurrentBookSet(targetSet);
      localStorage.setItem('hcm_book_current_set', targetSet);
    }
    const targetVolumes = targetSet === 'new' ? VOLUMES_NEW : VOLUMES_OLD;
    const volume = targetVolumes.find(v => v.id === result.tap);
    if (volume) {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
      if (currentVolume.id !== volume.id || currentBookSet !== targetSet) {
        setCurrentVolume(volume);
        setTimeout(() => {
          setPageNumber(result.trang);
          jumpToPage(result.trang);
        }, 600);
      } else {
        setPageNumber(result.trang);
        jumpToPage(result.trang);
      }
    }
  };

  // Find the clean unicode text for the current page
  const currentPageData = searchIndex.find(
    item => item.boSach === currentBookSet && item.tap === currentVolume.id && item.trang === pageNumber
  );
  const currentPageText = currentPageData ? currentPageData.text : '';

  const handleCopyPageText = () => {
    if (!currentPageText) return;
    
    let textToCopy = '';
    
    // Nếu đang tra cứu từ khóa và có tìm kiếm đang hoạt động
    if (searchQuery && searchQuery.trim().length >= 2) {
      // Chỉ copy chính xác những cụm từ khớp được bôi vàng trong văn bản
      textToCopy = extractExactMatches(currentPageText, searchQuery);
    } else {
      // Ngược lại, sao chép toàn bộ văn bản của trang
      textToCopy = currentPageText.replace(/\s+/g, ' ').trim();
    }
    
    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const customTextRenderer = useCallback(({ str }) => {
    return tcvn3ToUnicode(str);
  }, []);

  return (
    <div className="flex h-screen bg-neutral-100 dark:bg-[#121214] overflow-hidden text-neutral-800 dark:text-neutral-200 transition-colors duration-300">
      {/* Mobile Sidebar Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-15 transition-opacity duration-300 cursor-pointer"
        />
      )}

      {/* Mobile TextPanel Backdrop Overlay */}
      {isTextPanelOpen && (
        <div 
          onClick={() => setIsTextPanelOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-15 transition-opacity duration-300 cursor-pointer"
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`fixed lg:relative top-0 bottom-0 left-0 z-20 flex flex-col h-full w-80 bg-[var(--bg-sidebar)] border-r border-neutral-200 dark:border-neutral-800 transition-transform duration-300 lg:transition-all lg:transform-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:w-0 lg:translate-x-0'} overflow-hidden shadow-2xl lg:shadow-none`}>
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h1 className="text-lg font-bold text-primary dark:text-red-500 flex items-center gap-2 font-sans tracking-tight">
            <BookOpen className="w-5 h-5 text-primary dark:text-red-500" />
            Hồ Chí Minh Toàn Tập
          </h1>
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            title="Đóng thanh bên"
          >
            <X size={18} className="text-neutral-500" />
          </button>
        </div>

        
        {/* Sidebar Tabs */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E22]">
          <button onClick={() => setActiveSidebarTab('volumes')} className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${activeSidebarTab === 'volumes' ? 'text-primary dark:text-red-400 border-b-2 border-primary dark:border-red-500 bg-neutral-50 dark:bg-neutral-900/30' : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'}`}>
            <Book size={14} /> Tập sách
          </button>
          <button onClick={() => setActiveSidebarTab('bookmarks')} className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${activeSidebarTab === 'bookmarks' ? 'text-primary dark:text-red-400 border-b-2 border-primary dark:border-red-500 bg-neutral-50 dark:bg-neutral-900/30' : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'}`}>
            <Star size={14} /> Đã lưu
          </button>
        </div>

        {activeSidebarTab === 'volumes' && (
          <>
            {/* Book Set Selector */}
            <div className="p-4 border-b border-neutral-200/60 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-900/10">
              <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">Chọn bộ tư liệu</label>
              <div className="flex gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-lg border border-neutral-200/50 dark:border-neutral-800/50">
                <button
                  onClick={() => handleSwitchBookSet('new')}
                  className={`flex-1 py-1.5 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    currentBookSet === 'new'
                      ? 'bg-white dark:bg-[#1E1E22] text-primary dark:text-red-400 shadow-sm border border-neutral-200/20'
                      : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                >
                  Bộ mới (15 tập)
                </button>
                <button
                  onClick={() => handleSwitchBookSet('old')}
                  className={`flex-1 py-1.5 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    currentBookSet === 'old'
                      ? 'bg-white dark:bg-[#1E1E22] text-primary dark:text-red-400 shadow-sm border border-neutral-200/20'
                      : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                >
                  Bộ cũ (12 tập)
                </button>
              </div>
            </div>

            {/* Search Box */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30">
              <div className="relative mb-3">
                {isIndexLoading ? (
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary dark:border-red-500"></div>
                  </div>
                ) : (
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                )}
                <input 
                  type="text"
                  placeholder={isIndexLoading ? "Đang tải cơ sở dữ liệu..." : "Tra cứu văn bản..."}
                  value={searchQuery}
                  onChange={handleSearch}
                  onCompositionStart={() => { isComposingRef.current = true; }}
                  onCompositionEnd={handleCompositionEnd}
                  onPaste={handlePaste}
                  disabled={isIndexLoading}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1E1E22] border border-neutral-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:focus:ring-red-700 transition-all text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-neutral-500 flex items-center gap-1"><Filter size={12}/> Phạm vi tìm kiếm:</span>
                <select 
                  value={searchScope}
                  onChange={(e) => setSearchScope(e.target.value)}
                  className="bg-transparent text-primary dark:text-red-400 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="all">Toàn bộ sách</option>
                  <option value="current_vol">Chỉ Tập {currentVolume.id}</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* Volumes list / Search results list / TOC / Bookmarks */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {activeSidebarTab === 'bookmarks' ? (
            <div className="space-y-4 px-1">
              <div>
                <h3 className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Star size={12}/> Trang đã lưu ({bookmarks.length})</h3>
                {bookmarks.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">Chưa có trang nào được lưu.</p>
                ) : (
                  bookmarks.map((bm, idx) => (
                    <div key={idx} className="w-full text-left p-3 bg-neutral-50/50 dark:bg-neutral-900/20 border border-neutral-200 dark:border-neutral-800 rounded-lg mb-2 relative group">
                      <button onClick={() => jumpToLocation(bm.set, bm.volId, bm.page, bm.q)} className="block w-full text-left cursor-pointer">
                        <p className="text-xs font-bold text-primary dark:text-red-400 mb-1">{bm.volTitle} - Trang {bm.page}</p>
                        <p className="text-[10px] text-neutral-500">Bộ {bm.set === 'new' ? 'Mới' : 'Cũ'} • Đã lưu {new Date(bm.timestamp).toLocaleDateString('vi-VN')}</p>
                      </button>
                      <button 
                        onClick={() => {
                          const newBms = bookmarks.filter(b => b.id !== bm.id);
                          setBookmarks(newBms);
                          localStorage.setItem('hcm_book_bookmarks', JSON.stringify(newBms));
                        }}
                        className="absolute top-2 right-2 p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        title="Xóa Bookmark"
                      >
                        <X size={14}/>
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <h3 className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Clock size={12}/> Lịch sử đọc</h3>
                {history.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">Chưa có lịch sử.</p>
                ) : (
                  history.map((h, idx) => (
                    <button 
                      key={idx}
                      onClick={() => jumpToLocation(h.set, h.volId, h.page, h.q)}
                      className="w-full text-left py-2 px-2 hover:bg-neutral-100 dark:hover:bg-neutral-800/40 rounded transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-200 truncate">
                        {h.volTitle} - Tr.{h.page}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : searchQuery.length >= 2 ? (
            <div className="space-y-1">
              <h3 className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2 px-2">Kết quả tìm kiếm ({searchResults.length})</h3>
              {searchResults.length === 0 ? (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 px-2 py-4">Không tìm thấy kết quả phù hợp.</p>
              ) : (
                searchResults.map((result, idx) => (
                  <button 
                    key={idx}
                    onClick={() => navigateToResult(result)}
                    className="w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 rounded-lg mb-1 transition-all border border-neutral-100 dark:border-neutral-800/60 flex items-center justify-between shadow-sm bg-neutral-50/30 dark:bg-neutral-900/10 group cursor-pointer"
                  >
                    <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 group-hover:text-primary dark:group-hover:text-red-400 transition-colors">
                      Tập {result.tap} — {result.isDoublePage ? `Trang ${result.trang * 2 - 1}-${result.trang * 2} (Tờ ${result.trang})` : `Trang ${result.trang}`}
                    </span>
                    <ChevronRight size={14} className="text-neutral-400 group-hover:text-primary dark:group-hover:text-red-400 transition-all group-hover:translate-x-0.5" />
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              <h3 className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2 px-2">
                {currentBookSet === 'new' ? 'Danh mục 15 tập mới' : 'Danh mục 12 tập cũ'}
              </h3>
              {VOLUMES.map((vol) => (
                <button
                  key={vol.id}
                  onClick={() => {
                    setCurrentVolume(vol);
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`${currentVolume.id === vol.id ? 'bg-primary dark:bg-[#8C1C13] text-white shadow-sm' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40 text-neutral-700 dark:text-neutral-300'} w-full text-left px-3.5 py-3 rounded-lg transition-all font-medium text-sm flex items-center justify-between group cursor-pointer`}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{vol.title}</span>
                    <span className={`text-[10px] ${currentVolume.id === vol.id ? 'text-white/80' : 'text-neutral-400 dark:text-neutral-500'}`}>{vol.years}</span>
                  </div>
                  <ChevronRight size={14} className={`transition-all ${currentVolume.id === vol.id ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0'}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Navigation & Controls Header (Glassmorphic Pill Bar style) */}
        <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-[#1E1E22]/80 backdrop-blur-md flex items-center justify-between px-4 z-10 transition-colors">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button 
                onClick={() => setSidebarOpen(true)} 
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-500 dark:text-neutral-400 transition-colors cursor-pointer"
                title="Mở thanh bên"
              >
                <Menu size={20} />
              </button>
            )}
            <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-200 tracking-tight">
              {currentBookSet === 'new' ? 'Hồ Chí Minh Toàn Tập' : 'HCM Toàn Tập Cũ'} — {currentVolume.title}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 px-2 py-1 rounded-full border border-neutral-200/50 dark:border-neutral-800/50 shadow-inner">
              <button 
                onClick={() => setZoom(z => Math.max(0.4, z - 0.1))}
                disabled={zoom <= 0.4}
                className="p-1 text-neutral-500 dark:text-neutral-400 hover:text-primary dark:hover:text-red-400 disabled:opacity-40 rounded-full hover:bg-white dark:hover:bg-[#121214] transition-all cursor-pointer"
                title="Thu nhỏ"
              >
                <ZoomOut size={14} />
              </button>
              <button
                onClick={() => setZoom(1.0)}
                className="text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:text-primary dark:hover:text-red-400 px-2 py-0.5 rounded hover:bg-white dark:hover:bg-[#121214] transition-all cursor-pointer min-w-[42px] text-center"
                title="Đặt lại zoom 100%"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button 
                onClick={() => setZoom(z => Math.min(2.0, z + 0.1))}
                disabled={zoom >= 2.0}
                className="p-1 text-neutral-500 dark:text-neutral-400 hover:text-primary dark:hover:text-red-400 disabled:opacity-40 rounded-full hover:bg-white dark:hover:bg-[#121214] transition-all cursor-pointer"
                title="Phóng to"
              >
                <ZoomIn size={14} />
              </button>
            </div>

            {/* Page Navigation with Interactive Jump-to-Page */}
            <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 px-2.5 py-1 rounded-full border border-neutral-200/50 dark:border-neutral-800/50 shadow-inner">
              <button 
                onClick={() => {
                  const prev = Math.max(1, pageNumber - 1);
                  setPageNumber(prev);
                  jumpToPage(prev);
                }}
                disabled={pageNumber <= 1}
                className="p-1 text-neutral-500 dark:text-neutral-400 hover:text-primary dark:hover:text-red-400 disabled:opacity-40 transition-colors cursor-pointer"
                title="Trang trước"
              >
                <ChevronLeft size={16} />
              </button>
              
              {isEditingPage ? (
                <form onSubmit={handlePageSubmit} className="flex items-center">
                  <input 
                    type="number"
                    min={1}
                    max={isCurrentVolumeDoublePage ? (numPages * 2 || 1) : (numPages || 1)}
                    value={pageInputVal}
                    onChange={(e) => setPageInputVal(e.target.value)}
                    onBlur={handlePageSubmit}
                    className="w-11 text-center text-xs font-bold py-0.5 bg-white dark:bg-[#1E1E22] border border-neutral-300 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
                    autoFocus
                  />
                  <span className="text-xs font-semibold text-neutral-400 ml-1">/ {isCurrentVolumeDoublePage ? (numPages * 2 || '--') : (numPages || '--')}</span>
                </form>
              ) : (
                <span 
                  onClick={() => setIsEditingPage(true)}
                  className="text-xs font-bold text-neutral-750 dark:text-neutral-300 min-w-[70px] text-center select-none cursor-pointer hover:bg-white/60 dark:hover:bg-[#1E1E22] px-2 py-0.5 rounded transition-all"
                  title="Click để nhập số trang cần nhảy tới"
                >
                  {isCurrentVolumeDoublePage ? `Trang ${pageNumber * 2 - 1}-${pageNumber * 2} / ${numPages * 2} (Tờ ${pageNumber} / ${numPages})` : `Trang ${pageNumber} / ${numPages || '--'}`}
                </span>
              )}

              <button 
                onClick={() => {
                  const next = Math.min(numPages || pageNumber, pageNumber + 1);
                  setPageNumber(next);
                  jumpToPage(next);
                }}
                disabled={pageNumber >= numPages}
                className="p-1 text-neutral-500 dark:text-neutral-400 hover:text-primary dark:hover:text-red-400 disabled:opacity-40 transition-colors cursor-pointer"
                title="Trang sau"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Premium UI Features Toggle */}
            <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800" />
            
            {/* View Clean Text Panel Toggle */}
            <button 
              onClick={() => setIsTextPanelOpen(!isTextPanelOpen)}
              className={`p-2 rounded-lg border transition-all cursor-pointer ${
                isTextPanelOpen 
                  ? 'bg-primary/10 border-primary/20 text-primary dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400' 
                  : 'bg-white hover:bg-neutral-50 dark:bg-[#1E1E22] dark:hover:bg-neutral-800 border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400'
              }`}
              title="Xem văn bản trích xuất (Phím tắt: T)"
            >
              <FileText size={16} />
            </button>

            {/* Keyboard Shortcuts Dialog Trigger */}
            <button 
              onClick={() => setShowShortcuts(!showShortcuts)}
              className={`p-2 rounded-lg border transition-all cursor-pointer ${
                showShortcuts 
                  ? 'bg-primary/10 border-primary/20 text-primary dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400' 
                  : 'bg-white hover:bg-neutral-50 dark:bg-[#1E1E22] dark:hover:bg-neutral-800 border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400'
              }`}
              title="Phím tắt điều hướng (Phím tắt: H)"
            >
              <Keyboard size={16} />
            </button>
          </div>
        </header>

        {/* Shortcuts Panel Overlay */}
        {showShortcuts && (
          <div className="absolute top-18 right-4 bg-white dark:bg-[#1E1E22] border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl shadow-2xl z-30 w-72 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-3.5">
              <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Phím tắt nhanh</h4>
              <button 
                onClick={() => setShowShortcuts(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer p-0.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-600 dark:text-neutral-400">Lật sang trang sau</span>
                <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 border-b-2 border-neutral-300 dark:border-neutral-700 border-x border-t rounded font-mono shadow-sm text-[10px] font-bold text-neutral-700 dark:text-neutral-300">Phải (→)</kbd>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-600 dark:text-neutral-400">Lật về trang trước</span>
                <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 border-b-2 border-neutral-300 dark:border-neutral-700 border-x border-t rounded font-mono shadow-sm text-[10px] font-bold text-neutral-700 dark:text-neutral-300">Trái (←)</kbd>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-600 dark:text-neutral-400">Bật/Tắt bảng văn bản</span>
                <kbd className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 border-b-2 border-neutral-300 dark:border-neutral-700 border-x border-t rounded font-mono shadow-sm text-[10px] font-bold text-neutral-700 dark:text-neutral-300">T</kbd>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-600 dark:text-neutral-400">Phóng to / Thu nhỏ</span>
                <kbd className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 border-b-2 border-neutral-300 dark:border-neutral-700 border-x border-t rounded font-mono shadow-sm text-[10px] font-bold text-neutral-700 dark:text-neutral-300">+ / -</kbd>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-neutral-600 dark:text-neutral-400">Nhập số trang nhảy tới</span>
                <span className="text-[10px] italic text-neutral-400 dark:text-neutral-500 font-semibold bg-neutral-50 dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-200/50 dark:border-neutral-700/50">Click "Trang X/Y"</span>
              </div>
            </div>
          </div>
        )}

        {/* Workspace split: PDF Viewer & Clean Text panel */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Left panel: Scanned PDF canvas reader */}
          <div 
            ref={(el) => { containerRef.current = el; pdfAreaRef.current = el; }}
            className="flex-1 overflow-auto bg-[#E5E2DC] dark:bg-[#121214] p-4 lg:p-8 custom-scrollbar relative flex flex-col items-center transition-colors duration-300"
          >
            <Document
              file={currentVolume.file}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(err) => console.error("PDF Load Error:", err)}
              className="w-fit min-w-full mx-auto flex flex-col items-center"
              loading={
                <div className="flex flex-col items-center justify-center h-full min-h-[500px] gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Đang tải tập sách...</span>
                </div>
              }
            >
              {Array.from(new Array(numPages || 0), (el, index) => (
                <PageItem
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  width={containerWidth * zoom}
                  customTextRenderer={customTextRenderer}
                  onVisible={handlePageVisible}
                  pageAspectRatio={pageAspectRatio}
                  searchQuery={searchQuery}
                  isActive={pageNumber === index + 1}
                />
              ))}
            </Document>
          </div>

          {/* Right panel: Clean Unicode extracted Text view (Premium Sidebar) */}
          {(() => {
            const isSearching = searchQuery && searchQuery.trim().length >= 2;
            const snippets = extractSnippets(currentPageText, searchQuery);
            const hasSnippets = snippets.some(s => s.isSnippet);
            const hasActiveSearch = isSearching && hasSnippets;

            return (
              <div className={`fixed lg:relative top-0 bottom-0 right-0 z-20 flex flex-col h-full w-full max-w-[450px] bg-[var(--bg-card)] border-l border-neutral-200 dark:border-neutral-800 transition-all duration-300 ${isTextPanelOpen ? 'translate-x-0 opacity-100 lg:w-[450px]' : 'translate-x-full lg:w-0 opacity-0 pointer-events-none'} overflow-hidden shadow-2xl lg:shadow-none sepia-paper`}>
                {isTextPanelOpen && (
                  <>
                    {/* Header */}
                    <div className="p-4 border-b border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between bg-white/80 dark:bg-[#1E1E22]/80 backdrop-blur-sm">
                      <div>
                        <h3 className="font-bold text-sm tracking-tight text-neutral-800 dark:text-neutral-200">Bản Trích Văn Bản</h3>
                        <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                          {hasActiveSearch 
                            ? `Đoạn trích tìm kiếm — Tập ${currentVolume.id} ${isCurrentVolumeDoublePage ? `Trang ${pageNumber * 2 - 1}-${pageNumber * 2} (Tờ ${pageNumber})` : `Trang ${pageNumber}`}` 
                            : `Tập ${currentVolume.id} — ${isCurrentVolumeDoublePage ? `Trang ${pageNumber * 2 - 1}-${pageNumber * 2} (Tờ ${pageNumber})` : `Trang ${pageNumber}`}`}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={toggleBookmark}
                          className={`p-2 rounded-lg border text-xs font-semibold shadow-sm transition-all cursor-pointer ${
                            bookmarks.some(b => b.set === currentBookSet && b.volId === currentVolume.id && b.page === pageNumber)
                              ? 'bg-amber-100 border-amber-200 text-amber-500 dark:bg-amber-500/20 dark:border-amber-500/30 dark:text-amber-400' 
                              : 'bg-white dark:bg-[#1E1E22] hover:bg-neutral-50 dark:hover:bg-neutral-800 border-neutral-200 dark:border-neutral-800 text-neutral-400 dark:text-neutral-500 hover:text-amber-500'
                          }`}
                          title="Lưu trang này"
                        >
                          <Star size={14} fill={bookmarks.some(b => b.set === currentBookSet && b.volId === currentVolume.id && b.page === pageNumber) ? "currentColor" : "none"} />
                        </button>
                        <button 
                          onClick={handleCopyPageText}
                          disabled={!currentPageText || (isSearching && !hasSnippets)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                            copied 
                              ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' 
                              : 'bg-white dark:bg-[#1E1E22] hover:bg-neutral-50 dark:hover:bg-neutral-800 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300'
                          }`}
                          title={
                            isSearching 
                              ? (hasSnippets ? "Chỉ sao chép đúng đoạn văn bản được bôi vàng" : "Trang này không chứa từ khóa tìm kiếm") 
                              : "Sao chép toàn bộ văn bản của trang này"
                          }
                        >
                          {copied ? <Check size={12} /> : <Copy size={12} />}
                          {copied ? 'Đã sao chép!' : (hasActiveSearch ? 'Sao chép đoạn bôi vàng' : 'Sao chép')}
                        </button>
                        
                        <button 
                          onClick={() => setIsTextPanelOpen(false)}
                          className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-400 dark:text-neutral-500 transition-colors cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Text Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 selectable-text">
                      {isSearching ? (
                        hasSnippets ? (
                          <div className="space-y-4">
                            {snippets.map((snippet, idx) => (
                              <div key={idx} className="p-4 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/30 border border-neutral-200/50 dark:border-neutral-800/50 leading-relaxed font-serif text-[15px] select-text">
                                <span 
                                  dangerouslySetInnerHTML={{ 
                                    __html: highlightQueryInText(snippet.text, searchQuery) 
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          // Empty state if page does not contain searched query
                          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-neutral-400 dark:text-neutral-500">
                            <Search className="w-10 h-10 mb-3 opacity-55" />
                            <p className="text-sm font-bold mb-1 text-neutral-700 dark:text-neutral-300">Không có đoạn tìm kiếm</p>
                            <p className="text-xs max-w-[280px]">Trang {pageNumber} này không chứa từ khóa tìm kiếm. Bạn hãy chọn các trang kết quả trong danh sách tìm kiếm ở thanh bên trái hoặc lăn chuột sang trang khác chứa từ khóa.</p>
                          </div>
                        )
                      ) : (
                        isIndexLoading ? (
                          <div className="flex flex-col items-center justify-center h-full text-center p-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary dark:border-red-500 mb-3"></div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold animate-pulse">Đang tải dữ liệu văn bản...</p>
                          </div>
                        ) : currentPageText ? (
                          <div 
                            className="font-serif leading-relaxed text-[15.5px] text-neutral-800 dark:text-[#E2E2E9] select-text whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{ 
                              __html: highlightQueryInText(currentPageText, searchQuery) 
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-center p-4">
                            <FileText className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mb-2" />
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">Không có văn bản dạng ký tự cho trang này.</p>
                          </div>
                        )
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      </main>

      {/* Toast khôi phục phiên đọc cũ */}
      {showRestoreToast && (
        <div className="fixed bottom-6 left-6 bg-white/95 dark:bg-[#1E1E22]/95 backdrop-blur-md border border-primary/20 dark:border-red-500/20 px-4 py-3 rounded-2xl shadow-2xl z-50 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="p-1 rounded-lg bg-primary/10 dark:bg-red-500/10">
            <BookOpen className="w-4 h-4 text-primary dark:text-red-400" />
          </div>
          <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
