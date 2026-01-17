# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
**ensure you run this on supabase : CREATE POLICY "Allow anon upsert by wallet"
ON profiles
FOR INSERT
TO anon
WITH CHECK (true);

AND 

CREATE POLICY "Allow anon update by wallet"
ON profiles
FOR UPDATE
TO anon
USING (true);

if You enabled rls 
else you will get this error : injected.js:1 
 POST https://gtblmmefwrwshklnonct.supabase.co/rest/v1/profiles?on_conflict=wallet_address 401 (Unauthorized)
value	@	injected.js:1
**

While developing i also added this sql on supabase make sure to add it to avoid errors : -- Add missing columns if not already present
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS anonymous_mode BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS email_suffix TEXT DEFAULT '@kasmail.com' NOT NULL;

-- Make username nullable initially (user can choose later)
-- But enforce uniqueness when set
ALTER TABLE profiles
    ALTER COLUMN username DROP NOT NULL;

-- Optional: index for faster lookup
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- RLS update: allow users to update their own row
-- (assuming you already have basic RLS on profiles)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (wallet_address = auth.uid()::text);

    create bucket attachement if yoiu need attachment to our email : attachments

and run this sql : ALTER TABLE emails
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT;

  Add this if you need for dust transaction to be sent to record email on chain : ALTER TABLE emails
  ADD COLUMN IF NOT EXISTS kaspa_txid TEXT;

-- Optional: store user preference (per-profile)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onchain_proof_default BOOLEAN DEFAULT FALSE;


  in real development ensure no console error for security reasons.

The design is updated by Ai , since i am not much of a design guy myself , so feel free to play with the design with Ai 
  You can update your logo if you want , we will bbe using the custom Vite logo. 