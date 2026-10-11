# BINISTA - Official Technical Specification

এটি BINISTA প্ল্যাটফর্মের সম্পূর্ণ টেকনিক্যাল কাঠামো এবং ইন্টিগ্রেশন গাইড।

## ১. কোর টেকনোলজি স্ট্যাক (Core Stack)
*   **Frontend Framework:** React 19 (Vite) + TypeScript
*   **Styling:** Tailwind CSS (Modern functional UI)
*   **Animation:** Framer Motion (Smooth social interactions)
*   **Mobile Engine:** Capacitor JS (Native Android & iOS support)
*   **Backend:** Node.js (Express) - API Gateway and Background Workers
*   **Real-time Database:** Firebase Firestore
*   **Authentication:** Firebase Auth (OTP-based secure login)

## ২. প্ল্যাটফর্ম ফিচার ও ইন্টিগ্রেশন (Features & Integrations)

### ক. সোশ্যাল কমিউনিটি (Social Features)
*   **Posts & Reels:** ইউজাররা ফটো এবং শর্ট ভিডিও আপলোড করতে পারে।
*   **Real-time Chat:** Firestore ব্যবহার করে ইনস্ট্যান্ট মেসেজিং সিস্টেম।
*   **AI Agent:** Google Gemini API ব্যবহার করে চ্যাট অটো-রিপ্লাই এবং পার্সোনাল এআই অ্যাসিস্ট্যান্ট।

### খ. অথেন্টিকেশন ও ওটিপি (Auth & OTP)
*   **Mobile OTP:** SAS Bulk SMS Gateway-এর মাধ্যমে বাংলাদেশি মোবাইল নম্বরে ওটিপি পাঠানো হয়।
*   **Email OTP:** Resend API অথবা SMTP ব্যবহার করে ইমেইল ভেরিফিকেশন।
*   **Auth Flow:** OTP ভেরিফাই হওয়ার পর ডিরেক্ট ক্লায়েন্ট-সাইড Firebase Auth রেজিস্ট্রেশন সম্পন্ন হয়।

### গ. নোটিফিকেশন সিস্টেম (Notifications)
*   **Push Notifications:** OneSignal Integration (চ্যাট, ফলোয়ার এবং লাইক নোটিফিকেশনের জন্য)।
*   **Worker:** `server.ts`-এ একটি ব্যাকগ্রাউন্ড ইন্টারভ্যাল রানিং থাকে যা শিডিউলড নোটিফিকেশন প্রসেস করে।

### ঘ. মিডিয়া ও স্টোরেজ (Media Management)
*   **CDN Upload:** ImgBB এবং FreeImage.host ব্যবহার করে পাবলিক ইমেজ ইউআরএল জেনারেট করা হয়।
*   **Video Hosting:** অ্যাপের নিজস্ব সার্ভার (`/uploads`) বা ক্লাউড স্টোরেজ ব্যবহার করা হয়।

### ঙ. প্রিমিয়াম ভয়েস (AI Voice)
*   **TTS Service:** Microsoft Edge TTS ও Google Translate TTS ব্যবহার করে ইউজারদের জন্য ভয়েস গাইডেন্স দেওয়া হয়।

## ৩. এপিআই রাউটিং (API Routing)
অ্যান্ড্রয়েড অ্যাপে ক্রস-অরিজিন (CORS) সমস্যা এড়াতে `/src/lib/api.ts`-এ একটি বিশেষ `apiFetch` হেল্পার ব্যবহার করা হয়েছে। এটি স্বয়ংক্রিয়ভাবে লোকাল কলগুলোকে ক্লাউড ব্যাকএন্ডে রাউট করে।

## ৪. সিকিউরিটি (Security)
*   **Strict Auth:** ওটিপি ভেরিফিকেশন ছাড়া অ্যাকাউন্ট তৈরি করা সম্ভব নয়।
*   **Secure Fetch:** সমস্ত ব্যাকএন্ড রিকোয়েস্ট নিরাপদ গেটওয়ের মাধ্যমে পাস হয়।

## ৫. বিল্ড কমান্ড (Commands)
*   **Dev:** `npm run dev`
*   **Build:** `npm run build`
*   **Sync Mobile:** `npx cap sync android`

---
**BINISTA - Connect, Share, Discover**
