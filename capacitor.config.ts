import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Reverse-DNS bundle identifier. Match this in App Store Connect when you
  // register the app.
  appId: "com.brandonlines.mexicanrummy",
  appName: "Mexican Rummy",
  // Vite outputs here; run `npm run build` before `cap sync`.
  webDir: "dist",
  server: {
    androidScheme: "https"
  },
  ios: {
    // Neutral webview background so the default (light) theme doesn't flash dark
    // navy on load / rubber-band overscroll. Dark-mode overscroll briefly shows
    // this light tone — an accepted cross-platform tradeoff.
    backgroundColor: "#f2f2f7"
  },
  android: {
    backgroundColor: "#f2f2f7"
  }
};

export default config;
