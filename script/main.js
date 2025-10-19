// ==============================
// main.js  —  Sunday School page
// ==============================

// ------------- Verse data -------------
const VERSES = {
    'dc115-5-6': {
        title: 'D&C 115:5–6',
        text: 'Arise and shine forth, that thy light may be a standard for the nations ... for a defense, and for a refuge from the storm.',
        url: 'https://www.churchofjesuschrist.org/study/scriptures/dc-testament/dc/115?lang=eng&id=p5-p6#p5'
    },
    'dc117-13': {
        title: 'D&C 117:13',
        text: 'His sacrifice shall be more sacred unto me than his increase.',
        url: 'https://www.churchofjesuschrist.org/study/scriptures/dc-testament/dc/117?lang=eng&id=p13#p13'
    },
    'dc119-4': {
        title: 'D&C 119:4',
        text: 'This shall be a standing law ... after that, those who have thus been tithed shall pay one-tenth of all their interest annually.',
        url: 'https://www.churchofjesuschrist.org/study/scriptures/dc-testament/dc/119?lang=eng&id=p4#p4'
    }
};

// ------------- Modal wiring -------------
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

// Verse chip clicks
document.querySelectorAll('a.verse').forEach(a => {
    a.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey) return; // allow open in new tab
        e.preventDefault();
        openModal(a.getAttribute('data-modal'));
    });
});

// Close interactions
if (root) root.addEventListener('click', (e) => { if (e.target === root) closeModal(); });
if (closeBtn) closeBtn.addEventListener('click', closeModal);
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root && root.getAttribute('aria-hidden') === 'false') closeModal();
});

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

// ------------- Q&A form (public page) -------------
(function initForm() {
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

// ------------- Sticky nav + smooth anchor scrolling -------------
(() => {
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  const NAV_OPEN_CLASS = 'nav-open';

  if (!navToggle || !navMenu) return; // Safe no-op if nav isn't on this page

  // Toggle mobile menu
  navToggle.addEventListener('click', () => {
    const open = document.body.classList.toggle(NAV_OPEN_CLASS);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // Close menu and smooth-scroll to target on link click
  navMenu.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const hash = a.getAttribute('href');
      // Only handle in-page anchors like #history-h
      if (hash && hash.length > 1) {
        const id = hash.slice(1);
        const target = document.getElementById(id);
        if (target) {
          e.preventDefault();
          // Offset for sticky nav height
          const nav = document.querySelector('.site-nav');
          const navH = nav ? nav.offsetHeight : 0;
          const top = target.getBoundingClientRect().top + window.scrollY - (navH + 8);
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
      // Always close the mobile menu after navigation
      document.body.classList.remove(NAV_OPEN_CLASS);
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Close on Escape for accessibility
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.body.classList.remove(NAV_OPEN_CLASS);
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });

  // Prevent a "stuck open" state on resize (e.g., rotating phone)
  window.addEventListener('resize', () => {
    document.body.classList.remove(NAV_OPEN_CLASS);
    navToggle.setAttribute('aria-expanded', 'false');
  });
})();

// ------------- Live board (qa.html; admin-only) -------------
(function initBoard() {
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
            const total = seconds;
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
                // Redirect happens; on return, session will be set and board loads
            } catch (err) {
                console.error("Google OAuth error:", err);
            }
        });
    }

    async function signOut() {
        await sb.auth.signOut();
        setAuthed(false);
        list.innerHTML = "<p class='note' style='text-align:center'>Signed out.</p>";
        // Show OTP UI so you can sign back in immediately; keep the button hidden
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
    const escapeHtml = (s) => s.replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const card = (q) => {
        const who = (q.is_anonymous || !q.name || !q.name.trim()) ? "Anonymous" : q.name.trim();
        const when = new Date(q.created_at).toLocaleString();
        return `
      <section class="card" data-id="${q.id}">
        <div style="display:flex;justify-content:space-between;gap:.75rem;align-items:baseline">
          <strong>${who}</strong>
          <span style="opacity:.7;font-size:.92rem">${when}</span>
        </div>
        <p style="margin:.55rem 0 0;white-space:pre-wrap;line-height:1.5">${escapeHtml(q.text)}</p>
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

        sb.channel("public:questions")
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

// Keep CSS --nav-h equal to the real nav height (for padding & menu positioning)
(() => {
    const nav = document.querySelector('.site-nav');
    if (!nav) return;
    const setH = () => {
        document.documentElement.style.setProperty('--nav-h', nav.offsetHeight + 'px');
    };
    setH();
    window.addEventListener('load', setH);
    window.addEventListener('resize', setH);
})();