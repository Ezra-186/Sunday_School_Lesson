// ==============================
// main.js  —  Sunday School page
// ==============================

// ------------- Verse data -------------
const VERSES = {
    'dc88-63': {
        title: 'D&C 88:63',
        text: '“Draw near unto me and I will draw near unto you; seek me diligently and ye shall find me; ask, and ye shall receive; knock, and it shall be opened unto you.”',
        url: 'https://www.churchofjesuschrist.org/study/scriptures/dc-testament/dc/88?id=p63&lang=eng#p63'
    },
    'dc88-67': {
        title: 'D&C 88:67',
        text: '“And if your eye be single to my glory, your whole bodies shall be filled with light; and there shall be no darkness in you; and that body which is filled with light comprehendeth all things.”',
        url: 'https://www.churchofjesuschrist.org/study/scriptures/dc-testament/dc/88?id=p67&lang=eng#p67'
    },
    'dc88-118': {
        title: 'D&C 88:118',
        text: '“And as all have not faith, seek ye diligently and teach one another words of wisdom; yea, seek ye out of the best books words of wisdom; seek learning, even by study and also by faith.”',
        url: 'https://www.churchofjesuschrist.org/study/scriptures/dc-testament/dc/88?id=p118&lang=eng#p118'
    },
    'dc88-119': {
        title: 'D&C 88:119',
        text: '“Organize yourselves; prepare every needful thing; and establish a house, even a house of prayer, a house of fasting, a house of faith, a house of learning, a house of glory, a house of order, a house of God.”',
        url: 'https://www.churchofjesuschrist.org/study/scriptures/dc-testament/dc/88?id=p119&lang=eng#p119'
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

// Verse chip clicks (safe even if none exist)
document.querySelectorAll('a.verse').forEach(a => {
    a.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey) return; // allow open in new tab
        e.preventDefault();
        openModal(a.getAttribute('data-modal'));
    });
});

// Close interactions (guard for pages without modal)
if (root) root.addEventListener('click', (e) => { if (e.target === root) closeModal(); });
if (closeBtn) closeBtn.addEventListener('click', closeModal);
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root && root.getAttribute('aria-hidden') === 'false') closeModal();
});

// ------------- Supabase config -------------
// Make sure the Supabase CDN <script> is loaded BEFORE this file.
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

// ------------- Live board (qa.html; admin-only) -------------
(function initBoard() {
    if (!sb) return;
    const list = document.getElementById("list");
    if (!list) return; // not on qa.html

    // Insert controls above the list
    const controls = document.createElement("div");
    controls.style = "display:flex;gap:.5rem;justify-content:space-between;align-items:center;margin:.5rem 0 1rem;flex-wrap:wrap;";
    controls.innerHTML = `
    <div class="note">This page is private to you.</div>
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;justify-content:flex-end">
      <button id="signin"  class="btn primary">Sign in</button>
      <button id="signout" class="btn" style="display:none">Sign out</button>
      <button id="clearAll" class="btn" style="display:none">🗑️ Clear all</button>
    </div>
  `;
    list.insertAdjacentElement("beforebegin", controls);

    const signInBtn = controls.querySelector("#signin");
    const signOutBtn = controls.querySelector("#signout");
    const clearBtn = controls.querySelector("#clearAll");

    // helper: show/hide admin controls
    function setAuthed(ui) {
        signInBtn.style.display = ui ? "none" : "";
        signOutBtn.style.display = ui ? "" : "none";
        clearBtn.style.display = ui ? "" : "none";
    }

    // Inline OTP (email + 6-digit code) UI
    function renderOtpUI(container, onVerify) {
        if (container.querySelector("#otpBox")) return; // already rendered
        const box = document.createElement("div");
        box.id = "otpBox";
        box.style = "display:grid;gap:.4rem;justify-items:center;margin-top:.5rem";
        box.innerHTML = `
      <input id="otpEmail" type="email" placeholder="your@email.com"
             style="width:100%;max-width:22rem;padding:.6rem;border-radius:10px;border:1px solid var(--card-border);background:#3b1720;color:var(--fg)">
      <div style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;justify-content:center">
        <button id="sendLink" class="btn primary">Send sign-in link</button>
        <span class="note" style="opacity:.9">or paste 6-digit code:</span>
        <input id="otpCode" inputmode="numeric" pattern="[0-9]*" maxlength="6"
               style="width:7rem;text-align:center;padding:.6rem;border-radius:10px;border:1px solid var(--card-border);background:#3b1720;color:var(--fg)">
        <button id="verifyCode" class="btn">Verify code</button>
      </div>
      <div id="otpMsg" class="note"></div>
    `;
        container.appendChild(box);

        const emailEl = box.querySelector("#otpEmail");
        const codeEl = box.querySelector("#otpCode");
        const msgEl = box.querySelector("#otpMsg");

        // send magic link
        box.querySelector("#sendLink").addEventListener("click", async () => {
            const email = emailEl.value.trim();
            if (!email) { msgEl.textContent = "Enter your email first."; return; }
            msgEl.textContent = "Sending link…";
            const { error } = await sb.auth.signInWithOtp({
                email,
                options: { emailRedirectTo: window.location.href }
            });
            msgEl.textContent = error
                ? "Couldn’t send. Check your Auth URL settings."
                : "Link sent! If it doesn’t open, copy the 6-digit code from the email and paste it below.";
        });

        // verify 6-digit code
        box.querySelector("#verifyCode").addEventListener("click", async () => {
            const email = emailEl.value.trim();
            const token = codeEl.value.trim();
            if (!email || token.length !== 6) { msgEl.textContent = "Enter your email and 6-digit code."; return; }
            msgEl.textContent = "Verifying…";
            const { error } = await sb.auth.verifyOtp({ email, token, type: "email" });
            if (error) {
                msgEl.textContent = "Invalid/expired code. Send a new one.";
            } else {
                msgEl.textContent = "Signed in!";
                onVerify?.();
            }
        });
    }

    // Sign-in action: render the OTP UI inline and hide the extra button
    async function signIn() {
        renderOtpUI(controls, () => {
            setAuthed(true);
            if (location.hash.includes("access_token")) {
                const clean = location.pathname + location.search;
                history.replaceState(null, "", clean);
            }
            loadBoard();
        });
        if (signInBtn) signInBtn.style.display = "none";
    }

    async function signOut() {
        await sb.auth.signOut();
        setAuthed(false);
        list.innerHTML = "<p class='note' style='text-align:center'>Signed out.</p>";
        // Show OTP UI so you can sign back in immediately; keep the button hidden
        renderOtpUI(controls, () => {
            setAuthed(true);
            if (location.hash.includes("access_token")) {
                const clean = location.pathname + location.search;
                history.replaceState(null, "", clean);
            }
            loadBoard();
        });
        if (signInBtn) signInBtn.style.display = "none";
    }

    signInBtn.addEventListener("click", signIn);
    signOutBtn.addEventListener("click", signOut);

    // Delete ALL questions (careful!)
    clearBtn.addEventListener("click", async () => {
        if (!confirm("Delete ALL questions? This cannot be undone.")) return;

        // Use IS NOT NULL instead of != NULL
        const { error } = await sb
            .from("questions")
            .delete()
            .not("id", "is", null);

        if (error) {
            alert("Could not clear questions.");
        } else {
            await loadBoard();
        }
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

        // Subscribe to new inserts
        sb.channel("public:questions")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "questions" },
                payload => list.insertAdjacentHTML("afterbegin", card(payload.new)))
            .subscribe();
    }

    // Check session → if none, show OTP UI; if yes, show board
    (async function () {
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
            setAuthed(true);
            if (location.hash.includes("access_token")) {
                const clean = location.pathname + location.search;
                history.replaceState(null, "", clean);
            }
            loadBoard();
        } else {
            setAuthed(false);
            list.innerHTML = "<p class='note' style='text-align:center'>Not signed in. Click “Sign in” above to view/manage questions.</p>";

            // Render OTP UI immediately and hide the button
            renderOtpUI(controls, () => {
                setAuthed(true);
                if (location.hash.includes("access_token")) {
                    const clean = location.pathname + location.search;
                    history.replaceState(null, "", clean);
                }
                loadBoard();
            });
            if (signInBtn) signInBtn.style.display = "none";

            // If the page returns from the magic link, finalize session and load
            sb.auth.onAuthStateChange((_evt, sess) => {
                if (sess) {
                    setAuthed(true);
                    if (location.hash.includes("access_token")) {
                        const clean = location.pathname + location.search;
                        history.replaceState(null, "", clean);
                    }
                    loadBoard();
                }
            });
        }
    })();
})();
