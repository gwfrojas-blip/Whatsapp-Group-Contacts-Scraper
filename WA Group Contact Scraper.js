// ============================================================================
// WhatsApp Group Contacts Scraper v2.0
// by situmorang.com
//
// USAGE:
//   1. Open https://web.whatsapp.com/ and select a group chat
//   2. Click the group name in the header to open Group Info
//   3. Click "View all" or the members count to open the full members modal
//   4. Open DevTools (F12) > Console, paste this script, press Enter
//   5. The script will auto-scroll, extract all members, and download a CSV
//
// WHAT CHANGED (v2.0):
//   - Uses stable selectors: role="listitem", role="dialog",
//     data-animate-modal-popup, span[title][aria-label], etc.
//   - Handles WhatsApp's virtual scrolling (only visible members in DOM)
//   - Auto-scrolls through the entire member list to capture everyone
//   - async/await instead of setTimeout
//   - Better error handling and progress logging
// ============================================================================

(async function WhatsAppGroupScraper() {
  'use strict'41
91
11:40
2
Ayer
Ayer
Ayer
12
50
79
8/7/2026
146
8/7/2026
12
7/7/2026
1
21/6/2026
6
19/5/2026
1/5/2026
18/4/2026
3/5/2026
5/5/2026
5/3/2026
17/2/2026
15/2/2026
30/12/2025
Obtener WhatsApp para Mac
Geraldine, +56 9 8294 0784, +56 9 9089 4490, +56 9 8248 8186, +56 9 6286 7913, +56 9 8188 6309, +56 9 9789 8919, +56 9 8222 5214, Tú


;

  // --- Helper: wait ---
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // --- Helper: get group name ---
  function getGroupName() {
    // Method 1: From the main chat header (most reliable per working scrapers)
    const headerName = document.querySelector('#main header div[role="button"] > div > div > span');
    if (headerName && headerName.textContent) return headerName.textContent.trim();

    // Method 2: XPath fallback
    try {
      const xp = document.evaluate(
        '//*[@id="main"]/header//span[@dir="auto"]',
        document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
      ).singleNodeValue;
      if (xp && xp.textContent) return xp.textContent.trim();
    } catch (e) { /* ignore */ }

    return 'Unknown_Group';
  }

  // --- Notification banner with progress bar ---
  const banner = document.createElement('div');
  banner.style.cssText = [
    'z-index:9999',
    'background:#111b21',
    'color:#e9edef',
    'position:fixed',
    'left:16px',
    'top:16px',
    'width:320px',
    'font-size:13px',
    'padding:12px 14px 10px',
    'border:1.5px solid #25D366',
    'border-radius:10px',
    'line-height:20px',
    'box-shadow:0 4px 20px rgba(0,0,0,0.5)',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
  ].join(';');

  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-size:18px">💬</span>
      <span style="font-weight:600;font-size:13px;color:#25D366;letter-spacing:0.3px">WA Group Scraper</span>
    </div>
    <div id="waScraper_msg" style="color:#e9edef;margin-bottom:10px;font-size:12px">Starting...</div>
    <div style="background:#2a3942;border-radius:4px;height:6px;overflow:hidden">
      <div id="waScraper_bar" style="height:100%;width:0%;background:#25D366;border-radius:4px;transition:width 0.4s ease"></div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:5px;font-size:11px;color:#8696a0">
      <span id="waScraper_sub">Initialising</span>
      <span id="waScraper_pct">0%</span>
    </div>
  `;
  document.body.appendChild(banner);

  function updateBanner(msg, pct, sub) {
    const msgEl  = document.getElementById('waScraper_msg');
    const barEl  = document.getElementById('waScraper_bar');
    const subEl  = document.getElementById('waScraper_sub');
    const pctEl  = document.getElementById('waScraper_pct');
    if (msgEl) msgEl.textContent = msg;
    if (barEl && pct !== undefined) barEl.style.width = pct + '%';
    if (subEl && sub !== undefined) subEl.textContent = sub;
    if (pctEl && pct !== undefined) pctEl.textContent = pct + '%';
    console.log('🟢 [WA Scraper] ' + msg);
  }

  // --- Step 1: Check if the members modal is open ---
  updateBanner('Looking for members list...', 5, 'Step 1 of 4');

  // WhatsApp shows members in a dialog with role="listitem" children
  // The scroll container is a specific child of data-animate-modal-popup
  let memberRows = document.querySelectorAll('[role="dialog"] [role="listitem"] [role="button"]');
  let scrollBar = document.querySelector('div[data-animate-modal-popup="true"] > div > div > div > div:nth-child(3)');

  // Fallback: try without the nested structure for the scroll bar
  if (!scrollBar) {
    // Look for any scrollable element inside the modal
    const modalPopup = document.querySelector('div[data-animate-modal-popup="true"]');
    if (modalPopup) {
      const candidates = modalPopup.querySelectorAll('div');
      for (const div of candidates) {
        if (div.scrollHeight > div.clientHeight + 50 && div.clientHeight > 200) {
          scrollBar = div;
          break;
        }
      }
    }
  }

  // Fallback: try data-animate-modal-body
  if (!scrollBar) {
    const modalBody = document.querySelector('[data-animate-modal-body="true"]');
    if (modalBody) {
      const candidates = modalBody.querySelectorAll('div');
      for (const div of candidates) {
        if (div.scrollHeight > div.clientHeight + 50 && div.clientHeight > 200) {
          scrollBar = div;
          break;
        }
      }
    }
  }

  if (memberRows.length < 1) {
    // Also try without [role="button"] in case structure changed
    memberRows = document.querySelectorAll('[role="dialog"] [role="listitem"]');
  }

  if (memberRows.length < 1 || !scrollBar) {
    banner.style.backgroundColor = '#c62828';
    banner.innerHTML = '❌ Members list not found!<br><br>'
      + 'Make sure you have:<br>'
      + '1. Opened a group chat<br>'
      + '2. Clicked the group name → Group Info<br>'
      + '3. Clicked "View all" / member count<br>'
      + '<br>The full members modal must be open.';
    console.error('❌ Could not find members list.');
    console.log('memberRows found:', memberRows.length);
    console.log('scrollBar found:', !!scrollBar);
    setTimeout(() => { try { document.body.removeChild(banner); } catch(e){} }, 8000);
    return;
  }

  updateBanner(`Found ${memberRows.length} visible members — scrolling to load all...`, 15, 'Step 2 of 4 · Loading');

  // --- Step 2: Scroll through the list to load all members (virtual scrolling) ---
  // WhatsApp only renders members visible in the viewport.
  // We scroll incrementally and extract after each scroll.

  const contacts = new Map(); // key = unique identifier, value = contact object
  let yCoordinates = 0;
  const SCROLL_STEP = 800; // pixels per scroll step
  let noNewCount = 0;
  let scrollRound = 0;

  function extractVisibleMembers() {
    // IMPORTANT: Query from document level, NOT from scrollBar.
    // The scroll container and list items may be at different DOM levels.
    let rows = document.querySelectorAll('[role="dialog"] [role="listitem"] [role="button"]');
    if (rows.length === 0) {
      rows = document.querySelectorAll('[role="dialog"] [role="listitem"]');
    }

    let newCount = 0;

    for (const row of rows) {
      try {
        // --- Extract Phone Number ---
        let phoneNumber = '';
        const telTag = row.querySelector('[role="gridcell"] > span:first-child span');
        if (telTag) {
          phoneNumber = (telTag.textContent || '').replace(/\s/g, '').trim();
        }

        // --- Extract Name ---
        let displayName = '';
        const nameEl = row.querySelector('[role="gridcell"] > div > div > span[title][aria-label]');
        if (nameEl) {
          displayName = (nameEl.getAttribute('title') || nameEl.textContent || '').trim();
        }
        // Fallback: any span[title][aria-label]
        if (!displayName) {
          const nameAlt = row.querySelector('span[title][aria-label]');
          if (nameAlt) displayName = (nameAlt.getAttribute('title') || nameAlt.textContent || '').trim();
        }
        // Fallback: first span[dir="auto"]
        if (!displayName) {
          const nameDir = row.querySelector('span[dir="auto"]');
          if (nameDir) displayName = (nameDir.textContent || '').trim();
        }

        if (!displayName || displayName.length < 2) continue;

        // Skip UI elements that aren't actual members
        if (/^(Search|You$|View past|Add participant|Invite to group)/i.test(displayName)) continue;

        // If name looks like a phone number (unsaved contact)
        if (!phoneNumber) {
          const cleanName = displayName.replace(/[\s\-\(\)]/g, '');
          if (/^\+?\d{10,15}$/.test(cleanName)) {
            phoneNumber = cleanName;
          }
        }

        // --- Extract Bio/Status ---
        let bio = '';
        const bioEl = row.querySelector('div > div:nth-child(2) > div:nth-child(2) > div > span[title][aria-label]');
        if (bioEl) {
          bio = (bioEl.getAttribute('title') || '').trim();
        }
        if (!bio) {
          const bioAlt = row.querySelector('span[title].copyable-text');
          if (bioAlt) bio = (bioAlt.getAttribute('title') || bioAlt.textContent || '').trim();
        }

        // --- Extract Profile Image ---
        let profileImg = '';
        try {
          const imgEl = row.querySelector('img[src*="pps.whatsapp.net"]');
          if (imgEl) profileImg = imgEl.src;
        } catch (e) { /* no image */ }

        // Try to extract phone from image URL if we still don't have one
        if (!phoneNumber && profileImg) {
          const match = profileImg.match(/u=(\d+)/);
          if (match) phoneNumber = match[1];
        }

        // --- Determine saved vs unsaved ---
        // WhatsApp uses a tilde (~) prefix for a contact's own WhatsApp push name,
        // which is shown when that person is NOT saved in your phone's contacts.
        // A clean name with no tilde (e.g. "Ervina Sinaga") is the name YOU saved →
        // that person IS in your contacts.
        const cleanDisplayName = displayName.replace(/[\s\-\(\)]/g, '');
        const nameIsPhone = /^\+?\d{10,15}$/.test(cleanDisplayName);
        const hasWAPushName = displayName.startsWith('~'); // ~ prefix = NOT saved
        const isSavedContact = !nameIsPhone && !hasWAPushName && displayName.length > 1;

        // --- Unique key to prevent duplicates ---
        const key = (phoneNumber || '') + '|' + displayName;
        if (!contacts.has(key)) {
          contacts.set(key, {
            num: phoneNumber || 'N/A',
            namenum: isSavedContact ? 'IN_CONTACTS' : (phoneNumber || displayName),
            name: displayName,
            img: profileImg || 'No Pic',
            status: bio || 'NONE'
          });
          newCount++;
        }
      } catch (err) {
        // Skip individual member errors, continue with others
      }
    }
    return newCount;
  }

  // Scroll to top first
  scrollBar.scroll(0, 0);
  await wait(500);

  // Extract + scroll loop
  while (noNewCount < 10 && scrollRound < 300) {
    const newFound = extractVisibleMembers();

    if (newFound === 0) {
      noNewCount++;
    } else {
      noNewCount = 0;
    }

    // Scroll down
    yCoordinates += SCROLL_STEP;
    scrollBar.scroll(0, yCoordinates);
    await wait(400);

    scrollRound++;
    if (scrollRound % 10 === 0) {
      const scrollPct = Math.min(15 + Math.round((scrollRound / 300) * 65), 80);
      updateBanner(`${contacts.size} contacts found so far...`, scrollPct, `Step 2 of 4 · Scroll ${scrollRound}`);
    }
  }

  // Final extraction pass
  extractVisibleMembers();

  updateBanner(`Extracted ${contacts.size} contacts!`, 85, 'Step 3 of 4 · Extracted');

  if (contacts.size === 0) {
    banner.style.backgroundColor = '#c62828';
    banner.innerHTML = '❌ No contacts extracted.<br>Try scrolling the list manually once, then run again.';
    setTimeout(() => { try { document.body.removeChild(banner); } catch(e){} }, 8000);
    return;
  }

  // --- Step 3: Generate CSV ---
  updateBanner(`Generating CSV for ${contacts.size} contacts...`, 90, 'Step 4 of 4 · Building CSV');

  const groupName = getGroupName();
  const arrData = Array.from(contacts.values());

  let CSV = '';
  CSV += 'Whatsapp Contacts\r\n\r\n';
  CSV += 'Group Name : ' + groupName + '\r\n';
  CSV += 'Number of participants : ' + arrData.length + '\r\n\r\n';

  // Header row
  CSV += 'num,namenum,name,img,status\r\n';

  // Data rows (proper CSV escaping)
  for (const row of arrData) {
    CSV += '"' + String(row.num || '').replace(/"/g, '""') + '",';
    CSV += '"' + String(row.namenum || '').replace(/"/g, '""') + '",';
    CSV += '"' + String(row.name || '').replace(/"/g, '""') + '",';
    CSV += '"' + String(row.img || '').replace(/"/g, '""') + '",';
    CSV += '"' + String(row.status || '').replace(/"/g, '""') + '"';
    CSV += '\r\n';
  }

  // --- Step 4: Download CSV ---
  const sanitizedGroupName = groupName.replace(/[/\\?%*:|"<>\s]/g, '_');
  const fileName = 'WAGroup_' + sanitizedGroupName + '.csv';

  // Use Blob with BOM for Excel compatibility
  const blob = new Blob(['\uFEFF' + CSV], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    try { document.body.removeChild(link); } catch(e) {}
    URL.revokeObjectURL(url);
  }, 1000);

  // --- Summary ---
  const savedContacts = arrData.filter(c => c.namenum === 'IN_CONTACTS').length;
  updateBanner(
    `✅ Done! ${arrData.length} contacts saved`,
    100,
    `${savedContacts} in contacts · ${arrData.length - savedContacts} unsaved`
  );

  console.log('\n📥 Downloaded: ' + fileName);
  console.log('📊 Summary:');
  console.log('   Total contacts: ' + arrData.length);
  console.log('   Saved contacts: ' + savedContacts);
  console.log('   Unsaved (phone only): ' + (arrData.length - savedContacts));
  console.log('\n👀 First 20 contacts:');
  console.table(arrData.slice(0, 20));

  // Remove banner after 6 seconds
  setTimeout(() => {
    try { document.body.removeChild(banner); } catch(e) {}
  }, 6000);

})();
