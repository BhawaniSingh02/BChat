# Baaat Mobile

Start the dev server (tunnel mode — works over any network, not just same-WiFi):

```
npx expo start --dev-client --tunnel
```

Then on the phone's dev-client home screen, either tap **Fetch development servers** (if logged into the same Expo account as this machine) or **Enter URL manually** using the `exp://...exp.direct` URL printed once the tunnel is ready.

If you just installed a new native module, clear the cache first:

```
npx expo start --dev-client --tunnel --clear
```
