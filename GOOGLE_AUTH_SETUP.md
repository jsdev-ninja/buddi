# Google Authentication Setup Guide

## 1. Understanding the `scheme` Parameter

### What is `scheme`?

The `scheme` in `app.json` creates a **custom URL protocol** for your app. It allows other apps/websites to open your app via deep links.

**Current setting in app.json:**
```json
{
  "expo": {
    "scheme": "buddi"
  }
}
```

### How it works:

1. **Without scheme**: Google can't redirect back to your app after authentication
2. **With scheme**: Google redirects to `buddi://auth?token=...` and your phone opens your app

### Example Flow:

```
User clicks "Sign in with Google"
    ↓
Browser opens → User authenticates with Google
    ↓
Google redirects to: buddi://auth?token=abc123
    ↓
Phone recognizes "buddi://" protocol
    ↓
Your app opens and receives the token
    ↓
expo-auth-session processes the token
```

### Development vs Production:

- **Development (`useProxy: true`)**: Uses Expo's proxy server
  - Redirect URI: `https://auth.expo.io/@username/buddia`
  - Works in Expo Go
  - No rebuild needed

- **Production (`useProxy: false`)**: Uses your app scheme
  - Redirect URI: `buddi://`
  - Requires app rebuild (not updatable via OTA)
  - Better user experience (no proxy server)

## 2. Getting Your Google Client ID

### Method 1: From Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **buddia-dev**
3. Navigate to: **Authentication** → **Sign-in method**
4. Click on **Google** provider
5. Enable it if not already enabled
6. You'll see **"Web client ID"** - this is what you need!
   - Format: `64676977478-XXXXX.apps.googleusercontent.com`
7. Copy this value

### Method 2: From Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project: **buddia-dev**
3. Navigate to: **APIs & Services** → **Credentials**
4. Look for **"OAuth 2.0 Client IDs"**
5. Find the one labeled **"Web client"** (or create one)
6. Copy the **Client ID**

### Setting Up Redirect URIs

After getting your Client ID, you need to add redirect URIs in Google Cloud Console:

1. Go to Google Cloud Console → **APIs & Services** → **Credentials**
2. Click on your OAuth 2.0 Client ID
3. Under **"Authorized redirect URIs"**, add:

   **For Development:**
   ```
   https://auth.expo.io/@your-username/buddia
   ```
   (Replace `your-username` with your Expo username)

   **For Production:**
   ```
   buddi://
   ```

4. Click **Save**

## 3. Setting the Client ID in Your App

### Option 1: Environment Variable (Recommended)

Create a `.env` file in your project root:

```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=64676977478-XXXXX.apps.googleusercontent.com
```

Then update your code to use it (already done in `src/services/firebase/index.ts`).

### Option 2: Direct in Code

Update `src/services/firebase/index.ts`:

```typescript
const GOOGLE_CLIENT_ID = "64676977478-XXXXX.apps.googleusercontent.com";
```

⚠️ **Warning**: Don't commit this to version control if it's sensitive!

## 4. Testing

1. Make sure `scheme: "buddi"` is in `app.json` ✅ (already done)
2. Set your `GOOGLE_CLIENT_ID` in environment variable or code
3. Add redirect URIs to Google Cloud Console
4. Test the sign-in flow

## Troubleshooting

### "Redirect URI mismatch" error
- Make sure the redirect URI in Google Cloud Console matches exactly
- For development: `https://auth.expo.io/@username/buddia`
- For production: `buddi://`

### "Invalid client ID" error
- Double-check the Client ID is correct
- Make sure it's the "Web client" ID, not iOS/Android client ID

### App doesn't open after Google sign-in
- Make sure `scheme` is set in `app.json`
- For production, you need to rebuild the app (not just update)
