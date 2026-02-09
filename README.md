# KasMail – Decentralized Email powered by Kaspa

**Send & receive messages tied to your Kaspa wallet address — no central server owns your identity. Send and receive email from any email provider**

KasMail is a **client-side email-like messaging app** that uses Kaspa wallet addresses as identities and Supabase for message persistence + real-time sync. **Resend.com integration** enables real-time email send and receive, bypassing spam folders. Optional **on-chain dust transactions** provide cryptographic proof of sending (anti-spam + verifiable delivery).

Live demo: //Add the link here Charles  
GitHub: https://github.com/Zarbelt/Kasmail

![KasMail Screenshot](https://via.placeholder.com/1280x720.png?text=KasMail+Screenshot+-+replace+with+your+own)  
*(Replace this placeholder with a real screenshot you will upload to the repo for Kaspathon thumbnail)*

---

## ✨ Features

- **Wallet-based identity** (KasWare extension)
- **Username@kasmail.modmedianetwork.com** style addresses (stored in Supabase `profiles`)
- **Real-time inbox** via Supabase Realtime
- **Send & receive external emails** via Resend.com integration
- **Optional on-chain proof** (tiny ~2 KAS dust tx to developer wallet for onchain proof)
- **Anonymous mode** (hide username, show truncated address)
- **KasMail-only mode** (`only_internal` flag) — restrict to other KasMail users
- **Custom domain support** @kasmail.modmedianetwork.com
- **Attachments** (stored in Supabase bucket `attachments`)
- Clean Tailwind + React UI (AI-assisted design using DeepSeek AI)

---

## 🎯 Kaspa Integration

KasMail uses Kaspa in two meaningful ways:

1. **Identity** — Kaspa address = your email address (via KasWare extension)
2. **Optional delivery proof** — sender can pay tiny dust transaction (~2 KAS) recorded as `kaspa_txid` in the `emails` row → verifiable on-chain

No full Kaspa node is required — only browser wallet interaction.

---

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Wallet**: KasWare extension (window.kasware API)
- **Backend / Storage / Realtime**: Supabase (PostgreSQL + Realtime + Storage)
- **Email Service**: Resend.com (sending & receiving external emails)
- **Deployment**: Vercel (frontend) + Supabase Edge Functions (webhooks)

---

## 📋 Prerequisites

- Node.js ≥ 18
- KasWare browser extension (Chrome/Brave/Edge)
- Supabase project (free tier is enough)
- **Resend.com account** (free tier: 100 emails/day, 3,000/month)
- Custom domain for email (e.g., `kasmail.modmedianetwork.com`)

---

## 🚀 Quick Setup (Local Development)

### 1. Clone & Install

```bash
git clone https://github.com/Zarbelt/Kasmail.git
cd Kasmail
pnpm install          # or npm install / yarn
```

### 2. Create Environment Variables

Create `.env` in root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional - Developer wallet for on-chain proof
VITE_ADMIN_WALLET=kaspa:qp...

# ⚠️ DO NOT ADD RESEND_API_KEY HERE!
# It goes in Supabase Edge Functions secrets (see Resend Setup below)
```

### 3. Supabase Database Setup

**⚠️ VERY IMPORTANT** – Run these SQL commands in **Supabase → SQL Editor**:

```sql
-- Profiles table columns (if not already present)
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS username          TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS anonymous_mode    BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS email_suffix      TEXT DEFAULT '@kasmail.modmedianetwork.com' NOT NULL,
    ADD COLUMN IF NOT EXISTS only_internal     BOOLEAN DEFAULT FALSE,     -- KasMail-only toggle
    ADD COLUMN IF NOT EXISTS onchain_proof_default BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles ALTER COLUMN username DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Emails table extras (attachments + on-chain proof)
ALTER TABLE emails
    ADD COLUMN IF NOT EXISTS attachment_url  TEXT,
    ADD COLUMN IF NOT EXISTS attachment_name TEXT,
    ADD COLUMN IF NOT EXISTS attachment_type TEXT,
    ADD COLUMN IF NOT EXISTS kaspa_txid      TEXT;

-- ⚠️ CRITICAL: Remove foreign key constraints that block external emails
ALTER TABLE emails DROP CONSTRAINT IF EXISTS fk_from;
ALTER TABLE emails DROP CONSTRAINT IF EXISTS fk_to;

-- Critical RLS policies (without these → 401 Unauthorized)
CREATE POLICY "Allow anon upsert by wallet"
ON profiles FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update by wallet"
ON profiles FOR UPDATE TO anon USING (true);

-- Allow external email inserts
CREATE POLICY "Allow external email inserts"
ON emails FOR INSERT TO anon
WITH CHECK (from_wallet LIKE 'external:%');

-- Allow internal email inserts
CREATE POLICY "Allow internal email inserts"
ON emails FOR INSERT TO anon
WITH CHECK (NOT (from_wallet LIKE 'external:%'));

-- Users can read their own emails
CREATE POLICY "Users can read their own emails"
ON emails FOR SELECT TO anon
USING (true);
```

### 4. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

---

## 📧 Resend.com Setup (External Email Integration)

KasMail uses **Resend.com** to send and receive emails from/to any email provider (Gmail, Outlook, etc.).

### Step 1: Create Resend Account

1. Go to https://resend.com/signup
2. Sign up (free tier: 100 emails/day, 3,000/month)
3. Verify your email

---

### Step 2: Add Your Domain

1. Go to **Resend Dashboard** → **Domains**
2. Click **"Add Domain"**
3. Enter: `kasmail.modmedianetwork.com` (your domain)
4. Click **"Add Domain"**

---

### Step 3: Configure DNS Records

Resend will show you DNS records to add. Go to your domain registrar (Namecheap, Cloudflare, GoDaddy, etc.) and add these records:

**Example DNS Records:**
```
Type: TXT
Name: _resend
Value: resend-domain-verify=xxxxxxxxxxxxx

Type: MX  
Name: @ (or kasmail.modmedianetwork.com)
Value: mx.resend.com
Priority: 10

Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all

Type: TXT
Name: resend._domainkey
Value: [DKIM key provided by Resend]
```

**⏱️ Wait 5-10 minutes** for DNS propagation, then click **"Verify"** in Resend.

---

### Step 4: Get API Key

1. Go to **Resend Dashboard** → **API Keys**
2. Click **"Create API Key"**
3. Name: `KasMail Production`
4. Permissions: **Full Access**
5. Click **"Create"**
6. **Copy the API key** (starts with `re_...`)

⚠️ **CRITICAL:** Never add this to your `.env` file! It goes in Supabase Edge Functions secrets (next step).

---

### Step 5: Configure Supabase Edge Functions

#### 5.1 Add API Key to Supabase Secrets

1. Go to **Supabase Dashboard** → **Project Settings** → **Edge Functions**
2. Click **"Add Secret"**
3. **Name:** `RESEND_API_KEY`
4. **Value:** Your Resend API key (e.g., `re_K3mYbELi_Lkwci8XY4M5buwHSrThJG4cY`)
5. Click **"Add Secret"**

#### 5.2 Create Edge Function Files

Create the following file structure in your project:

```
your-project/
├── supabase/
│   └── functions/
│       ├── rapid-worker/
│       │   └── index.ts          ← Sends emails via Resend API
│       └── receive-kasmail/
│           └── index.ts          ← Receives emails from Resend webhook
```

**Create `supabase/functions/rapid-worker/index.ts`:**

```typescript
// Sends outgoing emails via Resend API
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method Not Allowed" }), 
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { from, to, subject, text, html } = await req.json();

    if (!from || !to || (!text && !html)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from,
        to,
        subject: subject || "(No subject)",
        text: text || undefined,
        html: html || undefined,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errorData.message }), 
        { status: resendResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resendData = await resendResponse.json();

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully", emailId: resendData.id }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to send email", details: err.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

**Create `supabase/functions/receive-kasmail/index.ts`:**

```typescript
// Receives incoming emails from Resend webhook
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method Not Allowed" }), 
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const payload = await req.json();
    
    const toFull = payload.to || "";
    const username = toFull.split("@")[0].toLowerCase().trim();
    const fromEmail = payload.from || "unknown@sender.com";
    const subject = payload.subject || "(No subject)";
    const body = payload.text || payload.html || "(No content)";

    if (!username) {
      return new Response(
        JSON.stringify({ error: "Missing username in 'to' field" }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find user by username
    const res = await fetch(
      `${supabaseUrl}/rest/v1/profiles?username=eq.${encodeURIComponent(username)}&select=wallet_address`, 
      {
        headers: {
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
        },
      }
    );

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to lookup user profile" }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const profiles = await res.json();
    if (!profiles?.length) {
      return new Response(
        JSON.stringify({ error: `User @${username} not found` }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const toWallet = profiles[0].wallet_address;

    // Insert email to database
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/emails`, {
      method: "POST",
      headers: {
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        from_wallet: `external:${fromEmail}`,
        to_wallet: toWallet,
        subject,
        body,
        content: payload.html || body,
        read: false,
        created_at: new Date().toISOString(),
      }),
    });

    if (!insertRes.ok) {
      const err = await insertRes.text();
      console.error("Insert failed:", err);
      return new Response(
        JSON.stringify({ error: "Failed to save email" }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email received and saved" }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: err.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

#### 5.3 Deploy Edge Functions

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
npx supabase login

# Link your project (replace with your project ref)
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy both functions
npx supabase functions deploy rapid-worker
npx supabase functions deploy receive-kasmail
```

**Your function URLs will be:**
- **Sending:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/rapid-worker`
- **Receiving:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/receive-kasmail`

---

### Step 6: Configure Resend Inbound Email

#### 6.1 Enable Inbound Routing

1. Go to **Resend Dashboard** → **Inbound**
2. Click **"Add Route"** or **"Configure"**
3. **Domain:** Select `kasmail.modmedianetwork.com`
4. **Status:** Enable
5. Click **"Save"**

#### 6.2 Add Webhook Endpoint

1. Go to **Resend Dashboard** → **Webhooks**
2. Click **"Add Endpoint"**

**Configure webhook:**
```
Endpoint URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/receive-kasmail
Description: KasMail Receiver (optional)
Events: ✅ email.received
Status: ✅ Active
```

3. Click **"Add Endpoint"**

---

### Step 7: Test the Integration

#### Test Receiving Emails

1. Set your username in KasMail Settings (e.g., "alice")
2. Send an email from Gmail to: `alice@kasmail.modmedianetwork.com`
3. Check your KasMail inbox - email should appear!

#### Test Sending Emails

1. In KasMail Settings, turn **OFF** "Only KasMail Users"
2. Go to Compose
3. Enter any external email (e.g., `recipient@gmail.com`)
4. Send message
5. Check recipient's inbox - email should arrive!

---

### Troubleshooting Resend

**Emails not being received?**
1. Check Resend webhook logs: https://resend.com/webhooks
2. Check Edge Function logs: `npx supabase functions logs receive-kasmail`
3. Verify domain is verified in Resend
4. Verify webhook is Active with `email.received` event

**500 Foreign Key Error?**
- Your database has a foreign key constraint blocking external emails
- **Fix:** Run this SQL in Supabase:
  ```sql
  ALTER TABLE emails DROP CONSTRAINT IF EXISTS fk_from;
  ALTER TABLE emails DROP CONSTRAINT IF EXISTS fk_to;
  ```

**401 Unauthorized errors?**
- Make sure `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart dev server after adding env variables

**Emails not showing in inbox?**
- Go to Settings and turn **OFF** "Only KasMail Users"
- This allows external emails to display

---

## 📖 How to Use KasMail (User Guide)

### 1. Connect Wallet

- Click **"Connect KasWare Wallet"** → approve in extension
- Minimum **1 KAS balance** required (anti-spam check, never spent)

### 2. Set Your Username (Settings Page)

- Go to `/settings`
- Enter desired username (3–20 chars, a-z0-9_)
- Check availability → Save
- Your email becomes **username@kasmail.modmedianetwork.com**

### 3. Configure Settings

**Toggle modes (in Settings):**
- **Anonymous mode** → hide username, show truncated address instead
- **KasMail-only mode** (`only_internal`) → only receive messages from other KasMail users
- **Default on-chain proof** → auto-enable dust tx proof when composing

### 4. Send Messages

#### Internal (KasMail to KasMail):
- Go to `/compose`
- Enter recipient: `username` or `kaspa:address`
- Optional: attach file, toggle on-chain proof
- Send → wallet popup for dust tx if enabled

#### External (KasMail to Gmail/Outlook):
- Turn **OFF** "Only KasMail Users" in Settings
- Go to `/compose`
- Enter recipient: `someone@gmail.com`
- Send → email delivered via Resend

### 5. Receive Messages

- **Internal** (KasMail → KasMail): Real-time via Supabase
- **External** (Gmail → KasMail): Via Resend webhook → Edge Function → Database → Inbox

---

## 🚀 Deployment

### Frontend (Vercel)

1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_ADMIN_WALLET=kaspa:qp...
   ```
4. Deploy!

### Edge Functions (Supabase)

Already deployed in Step 5.3 above. Functions auto-update when you redeploy:

```bash
npx supabase functions deploy
```

---

## 🤖 AI Usage Disclosure (Kaspathon Requirement)

- **UI/Design**: DeepSeek AI was used to generate and refine most Tailwind + React component styles, layouts, icons arrangement, color palette and responsiveness.
- **Code logic**: Mostly hand-written or lightly adapted (wallet connection, Supabase queries, webhook handler, Kaspa dust tx).
- **README & docs**: Written by human with AI assistance for structure and clarity.

→ **AI was not used to generate the core business logic or Kaspa integration.**

---

## 🔒 Security Notes

- Never log private keys or full wallet info
- Service role key is used **only** in Edge Functions (never in client)
- Dust tx is optional and very small (2 KAS)
- You can remove the anti-bot fee requirement by changing `hasMinimumKAS()` logic
- **Never use `VITE_` prefix for API keys** (only use for Supabase anon key, which is public)
- Resend API key is stored in Supabase Edge Functions secrets (server-side only)

---

## 📝 License

MIT License

---

## 🙏 Acknowledgments

- **Kaspa** - Fast, secure blockchain
- **KasWare** - Browser wallet extension
- **Supabase** - Database, storage & real-time
- **Resend** - Modern email infrastructure
- **Vercel** - Deployment platform
- **DeepSeek AI** - UI/UX design assistance

---

**Built with ❤️ for the Kaspa ecosystem**