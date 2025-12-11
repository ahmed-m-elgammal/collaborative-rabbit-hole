// Content script to extract page metadata
// Runs on all web pages to gather semantic information

(function () {
    'use strict';

    // Extract page metadata
    function extractMetadata() {
        const metadata = {
            title: document.title,
            description: '',
            keywords: [],
            ogTitle: '',
            ogDescription: '',
            author: '',
            publishedTime: '',
            mainContent: ''
        };

        // Get meta tags
        const metaTags = document.querySelectorAll('meta');
        metaTags.forEach(tag => {
            const name = tag.getAttribute('name') || tag.getAttribute('property');
            const content = tag.getAttribute('content');

            if (name && content) {
                switch (name.toLowerCase()) {
                    case 'description':
                        metadata.description = content;
                        break;
                    case 'keywords':
                        metadata.keywords = content.split(',').map(k => k.trim());
                        break;
                    case 'author':
                        metadata.author = content;
                        break;
                    case 'og:title':
                        metadata.ogTitle = content;
                        break;
                    case 'og:description':
                        metadata.ogDescription = content;
                        break;
                    case 'article:published_time':
                        metadata.publishedTime = content;
                        break;
                }
            }
        });

        // Extract main content text (for topic detection)
        const mainContent = document.querySelector('main') ||
            document.querySelector('article') ||
            document.querySelector('[role="main"]') ||
            document.body;

        if (mainContent) {
            // Get first 500 characters of text content
            metadata.mainContent = mainContent.textContent
                .trim()
                .substring(0, 500)
                .replace(/\s+/g, ' ');
        }

        // Extract keywords from content if not provided
        if (metadata.keywords.length === 0) {
            metadata.keywords = extractKeywords(metadata.mainContent);
        }

        return metadata;
    }

    // Simple keyword extraction using frequency analysis
    function extractKeywords(text) {
        if (!text) return [];

        // Common stop words to filter out
        const stopWords = new Set([
            'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
            'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
            'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
            'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
            'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go',
            'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
            'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them',
            'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over'
        ]);

        // Tokenize and count words
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !stopWords.has(word));

        const wordFreq = {};
        words.forEach(word => {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        });

        // Get top 10 most frequent words
        const keywords = Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word]) => word);

        return keywords;
    }

    // Send metadata to background script when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', sendMetadata);
    } else {
        sendMetadata();
    }

    function sendMetadata() {
        const metadata = extractMetadata();

        chrome.runtime.sendMessage({
            type: 'PAGE_METADATA',
            url: window.location.href,
            metadata: metadata
        }).catch(error => {
            // Ignore errors if background script isn't ready
            console.debug('Could not send metadata:', error);
        });
    }

    // Listen for requests from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'GET_METADATA') {
            const metadata = extractMetadata();
            sendResponse({ metadata });
        }
        return true;
    });

})();
