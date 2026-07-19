# Connecting SARDAARJI to a real backend + Gmail login

You do **Part 1 and 2** (about 15–20 minutes, no coding).
Claude does **Part 3** (all the code) once you send the two keys.

---

## Part 1 — Create the cloud database (Supabase)

1. Go to **https://supabase.com** → click **Start your project** → sign in (you can use your Gmail).
2. Click **New project**. Give it a name like `sardaarji`. Pick any region close to you. Set a database password (save it somewhere safe).
3. Wait ~2 minutes while it builds.
4. On the left menu click **SQL Editor** → **New query**.
5. Open the file `supabase-schema.sql` (in this folder), copy **everything**, paste it in, click **Run**.
   → This creates all your tables (profiles, trades, workouts, Q&A) with proper privacy rules.
6. On the left menu click **Project Settings** (gear icon) → **API**. You'll see two things I need:
   - **Project URL** (looks like `https://abcdxyz.supabase.co`)
   - **anon public** key (a long text string — the one labelled "anon" / "public", NOT the "service_role" one)

> ⚠️ The **anon public** key is safe to put in a website. Never share the **service_role** key or your database password with anyone, including me.

---

## Part 2 — Turn on "Sign in with Google" (Gmail login)

1. In Supabase, left menu → **Authentication** → **Providers** → find **Google** → toggle it on.
   It will ask for a *Client ID* and *Client Secret*. Get those next:
2. Go to **https://console.cloud.google.com** (sign in with your Gmail).
3. Create a new project (top bar → project dropdown → New Project → name it `sardaarji`).
4. Left menu → **APIs & Services** → **OAuth consent screen** → choose **External** → fill in app name
   (`SARDAARJI`), your email, save. (You can skip optional fields.)
5. Left menu → **Credentials** → **Create Credentials** → **OAuth client ID** →
   Application type: **Web application**.
6. Under **Authorized redirect URIs**, paste the callback URL Supabase shows you on the Google
   provider screen (it looks like `https://abcdxyz.supabase.co/auth/v1/callback`). Click **Create**.
7. Google gives you a **Client ID** and **Client Secret** → paste both back into the Supabase Google
   provider screen → **Save**.

Done. Gmail login is now active on your account.

---

## Part 3 — Claude wires up the website (send me these)

Paste me:
1. Your **Project URL**
2. Your **anon public** key

Then I will:
- Add a small config file to connect the site to your database
- Replace the "saves in browser only" code with "saves to the cloud"
- Add a **"Continue with Google"** button so members log in with Gmail
- Make profiles, trades, workouts and Q&A all load from and save to your tables
- Test the whole flow in the browser

After that, every member's data is stored permanently, works across devices, and you (as CEO)
can see all members inside the Supabase dashboard under **Table Editor**.

---

### What stays the same
Your design, animations, and all the app screens don't change — we're only swapping the
"where does the data live" part underneath.

---

## Part 4 — One setting so login links come back to your site  ✅ DONE by Claude, YOU do the setting

The website code is now connected (config in `js/supabase-config.js`, all screens read/write
to your Supabase tables, and a login modal with **Continue with Google** + **email link** is live).

For the login link / Google to send people **back** to your site after they sign in, tell
Supabase which addresses are allowed:

1. Supabase → **Authentication** → **URL Configuration**
2. **Site URL**: put the address where the site runs.
   - Testing on your computer: `http://localhost:5180`
   - Once deployed (e.g. Netlify): your real URL, like `https://sardaarji.netlify.app`
3. **Redirect URLs** → **Add URL** → add the same address(es). You can add both the localhost
   one and your future deployed one.
4. Save.

### How to test it works
1. Open the site, click **Launch App**.
2. Type your real email → **Email me a login link** → open the email → click the link.
   (Or **Continue with Google** once Part 2 is done.)
3. You land in the app. Go to **Profile**, set your name + role, **Save Profile**.
4. Proof it saved to the cloud: in Supabase → **Table Editor** → **profiles** — your row is there.
   Log a trade or workout and watch them appear in the `trades` / `workouts` tables too.

> Tip: Gmail login and email links work most smoothly on a real deployed URL. When you're ready,
> the next step is to publish the site (free on Netlify) and add that URL in Part 4 above.
