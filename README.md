# Qubtic Authentication Server

A passwordless authentication backend with **Mailgun SMTP verification codes** and **Supabase (PostgreSQL)** storage. Designed for local development and one-click **Vercel Serverless** deployment.

---

## 🚀 Features

- **Passwordless Sign Up & Sign In**: Users authenticate using a secure 6-digit one-time code (OTP) sent to their email.
- **Mailgun SMTP Integration**: Configured with custom branded HTML email templates (user OTP and team sign-up notifications to `hello@qubtic.com`).
- **Supabase PostgreSQL Data Storage**:
  - `users`: persistent user profiles (`id` UUID, `email`, `name`, `role`, `created_at`, `updated_at`, `last_login_at`).
  - `verification_codes`: secure SHA-256 hashed OTPs with rate limiting and automated expiration tracking.
- **Vercel Serverless Ready**:
  - `api/index.ts` handler + `vercel.json` rewrites.
  - Supabase client with zero connection exhaustion overhead.
- **Full Type Safety**: Written in TypeScript with strict Zod request validation and Vitest test suite.

---

## 🛠️ Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Supabase Database
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard) and create or select your project.
2. Open the **SQL Editor** tab on the left sidebar.
3. Open [`supabase-schema.sql`](./supabase-schema.sql), copy its contents, and click **Run**.
4. Retrieve your API credentials from **Project Settings** -> **API**:
   - **Project URL**
   - **service_role secret key** (recommended for backend server) or **anon public key**

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your details:
```env
PORT=4000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key

JWT_SECRET=your_jwt_secret_key

# Mailgun SMTP
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_user_or_email
SMTP_PASS=your_smtp_password
SMTP_FROM="frame-drop by Qubtic" <noreply@qubtic.com>

# Team Alerts
TEAM_NOTIFICATION_EMAIL=hello@qubtic.com

CLIENT_ORIGIN=http://localhost:5173
```

### 4. Run Diagnostic Tests
Verify your SMTP connection:
```bash
npm run test:smtp
```

Verify your Supabase connection and tables:
```bash
npm run test:db
```

Generate email preview:
```bash
npm run preview:email
```

Run test suite:
```bash
npm test
```

### 5. Start Local Dev Server
```bash
npm run dev
```
The server will run at `http://localhost:4000`.

---

## 📡 API Endpoints

### 1. Request Verification Code
- **URL**: `POST /api/auth/send-code`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "name": "Optional Name"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "message": "A 6-digit verification code has been sent to user@example.com",
    "email": "user@example.com",
    "expiresInSeconds": 600
  }
  ```

### 2. Verify Code & Authenticate
- **URL**: `POST /api/auth/verify-code`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "code": "123456",
    "name": "Optional Name"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "token": "eyJhbGciOi...",
    "user": {
      "id": "a1b2c3d4-e5f6-4789-a012-3456789abcde",
      "email": "user@example.com",
      "name": "User",
      "role": "user",
      "createdAt": "2026-10-01T...",
      "lastLoginAt": "2026-10-01T..."
    }
  }
  ```

### 3. Get Current User Profile
- **URL**: `GET /api/auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "user": {
      "id": "a1b2c3d4-e5f6-4789-a012-3456789abcde",
      "email": "user@example.com",
      "name": "User",
      "role": "user"
    }
  }
  ```

### 4. Health Check
- **URL**: `GET /api/health`
- **Response** (200 OK):
  ```json
  {
    "status": "ok",
    "timestamp": "2026-10-01T...",
    "service": "qubtic-auth-server",
    "database": "connected",
    "smtp": { "success": true, "message": "SMTP connected successfully..." }
  }
  ```

---

## ☁️ Deploying to Vercel

1. In the `qube-builder/server` directory, deploy using the Vercel CLI:
   ```bash
   npx vercel
   ```
   Or connect this repository to your Vercel Dashboard.
2. In the Vercel project settings, set the **Environment Variables**:
   - `SUPABASE_URL`: Your Supabase Project URL (`https://xyz.supabase.co`)
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service_role secret key
   - `JWT_SECRET`: A secure random string
   - `SMTP_HOST`: `smtp.mailgun.org`
   - `SMTP_PORT`: `587`
   - `SMTP_USER`: `qubticpro@gmail.com`
   - `SMTP_PASS`: Your SMTP password
   - `SMTP_FROM`: `"frame-drop by Qubtic" <noreply@qubtic.com>`
   - `TEAM_NOTIFICATION_EMAIL`: `hello@qubtic.com`
3. Once deployed, copy your Vercel production URL (e.g. `https://qubtic-auth.vercel.app`) into your frame-drop plugin settings or environment variables.
