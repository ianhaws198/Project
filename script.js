// Global variables
let historyEntries = [];
const MAX_HISTORY = 10;

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    // Set toast color based on type
    if (type === 'error') {
        toast.style.background = '#dc2626';
    } else if (type === 'warning') {
        toast.style.background = '#d97706';
    } else {
        toast.style.background = '#059669';
    }
    
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Show loading overlay
function showLoading() {
    document.getElementById('loader').classList.add('active');
}

// Hide loading overlay
function hideLoading() {
    document.getElementById('loader').classList.remove('active');
}

// Update word and character count
function updateWordCount() {
    const editor = document.getElementById('editor');
    const text = editor.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const characters = text.length;
    
    document.getElementById('word-count').textContent = `${words} words`;
    document.getElementById('char-count').textContent = `${characters} characters`;
}

// Add to history log
function addToHistory(action) {
    const editor = document.getElementById('editor');
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    
    // Save current content to history
    historyEntries.push({
        action: action,
        timestamp: timeString,
        content: editor.innerHTML
    });
    
    // Keep only the last MAX_HISTORY entries
    if (historyEntries.length > MAX_HISTORY) {
        historyEntries.shift();
    }
    
    updateHistoryLog();
    showToast(action);
}

// Update history log display
function updateHistoryLog() {
    const historyLog = document.getElementById('history-log');
    
    // Clear current log
    historyLog.innerHTML = '';
    
    if (historyEntries.length === 0) {
        historyLog.innerHTML = '<p class="empty-state">Your actions will appear here...</p>';
        return;
    }
    
    // Add entries in reverse order (newest first)
    for (let i = historyEntries.length - 1; i >= 0; i--) {
        const entry = historyEntries[i];
        const historyEntry = document.createElement('div');
        historyEntry.className = 'history-entry';
        historyEntry.innerHTML = `
            <div class="history-entry-header">
                <span class="history-action">${entry.action}</span>
                <span class="history-time">${entry.timestamp}</span>
            </div>
        `;
        
        // Add click event to restore content
        historyEntry.addEventListener('click', () => {
            document.getElementById('editor').innerHTML = entry.content;
            addToHistory(`Restored: ${entry.action}`);
            updateFormatIndicators();
            updateWordCount();
        });
        
        historyLog.appendChild(historyEntry);
    }
}

// Enhanced clean text function with precise dash handling
function cleanText() {
    const editor = document.getElementById('editor');
    
    // Get the HTML content
    let content = editor.innerHTML;
    
    // Create a temporary div to work with the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // Clean text nodes without altering structure
    const cleanTextNodes = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            let text = node.nodeValue;
            
            // Replace em dash (—) between words with comma and space
            text = text.replace(/(\w)—(\w)/g, '$1, $2');
            
            // Replace en dash (–) between words with comma and space
            text = text.replace(/(\w)–(\w)/g, '$1, $2');
            
            // Replace dashes with surrounding spaces with single space
            text = text.replace(/\s*[—–]\s*/g, ' ');
            
            // Replace multiple spaces with single space (preserve line breaks)
            text = text.replace(/[^\S\r\n]+/g, ' ');
            
            node.nodeValue = text;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Preserve all structural elements (div, p, br, etc.)
            for (let child of node.childNodes) {
                cleanTextNodes(child);
            }
        }
    };
    
    cleanTextNodes(tempDiv);
    
    // Set the cleaned content back to the editor
    editor.innerHTML = tempDiv.innerHTML;
    
    addToHistory("Cleaned text");
    updateFormatIndicators();
    updateWordCount();
}

// Remove existing highlights
function removeHighlights() {
    const editor = document.getElementById('editor');
    const highlights = editor.querySelectorAll('.highlight');
    
    highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        const textNode = document.createTextNode(highlight.textContent);
        parent.replaceChild(textNode, highlight);
        
        // Normalize to merge adjacent text nodes
        parent.normalize();
    });
}

// Highlight matches in text
function highlightMatches() {
    const searchInput = document.getElementById('search-input').value;
    if (!searchInput) {
        showToast('Please enter text to search for', 'warning');
        return;
    }
    
    // Remove existing highlights first
    removeHighlights();
    
    const editor = document.getElementById('editor');
    const regexCheckbox = document.getElementById('regex-checkbox').checked;
    
    try {
        let regex;
        if (regexCheckbox) {
            regex = new RegExp(searchInput, 'gi');
        } else {
            // Escape special characters for plain text search
            regex = new RegExp(searchInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        }
        
        // Create a temporary div to work with the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = editor.innerHTML;
        
        // Function to highlight text in a node
        const highlightNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.nodeValue;
                const matches = [...text.matchAll(regex)];
                
                if (matches.length > 0) {
                    const parent = node.parentNode;
                    const fragment = document.createDocumentFragment();
                    let lastIndex = 0;
                    
                    matches.forEach(match => {
                        const matchIndex = match.index;
                        
                        // Text before the match
                        if (matchIndex > lastIndex) {
                            fragment.appendChild(document.createTextNode(text.substring(lastIndex, matchIndex)));
                        }
                        
                        // The matched text with highlight
                        const highlightSpan = document.createElement('span');
                        highlightSpan.className = 'highlight';
                        highlightSpan.textContent = match[0];
                        fragment.appendChild(highlightSpan);
                        
                        lastIndex = matchIndex + match[0].length;
                    });
                    
                    // Text after the last match
                    if (lastIndex < text.length) {
                        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
                    }
                    
                    parent.replaceChild(fragment, node);
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                for (let child of node.childNodes) {
                    highlightNode(child);
                }
            }
        };
        
        highlightNode(tempDiv);
        editor.innerHTML = tempDiv.innerHTML;
        
        addToHistory(`Highlighted: "${searchInput}"`);
    } catch (e) {
        showToast(`Regex error: ${e.message}`, 'error');
    }
}

// Replace text function
function replaceText() {
    const searchInput = document.getElementById('search-input').value;
    const replaceInput = document.getElementById('replace-input').value;
    if (!searchInput) {
        showToast('Please enter text to search for', 'warning');
        return;
    }
    
    // Remove existing highlights first
    removeHighlights();
    
    const editor = document.getElementById('editor');
    const regexCheckbox = document.getElementById('regex-checkbox').checked;
    
    try {
        let regex;
        if (regexCheckbox) {
            regex = new RegExp(searchInput, 'gi');
        } else {
            // Escape special characters for plain text search
            regex = new RegExp(searchInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        }
        
        // Create a temporary div to work with the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = editor.innerHTML;
        
        // Function to replace text in a node
        const replaceNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                let text = node.nodeValue;
                text = text.replace(regex, replaceInput);
                node.nodeValue = text;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                for (let child of node.childNodes) {
                    replaceNode(child);
                }
            }
        };
        
        replaceNode(tempDiv);
        editor.innerHTML = tempDiv.innerHTML;
        
        addToHistory(`Replaced: "${searchInput}" with "${replaceInput}"`);
        updateFormatIndicators();
        updateWordCount();
    } catch (e) {
        showToast(`Regex error: ${e.message}`, 'error');
    }
}

// Copy text function with styling preserved
function copyTextWithStyle() {
    const editor = document.getElementById('editor');
    const htmlContent = editor.innerHTML;
    
    // Create a blob of the content
    const blob = new Blob([htmlContent], {type: 'text/html'});
    const data = [new ClipboardItem({
        'text/html': blob,
        'text/plain': new Blob([editor.innerText], {type: 'text/plain'})
    })];
    
    navigator.clipboard.write(data).then(() => {
        showToast("Text copied with formatting!");
        addToHistory("Copied text with formatting");
    }).catch(err => {
        // Fallback to plain text copy
        navigator.clipboard.writeText(editor.innerText).then(() => {
            showToast("Text copied as plain text");
            addToHistory("Copied text as plain text");
        }).catch(() => {
            showToast("Failed to copy text", 'error');
        });
    });
}

// Download as PDF function
function downloadPDF() {
    showLoading();
    
    setTimeout(() => {
        const editor = document.getElementById('editor');
        const { jsPDF } = window.jspdf;
        
        html2canvas(editor).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            // Calculate aspect ratio to fit content
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            const imgX = (pdfWidth - imgWidth * ratio) / 2;
            const imgY = 15;
            
            pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
            pdf.save('PROCESSED_DOCUMENT.pdf');
            
            hideLoading();
            addToHistory("Exported as PDF");
            showToast("PDF exported successfully!");
        }).catch(err => {
            hideLoading();
            showToast("Failed to generate PDF", 'error');
            console.error('PDF generation error:', err);
        });
    }, 500);
}

// Enhanced format detection function
function detectFormats(element) {
    const formats = {
        bold: false,
        italic: false,
        underline: false,
        link: false
    };

    if (!element) return formats;

    // Check current element
    const tagName = element.tagName.toLowerCase();
    const style = window.getComputedStyle(element);
    
    // Check for bold (font-weight >= 600 or bold/strong tags)
    if (tagName === 'b' || tagName === 'strong' || 
        parseInt(style.fontWeight) >= 600 || 
        style.fontWeight === 'bold' || 
        style.fontWeight === 'bolder') {
        formats.bold = true;
    }
    
    // Check for italic (font-style italic or em/i tags)
    if (tagName === 'i' || tagName === 'em' || style.fontStyle === 'italic') {
        formats.italic = true;
    }
    
    // Check for underline
    if (style.textDecoration.includes('underline') || tagName === 'u') {
        formats.underline = true;
    }
    
    // Check for links
    if (tagName === 'a') {
        formats.link = true;
    }

    return formats;
}

// Enhanced format detection with recursive checking
function checkElementFormats(element, results) {
    if (!element) return;
    
    // Check if this element has any formatting
    const formats = detectFormats(element);
    
    if (formats.bold) results.hasBold = true;
    if (formats.italic) results.hasItalic = true;
    if (formats.underline) results.hasUnderline = true;
    if (formats.link) results.hasLinks = true;
    
    // Check child elements recursively
    for (let child of element.children) {
        checkElementFormats(child, results);
    }
    
    // Also check text nodes for inline styling
    if (element.childNodes) {
        for (let node of element.childNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                checkElementFormats(node, results);
            }
        }
    }
}

// Detect source links in text
function detectSourceLinks(content) {
    const urlPattern = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|\b[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}(?::[0-9]{1,5})?(?:\/[^\s<>"']*)?)/gi;
    const matches = content.match(urlPattern);
    return matches && matches.length > 0;
}

// Detect AI dividers in content
function detectAIDividers(content) {
    const dividerPatterns = [
        /<div[^>]*>\s*<\/div>/gi, // Empty divs
        /<hr[^>]*>/gi, // Horizontal rules
        /<br\s*\/?>\s*<br\s*\/?>/gi, // Multiple line breaks
        /<p[^>]*>\s*<\/p>/gi, // Empty paragraphs
        /<span[^>]*>\s*<\/span>/gi, // Empty spans
        /-{3,}/g, // Multiple dashes
        /_{3,}/g, // Multiple underscores
        /\*{3,}/g, // Multiple asterisks,
        /={3,}/g, // Multiple equals
        /<div[^>]*class[^>]*divider[^>]*>/gi, // Divider classes
        /<div[^>]*style[^>]*border[^>]*>/gi, // Border dividers
    ];
    
    for (let pattern of dividerPatterns) {
        if (content.match(pattern)) {
            return true;
        }
    }
    return false;
}

// Update format indicators with enhanced detection
function updateFormatIndicators() {
    const editor = document.getElementById('editor');
    const indicatorsContainer = document.getElementById('format-indicators');
    const content = editor.innerHTML;
    const textContent = editor.innerText;
    
    // Clear current indicators
    indicatorsContainer.innerHTML = '';
    
    // Initialize results
    const results = {
        hasBold: false,
        hasItalic: false,
        hasUnderline: false,
        hasLinks: false,
        hasSourceLinks: false,
        hasDividers: false
    };
    
    // Check all elements in editor
    checkElementFormats(editor, results);
    
    // Additional checks for common patterns
    if (!results.hasBold) {
        results.hasBold = content.includes('<b>') || 
                         content.includes('<strong>') || 
                         content.includes('font-weight:') ||
                         content.includes('style="') && content.includes('font-weight');
    }
    
    if (!results.hasItalic) {
        results.hasItalic = content.includes('<i>') || 
                           content.includes('<em>') || 
                           content.includes('font-style:') ||
                           content.includes('style="') && content.includes('font-style');
    }
    
    if (!results.hasUnderline) {
        results.hasUnderline = content.includes('<u>') || 
                              content.includes('text-decoration:') ||
                              content.includes('style="') && content.includes('underline');
    }
    
    if (!results.hasLinks) {
        results.hasLinks = content.includes('<a ') || 
                          content.includes('href=');
    }
    
    // Check for source links (plain text URLs)
    results.hasSourceLinks = detectSourceLinks(textContent);
    
    // Check for AI dividers
    results.hasDividers = detectAIDividers(content);
    
    // Create indicators based on results
    if (results.hasBold) {
        const boldIndicator = document.createElement('span');
        boldIndicator.className = 'format-indicator bold-indicator';
        boldIndicator.innerHTML = '<i class="fas fa-bold"></i> Bold Text';
        indicatorsContainer.appendChild(boldIndicator);
    }
    
    if (results.hasItalic) {
        const italicIndicator = document.createElement('span');
        italicIndicator.className = 'format-indicator italic-indicator';
        italicIndicator.innerHTML = '<i class="fas fa-italic"></i> Italic Text';
        indicatorsContainer.appendChild(italicIndicator);
    }
    
    if (results.hasLinks) {
        const linkIndicator = document.createElement('span');
        linkIndicator.className = 'format-indicator link-indicator';
        linkIndicator.innerHTML = '<i class="fas fa-link"></i> Hyperlinks';
        indicatorsContainer.appendChild(linkIndicator);
    }
    
    if (results.hasUnderline) {
        const underlineIndicator = document.createElement('span');
        underlineIndicator.className = 'format-indicator underline-indicator';
        underlineIndicator.innerHTML = '<i class="fas fa-underline"></i> Underlined';
        indicatorsContainer.appendChild(underlineIndicator);
    }
    
    if (results.hasSourceLinks) {
        const sourceLinkIndicator = document.createElement('span');
        sourceLinkIndicator.className = 'format-indicator source-link-indicator';
        sourceLinkIndicator.innerHTML = '<i class="fas fa-globe"></i> Source Links';
        indicatorsContainer.appendChild(sourceLinkIndicator);
    }
    
    if (results.hasDividers) {
        const dividerIndicator = document.createElement('span');
        dividerIndicator.className = 'format-indicator divider-indicator';
        dividerIndicator.innerHTML = '<i class="fas fa-grip-lines"></i> AI Dividers';
        indicatorsContainer.appendChild(dividerIndicator);
    }
    
    // If no special formatting
    if (!results.hasBold && !results.hasItalic && !results.hasLinks && 
        !results.hasUnderline && !results.hasSourceLinks && !results.hasDividers) {
        indicatorsContainer.innerHTML = '<span class="no-formatting">No special formatting detected</span>';
    }
}

// Remove all bold formatting - Enhanced version
function removeBoldFormatting() {
    const editor = document.getElementById('editor');
    
    // Find all bold elements
    const boldElements = editor.querySelectorAll('b, strong');
    
    // Also find elements with inline bold styling
    const inlineBoldElements = editor.querySelectorAll('[style*="font-weight"], [style*="font:"]');
    
    let removedCount = 0;
    
    // Remove <b> and <strong> tags
    boldElements.forEach(element => {
        const parent = element.parentNode;
        const textNode = document.createTextNode(element.textContent);
        parent.replaceChild(textNode, element);
        parent.normalize();
        removedCount++;
    });
    
    // Remove inline bold styling
    inlineBoldElements.forEach(element => {
        const style = element.getAttribute('style') || '';
        if (style.includes('font-weight') || style.includes('font:')) {
            // Remove font-weight and bold-related styles
            let newStyle = style
                .replace(/font-weight\s*:\s*(bold|bolder|[6-9]\d{2,})[^;]*;?/gi, '')
                .replace(/font\s*:\s*[^;]*\b(bold|bolder)\b[^;]*;?/gi, '')
                .replace(/;\s*;/, ';')
                .trim();
            
            if (newStyle.endsWith(';')) {
                newStyle = newStyle.slice(0, -1);
            }
            
            if (newStyle) {
                element.setAttribute('style', newStyle);
            } else {
                element.removeAttribute('style');
            }
            removedCount++;
        }
    });
    
    if (removedCount === 0) {
        showToast("No bold text found!", 'warning');
        return;
    }
    
    addToHistory("Removed all bold formatting");
    updateFormatIndicators();
    showToast(`Removed ${removedCount} bold formatting instances`);
}

// Remove all italic formatting - Enhanced version
function removeItalicFormatting() {
    const editor = document.getElementById('editor');
    
    // Find all italic elements
    const italicElements = editor.querySelectorAll('i, em');
    
    // Also find elements with inline italic styling
    const inlineItalicElements = editor.querySelectorAll('[style*="font-style"], [style*="font:"]');
    
    let removedCount = 0;
    
    // Remove <i> and <em> tags
    italicElements.forEach(element => {
        const parent = element.parentNode;
        const textNode = document.createTextNode(element.textContent);
        parent.replaceChild(textNode, element);
        parent.normalize();
        removedCount++;
    });
    
    // Remove inline italic styling
    inlineItalicElements.forEach(element => {
        const style = element.getAttribute('style') || '';
        if (style.includes('font-style') || style.includes('font:')) {
            // Remove font-style and italic-related styles
            let newStyle = style
                .replace(/font-style\s*:\s*italic[^;]*;?/gi, '')
                .replace(/font\s*:\s*[^;]*\bitalic\b[^;]*;?/gi, '')
                .replace(/;\s*;/, ';')
                .trim();
            
            if (newStyle.endsWith(';')) {
                newStyle = newStyle.slice(0, -1);
            }
            
            if (newStyle) {
                element.setAttribute('style', newStyle);
            } else {
                element.removeAttribute('style');
            }
            removedCount++;
        }
    });
    
    if (removedCount === 0) {
        showToast("No italic text found!", 'warning');
        return;
    }
    
    addToHistory("Removed all italic formatting");
    updateFormatIndicators();
    showToast(`Removed ${removedCount} italic formatting instances`);
}

// Remove source links (URLs)
function removeSourceLinks() {
    const editor = document.getElementById('editor');
    let content = editor.innerHTML;
    const textContent = editor.innerText;
    
    // URL pattern matching - more comprehensive
    const urlPattern = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|\b[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}(?::[0-9]{1,5})?(?:\/[^\s<>"']*)?)/gi;
    const matches = textContent.match(urlPattern);
    
    if (!matches || matches.length === 0) {
        showToast("No source links found!", 'warning');
        return;
    }
    
    // Remove URLs from both HTML and text content
    let newContent = content;
    matches.forEach(url => {
        const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedUrl, 'g');
        newContent = newContent.replace(regex, '');
    });
    
    editor.innerHTML = newContent;
    
    addToHistory("Removed source links");
    updateFormatIndicators();
    updateWordCount();
    showToast(`Removed ${matches.length} source links`);
}

// Remove hyperlinks but keep text
function removeHyperlinks() {
    const editor = document.getElementById('editor');
    const linkElements = editor.querySelectorAll('a');
    
    if (linkElements.length === 0) {
        showToast("No hyperlinks found!", 'warning');
        return;
    }
    
    linkElements.forEach(link => {
        const parent = link.parentNode;
        const textNode = document.createTextNode(link.textContent);
        parent.replaceChild(textNode, link);
        parent.normalize();
    });
    
    addToHistory("Removed hyperlinks");
    updateFormatIndicators();
    showToast(`Converted ${linkElements.length} hyperlinks to plain text`);
}

// Remove AI dividers (common AI formatting patterns)
function removeAIDividers() {
    const editor = document.getElementById('editor');
    let content = editor.innerHTML;
    
    // Common AI divider patterns
    const dividerPatterns = [
        /<div[^>]*>\s*<\/div>/gi, // Empty divs
        /<hr[^>]*>/gi, // Horizontal rules
        /<br\s*\/?>\s*<br\s*\/?>/gi, // Multiple line breaks
        /<p[^>]*>\s*<\/p>/gi, // Empty paragraphs
        /<span[^>]*>\s*<\/span>/gi, // Empty spans
        /-{3,}/g, // Multiple dashes
        /_{3,}/g, // Multiple underscores
        /\*{3,}/g, // Multiple asterisks,
        /={3,}/g, // Multiple equals
        /<div[^>]*class[^>]*divider[^>]*>/gi, // Divider classes
        /<div[^>]*style[^>]*border[^>]*>/gi, // Border dividers
    ];
    
    let removedCount = 0;
    
    dividerPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
            removedCount += matches.length;
        }
        content = content.replace(pattern, '');
    });
    
    editor.innerHTML = content;
    
    if (removedCount > 0) {
        addToHistory("Removed AI dividers");
        updateFormatIndicators();
        updateWordCount();
        showToast(`Removed ${removedCount} AI dividers`);
    } else {
        showToast("No AI dividers found!", 'warning');
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Set up event listeners
    document.getElementById('clean-btn').addEventListener('click', cleanText);
    document.getElementById('replace-btn').addEventListener('click', replaceText);
    document.getElementById('highlight-btn').addEventListener('click', highlightMatches);
    document.getElementById('download-pdf').addEventListener('click', downloadPDF);
    document.getElementById('copy-btn').addEventListener('click', copyTextWithStyle);
    document.getElementById('remove-bold-btn').addEventListener('click', removeBoldFormatting);
    document.getElementById('remove-italic-btn').addEventListener('click', removeItalicFormatting);
    document.getElementById('remove-source-links-btn').addEventListener('click', removeSourceLinks);
    document.getElementById('remove-hyperlinks-btn').addEventListener('click', removeHyperlinks);
    document.getElementById('remove-ai-dividers-btn').addEventListener('click', removeAIDividers);
    
    document.getElementById('clear-btn').addEventListener('click', () => {
        document.getElementById('editor').innerHTML = '';
        addToHistory("Cleared editor");
        showToast("Editor cleared!");
        updateFormatIndicators();
        updateWordCount();
    });
    
    // Add placeholder text to editor with various formatting including dividers and source links
    document.getElementById('editor').innerHTML = 
        '<div style="color: #64748b; font-style: italic; padding: 1rem;">' + 
        '<h2 style="font-size: 1.5rem; font-weight: bold; color: #1e293b; margin-bottom: 1rem;">Welcome to Jawad\'s AI Fixer</h2>' + 
        '<p>Paste or type your <strong style="font-weight: 700;">AI-generated text</strong> here to <em style="font-style: italic;">fix it up</em>!</p><br>' + 
        '<hr style="margin: 1.5rem 0; border: 1px solid #e2e8f0;">' +
        '<p>This editor preserves all formatting including:</p>' +
        '<ul style="margin-left: 1.5rem; margin-top: 0.5rem;">' +
        '<li><strong>Bold text</strong> for emphasis</li>' +
        '<li><em>Italic text</em> for subtle emphasis</li>' +
        '<li><u>Underlined text</u> for importance</li>' +
        '<li><a href="https://example.com" style="color: #2563eb; text-decoration: none;">Hyperlinks like this example</a> for references</li>' +
        '<li><span style="font-weight: 600;">Semi-bold text</span> with inline styling</li>' +
        '</ul>' +
        '<div style="border-left: 4px solid #2563eb; padding-left: 1rem; margin: 1rem 0; background: #f8fafc;">' +
        '<p><strong>Source Links Detection:</strong> The tool can detect plain text URLs like https://openai.com and www.example.com</p>' +
        '</div>' +
        '<p>Common AI dividers like ---, ***, ___ will also be detected and can be removed.</p>' +
        '<p>Try pasting content from ChatGPT, Claude, or other AI tools to see the format detection in action!</p>' +
        '</div>';
    
    // Update format indicators and word count for placeholder
    updateFormatIndicators();
    updateWordCount();
    
    // Add event listener for editor focus to clear placeholder
    document.getElementById('editor').addEventListener('focus', function() {
        if (this.innerHTML.includes('Welcome to Jawad')) {
            this.innerHTML = '';
            updateWordCount();
        }
    });
    
    // Update format indicators and word count when content changes
    document.getElementById('editor').addEventListener('input', () => {
        updateFormatIndicators();
        updateWordCount();
    });
    
    // Also update on paste events
    document.getElementById('editor').addEventListener('paste', (e) => {
        // Let the paste happen first, then update
        setTimeout(() => {
            updateFormatIndicators();
            updateWordCount();
        }, 100);
    });
    
    // Add example text for testing
    document.getElementById('search-input').value = 'example';
    document.getElementById('replace-input').value = 'demo';
});