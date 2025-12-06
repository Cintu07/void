# 🔄 Clear Browser Cache & Workers

If IntelliSense or formatting doesn't work after an update, follow these steps:

## Option 1: DevTools Method (Recommended)

1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Click **Service Workers** on the left
4. Check "Update on reload"
5. Unregister any workers you see
6. Go to **Storage** → **Clear site data** button
7. **Hard Refresh**: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)

## Option 2: Quick Method

1. Open DevTools (F12)
2. Right-click the **Refresh** button (while DevTools is open)
3. Select **"Empty Cache and Hard Reload"**

## Option 3: Nuclear Option

1. Close all tabs with `localhost:3000`
2. Open Chrome Settings
3. Privacy → Clear browsing data
4. Select "Cached images and files"
5. Clear data
6. Reopen `localhost:3000`

## Verification

After clearing cache:

- Type `pri` in editor → Should see `print` autocomplete
- Run `for i in range(5): print(f"Line {i}")` → Should print on separate lines
