# Qubtic Authentication Server

A passwordless authentication backend with **Mailgun SMTP verification codes** and **MongoDB** storage. Designed for local development and one-click **Vercel Serverless** deployment.

---

## 🚀 Features

- **Passwordless Sign Up & Sign In**: Users authenticate using a secure 6-digit one-time code (OTP) sent to their email.
- **Mailgun SMTP Integration**: Configured for `qubtic.tech` sending domain with custom branded HTML email templates.
- **MongoDB Data Storage**:
  - `users`: persistent user profiles (`email`, `name`, `createdAt`, `lastLoginAt`).
  - `verification_codes`: secure SHA-256 hashed OTPs with automatic MongoDB TTL expiration (10 minutes).
- **Vercel Serverless Ready**:
  - `api/index.ts` handler + `vercel.json` rewrites.
  - Connection pooling cached across serverless cold starts.
- **Full Type Safety**: Written in TypeScript with strict Zod request validation.

---

## 🛠️ Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your details:
```env
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/qubtic
MONGODB_DB_NAME=qubtic
JWT_SECRET=your_jwt_secret_key

# Mailgun SMTP
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_user_or_email
SMTP_PASS=your_smtp_password
SMTP_FROM="Qubtic" <noreply@qubtic.tech>

CLIENT_ORIGIN=http://localhost:5173
```

### 3. Run Diagnostic Tests
Verify your SMTP connection:
```bash
npm run test:smtp
```
Verify your MongoDB connection:
```bash
npm run test:db
```

### 4. Start Local Dev Server
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
      "id": "67...",
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
      "id": "67...",
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
   Or link this repository to your Vercel Dashboard.
2. In the Vercel project settings, set the **Environment Variables**:
   - `MONGODB_URI`: Your MongoDB Atlas connection string (`mongodb+srv://...`)
   - `MONGODB_DB_NAME`: `qubtic`
   - `JWT_SECRET`: A secure random string
   - `SMTP_HOST`: `smtp.mailgun.org`
   - `SMTP_PORT`: `587`
   - `SMTP_USER`: `qubticpro@gmail.com`
   - `SMTP_PASS`: `9iEggBuT#Xq-Ca*`
   - `SMTP_FROM`: `"Qubtic" <noreply@qubtic.tech>`
3. Once deployed, copy your Vercel production URL (e.g. `https://qubtic-auth.vercel.app`) into your FrameKit plugin settings or environment variables.
