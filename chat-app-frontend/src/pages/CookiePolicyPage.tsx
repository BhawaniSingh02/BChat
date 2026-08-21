import LegalLayout from './legal/LegalLayout'

const COOKIES = [
  { name: 'token', platform: 'Web app only', purpose: 'Holds your signed-in session (JWT). This is what keeps you logged in.', duration: 'Session lifetime (set by the server)', type: 'Strictly necessary' },
  { name: 'refreshToken', platform: 'Web app only', purpose: 'Used to silently renew your session without asking you to log in again.', duration: 'A few days', type: 'Strictly necessary' },
]

const TOC: [string, string][] = [
  ['short-answer', '1. The short answer'],
  ['web-cookies', '2. Cookies on the web app'],
  ['not-used', "3. What we don't use"],
  ['local-storage', '4. Local storage (not a cookie)'],
  ['mobile', '5. Mobile app'],
  ['desktop', '6. Desktop app'],
  ['fonts', '7. Google Fonts'],
  ['managing', '8. Managing cookies'],
  ['changes', '9. Changes to this policy'],
  ['contact', '10. Contact'],
]

export default function CookiePolicyPage() {
  return (
    <LegalLayout
      title="Cookie Policy"
      dek="What Baaat actually stores in your browser or on your device, checked directly against the code — not a generic cookie-category list."
      activePath="/cookie-policy"
      toc={TOC}
      calloutIcon="🍪"
      calloutBody={
        <>
          <b>The short version:</b> The Baaat <b>web app</b> sets exactly two cookies, both strictly necessary to
          keep you logged in — no tracking, advertising, or analytics cookies. The Baaat <b>mobile app</b> uses no
          cookies at all; it keeps your session in the device's secure keychain instead. Because we only use
          essential cookies, no cookie-consent banner is required.
        </>
      }
      footerNote={<>© 2026 Baaat. This policy lists exactly what Baaat sets, checked against the codebase — nothing is included "just in case."</>}
    >
      <section id="short-answer">
        <span className="sec-num">01</span>
        <h2>The short answer</h2>
        <div className="fact-grid">
          <div className="fact"><div className="fk">Web app</div><div className="fv">2 cookies — both strictly necessary for login</div></div>
          <div className="fact"><div className="fk">Mobile app</div><div className="fv no">0 cookies — session kept in secure device storage</div></div>
          <div className="fact"><div className="fk">Desktop app</div><div className="fv">Same 2 cookies as the web app (it loads the web app)</div></div>
          <div className="fact"><div className="fk">Advertising / tracking cookies</div><div className="fv no">None, on any platform</div></div>
        </div>
        <p>
          Under GDPR/ePrivacy rules, a consent banner is only required for non-essential cookies (analytics,
          advertising, personalization). Since every cookie Baaat sets is strictly necessary to log you in, Baaat
          does not show a cookie banner.
        </p>
      </section>

      <section id="web-cookies">
        <span className="sec-num">02</span>
        <h2>Cookies on the web app</h2>
        <p>When you sign in at the Baaat web app, our server sets these cookies:</p>
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th>Cookie</th><th>Purpose</th><th>Duration</th><th>Category</th></tr>
            </thead>
            <tbody>
              {COOKIES.map((c) => (
                <tr key={c.name}>
                  <td className="who"><code>{c.name}</code></td>
                  <td>{c.purpose}</td>
                  <td>{c.duration}</td>
                  <td>{c.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Both cookies are set with:</p>
        <ul>
          <li><strong>HttpOnly</strong> — never readable by page JavaScript, so a malicious script on the page can't steal your session</li>
          <li><strong>Secure</strong> — only sent over HTTPS</li>
          <li><strong>SameSite</strong> — restricts when the cookie is sent on cross-site requests, as anti-CSRF protection</li>
        </ul>
        <p>
          <code>token</code> is sent with every request so the server knows who you are. <code>refreshToken</code>{' '}
          is only sent to the token-refresh endpoint and is used to issue you a new <code>token</code> without
          re-entering your password. Neither cookie is used for tracking, analytics, or advertising, and neither is
          shared with a third party.
        </p>
      </section>

      <section id="not-used">
        <span className="sec-num">03</span>
        <h2>What we don't use</h2>
        <p>We checked the codebase directly rather than assume. Baaat does not set or use:</p>
        <ul>
          <li>Analytics cookies (no Google Analytics, Mixpanel, or similar)</li>
          <li>Advertising or retargeting cookies (no ad network is integrated)</li>
          <li>Social-media tracking pixels (no Facebook Pixel or equivalent)</li>
          <li>Third-party marketing cookies of any kind</li>
        </ul>
        <p>
          Baaat's web app uses <strong>Vercel Analytics</strong> for basic traffic metrics (page views, referrers).
          It's cookieless by design — it doesn't set a cookie or use any persistent identifier tied to your account,
          and it isn't linked to who you are. See <a href="/privacy-policy">Privacy Policy</a> §3 for the full list
          of infrastructure providers Baaat uses.
        </p>
      </section>

      <section id="local-storage">
        <span className="sec-num">04</span>
        <h2>Local storage (not a cookie)</h2>
        <p>
          Separately from cookies, the web app writes two small preferences to your browser's{' '}
          <code>localStorage</code> — a different, non-cookie storage mechanism that isn't sent to our server on
          every request and isn't covered by cookie regulations, but we're listing it here for completeness:
        </p>
        <ul>
          <li>Your light/dark theme choice</li>
          <li>Your last-used camera/microphone device, for call setup convenience</li>
        </ul>
        <p>Neither value identifies you, contains your session, or ever leaves your device.</p>
      </section>

      <section id="mobile">
        <span className="sec-num">05</span>
        <h2>Mobile app</h2>
        <p>
          The Baaat mobile app (iOS/Android, built with Expo/React Native) does not use cookies at all — mobile apps
          don't have a browser cookie jar in the way a website does. Your session token is stored using{' '}
          <strong>Expo SecureStore</strong>, which keeps it in the device's encrypted keychain (iOS Keychain /
          Android Keystore), not in a cookie or in plain app storage. Push notifications are delivered via a device
          push token (registered with Firebase Cloud Messaging on Android or Apple Push Notification service on
          iOS, through Expo's push service) — this token identifies your device for notification delivery, not for
          tracking, and it isn't a cookie.
        </p>
      </section>

      <section id="desktop">
        <span className="sec-num">06</span>
        <h2>Desktop app</h2>
        <p>
          The Baaat desktop app (Windows/macOS/Linux, built with Electron) loads the same web app inside an embedded
          Chromium browser, so the same two cookies described in §2 (<code>token</code>, <code>refreshToken</code>)
          apply there. The desktop shell separately saves a small local settings file on your machine (window
          size/position and update preferences) — this is a local configuration file, not a cookie, isn't sent to
          any server, and isn't shared with us or any third party.
        </p>
      </section>

      <section id="fonts">
        <span className="sec-num">07</span>
        <h2>Google Fonts</h2>
        <p>
          Baaat's pages load typefaces from Google Fonts' stylesheet CDN. These are static font files, not a
          tracking script, and don't set a cookie for advertising or analytics purposes.
        </p>
      </section>

      <section id="managing">
        <span className="sec-num">08</span>
        <h2>Managing cookies</h2>
        <p>
          Because Baaat's only cookies are the ones that keep you signed in, blocking or deleting them will simply
          log you out (or prevent login) on the web app — there's no optional/non-essential cookie to opt out of.
          You can clear cookies for Baaat's site at any time through your browser's settings; you'll need to sign in
          again afterward.
        </p>
      </section>

      <section id="changes">
        <span className="sec-num">09</span>
        <h2>Changes to this policy</h2>
        <p>
          If Baaat starts using cookies for a new purpose (for example, adding an analytics or marketing tool that
          isn't strictly necessary), we'll update this page, add the appropriate cookie categories, and — if
          required by law — add a consent mechanism before that cookie is set.
        </p>
      </section>

      <section id="contact">
        <span className="sec-num">10</span>
        <h2>Contact</h2>
        <p>For questions about this policy:</p>
        <address>
          <p>
            <strong>Email:</strong> <a href="mailto:baaat.app@gmail.com">baaat.app@gmail.com</a>
            <br />
            <strong>App:</strong> Baaat
          </p>
        </address>
        <a className="backtotop" href="#short-answer">↑ Back to top</a>
      </section>
    </LegalLayout>
  )
}
