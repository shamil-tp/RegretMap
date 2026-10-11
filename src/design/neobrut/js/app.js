/* ==========================================================================
   REGRET MAP — CORE APPLICATION LOGIC (ROUNDED & MINIMAL)
   ========================================================================== */

(function () {
  'use strict';

  // --- Streamlined Posts Data (Crisp, Concise & High-Impact) ---
  const POSTS_DATA = [
    {
      id: 'bromo-sunset',
      title: 'Missing the sunset at Mount Bromo due to a traffic jam',
      author: 'u/lost_in_java',
      authorAvatar: 'LJ',
      city: 'Mt. Bromo, ID',
      coords: '7.9425° S, 112.9530° E',
      timeAgo: '3h ago',
      category: 'TRAFFIC / LOGISTICS',
      categoryColor: 'badge-red',
      severity: 9.8,
      hoursLost: '4.5 hrs',
      upvotes: 4812,
      commentCount: 384,
      image: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1200&q=80',
      story: `Hired a 1982 Land Cruiser at 2:00 AM to catch the sunrise over Mount Bromo. Exactly 6km before the viewpoint, an overloaded cabbage truck snapped its axle on a steep hairpin turn, trapping 180 jeeps. We sat in diesel smoke as the sky turned crimson behind the ridge. By the time it was towed, the caldera was blank white haze.`,
      timeline: [
        { time: '02:00 AM', text: 'Departed Malang in high spirits.' },
        { time: '03:45 AM', text: 'Overloaded cabbage truck snapped axle on hairpin #7.' },
        { time: '05:15 AM', text: 'Sunrise peaked while trapped in diesel exhaust.' }
      ]
    },
    {
      id: 'louvre-tuesday',
      title: 'Arrived at the Louvre on a Tuesday (closed on Tuesdays)',
      author: 'u/art_fan',
      authorAvatar: 'AF',
      city: 'Paris, FR',
      coords: '48.8606° N, 2.3376° E',
      timeAgo: '6h ago',
      category: 'TIMING / CLOSURE',
      categoryColor: 'badge-yellow',
      severity: 8.4,
      hoursLost: '3.0 hrs',
      upvotes: 3290,
      commentCount: 198,
      image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1200&q=80',
      story: `Sprinted through Paris in the rain during a 12-hour layover to see the Winged Victory. Arrived at the pyramid to find steel barricades and a small sign: 'Fermé le mardi'. Ate a cold sandwich in the metro instead.`,
      timeline: [
        { time: '08:30 AM', text: 'Landed at CDG and sprinted to the metro.' },
        { time: '09:15 AM', text: 'Security pointed to calendar: Closed on Tuesdays.' }
      ]
    },
    {
      id: 'preikestolen-fog',
      title: 'Hiked 8 hours up Preikestolen to stand in 100% whiteout fog',
      author: 'u/fjord_seeker',
      authorAvatar: 'FS',
      city: 'Rogaland, NO',
      coords: '58.9870° N, 6.1887° E',
      timeAgo: '11h ago',
      category: 'WEATHER DISASTER',
      categoryColor: 'badge-blue',
      severity: 9.1,
      hoursLost: '8.0 hrs',
      upvotes: 2140,
      commentCount: 142,
      image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
      story: `Trained for months for the 604m cliff view over Lysefjorden. Reached the edge in gale-force winds and zero visibility. Like standing inside a glass of warm milk for an hour before hiking back down.`,
      timeline: [
        { time: '06:00 AM', text: 'Began wet climb through granite boulders.' },
        { time: '10:00 AM', text: 'Summit reached: 2 meters visibility.' }
      ]
    },
    {
      id: 'shibuya-train',
      title: 'Missed Shibuya last train by 90s, slept in a karaoke booth',
      author: 'u/tokyo_drift',
      authorAvatar: 'TD',
      city: 'Tokyo, JP',
      coords: '35.6595° N, 139.7004° E',
      timeAgo: '1d ago',
      category: 'TIMING / CLOSURE',
      categoryColor: 'badge-yellow',
      severity: 7.9,
      hoursLost: '6.5 hrs',
      upvotes: 4105,
      commentCount: 276,
      image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
      story: `Ran down the Shibuya stairs at 00:43 AM. The gates snapped shut right as my hand reached the scanner. Slept in a tiny karaoke room with a mic in my ribs while the next room sang on repeat.`,
      timeline: [
        { time: '00:43 AM', text: 'Gates shut 5 yards ahead of me.' },
        { time: '01:30 AM', text: 'Checked into all-night karaoke booth.' }
      ]
    }
  ];

  // --- Concise Nested Comments (Clean & Punchy) ---
  const MOUNT_BROMO_COMMENTS = [
    {
      id: 'c1',
      author: 'u/bromo_jeep_driver',
      avatar: 'BJ',
      timeAgo: '3h ago',
      upvotes: 842,
      content: `Local driver here. That hairpin is notorious. The cabbage trucks are heavily overloaded every Tuesday for the dawn market. Never leave Malang at 2:00 AM anymore—leave by 00:30 AM or stay directly in Cemoro Lawang.`,
      replies: [
        {
          id: 'c1-1',
          author: 'u/java_wanderer',
          avatar: 'JW',
          timeAgo: '2h ago',
          upvotes: 319,
          content: `Happened to us too. Sitting at 8°C smelling leaded gas fumes for 4 hours while your toes freeze is true misery.`,
          replies: [
            {
              id: 'c1-1-1',
              author: 'u/trail_guide',
              avatar: 'TG',
              timeAgo: '1h ago',
              upvotes: 184,
              content: `Pro tip: get out and walk 400m to the foot trail for Seruni Point (Viewpoint 2). 35 min on foot, bypasses all vehicles, and the sunrise is just as stunning.`,
              replies: [
                {
                  id: 'c1-1-1-1',
                  author: 'u/lost_in_java',
                  avatar: 'LJ',
                  isOp: true,
                  timeAgo: '30m ago',
                  upvotes: 95,
                  content: `Where was this advice yesterday?! Bookmark saved for my next attempt.`,
                  replies: []
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'c2',
      author: 'u/photo_dave',
      avatar: 'PD',
      timeAgo: '3h ago',
      upvotes: 567,
      content: `I flew with a $6k camera and medium telephoto lens only to photograph the rusty tailpipe of a minibus 6 inches from my windshield. Modern travel in a nutshell.`,
      replies: []
    }
  ];

  // --- App State ---
  const state = {
    currentView: 'feed',
    activeThreadPostId: null,
    userVotes: {},
    collapsedComments: new Set(),
    activeReplyBoxes: new Set(),
    posts: [...POSTS_DATA],
    comments: JSON.parse(JSON.stringify(MOUNT_BROMO_COMMENTS)),
    filterCategory: 'ALL',
    searchQuery: ''
  };

  // --- DOM References ---
  const elements = {
    feedViewContainer: document.getElementById('feed-view-container'),
    deepThreadContainer: document.getElementById('deep-thread-container'),
    heatmapViewSection: document.getElementById('heatmap-view-section'),
    splitViewSection: document.getElementById('split-view-section'),
    viewBtnFeed: document.getElementById('view-btn-feed'),
    viewBtnMap: document.getElementById('view-btn-map'),
    viewBtnSplit: document.getElementById('view-btn-split'),
    modalOverlay: document.getElementById('modal-log-regret'),
    btnOpenModal: document.getElementById('btn-open-log-modal'),
    btnCloseModal: document.getElementById('btn-close-log-modal'),
    formLogRegret: document.getElementById('form-log-regret'),
    severitySlider: document.getElementById('regret-severity-slider'),
    severityValueDisplay: document.getElementById('severity-value-display'),
    toastContainer: document.getElementById('toast-container'),
    searchInput: document.getElementById('global-search-input'),
    navItemFeed: document.getElementById('nav-item-feed'),
    navItemMap: document.getElementById('nav-item-map')
  };

  // --- Initial Setup ---
  function init() {
    renderFeedCards();
    setupEventListeners();
    setupSeveritySlider();

    if (window.location.hash === '#post-bromo-sunset') {
      openThreadView('bromo-sunset');
    }
  }

  // --- Render Streamlined Feed Cards ---
  function renderFeedCards() {
    if (!elements.feedViewContainer) return;

    let filteredPosts = state.posts;
    if (state.filterCategory !== 'ALL') {
      filteredPosts = state.posts.filter(p => p.category.includes(state.filterCategory));
    }

    if (state.searchQuery && state.searchQuery.trim() !== '') {
      const q = state.searchQuery.toLowerCase().trim();
      filteredPosts = filteredPosts.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        p.story.toLowerCase().includes(q)
      );
    }

    elements.feedViewContainer.innerHTML = filteredPosts.map(post => {
      const userVote = state.userVotes[post.id];
      const isUpvoted = userVote === 'up';
      const isDownvoted = userVote === 'down';
      const currentVotes = post.upvotes + (isUpvoted ? 1 : isDownvoted ? -1 : 0);

      return `
        <article class="regret-card" id="card-${post.id}">
          <!-- Left Voting Column -->
          <div class="vote-column">
            <button 
              class="vote-chevron-btn ${isUpvoted ? 'upvoted' : ''}" 
              onclick="window.regretApp.handleVote('${post.id}', 'up')"
              title="Upvote"
              aria-label="Upvote">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            </button>

            <span class="vote-count-number ${isUpvoted ? 'upvoted' : isDownvoted ? 'downvoted' : ''}">
              ${currentVotes.toLocaleString()}
            </span>

            <button 
              class="vote-chevron-btn ${isDownvoted ? 'downvoted' : ''}" 
              onclick="window.regretApp.handleVote('${post.id}', 'down')"
              title="Downvote"
              aria-label="Downvote">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>

          <!-- Main Post Body -->
          <div class="post-main-content">
            <div class="post-header-meta">
              <div class="post-user-info">
                <div class="avatar-circle" style="width: 26px; height: 26px; font-size: 0.7rem;">${post.authorAvatar}</div>
                <span class="author-name">${post.author}</span>
                <span class="badge-brutal badge-yellow">📍 ${post.city}</span>
              </div>
              <span class="mono-meta">${post.timeAgo}</span>
            </div>

            <h3 class="post-title" onclick="window.regretApp.openThreadView('${post.id}')">
              ${post.title}
            </h3>

            <p class="post-story-body">
              ${truncateText(post.story, 180)}
            </p>

            ${post.image ? `
              <div class="post-visual-banner" onclick="window.regretApp.openThreadView('${post.id}')" style="cursor: pointer;">
                <img src="${post.image}" alt="${post.title}" loading="lazy">
                <div class="missed-stamp-overlay">${post.severity}/10 Regret</div>
              </div>
            ` : ''}

            <div class="post-footer-actions">
              <button class="action-btn-pill primary-open" onclick="window.regretApp.openThreadView('${post.id}')">
                💬 ${post.commentCount} Comments
              </button>
              <button class="action-btn-pill" onclick="window.regretApp.sharePost('${post.id}')">
                ↗ Share
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  // --- Open Thread View ---
  function openThreadView(postId) {
    const post = state.posts.find(p => p.id === postId) || state.posts[0];
    state.activeThreadPostId = post.id;
    window.location.hash = `post-${post.id}`;

    elements.feedViewContainer.style.display = 'none';
    elements.deepThreadContainer.style.display = 'flex';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    renderDeepThread(post);
  }

  // --- Return to Feed ---
  function backToFeed() {
    state.activeThreadPostId = null;
    window.location.hash = '';

    elements.deepThreadContainer.style.display = 'none';
    elements.feedViewContainer.style.display = 'block';
    renderFeedCards();
  }

  // --- Render Deep Thread View ---
  function renderDeepThread(post) {
    const userVote = state.userVotes[post.id];
    const isUpvoted = userVote === 'up';
    const isDownvoted = userVote === 'down';
    const currentVotes = post.upvotes + (isUpvoted ? 1 : isDownvoted ? -1 : 0);

    elements.deepThreadContainer.innerHTML = `
      <nav class="thread-nav-breadcrumb">
        <button class="btn-brutal btn-sm btn-yellow btn-pill" onclick="window.regretApp.backToFeed()">
          ← Back to Feed
        </button>
        <span class="mono-meta">📍 ${post.city} • ${post.coords}</span>
      </nav>

      <article class="thread-hero-card">
        <div class="vote-column">
          <button 
            class="vote-chevron-btn ${isUpvoted ? 'upvoted' : ''}" 
            onclick="window.regretApp.handleVote('${post.id}', 'up')"
            aria-label="Upvote">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          </button>

          <span class="vote-count-number ${isUpvoted ? 'upvoted' : isDownvoted ? 'downvoted' : ''}">
            ${currentVotes.toLocaleString()}
          </span>

          <button 
            class="vote-chevron-btn ${isDownvoted ? 'downvoted' : ''}" 
            onclick="window.regretApp.handleVote('${post.id}', 'down')"
            aria-label="Downvote">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>

        <div class="post-main-content">
          <div class="post-header-meta">
            <div class="post-user-info">
              <div class="avatar-circle" style="width: 28px; height: 28px;">${post.authorAvatar}</div>
              <span class="author-name">${post.author}</span>
              <span class="badge-brutal badge-red">${post.severity}/10 Regret</span>
            </div>
            <span class="mono-meta">${post.timeAgo}</span>
          </div>

          <h1 style="font-size: 1.55rem; line-height: 1.3;">
            ${post.title}
          </h1>

          <p class="post-story-body" style="font-size: 1rem;">
            ${post.story}
          </p>

          ${post.timeline ? `
            <div class="timeline-chronology">
              <span style="font-weight: 700; font-size: 0.85rem;">Timeline:</span>
              ${post.timeline.map(item => `
                <div class="timeline-step">
                  <span class="timeline-time">${item.time}</span>
                  <span>${item.text}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${post.image ? `
            <div class="post-visual-banner">
              <img src="${post.image}" alt="${post.title}">
            </div>
          ` : ''}

          <div class="post-footer-actions">
            <span class="mono-meta" style="font-weight: 700;">${post.commentCount} Comments</span>
            <button class="action-btn-pill" onclick="window.regretApp.sharePost('${post.id}')">↗ Share</button>
          </div>
        </div>
      </article>

      <!-- Composer -->
      <section class="comment-composer-card">
        <textarea 
          id="main-thread-reply-input"
          class="composer-textarea" 
          placeholder="Share your thought or advice..." 
          rows="2"></textarea>
        <div class="composer-toolbar">
          <button class="btn-brutal btn-yellow btn-pill btn-sm" onclick="window.regretApp.submitTopLevelComment()">
            Reply →
          </button>
        </div>
      </section>

      <!-- Comments Tree -->
      <section class="comments-container" id="thread-comments-root">
        ${renderCommentTree(state.comments, 0)}
      </section>
    `;
  }

  // --- Recursive Nested Comment Tree ---
  function renderCommentTree(commentsList, depth = 0) {
    if (!commentsList || commentsList.length === 0) return '';

    return commentsList.map(comment => {
      const isCollapsed = state.collapsedComments.has(comment.id);
      const isReplying = state.activeReplyBoxes.has(comment.id);
      const userVote = state.userVotes[comment.id];
      const isUpvoted = userVote === 'up';
      const isDownvoted = userVote === 'down';
      const currentVotes = comment.upvotes + (isUpvoted ? 1 : isDownvoted ? -1 : 0);

      return `
        <div class="comment-node" id="comment-node-${comment.id}">
          <div class="comment-card">
            <div class="comment-header">
              <div class="comment-author-group">
                <button 
                  class="collapse-toggle-btn" 
                  onclick="window.regretApp.toggleCollapse('${comment.id}')">
                  ${isCollapsed ? '[ + ]' : '[ – ]'}
                </button>

                <div class="comment-avatar-circle" style="${comment.isOp ? 'background-color: #FF3B30; color: #FFF;' : ''}">
                  ${comment.avatar}
                </div>

                <span class="comment-author-name" style="${comment.isOp ? 'color: #FF3B30;' : ''}">
                  ${comment.author}
                </span>

                ${comment.isOp ? `<span class="badge-brutal badge-red" style="font-size: 9px; padding: 1px 5px;">OP</span>` : ''}
                <span class="mono-meta">${comment.timeAgo}</span>
              </div>

              <div class="comment-vote-inline">
                <button 
                  class="inline-chevron ${isUpvoted ? 'upvoted' : ''}" 
                  onclick="window.regretApp.handleVote('${comment.id}', 'up')">▲</button>
                <span class="vote-count-number ${isUpvoted ? 'upvoted' : isDownvoted ? 'downvoted' : ''}">
                  ${currentVotes}
                </span>
                <button 
                  class="inline-chevron ${isDownvoted ? 'downvoted' : ''}" 
                  onclick="window.regretApp.handleVote('${comment.id}', 'down')">▼</button>
              </div>
            </div>

            ${isCollapsed ? `
              <div class="collapsed-placeholder" onclick="window.regretApp.toggleCollapse('${comment.id}')">
                <span>[ + ] Thread collapsed (${comment.replies ? comment.replies.length : 0} replies hidden)</span>
              </div>
            ` : `
              <div class="comment-body-text">
                ${comment.content}
              </div>

              <div class="comment-actions-bar">
                <button class="comment-reply-btn" onclick="window.regretApp.toggleReplyComposer('${comment.id}')">
                  ${isReplying ? 'Cancel' : 'Reply'}
                </button>
              </div>

              ${isReplying ? `
                <div class="inline-reply-composer">
                  <textarea 
                    id="reply-input-${comment.id}" 
                    class="inline-reply-textarea" 
                    placeholder="Write a reply..."
                    rows="2"></textarea>
                  <div style="display: flex; justify-content: flex-end; gap: 6px;">
                    <button class="btn-brutal btn-sm" onclick="window.regretApp.toggleReplyComposer('${comment.id}')">Cancel</button>
                    <button class="btn-brutal btn-sm btn-yellow btn-pill" onclick="window.regretApp.submitNestedReply('${comment.id}')">Post</button>
                  </div>
                </div>
              ` : ''}
            `}
          </div>

          <!-- Nested Children with 2.5px Left Guide Line -->
          ${!isCollapsed && comment.replies && comment.replies.length > 0 ? `
            <div class="comment-nested-children">
              ${renderCommentTree(comment.replies, depth + 1)}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  // --- Collapse Toggle ---
  function toggleCollapse(commentId) {
    if (state.collapsedComments.has(commentId)) {
      state.collapsedComments.delete(commentId);
    } else {
      state.collapsedComments.add(commentId);
    }
    const post = state.posts.find(p => p.id === state.activeThreadPostId) || state.posts[0];
    renderDeepThread(post);
  }

  // --- Reply Composer Toggle ---
  function toggleReplyComposer(commentId) {
    if (state.activeReplyBoxes.has(commentId)) {
      state.activeReplyBoxes.delete(commentId);
    } else {
      state.activeReplyBoxes.add(commentId);
    }
    const post = state.posts.find(p => p.id === state.activeThreadPostId) || state.posts[0];
    renderDeepThread(post);
  }

  // --- Submit Nested Reply ---
  function submitNestedReply(parentId) {
    const input = document.getElementById(`reply-input-${parentId}`);
    if (!input || !input.value.trim()) return;

    const newReply = {
      id: 'c-' + Date.now(),
      author: 'u/guest_explorer',
      avatar: 'GE',
      timeAgo: 'Just now',
      upvotes: 1,
      content: input.value.trim(),
      replies: []
    };

    function appendReplyRecursive(list) {
      for (let item of list) {
        if (item.id === parentId) {
          if (!item.replies) item.replies = [];
          item.replies.push(newReply);
          return true;
        }
        if (item.replies && appendReplyRecursive(item.replies)) {
          return true;
        }
      }
      return false;
    }

    appendReplyRecursive(state.comments);
    state.activeReplyBoxes.delete(parentId);
    showToast('Reply posted');

    const post = state.posts.find(p => p.id === state.activeThreadPostId) || state.posts[0];
    post.commentCount += 1;
    renderDeepThread(post);
  }

  // --- Submit Top-Level Comment ---
  function submitTopLevelComment() {
    const input = document.getElementById('main-thread-reply-input');
    if (!input || !input.value.trim()) return;

    const newComment = {
      id: 'c-' + Date.now(),
      author: 'u/guest_explorer',
      avatar: 'GE',
      timeAgo: 'Just now',
      upvotes: 1,
      content: input.value.trim(),
      replies: []
    };

    state.comments.unshift(newComment);
    input.value = '';
    showToast('Comment added');

    const post = state.posts.find(p => p.id === state.activeThreadPostId) || state.posts[0];
    post.commentCount += 1;
    renderDeepThread(post);
  }

  // --- Voting ---
  function handleVote(id, direction) {
    const current = state.userVotes[id];
    if (current === direction) {
      delete state.userVotes[id];
    } else {
      state.userVotes[id] = direction;
    }

    if (state.activeThreadPostId) {
      const post = state.posts.find(p => p.id === state.activeThreadPostId) || state.posts[0];
      renderDeepThread(post);
    } else {
      renderFeedCards();
    }
  }

  // --- View Switcher ---
  function switchView(viewName) {
    state.currentView = viewName;

    elements.viewBtnFeed.classList.toggle('active', viewName === 'feed');
    elements.viewBtnMap.classList.toggle('active', viewName === 'map');
    elements.viewBtnSplit.classList.toggle('active', viewName === 'split');

    if (viewName === 'feed') {
      elements.feedViewContainer.style.display = state.activeThreadPostId ? 'none' : 'block';
      if (state.activeThreadPostId) {
        elements.deepThreadContainer.style.display = 'flex';
      }
      elements.heatmapViewSection.style.display = 'none';
      elements.splitViewSection.style.display = 'none';
    } else if (viewName === 'map') {
      elements.feedViewContainer.style.display = 'none';
      elements.deepThreadContainer.style.display = 'none';
      elements.heatmapViewSection.style.display = 'flex';
      elements.splitViewSection.style.display = 'none';

      if (!window._mainMapLoaded && window.regretMapEngine) {
        const map = window.regretMapEngine.initMainMap('leaflet-map-container');
        window.regretMapEngine.setMainMapInstance(map);
        window._mainMapLoaded = true;
      }
    } else if (viewName === 'split') {
      elements.feedViewContainer.style.display = 'none';
      elements.deepThreadContainer.style.display = 'none';
      elements.heatmapViewSection.style.display = 'none';
      elements.splitViewSection.style.display = 'grid';

      renderSplitFeed();

      if (!window._splitMapLoaded && window.regretMapEngine) {
        const splitMap = window.regretMapEngine.initMainMap('split-map-container');
        window.regretMapEngine.setSplitMapInstance(splitMap);
        window._splitMapLoaded = true;
      }
    }
  }

  function renderSplitFeed() {
    const splitFeed = document.getElementById('split-feed-container');
    if (!splitFeed) return;

    splitFeed.innerHTML = state.posts.map(post => `
      <div class="card-brutal" style="margin-bottom: 12px; padding: 14px;">
        <span class="badge-brutal badge-yellow" style="margin-bottom: 6px;">${post.city}</span>
        <h4 style="font-size: 0.95rem; cursor: pointer; margin-bottom: 6px;" onclick="window.regretApp.openThreadView('${post.id}')">
          ${post.title}
        </h4>
        <button class="btn-brutal btn-sm btn-yellow btn-pill" onclick="window.regretMapEngine.flyToSpot('${post.id}')">
          Locate ↗
        </button>
      </div>
    `).join('');
  }

  // --- Modal Logic ---
  function openLogModal() {
    elements.modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLogModal() {
    elements.modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function setupSeveritySlider() {
    if (elements.severitySlider && elements.severityValueDisplay) {
      elements.severitySlider.addEventListener('input', (e) => {
        elements.severityValueDisplay.textContent = e.target.value + '/10';
      });
    }
  }

  function handleLogRegretSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('input-regret-title').value;
    const location = document.getElementById('input-regret-location').value;
    const category = document.getElementById('select-regret-category').value;
    const severity = elements.severitySlider.value;
    const story = document.getElementById('input-regret-story').value;

    if (!title || !location || !story) return;

    const newPost = {
      id: 'regret-' + Date.now(),
      title: title,
      author: 'u/guest_explorer',
      authorAvatar: 'GE',
      city: location,
      coords: '12.0° N, 77.0° E',
      timeAgo: 'Just now',
      category: category,
      categoryColor: 'badge-yellow',
      severity: parseFloat(severity),
      hoursLost: '2.5 hrs',
      upvotes: 1,
      commentCount: 0,
      story: story,
      image: null
    };

    state.posts.unshift(newPost);
    closeLogModal();
    elements.formLogRegret.reset();
    showToast('Regret logged to map');

    if (state.currentView === 'feed') {
      renderFeedCards();
    }
  }

  // --- Toast ---
  function showToast(message) {
    if (!elements.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast-brutal';
    toast.innerHTML = `<span>✓</span> <span>${message}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  // --- Event Listeners ---
  function setupEventListeners() {
    elements.viewBtnFeed.addEventListener('click', () => switchView('feed'));
    elements.viewBtnMap.addEventListener('click', () => switchView('map'));
    elements.viewBtnSplit.addEventListener('click', () => switchView('split'));

    if (elements.btnOpenModal) elements.btnOpenModal.addEventListener('click', openLogModal);
    if (elements.btnCloseModal) elements.btnCloseModal.addEventListener('click', closeLogModal);
    if (elements.modalOverlay) {
      elements.modalOverlay.addEventListener('click', (e) => {
        if (e.target === elements.modalOverlay) closeLogModal();
      });
    }

    if (elements.formLogRegret) {
      elements.formLogRegret.addEventListener('submit', handleLogRegretSubmit);
    }

    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.filterCategory = chip.dataset.category || 'ALL';
        renderFeedCards();
      });
    });

    const sortButtons = document.querySelectorAll('.sort-btn');
    sortButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        sortButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const sortType = btn.dataset.sort;
        if (sortType === 'new') {
          state.posts.sort((a, b) => b.id.localeCompare(a.id));
        } else if (sortType === 'top') {
          state.posts.sort((a, b) => b.upvotes - a.upvotes);
        } else {
          renderFeedCards();
        }
        renderFeedCards();
      });
    });

    if (elements.searchInput) {
      elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        if (state.activeThreadPostId) backToFeed();
        renderFeedCards();
      });
    }
  }

  function truncateText(str, maxLength) {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength).trim() + '...';
  }

  function sharePost(id) {
    showToast('Link copied to clipboard');
  }

  // Window API
  window.regretApp = {
    handleVote,
    openThreadView,
    backToFeed,
    toggleCollapse,
    toggleReplyComposer,
    submitNestedReply,
    submitTopLevelComment,
    sharePost,
    showToast,
    onMapPinClick: (spotId) => {
      openThreadView(spotId);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
