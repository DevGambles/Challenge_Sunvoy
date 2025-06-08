# 🔐 Sunvoy Challenge Scraper

This Node.js project logs into the [Sunvoy Challenge](https://challenge.sunvoy.com), retrieves a list of users via the API, fetches the current logged-in user's info from a secure endpoint, and stores everything in a `users.json` file.

It maintains login state via cookies stored locally in `auth.json`, with auto re-authentication when needed.

---

## 📹 Demo

Watch this short walkthrough to see how it works:

👉 [Loom Video Walkthrough](https://www.loom.com/share/your-video-id-here)

---

## 📦 Features

- ✅ Login using a nonce-based form.
- 🍪 Session persistence with cookie management.
- 🔁 Auto re-authentication on cookie expiration.
- 👥 Fetch user list from internal API.
- 🔍 Extract current user information via form-scraping.
- 🔐 Secure HMAC checkcode signing.
- 📝 Writes final output to `users.json`.

---

## 🚀 Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/sunvoy-scraper.git
cd sunvoy-scraper
```

### 2. Install dependencies

```bash
npm install
```

## 🛠️ Usage

### Run the scraper

```bash
npm run start
```

### On successful run, it will:
-	Read or request a session cookie
-	Fetch the list of users
-	Fetch current user info
-	Save all user data to users.json