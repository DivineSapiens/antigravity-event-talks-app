document.addEventListener('DOMContentLoaded', () => {
    // State management
    let releaseNotes = [];
    let activeCategory = 'all';
    let searchQuery = '';
    let selectedNote = null;

    // DOM Elements
    const feedContainer = document.getElementById('feedContainer');
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const emptyState = document.getElementById('emptyState');
    
    const refreshBtn = document.getElementById('refreshBtn');
    const refreshSpinner = document.getElementById('refreshSpinner');
    const themeCheckbox = document.getElementById('themeCheckbox');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const retryBtn = document.getElementById('retryBtn');
    
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    const categoryFilters = document.getElementById('categoryFilters');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    
    // Stats elements
    const totalUpdatesEl = document.getElementById('totalUpdates');
    const featureCountEl = document.getElementById('featureCount');
    const changeCountEl = document.getElementById('changeCount');
    const noticeCountEl = document.getElementById('noticeCount');

    // Tweet Modal Elements
    const tweetModal = document.getElementById('tweetModal');
    const closeModal = document.getElementById('closeModal');
    const cancelTweet = document.getElementById('cancelTweet');
    const tweetContent = document.getElementById('tweetContent');
    const publishTweetBtn = document.getElementById('publishTweetBtn');
    const charCount = document.getElementById('charCount');
    const hashtagTags = document.querySelectorAll('.hashtag-tag');
    const progressCircle = document.querySelector('.progress-ring__circle');
    
    // Toast Notification
    const toast = document.getElementById('toastNotification');
    const toastMsg = document.getElementById('toastMessage');

    // ==========================================================================
    // Theme Initializer
    // ==========================================================================
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (themeCheckbox) {
        themeCheckbox.checked = savedTheme === 'dark';
        themeCheckbox.addEventListener('change', (e) => {
            const newTheme = e.target.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            showToast(`Switched to ${newTheme} mode`);
        });
    }

    // ==========================================================================
    // Data Fetching
    // ==========================================================================
    async function fetchNotes() {
        showLoading(true);
        refreshSpinner.classList.add('spinning');
        refreshBtn.disabled = true;

        try {
            const response = await fetch('/api/release-notes');
            const data = await response.json();

            if (data.success) {
                releaseNotes = data.notes;
                updateStats(releaseNotes);
                renderFeed();
                showError(false);
            } else {
                showError(true, 'Failed to Parse Notes', data.error || 'Unknown error occurred while parsing the BigQuery RSS feed.');
            }
        } catch (err) {
            showError(true, 'Network Error', 'Failed to connect to the backend server. Make sure the Flask application is running.');
            console.error('Error fetching release notes:', err);
        } finally {
            showLoading(false);
            refreshSpinner.classList.remove('spinning');
            refreshBtn.disabled = false;
        }
    }

    // Helper states toggle
    function showLoading(isLoading) {
        if (isLoading) {
            loadingState.classList.remove('hidden');
            feedContainer.classList.add('hidden');
            emptyState.classList.add('hidden');
            errorState.classList.add('hidden');
        } else {
            loadingState.classList.add('hidden');
        }
    }

    function showError(isError, title = '', message = '') {
        if (isError) {
            document.getElementById('errorTitle').textContent = title;
            document.getElementById('errorMessage').textContent = message;
            errorState.classList.remove('hidden');
            feedContainer.classList.add('hidden');
            emptyState.classList.add('hidden');
            loadingState.classList.add('hidden');
        } else {
            errorState.classList.add('hidden');
        }
    }

    // ==========================================================================
    // Stats Updating
    // ==========================================================================
    function updateStats(notes) {
        totalUpdatesEl.textContent = notes.length;
        
        const features = notes.filter(n => n.type.toLowerCase() === 'feature').length;
        const notices = notes.filter(n => n.type.toLowerCase() === 'announcement' || n.type.toLowerCase() === 'notice').length;
        const changes = notes.filter(n => {
            const t = n.type.toLowerCase();
            return t === 'change' || t === 'fix' || t === 'issue' || t === 'deprecation';
        }).length;

        animateValue(featureCountEl, 0, features, 800);
        animateValue(changeCountEl, 0, changes, 800);
        animateValue(noticeCountEl, 0, notices, 800);
    }

    // Smooth counter animation
    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // ==========================================================================
    // Render Release Notes Card Feed
    // ==========================================================================
    function renderFeed() {
        feedContainer.innerHTML = '';
        
        // Filter Notes
        const filteredNotes = releaseNotes.filter(note => {
            // Category check
            let catMatch = false;
            if (activeCategory === 'all') {
                catMatch = true;
            } else {
                catMatch = note.type.toLowerCase() === activeCategory.toLowerCase();
            }
            
            // Search query check
            let searchMatch = false;
            if (!searchQuery) {
                searchMatch = true;
            } else {
                const query = searchQuery.toLowerCase();
                searchMatch = note.date.toLowerCase().includes(query) || 
                              note.type.toLowerCase().includes(query) || 
                              note.text_content.toLowerCase().includes(query);
            }
            
            return catMatch && searchMatch;
        });

        if (filteredNotes.length === 0) {
            feedContainer.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        feedContainer.classList.remove('hidden');

        filteredNotes.forEach((note, idx) => {
            const card = document.createElement('article');
            card.className = 'note-card';
            card.style.animationDelay = `${Math.min(idx * 0.05, 0.5)}s`;
            
            const badgeClass = `badge-${note.type.toLowerCase()}`;
            
            card.innerHTML = `
                <div class="card-header">
                    <div class="badge-and-date">
                        <span class="badge ${badgeClass}">${note.type}</span>
                        <span class="card-date">${note.date}</span>
                    </div>
                    <a href="${note.link}" target="_blank" class="source-link-btn" title="View official release log">
                        <span>Official Log</span>
                        <svg class="source-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                    </a>
                </div>
                <div class="card-content">
                    ${note.html_content}
                </div>
                <div class="card-actions">
                    <button class="card-action-btn copy-clip-btn" data-id="${note.id}">
                        <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        <span>Copy to Clipboard</span>
                    </button>
                    <button class="card-action-btn copy-link-btn" data-link="${note.link}">
                        <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="9" x2="15" y1="15" y2="9"/><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        <span>Copy Link</span>
                    </button>
                    <button class="card-action-btn tweet-btn" data-id="${note.id}">
                        <svg class="action-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span>Tweet</span>
                    </button>
                </div>
            `;
            
            feedContainer.appendChild(card);
        });

        // Attach Card Button Event Listeners
        document.querySelectorAll('.copy-clip-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteId = btn.getAttribute('data-id');
                const note = releaseNotes.find(n => n.id === noteId);
                if (note) {
                    const formattedText = `BigQuery Release Note (${note.date})\nType: ${note.type}\n\n${note.text_content}\n\nSource: ${note.link}`;
                    copyToClipboard(formattedText);
                    showToast('Release note copied to clipboard!');
                }
            });
        });

        document.querySelectorAll('.copy-link-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const link = btn.getAttribute('data-link');
                copyToClipboard(link);
                showToast('Release note link copied!');
            });
        });

        document.querySelectorAll('.tweet-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteId = btn.getAttribute('data-id');
                const note = releaseNotes.find(n => n.id === noteId);
                if (note) {
                    openTweetModal(note);
                }
            });
        });
    }

    // Copy to clipboard utility
    function copyToClipboard(text) {
        const temp = document.createElement('textarea');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
    }

    // Show Toast
    let toastTimeout;
    function showToast(msg) {
        toastMsg.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }

    // ==========================================================================
    // Search and Filter Events
    // ==========================================================================
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (searchQuery) {
            clearSearch.style.display = 'block';
        } else {
            clearSearch.style.display = 'none';
        }
        renderFeed();
    });

    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearch.style.display = 'none';
        renderFeed();
        searchInput.focus();
    });

    categoryFilters.addEventListener('click', (e) => {
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;

        // Toggle Active
        document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
        pill.classList.add('active');

        activeCategory = pill.getAttribute('data-category');
        renderFeed();
    });

    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearch.style.display = 'none';
        
        document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.filter-pill[data-category="all"]').classList.add('active');
        activeCategory = 'all';
        
        renderFeed();
    });

    refreshBtn.addEventListener('click', () => {
        fetchNotes().then(() => showToast('Release notes updated!'));
    });

    retryBtn.addEventListener('click', () => {
        fetchNotes();
    });

    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            exportToCSV();
        });
    }

    function exportToCSV() {
        const filteredNotes = releaseNotes.filter(note => {
            // Category check
            let catMatch = activeCategory === 'all' || note.type.toLowerCase() === activeCategory.toLowerCase();
            
            // Search query check
            let searchMatch = !searchQuery || 
                note.date.toLowerCase().includes(searchQuery.toLowerCase()) || 
                note.type.toLowerCase().includes(searchQuery.toLowerCase()) || 
                note.text_content.toLowerCase().includes(searchQuery.toLowerCase());
                
            return catMatch && searchMatch;
        });
        
        if (filteredNotes.length === 0) {
            showToast('No notes available to export.');
            return;
        }
        
        // Build CSV
        let csvContent = "\ufeffDate,Type,Link,Content\n"; // Add BOM for Excel compatibility
        filteredNotes.forEach(note => {
            const cleanText = note.text_content.replace(/"/g, '""').trim();
            const cleanDate = note.date.replace(/"/g, '""');
            const cleanType = note.type.replace(/"/g, '""');
            const cleanLink = note.link.replace(/"/g, '""');
            
            csvContent += `"${cleanDate}","${cleanType}","${cleanLink}","${cleanText}"\n`;
        });
        
        // Trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `bigquery_release_notes_${activeCategory}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast(`Exported ${filteredNotes.length} notes to CSV!`);
    }

    // ==========================================================================
    // Tweet Composer Modal Logic
    // ==========================================================================
    const rRing = 10;
    const circumference = 2 * Math.PI * rRing;
    if (progressCircle) {
        progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
        progressCircle.style.strokeDashoffset = circumference;
    }

    function openTweetModal(note) {
        selectedNote = note;
        
        // Reset hashtag tags selection
        hashtagTags.forEach(tag => tag.classList.remove('selected'));
        // Always select the first two hashtags by default (#BigQuery #GoogleCloud)
        hashtagTags[0].classList.add('selected');
        hashtagTags[1].classList.add('selected');

        // Compile default Tweet draft
        // Form: "📢 BigQuery Update ([Date])\n[Type]: [Body]\n[Link]"
        const dateStr = note.date;
        const typeStr = note.type;
        
        // Truncate body if it is too long.
        // Let's reserve characters for the link, hashtags, and template framing.
        // Standard Twitter link counts as 23 chars. Let's make sure the actual draft fits.
        const header = `📢 BigQuery Update (${dateStr})\n🔑 ${typeStr}: `;
        const link = `\n\nRead more: ${note.link}`;
        const tags = `\n#BigQuery #GoogleCloud`;
        
        // Maximum length for the body content
        // 280 - header.length - link.length (or 23) - tags.length - ellipsis (3)
        // Let's use 23 for the URL length because Twitter t.co replaces all URLs with a 23-char link.
        const urlEstimatedLength = 23;
        const fixedFrameLen = header.length + "\n\nRead more: ".length + urlEstimatedLength + tags.length + 3; // +3 for "..."
        const maxBodyLen = 280 - fixedFrameLen;

        let bodyText = note.text_content.replace(/\n+/g, ' ').trim();
        if (bodyText.length > maxBodyLen) {
            bodyText = bodyText.substring(0, maxBodyLen) + '...';
        }

        const draft = `${header}${bodyText}${link}${tags}`;
        tweetContent.value = draft;
        
        updateCharCount();

        // Show Modal
        tweetModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Lock background scroll
        setTimeout(() => tweetContent.focus(), 100);
    }

    function closeTweetModal() {
        tweetModal.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scroll
        selectedNote = null;
    }

    closeModal.addEventListener('click', closeTweetModal);
    cancelTweet.addEventListener('click', closeTweetModal);
    
    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !tweetModal.classList.contains('hidden')) {
            closeTweetModal();
        }
    });

    // Close modal when clicking outside the card
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });

    // Handle character counts & ring visualization
    function updateCharCount() {
        const text = tweetContent.value;
        
        // Twitter link character count algorithm standard:
        // Any URL is counted as exactly 23 characters.
        // Let's find URLs in text and adjust the count.
        const urlRegex = /https?:\/\/[^\s]+/g;
        let adjustedLength = text.length;
        
        const urls = text.match(urlRegex) || [];
        urls.forEach(url => {
            adjustedLength = adjustedLength - url.length + 23;
        });

        const charsRemaining = 280 - adjustedLength;
        charCount.textContent = charsRemaining;

        // Progress Circle fill calculation
        const percent = Math.min(adjustedLength / 280, 1);
        const offset = circumference - (percent * circumference);
        
        if (progressCircle) {
            progressCircle.style.strokeDashoffset = offset;
            
            // Set colors based on limit warning
            if (charsRemaining < 0) {
                progressCircle.style.stroke = 'var(--color-issue)';
                charCount.className = 'char-count-error';
                publishTweetBtn.disabled = true;
            } else if (charsRemaining <= 20) {
                progressCircle.style.stroke = 'var(--color-change)';
                charCount.className = 'char-count-warning';
                publishTweetBtn.disabled = false;
            } else {
                progressCircle.style.stroke = '#1d9bf0';
                charCount.className = '';
                publishTweetBtn.disabled = text.trim() === '';
            }
        }
    }

    tweetContent.addEventListener('input', updateCharCount);

    // Hashtag tags selection toggle behavior
    hashtagTags.forEach(tag => {
        tag.addEventListener('click', () => {
            const hashtag = tag.getAttribute('data-tag');
            const isSelected = tag.classList.contains('selected');
            let text = tweetContent.value;
            
            if (isSelected) {
                // Remove hashtag
                tag.classList.remove('selected');
                
                // Regular expression to replace the hashtag and clean up spaces
                // Match the hashtag with optional leading/trailing spaces
                const escapedTag = hashtag.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const regex = new RegExp(`\\s*${escapedTag}`, 'g');
                text = text.replace(regex, '').trim();
            } else {
                // Add hashtag
                tag.classList.add('selected');
                
                // We'll append it before the URL or at the end.
                // Usually hashtags are grouped together. Let's find if they exist, or append them.
                // Look for "Read more:" link and insert before it, or append to the end.
                const linkIndex = text.indexOf('\n\nRead more:');
                if (linkIndex !== -1) {
                    const beforeLink = text.substring(0, linkIndex).trim();
                    const afterLink = text.substring(linkIndex);
                    // Append with leading space
                    text = `${beforeLink} ${hashtag}${afterLink}`;
                } else {
                    text = `${text.trim()} ${hashtag}`;
                }
            }
            
            tweetContent.value = text;
            updateCharCount();
        });
    });

    // Tweet Publisher
    publishTweetBtn.addEventListener('click', () => {
        const text = tweetContent.value;
        if (!text.trim()) return;

        // Encode details
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        
        // Open link
        window.open(twitterUrl, '_blank', 'width=600,height=400,resizable=yes,scrollbars=yes');
        
        // Success feedback
        closeTweetModal();
        showToast('Opened Twitter composer tab!');
    });

    // Initialize Page
    fetchNotes();
});
