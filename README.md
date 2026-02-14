# KasMail – Decentralized Email powered by Kaspa

**Send & receive messages tied to your Kaspa wallet address — no central server owns your identity. Send and receive email from any email provider**

KasMail is a **client-side email-like messaging app** that uses Kaspa wallet addresses as identities and Supabase for message persistence + real-time sync. **Resend.com integration** enables real-time email send and receive, bypassing spam folders. Optional **on-chain transactions** provide cryptographic proof of sending (anti-spam + verifiable delivery) while simultaneously **rewarding Kaspa miners** to strengthen the L1 network effect.

Live demo: https://youtu.be/8t9Crw1qtmU
GitHub: https://github.com/Zarbelt/Kasmail

---

## ✨ Features

- **Wallet-based identity** (KasWare extension)
- **Username@kasmail.org** style addresses (stored in Supabase `profiles`)
- **Real-time inbox** via Supabase Realtime
- **Send & receive external emails** via Resend.com integration
- **Split on-chain proof + miner reward** (1 KAS to developer wallet for on-chain proof + 1 KAS to a random top-50 miner to support L1 network)
- **Miner reward system** — every email sent distributes 1 KAS to a randomly selected miner from the top 50 mining pool addresses, supporting Kaspa's L1 network effect
- **Anonymous mode** (hide username, show truncated address)
- **KasMail-only mode** (`only_internal` flag) — restrict to other KasMail users
- **Custom domain support** @kasmail.org
- **Attachments** (stored in Supabase bucket `attachments`)
- Clean Tailwind + React UI (AI-assisted design using DeepSeek AI)

---

## 🎯 Kaspa Integration

KasMail uses Kaspa in three meaningful ways:

1. **Identity** — Kaspa address = your email address (via KasWare extension)
2. **Delivery proof** — sender pays 1 KAS to the developer wallet, recorded as `dev_fee_txid` in the `emails` row → verifiable on-chain
3. **Miner reward** — sender pays 1 KAS to a randomly selected top-50 mining pool address, recorded as `miner_fee_txid` → supports L1 network effect and incentivizes miners

No full Kaspa node is required — only browser wallet interaction.

### Fee Breakdown Per Email (Optional)

| Recipient | Amount | Purpose |
|-----------|--------|---------|
| Developer wallet (`VITE_ADMIN_WALLET`) | 1 KAS | On-chain proof + platform sustainability |
| Random top-50 miner (from Supabase `miner_addresses`) | 1 KAS | L1 network support + miner reward |
| **Total** | **2 KAS** | |

---

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Wallet**: KasWare extension (window.kasware API)
- **Backend / Storage / Realtime**: Supabase (PostgreSQL + Realtime + Storage)
- **Email Service**: Resend.com (sending & receiving external emails)
- **Miner Data**: Top 50 addresses from kaspa-pool.org stored in Supabase
- **Deployment**: Vercel (frontend) + Supabase Edge Functions (webhooks)

---

## 📋 Prerequisites

- Node.js ≥ 18
- KasWare browser extension (Chrome/Brave/Edge)
- Supabase project (free tier is enough)
- **Resend.com account** (free tier: 100 emails/day, 3,000/month)
- Custom domain for email (e.g., `kasmail.org`)

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

# Developer wallet for on-chain proof (receives 1 KAS per email)
VITE_ADMIN_WALLET=kaspa:qp...

# ⚠️ DO NOT ADD RESEND_API_KEY HERE!
# It goes in Supabase Edge Functions secrets (see Resend Setup below)
```

### 3. Supabase Database Setup

**⚠️ VERY IMPORTANT** – Run these SQL commands in **Supabase → SQL Editor**:

#### 3a. Core Tables (profiles + emails)

```sql
-- Profiles table columns (if not already present)
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS username          TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS anonymous_mode    BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS email_suffix      TEXT DEFAULT '@kasmail.org' NOT NULL,
    ADD COLUMN IF NOT EXISTS only_internal     BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS onchain_proof_default BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles ALTER COLUMN username DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Emails table extras (attachments + split on-chain proof)
ALTER TABLE emails
    ADD COLUMN IF NOT EXISTS attachment_url  TEXT,
    ADD COLUMN IF NOT EXISTS attachment_name TEXT,
    ADD COLUMN IF NOT EXISTS attachment_type TEXT,
    ADD COLUMN IF NOT EXISTS dev_fee_txid    TEXT,
    ADD COLUMN IF NOT EXISTS miner_fee_txid  TEXT,
    ADD COLUMN IF NOT EXISTS miner_address   TEXT;

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

#### 3b. Miner Addresses Table (NEW — required for miner rewards)

Run the full SQL from **`supabase_miner_schema.sql`** (included in this repo). This creates the `miner_addresses` table, seeds the top 50 miner addresses, adds RLS policies, and creates a `get_random_miner()` PostgreSQL function.

```sql
-- Quick summary of what the schema creates:
-- • miner_addresses table (rank, address, is_active, pool_source)
-- • 50 seeded addresses from kaspa-pool.org
-- • RLS: anon can SELECT active addresses; service_role manages all
-- • get_random_miner() function for server-side random selection
-- • Tracking columns on emails: dev_fee_txid, miner_fee_txid, miner_address
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
3. Enter: `kasmail.org` (your domain)
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
Name: @ (or kasmail.org)
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
3. **Domain:** Select `kasmail.org`
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
2. Send an email from Gmail to: `alice@kasmail.org`
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
- Your email becomes **username@kasmail.org**

### 3. Configure Settings

**Toggle modes (in Settings):**
- **Anonymous mode** → hide username, show truncated address instead
- **KasMail-only mode** (`only_internal`) → only receive messages from other KasMail users
- **Default on-chain proof** → auto-enable on-chain proof + miner reward when composing

### 4. Send Messages

#### Internal (KasMail to KasMail):
- Go to `/compose`
- Enter recipient: `username` or `kaspa:address`
- Optional: attach file, toggle on-chain proof
- Send → two wallet popups: 1 KAS dev fee + 1 KAS miner reward (if enabled)

#### External (KasMail to Gmail/Outlook):
- Turn **OFF** "Only KasMail Users" in Settings
- Go to `/compose`
- Enter recipient: `someone@gmail.com`
- Send → email delivered via Resend

### 5. Receive Messages

- **Internal** (KasMail → KasMail): Real-time via Supabase
- **External** (Gmail → KasMail): Via Resend webhook → Edge Function → Database → Inbox

---

## ⛏️ Miner Reward System

KasMail implements a novel approach to supporting the Kaspa mining ecosystem. Every email sent with on-chain proof triggers two transactions:

1. **1 KAS → Developer wallet** — sustains the platform and provides on-chain delivery proof
2. **1 KAS → Random miner** — selected from a pool of top 50 mining addresses indexed from kaspa-pool.org

### How It Works

1. The `miner_addresses` table in Supabase stores the top 50 mining pool addresses
2. When a user sends an email with on-chain proof enabled, `kaspa.ts` fetches a random miner address from Supabase
3. Two separate KasWare wallet popups appear for the user to confirm each transaction
4. Both transaction IDs are stored in the `emails` table (`dev_fee_txid` + `miner_fee_txid`)
5. The miner address that received the reward is also stored for transparency

### Updating Miner Addresses

To refresh the miner list, update the `miner_addresses` table in Supabase with new addresses from kaspa-pool.org. Use `is_active = FALSE` to disable old addresses without deleting them.

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
- **Code logic**: Mostly hand-written or lightly adapted (wallet connection, Supabase queries, webhook handler, Kaspa dust tx, miner reward logic).
- **README & docs**: Written by human with AI assistance for structure and clarity.

→ **AI was not used to generate the core business logic or Kaspa integration.**

---

## 🔒 Security Notes

- Never log private keys or full wallet info
- Service role key is used **only** in Edge Functions (never in client)
- On-chain fees are optional and transparent (1 KAS dev + 1 KAS miner = 2 KAS total)
- You can remove the anti-bot fee requirement by changing `hasMinimumKAS()` logic
- **Never use `VITE_` prefix for API keys** (only use for Supabase anon key, which is public)
- Resend API key is stored in Supabase Edge Functions secrets (server-side only)
- Miner addresses are read-only for anonymous users (RLS enforced)

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
- **kaspa-pool.org** - Mining pool address data
- **miningpoolstats.stream** - Mining statistics reference

---

**Built with ❤️ for the Kaspa ecosystem — every email supports a miner**
