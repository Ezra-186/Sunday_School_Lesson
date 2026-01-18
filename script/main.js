// ==============================
// main.js  —  Sunday School page
// ==============================

// ------------- Verse data -------------
const VERSES = {
    'gen1-1-5': {
        title: 'Genesis 1:1–5',
        text: 'In the beginning God created the heaven and the earth… And God said, Let there be light: and there was light.',
        url: 'https://www.churchofjesuschrist.org/study/scriptures/ot/gen/1?lang=eng&id=p1-p5#p1'
    },
    'gen1-26-27': {
        title: 'Genesis 1:26–27',
        text: 'And God said, Let us make man in our image, after our likeness… male and female created he them.',
        url: 'https://www.churchofjesuschrist.org/study/scriptures/ot/gen/1?lang=eng&id=p26-p27#p26'
    },
    'gen2-2-3': {
        title: 'Genesis 2:2–3',
        text: 'On the seventh day God ended his work… and God blessed the seventh day, and sanctified it.',
        url: 'https://www.churchofjesuschrist.org/study/scriptures/ot/gen/2?lang=eng&id=p2-p3#p2'
    }
};

// ------------- Supabase config -------------
const SUPABASE_URL = "https://ekcrhlfhqebtqytkhfkq.supabase.co"; // your project URL
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrY3JobGZocWVidHF5dGtoZmtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzODM4MzYsImV4cCI6MjA3MDk1OTgzNn0.JCFxQXvRoZRs2H2R0Uwn8Buz2madkqwaYq8g5uZ_JqM"; // anon public key

let sb = null;
if (window.supabase) {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    window.sb = sb; // expose for other pages
} else {
    console.warn("Supabase SDK not found. Include it before main.js.");
}

// ------------- Helpers -------------
const state = {
    lastSeenMs: 0,
    newCount: 0,
    sheetOpen: false,
    hideNames: false,
    feedLoaded: false,
    feedData: [],
    feedChannel: null,
    lastFocus: null
};

const LAST_SEEN_KEY = "ss:lastSeenQuestionTime";
const NEW_COUNT_KEY = "ss:newQuestionCount";

const parseMs = (value) => {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : 0;
};

const escapeHtml = (s = "") =>
    s.replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function loadStoredState() {
    const seen = localStorage.getItem(LAST_SEEN_KEY);
    const count = Number.parseInt(localStorage.getItem(NEW_COUNT_KEY) || "0", 10);
    state.lastSeenMs = seen ? parseMs(seen) : 0;
    state.newCount = Number.isFinite(count) ? count : 0;
}

function setLastSeen(iso) {
    if (!iso) return;
    state.lastSeenMs = parseMs(iso);
    localStorage.setItem(LAST_SEEN_KEY, iso);
}

function setNewCount(count) {
    const clean = Math.max(0, count | 0);
    state.newCount = clean;
    localStorage.setItem(NEW_COUNT_KEY, String(clean));
    updateBadgeUI();
}

function updateBadgeUI() {
    const badges = document.querySelectorAll(".qa-badge");
    badges.forEach((badge) => {
        if (state.newCount <= 0) {
            badge.classList.remove("show");
            badge.textContent = "";
        } else {
            badge.classList.add("show");
            badge.textContent = badge.classList.contains("dot")
                ? "" // dot badges just show the dot
                : (state.newCount > 9 ? "9+" : String(state.newCount));
        }
    });
}

// ------------- Modal wiring -------------
(() => {
    const root = document.getElementById('modal-root');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const linkEl = document.getElementById('modal-link');
    const closeBtn = document.getElementById('modal-close');
    let lastFocus = null;

    function openModal(key) {
        const v = VERSES[key];
        if (!v || !root || !titleEl || !bodyEl || !linkEl || !closeBtn) return;
        lastFocus = document.activeElement;
        titleEl.textContent = v.title;
        bodyEl.textContent = v.text;
        linkEl.href = v.url;
        root.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        closeBtn.focus();
    }

    function closeModal() {
        if (!root) return;
        root.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (lastFocus) lastFocus.focus();
    }

    document.querySelectorAll('a.verse').forEach(a => {
        a.addEventListener('click', (e) => {
            if (e.metaKey || e.ctrlKey) return; // allow open in new tab
            e.preventDefault();
            openModal(a.getAttribute('data-modal'));
        });
    });

    if (root) root.addEventListener('click', (e) => { if (e.target === root) closeModal(); });
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && root && root.getAttribute('aria-hidden') === 'false') closeModal();
    });
})();

// ------------- Q&A form (public page) -------------
(() => {
    if (!sb) return;
    const form = document.getElementById("qaForm");
    const msg = document.getElementById("qaMsg");
    const anon = document.getElementById("anonBox");
    if (!form || !msg) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = new FormData(form);

        // Honeypot (spam trap)
        if ((data.get("website") || "").trim() !== "") return;

        const name = (data.get("name") || "").trim();
        const text = (data.get("text") || "").trim();
        const is_anonymous = !!(anon && anon.checked);

        if (text.length < 3) { msg.textContent = "Please write a little more detail."; return; }
        if (text.length > 800) { msg.textContent = "Please keep it under 800 characters."; return; }

        msg.textContent = "Sending…";
        const { error } = await sb.from("questions").insert({ text, name, is_anonymous });
        if (error) {
            msg.textContent = "❌ Couldn't send. Please try again.";
        } else {
            msg.textContent = "✅ Sent! I’ve got it.";
            form.reset();
            if (anon) anon.checked = false; // leave default as NOT anonymous
        }
    });
})();

// ------------- Bottom nav + panel switching -------------
let setActivePanel = () => { };
(() => {
    const navButtons = Array.from(document.querySelectorAll(".nav-btn"));
    const panels = Array.from(document.querySelectorAll(".panel"));

    if (!navButtons.length || !panels.length) return;

    setActivePanel = (target) => {
        if (!target) return;
        navButtons.forEach((btn) => {
            const isActive = btn.dataset.target === target;
            btn.classList.toggle("active", isActive);
            btn.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
        panels.forEach((panel) => {
            panel.classList.toggle("active", panel.dataset.panel === target);
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    navButtons.forEach((btn) => {
        btn.addEventListener("click", () => setActivePanel(btn.dataset.target));
    });

    document.querySelectorAll("[data-jump]").forEach((btn) => {
        btn.addEventListener("click", () => setActivePanel(btn.getAttribute("data-jump")));
    });
})();

// ------------- Teacher feed + badge -------------
(() => {
    if (!sb) return;
    const sheetWrapper = document.getElementById("qaSheetWrapper");
    const feedList = document.getElementById("qaFeedList");
    const liveMsg = document.getElementById("qaLiveMessage");
    const hideNamesToggle = document.getElementById("hideNames");
    const markSeenBtn = document.getElementById("markSeen");
    const closeBtn = document.getElementById("qaSheetClose");
    const overlay = document.querySelector(".qa-sheet-overlay");
    const openBtns = document.querySelectorAll("[data-open-feed]");

    if (!sheetWrapper || !feedList) return;

    loadStoredState();
    updateBadgeUI();
    primeBadgeCount();
    subscribeToQuestions();

    hideNamesToggle?.addEventListener("change", () => {
        state.hideNames = hideNamesToggle.checked;
        renderFeed();
    });

    markSeenBtn?.addEventListener("click", () => {
        const newest = state.feedData[0]?.created_at || new Date().toISOString();
        setLastSeen(newest);
        setNewCount(0);
        if (liveMsg) liveMsg.textContent = "All questions marked as seen.";
    });

    openBtns.forEach(btn => btn.addEventListener("click", () => openSheet(btn)));
    closeBtn?.addEventListener("click", closeSheet);
    overlay?.addEventListener("click", closeSheet);
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && state.sheetOpen) closeSheet();
    });

    function openSheet(trigger) {
        state.lastFocus = trigger || document.activeElement;
        sheetWrapper.setAttribute("aria-hidden", "false");
        document.body.classList.add("sheet-open");
        state.sheetOpen = true;
        closeBtn?.focus();
        if (!state.feedLoaded) loadFeed();
        // when opening, clear badge to reflect "seen"
        if (state.feedData.length) {
            const newest = state.feedData[0]?.created_at || new Date().toISOString();
            setLastSeen(newest);
        } else {
            setLastSeen(new Date().toISOString());
        }
        setNewCount(0);
    }

    function closeSheet() {
        sheetWrapper.setAttribute("aria-hidden", "true");
        document.body.classList.remove("sheet-open");
        state.sheetOpen = false;
        state.lastFocus?.focus();
    }

    async function loadFeed() {
        feedList.innerHTML = "<p class='note'>Loading…</p>";
        const { data, error } = await sb
            .from("questions")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(120);

        if (error) {
            console.error("Load feed error:", error);
            feedList.innerHTML = "<p class='note'>Can’t load questions right now.</p>";
            return;
        }

        state.feedData = data || [];
        state.feedLoaded = true;
        if (!state.lastSeenMs && data?.length) {
            setLastSeen(data[0].created_at);
        }
        renderFeed();
    }

    async function primeBadgeCount() {
        try {
            const { data, error } = await sb
                .from("questions")
                .select("id,created_at")
                .order("created_at", { ascending: false })
                .limit(60);
            if (error || !data) return;
            if (!state.lastSeenMs && data.length) {
                setLastSeen(data[0].created_at);
                setNewCount(0);
                return;
            }
            const unseen = data.filter(q => parseMs(q.created_at) > state.lastSeenMs).length;
            setNewCount(unseen);
        } catch (err) {
            console.error("primeBadgeCount error:", err);
        }
    }

    function subscribeToQuestions() {
        if (state.feedChannel || !sb) return;
        state.feedChannel = sb.channel("public:questions-index")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "questions" }, (payload) => {
                console.log("[realtime] insert payload", payload);
                if (!payload?.new) return;
                handleNewQuestion(payload.new);
            })
            .subscribe((status) => {
                console.log("[realtime] channel status", status);
            });
    }

    function handleNewQuestion(q) {
        // Keep feed up to date
        state.feedData = [q, ...state.feedData];
        renderFeed();

        if (state.sheetOpen) {
            setLastSeen(q.created_at || new Date().toISOString());
            setNewCount(0);
        } else if (parseMs(q.created_at) > state.lastSeenMs) {
            setNewCount(state.newCount + 1);
        }

        if (liveMsg) {
            liveMsg.textContent = "New question posted.";
        }
    }

    function renderFeed() {
        if (!feedList) return;
        if (!state.feedData.length) {
            feedList.innerHTML = "<p class='note'>No questions yet.</p>";
            return;
        }
        feedList.innerHTML = state.feedData.map(q => {
            const who = (state.hideNames || q.is_anonymous || !q.name?.trim()) ? "Anonymous" : escapeHtml(q.name.trim());
            const when = new Date(q.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            return `
            <article class="qa-card" data-id="${q.id}">
              <div class="meta">
                <strong>${who}</strong>
                <span>${when}</span>
              </div>
              <p class="question">${escapeHtml(q.text || "")}</p>
            </article>
          `;
        }).join("");
    }
})();

// ------------- Live board (qa.html; admin-only) -------------
(() => {
    if (!sb) return;
    const list = document.getElementById("list");
    if (!list) return; // not on qa.html

    // Compute an explicit redirect that matches your whitelisted URLs
    const AUTH_REDIRECT =
        (location.hostname === "localhost" || location.hostname === "127.0.0.1")
            ? `${location.protocol}//${location.host}/qa.html`
            : window.location.href;

    // Insert controls above the list
    const controls = document.createElement("div");
    controls.style = "display:flex;gap:.5rem;justify-content:space-between;align-items:center;margin:.5rem 0 1rem;flex-wrap:wrap;";
    controls.innerHTML = `
    <div class="note">This page is private to you.</div>
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;justify-content:flex-end">
      <button id="signin"        class="btn primary">Sign in</button>
      <button id="signinGoogle"  class="btn">Sign in with Google</button>
      <button id="signout"       class="btn" style="display:none">Sign out</button>
      <button id="clearAll"      class="btn" style="display:none">🗑️ Clear all</button>
    </div>
  `;
    list.insertAdjacentElement("beforebegin", controls);

    const signInBtn = controls.querySelector("#signin");
    const googleBtn = controls.querySelector("#signinGoogle");
    const signOutBtn = controls.querySelector("#signout");
    const clearBtn = controls.querySelector("#clearAll");

    // helper: show/hide admin controls
    function setAuthed(ui) {
        signInBtn.style.display = ui ? "none" : "";
        googleBtn.style.display = ui ? "none" : "";
        signOutBtn.style.display = ui ? "" : "none";
        clearBtn.style.display = ui ? "" : "none";
    }

    // Helper: clean magic-link fragment
    function cleanFragment() {
        if (location.hash.includes("access_token")) {
            const clean = location.pathname + location.search;
            history.replaceState(null, "", clean);
        }
    }

    // Build Email OTP UI (magic link + 6-digit code) with cooldown
    function renderOtpUI(container, onVerify) {
        if (container.querySelector("#otpBox")) return; // already rendered
        const box = document.createElement("div");
        box.id = "otpBox";
        box.style = "display:grid;gap:.6rem;justify-items:center;margin-top:.5rem";
        box.innerHTML = `
      <div id="emailPane" style="display:grid;gap:.4rem;justify-items:center;width:100%;">
        <input id="otpEmail" type="email" placeholder="you@example.com"
               style="width:100%;max-width:22rem;padding:.6rem;border-radius:10px;border:1px solid var(--card-border);background:#3b1720;color:var(--fg)">
        <div style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;justify-content:center">
          <button id="sendLink" class="btn primary">Send sign-in link</button>
          <span class="note" style="opacity:.9">or paste 6-digit code:</span>
          <input id="otpCode" inputmode="numeric" pattern="[0-9]*" maxlength="6"
                 style="width:7rem;text-align:center;padding:.6rem;border-radius:10px;border:1px solid var(--card-border);background:#3b1720;color:var(--fg)">
          <button id="verifyCode" class="btn">Verify code</button>
        </div>
      </div>
      <div id="otpMsg" class="note"></div>
    `;
        container.appendChild(box);

        const emailEl = box.querySelector("#otpEmail");
        const codeEl = box.querySelector("#otpCode");
        const msgEl = box.querySelector("#otpMsg");
        const sendBtn = box.querySelector("#sendLink");

        // Cooldown UI helper (to avoid 2/hr cap while testing)
        function startCooldown(seconds) {
            sendBtn.disabled = true;
            let t = seconds;
            sendBtn.textContent = `Resend (${t}s)`;
            const tick = setInterval(() => {
                t -= 1;
                if (t <= 0) {
                    clearInterval(tick);
                    sendBtn.disabled = false;
                    sendBtn.textContent = "Send sign-in link";
                } else {
                    sendBtn.textContent = `Resend (${t}s)`;
                }
            }, 1000);
        }

        // send magic link
        sendBtn.addEventListener("click", async () => {
            const email = (emailEl.value || "").trim();
            if (!email) { msgEl.textContent = "Enter your email first."; return; }
            msgEl.textContent = "Sending link…";
            const { error } = await sb.auth.signInWithOtp({
                email,
                options: { emailRedirectTo: AUTH_REDIRECT }
            });
            if (error) {
                console.error("signInWithOtp(email) error:", error);
                msgEl.textContent = error.message || "Couldn’t send. Check Auth URL settings and rate limits.";
            } else {
                msgEl.textContent = "Link sent! If it doesn’t open, paste the 6-digit code from the email below.";
                startCooldown(60); // 60s cooldown to avoid rate limit
            }
        });

        // verify 6-digit code
        box.querySelector("#verifyCode").addEventListener("click", async () => {
            const email = (emailEl.value || "").trim();
            const token = (codeEl.value || "").trim();
            if (!email || token.length !== 6) { msgEl.textContent = "Enter your email and 6-digit code."; return; }
            msgEl.textContent = "Verifying…";
            const { error } = await sb.auth.verifyOtp({ email, token, type: "email" });
            if (error) {
                console.error("verifyOtp(email) error:", error);
                msgEl.textContent = "Invalid/expired code. Send a new one.";
            } else {
                msgEl.textContent = "Signed in!";
                cleanFragment();
                onVerify?.();
            }
        });
    }

    // Sign-in action (email)
    async function signIn() {
        renderOtpUI(controls, () => {
            setAuthed(true);
            cleanFragment();
            loadBoard();
        });
        if (signInBtn) signInBtn.style.display = "none";
    }

    // Optional: Google OAuth (no emails, no rate limit)
    if (googleBtn) {
        googleBtn.addEventListener("click", async () => {
            try {
                await sb.auth.signInWithOAuth({
                    provider: "google",
                    options: { redirectTo: AUTH_REDIRECT }
                });
            } catch (err) {
                console.error("Google OAuth error:", err);
            }
        });
    }

    async function signOut() {
        await sb.auth.signOut();
        setAuthed(false);
        list.innerHTML = "<p class='note' style='text-align:center'>Signed out.</p>";
        renderOtpUI(controls, () => {
            setAuthed(true);
            cleanFragment();
            loadBoard();
        });
        if (signInBtn) signInBtn.style.display = "none";
    }

    signInBtn.addEventListener("click", signIn);
    signOutBtn.addEventListener("click", signOut);

    // Delete ALL questions (careful!)
    clearBtn.addEventListener("click", async () => {
        if (!confirm("Delete ALL questions? This cannot be undone.")) return;
        const { error } = await sb.from("questions").delete().not("id", "is", null);
        if (error) alert("Could not clear questions.");
        else await loadBoard();
    });

    // Render a question card
    const card = (q) => {
        const who = (q.is_anonymous || !q.name || !q.name.trim()) ? "Anonymous" : escapeHtml(q.name.trim());
        const when = new Date(q.created_at).toLocaleString();
        return `
      <section class="card" data-id="${q.id}">
        <div style="display:flex;justify-content:space-between;gap:.75rem;align-items:baseline">
          <strong>${who}</strong>
          <span style="opacity:.7;font-size:.92rem">${when}</span>
        </div>
        <p style="margin:.55rem 0 0;white-space:pre-wrap;line-height:1.5">${escapeHtml(q.text || "")}</p>
        <div style="margin-top:.6rem;display:flex;justify-content:flex-end">
          <button class="btn" data-del="${q.id}">Delete</button>
        </div>
      </section>`;
    };

    // Delete a single question
    list.addEventListener("click", async (e) => {
        const btn = e.target.closest("[data-del]");
        if (!btn) return;
        const id = btn.getAttribute("data-del");
        if (!confirm("Delete this question?")) return;
        const { error } = await sb.from("questions").delete().eq("id", id);
        if (error) alert("Could not delete.");
        else btn.closest("section.card")?.remove();
    });

    // Load + realtime
    async function loadBoard() {
        list.innerHTML = "<p class='note' style='text-align:center'>Loading…</p>";
        const { data, error } = await sb
            .from("questions")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(200);
        if (error) { list.innerHTML = "<p style='text-align:center'>Couldn't load.</p>"; return; }
        list.innerHTML = data.map(card).join("");

        sb.channel("public:questions-admin")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "questions" },
                payload => list.insertAdjacentHTML("afterbegin", card(payload.new)))
            .subscribe();
    }

    // Session check
    (async function () {
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
            setAuthed(true);
            cleanFragment();
            loadBoard();
        } else {
            setAuthed(false);
            list.innerHTML = "<p class='note' style='text-align:center'>Not signed in. Use Email below to view/manage questions.</p>";
            renderOtpUI(controls, () => {
                setAuthed(true);
                cleanFragment();
                loadBoard();
            });
            if (signInBtn) signInBtn.style.display = "none";

            sb.auth.onAuthStateChange((_evt, sess) => {
                if (sess) {
                    setAuthed(true);
                    cleanFragment();
                    loadBoard();
                }
            });
        }
    })();
})();
