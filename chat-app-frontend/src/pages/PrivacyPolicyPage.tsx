import { Link } from 'react-router-dom'

// ─── Standalone, publicly-routed privacy policy page. Self-contained styling
// (paper/serif editorial look) that doesn't lean on the app's chat theme. ───
const styles = `
.privacy-page{
  --paper:#faf8f4;
  --paper-raised:#ffffff;
  --ink:#1c1a16;
  --ink-soft:#4a463d;
  --ink-faint:#837c6d;
  --line:#e4ddd0;
  --line-strong:#cfc5b2;
  --accent:#8a5a2b;
  --accent-ink:#ffffff;
  --accent-tint:#f3e6d4;
  --good:#3f6b3f;
  --good-tint:#e7efe2;
  --warn:#8a4a1f;
  --warn-tint:#f7e8d9;
  --no:#8a2f2f;
  --no-tint:#f7e2df;
  --focus:#8a5a2b;

  background:var(--paper);
  color:var(--ink);
  font-family:'Source Serif 4', Georgia, 'Times New Roman', serif;
  font-size:17px;
  line-height:1.6;
  -webkit-font-smoothing:antialiased;
  min-height:100vh;
}
.dark .privacy-page{
  --paper:#171512;
  --paper-raised:#1f1c17;
  --ink:#f1ece1;
  --ink-soft:#c9c0ac;
  --ink-faint:#8f8672;
  --line:#332e26;
  --line-strong:#463f32;
  --accent:#d9a35f;
  --accent-ink:#221a0f;
  --accent-tint:#2c2317;
  --good:#8fbf8a;
  --good-tint:#1d2a1c;
  --warn:#e0a869;
  --warn-tint:#2c2115;
  --no:#e0938c;
  --no-tint:#2c1a18;
  --focus:#d9a35f;
}

.privacy-page *{box-sizing:border-box;}
.privacy-page a{color:var(--accent);}
.privacy-page a:focus-visible, .privacy-page button:focus-visible{
  outline:2px solid var(--focus); outline-offset:3px; border-radius:2px;
}

.privacy-page .masthead{border-bottom:1px solid var(--line); background:var(--paper-raised);}
.privacy-page .masthead-inner{max-width:920px; margin:0 auto; padding:2.6rem 1.75rem 2rem;}
.privacy-page .brandrow{display:flex; align-items:center; gap:.65rem; margin-bottom:1.4rem;}
.privacy-page .mark{
  width:34px; height:34px; border-radius:9px;
  background:var(--accent); color:var(--accent-ink);
  display:flex; align-items:center; justify-content:center;
  font-family:'Archivo',sans-serif; font-weight:800; font-size:1.05rem;
  flex:none;
}
.privacy-page .brandname{font-family:'Archivo',sans-serif; font-weight:700; font-size:1.05rem; letter-spacing:.01em;}
.privacy-page h1{
  font-family:'Archivo',sans-serif; font-weight:800;
  font-size:clamp(1.9rem, 4.4vw, 2.7rem);
  line-height:1.08; letter-spacing:-.01em; margin:0 0 .85rem;
  text-wrap:balance; max-width:16ch;
}
.privacy-page .dek{color:var(--ink-soft); font-size:1.08rem; max-width:56ch; margin:0 0 1.4rem;}
.privacy-page .metarow{
  display:flex; flex-wrap:wrap; gap:.5rem 1.6rem;
  font-family:'IBM Plex Mono', ui-monospace, monospace;
  font-size:.78rem; color:var(--ink-faint); letter-spacing:.02em;
}

.privacy-page .layout{
  max-width:920px; margin:0 auto; padding:0 1.75rem 6rem;
  display:grid; grid-template-columns: 210px minmax(0,1fr); gap:3rem;
}
@media (max-width: 800px){
  .privacy-page .layout{grid-template-columns:1fr; padding-top:1.5rem;}
  .privacy-page nav.toc{display:none;}
}

.privacy-page nav.toc{
  position:sticky; top:1.75rem; align-self:start;
  padding-top:2.4rem; max-height:calc(100vh - 3.5rem); overflow-y:auto;
}
.privacy-page nav.toc .toc-label{
  font-family:'Archivo',sans-serif; font-size:.72rem; font-weight:700;
  text-transform:uppercase; letter-spacing:.09em; color:var(--ink-faint);
  margin-bottom:.75rem;
}
.privacy-page nav.toc ol{list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:.05rem;}
.privacy-page nav.toc a{
  display:block; text-decoration:none; color:var(--ink-soft);
  font-family:'Archivo',sans-serif; font-size:.83rem; font-weight:500;
  padding:.32rem .1rem; border-left:2px solid transparent;
  padding-left:.7rem; margin-left:-.1rem;
}
.privacy-page nav.toc a:hover{color:var(--ink); border-left-color:var(--line-strong);}

.privacy-page main{padding-top:2.4rem; min-width:0;}

.privacy-page .callout{
  display:flex; gap:.85rem; background:var(--accent-tint);
  border:1px solid var(--line); border-radius:10px;
  padding:1.1rem 1.25rem; margin:0 0 2.4rem;
  font-family:'Archivo',sans-serif; font-size:.86rem; line-height:1.55; color:var(--ink-soft);
}
.privacy-page .callout b{color:var(--ink);}

.privacy-page section{padding:2.3rem 0; border-bottom:1px solid var(--line); scroll-margin-top:1.5rem;}
.privacy-page section:last-of-type{border-bottom:none;}

.privacy-page .sec-num{
  font-family:'IBM Plex Mono', ui-monospace, monospace;
  font-size:.78rem; color:var(--accent); letter-spacing:.03em;
  display:block; margin-bottom:.4rem;
}
.privacy-page h2{
  font-family:'Archivo',sans-serif; font-weight:700; font-size:1.4rem;
  letter-spacing:-.005em; margin:0 0 1rem; text-wrap:balance;
}
.privacy-page h3{font-family:'Archivo',sans-serif; font-weight:600; font-size:1.02rem; margin:1.6rem 0 .7rem;}
.privacy-page p{margin:0 0 1rem; max-width:66ch; color:var(--ink-soft);}
.privacy-page p:last-child{margin-bottom:0;}
.privacy-page strong{color:var(--ink); font-weight:600;}

.privacy-page ul{margin:0 0 1rem; padding-left:1.3rem; max-width:64ch; color:var(--ink-soft);}
.privacy-page ul li{margin-bottom:.4rem;}
.privacy-page ul li::marker{color:var(--accent);}

.privacy-page table{border-collapse:collapse; width:100%; margin:0; font-family:'Archivo',sans-serif; font-size:.86rem;}
.privacy-page .tablewrap{overflow-x:auto; margin:1rem 0 1.4rem; border:1px solid var(--line); border-radius:10px;}
.privacy-page th, .privacy-page td{text-align:left; padding:.65rem .85rem; border-bottom:1px solid var(--line); vertical-align:top;}
.privacy-page th{
  background:var(--paper-raised); font-weight:700; font-size:.72rem;
  text-transform:uppercase; letter-spacing:.06em; color:var(--ink-faint);
}
.privacy-page tr:last-child td{border-bottom:none;}
.privacy-page td{color:var(--ink-soft);}
.privacy-page td.who{color:var(--ink); font-weight:600; white-space:nowrap;}

.privacy-page .fact-grid{
  display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
  gap:.85rem; margin:1rem 0 1.4rem;
}
.privacy-page .fact{border:1px solid var(--line); border-radius:10px; padding:.9rem 1rem; background:var(--paper-raised);}
.privacy-page .fact .fk{
  font-family:'Archivo',sans-serif; font-size:.68rem; font-weight:700;
  text-transform:uppercase; letter-spacing:.06em; color:var(--ink-faint); margin-bottom:.35rem;
}
.privacy-page .fact .fv{font-family:'Archivo',sans-serif; font-weight:600; font-size:.92rem; color:var(--ink);}
.privacy-page .fact .fv.no{color:var(--no);}
.privacy-page .fact .fv.yes{color:var(--good);}

.privacy-page .note{
  border-left:3px solid var(--warn); background:var(--warn-tint);
  border-radius:0 8px 8px 0; padding:.85rem 1.1rem; margin:1rem 0;
  font-family:'Archivo',sans-serif; font-size:.85rem; color:var(--ink-soft);
}
.privacy-page .note b{color:var(--ink);}

.privacy-page address{font-style:normal;}

.privacy-page footer{
  max-width:920px; margin:0 auto; padding:0 1.75rem 4rem;
  color:var(--ink-faint); font-size:.82rem; font-family:'Archivo',sans-serif;
}
.privacy-page footer .layout-pad{padding-left:calc(210px + 3rem);}
@media (max-width:800px){.privacy-page footer .layout-pad{padding-left:0;}}

.privacy-page .backtotop{
  display:inline-block; margin-top:1.5rem;
  font-family:'Archivo',sans-serif; font-size:.78rem; font-weight:600;
  color:var(--ink-faint); text-decoration:none;
}
`

const PROVIDERS = [
  { who: 'Cloudinary', what: 'Profile photos, chat images/files, story media you upload', why: 'Media hosting & delivery' },
  { who: 'Brevo', what: 'Your email address and display name', why: 'Sends verification codes, password-reset links, and account emails' },
  { who: 'MongoDB Atlas', what: 'All account, message, and app data described in this policy', why: 'Primary database' },
  { who: 'Render', what: 'API traffic, server logs (including IP address)', why: 'Hosts the backend server' },
  { who: 'Vercel', what: 'Page-load/visit analytics (cookieless, no account linkage)', why: 'Hosts the web app; basic traffic analytics via Vercel Analytics' },
  { who: 'Firebase Cloud Messaging', what: 'A device push token (no message content)', why: "Delivers push notifications to Android devices, via Expo's push service" },
  { who: 'Apple Push Notification service', what: 'A device push token (no message content)', why: "Delivers push notifications to iOS devices, via Expo's push service" },
]

const TOC = [
  ['collect', '1. What we collect'],
  ['messages', '2. Messages & calls'],
  ['thirdparty', '3. Who else touches your data'],
  ['permissions', '4. Device permissions'],
  ['device-storage', '5. On your device'],
  ['hosting', '6. Where data lives'],
  ['security', '7. Security & encryption'],
  ['retention', '8. Retention & deletion'],
  ['children', "9. Children's privacy"],
  ['rights', '10. Your rights'],
  ['changes', '11. Changes to this policy'],
  ['contact', '12. Contact'],
]

export default function PrivacyPolicyPage() {
  return (
    <div className="privacy-page">
      <style>{styles}</style>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600&family=IBM+Plex+Mono:wght@500&display=swap"
      />

      <div className="masthead">
        <div className="masthead-inner">
          <div className="brandrow">
            <div className="mark" aria-hidden="true">B</div>
            <div className="brandname">Baaat</div>
          </div>
          <h1>Privacy Policy</h1>
          <p className="dek">
            A plain account of what Baaat collects, why, where it lives, and what you can do about it — written to
            match what the app actually does, not a generic template.
          </p>
        </div>
      </div>

      <div className="layout">
        <nav className="toc" aria-label="Table of contents">
          <div className="toc-label">Contents</div>
          <ol>
            {TOC.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`}>{label}</a>
              </li>
            ))}
          </ol>
        </nav>

        <main>
          <div className="callout">
            <span aria-hidden="true">🐐</span>
            <span>
              <b>The short version:</b> Baaat stores your display name, email, password (hashed), and the
              messages/media you send, so the app can function. We don't sell data, we don't run ad tracking, and we
              don't collect your location. Message content is <b>not</b> end-to-end encrypted — see §7. Account
              deletion is currently handled by request, not a self-serve button — see §8.
            </span>
          </div>

          <section id="collect">
            <span className="sec-num">01</span>
            <h2>What we collect</h2>
            <p>When you create a Baaat account, we ask for:</p>
            <ul>
              <li><strong>Display name</strong> — shown to other users.</li>
              <li><strong>Email address</strong> — used to log in, verify your account (one-time code), reset your password, and send account-related email. It is not shown to other users.</li>
              <li><strong>Password</strong> — stored only as a salted BCrypt hash. We cannot see or recover your actual password.</li>
            </ul>
            <p>As you use the app, additional profile fields are created and stored, all editable or removable by you:</p>
            <ul>
              <li>Profile photo (uploaded to Cloudinary), bio, status message</li>
              <li>Public @handle (a chosen, changeable username separate from your internal account ID)</li>
              <li>Privacy preferences — who can see your last-seen time, online status, profile photo, and who can message you</li>
              <li>List of users you've blocked</li>
            </ul>
            <p>We also automatically record, for security purposes:</p>
            <ul>
              <li>Account creation and last-active timestamps</li>
              <li>Failed login attempts and temporary lockout state</li>
              <li>IP address and browser/device identifier (User-Agent) at login, logout, and token refresh — used to detect suspicious activity and to let you recognize active sessions</li>
              <li>A security event log (e.g. "password changed," "login from new device") tied to your username and IP address</li>
            </ul>
            <p>
              We do <strong>not</strong> collect your phone number, physical address, government ID, payment
              details, or date of birth — none of these fields exist in Baaat's signup or profile forms.
            </p>
          </section>

          <section id="messages">
            <span className="sec-num">02</span>
            <h2>Messages &amp; calls</h2>
            <p>
              Baaat is a messaging app, so message content is, necessarily, the core thing we store. For every
              message sent in a room or direct conversation, we store:
            </p>
            <ul>
              <li>The message text (indexed so you can search your own chat history)</li>
              <li>Attached media or files (stored on Cloudinary; the message itself holds a link to it)</li>
              <li>Sender, timestamp, and read receipts (who has read the message, and when)</li>
              <li>Edit history state, reactions, replies, forwards, starred/pinned status</li>
              <li>If you set a disappearing-messages timer, the scheduled deletion time</li>
            </ul>
            <p>
              Deleting a message replaces its content with a "this message was deleted" placeholder and flags it as
              deleted — the row itself, and the fact a message once existed there, is not scrubbed from the
              database.
            </p>
            <h3>Voice &amp; video calls</h3>
            <p>
              Calls are peer-to-peer (WebRTC) — the audio/video stream itself does not pass through or get stored on
              our servers. We do store <strong>call metadata</strong>: caller, callee, call type, start/answer/end
              time, and duration, so you have a call history.
            </p>
          </section>

          <section id="thirdparty">
            <span className="sec-num">03</span>
            <h2>Who else touches your data</h2>
            <p>
              Baaat is built on a small number of named infrastructure providers. We don't use ad networks, data
              brokers, or general-purpose analytics/tracking SDKs (no Google Analytics, Mixpanel, Facebook Pixel, or
              similar).
            </p>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr><th>Provider</th><th>What they receive</th><th>Why</th></tr>
                </thead>
                <tbody>
                  {PROVIDERS.map((p) => (
                    <tr key={p.who}>
                      <td className="who">{p.who}</td>
                      <td>{p.what}</td>
                      <td>{p.why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              None of these providers are permitted to use your data for their own advertising or model-training
              purposes under our agreements with them; they process it solely to provide the service listed above.
            </p>
          </section>

          <section id="permissions">
            <span className="sec-num">04</span>
            <h2>Device permissions</h2>
            <p>Baaat requests only the permissions each feature genuinely needs, when you first use that feature:</p>
            <div className="fact-grid">
              <div className="fact"><div className="fk">Camera</div><div className="fv">Requested for video calls only</div></div>
              <div className="fact"><div className="fk">Microphone</div><div className="fv">Requested for voice/video calls only</div></div>
              <div className="fact"><div className="fk">Photo library</div><div className="fv">Requested to attach or save media</div></div>
              <div className="fact"><div className="fk">Notifications</div><div className="fv">Requested for message &amp; call alerts</div></div>
              <div className="fact"><div className="fk">Location</div><div className="fv no">Never requested — Baaat does not use location data</div></div>
            </div>
            <p>
              You can revoke any of these permissions at any time in your device or browser settings; doing so only
              disables the corresponding feature (e.g. revoking microphone access disables voice calls) and does not
              affect the rest of the app.
            </p>
          </section>

          <section id="device-storage">
            <span className="sec-num">05</span>
            <h2>On your device</h2>
            <p>
              Your login session is kept in an <strong>httpOnly cookie</strong> — meaning it is never written to{' '}
              <code>localStorage</code>, never readable by page scripts, and not exposed to third-party scripts
              running on the page. The only things Baaat writes to browser <code>localStorage</code> are
              non-sensitive interface preferences:
            </p>
            <ul>
              <li>Your light/dark theme choice</li>
              <li>Your last-used camera/microphone device, for call setup convenience</li>
            </ul>
            <p>Neither of these identifies you or leaves your device.</p>
          </section>

          <section id="hosting">
            <span className="sec-num">06</span>
            <h2>Where data lives</h2>
            <p>
              Application data (accounts, messages, rooms, calls, security logs) is stored in{' '}
              <strong>MongoDB Atlas</strong>. The backend API runs on <strong>Render</strong>. The web app is served
              from <strong>Vercel</strong>. Uploaded media is stored on <strong>Cloudinary</strong>. These providers
              may process data in data centers outside your home country; each maintains its own security and
              compliance program, and our use of them is governed by their respective data-processing terms.
            </p>
          </section>

          <section id="security">
            <span className="sec-num">07</span>
            <h2>Security &amp; encryption</h2>
            <div className="fact-grid">
              <div className="fact"><div className="fk">In transit</div><div className="fv yes">TLS / HTTPS enforced</div></div>
              <div className="fact"><div className="fk">Passwords</div><div className="fv yes">BCrypt-hashed, never stored in plain text</div></div>
              <div className="fact"><div className="fk">At rest</div><div className="fv">Provider-level encryption (Atlas, Cloudinary) — no app-level encryption layer</div></div>
              <div className="fact"><div className="fk">End-to-end encryption</div><div className="fv no">Not implemented</div></div>
            </div>
            <p>
              We want to be direct about the last point: <strong>Baaat does not use end-to-end encryption.</strong>{' '}
              Message content is transmitted over TLS and stored on our servers in a form our infrastructure can
              access — the same way most mainstream chat apps that offer server-side search, message editing, and
              multi-device sync operate. If your threat model requires E2EE, Baaat is not currently the right tool
              for that content.
            </p>
            <p>
              Session tokens are short-lived and stored in httpOnly, secure cookies. We rate-limit login and
              registration attempts, lock accounts after repeated failed logins, and log security-relevant events
              (logins, password changes, new-device sign-ins) so suspicious activity can be investigated.
            </p>
          </section>

          <section id="retention">
            <span className="sec-num">08</span>
            <h2>Retention &amp; deletion</h2>
            <p>We retain your account and message data for as long as your account is active. Some data has automatic, built-in expiry:</p>
            <ul>
              <li><strong>Disappearing messages</strong> — soft-deleted automatically once the timer you set elapses.</li>
              <li><strong>Stories</strong> — automatically and permanently deleted 24 hours after posting (enforced at the database level).</li>
              <li><strong>Password-reset and email-verification codes</strong> — deleted shortly after use or expiry.</li>
              <li><strong>Expired login sessions</strong> — purged automatically.</li>
            </ul>
            <div className="note">
              <b>Account deletion, honestly stated:</b> Baaat does not yet have a self-serve "delete my account"
              button in the app. To delete your account and associated personal data, email us at the address in §12
              from the address on your account, and we will process the request manually. Deleting a message from
              within the chat replaces its visible content with a placeholder and marks it deleted in our records;
              it is not immediately purged from the database. Full account and message erasure is completed as part
              of a deletion request. We are working toward in-app self-serve deletion.
            </div>
          </section>

          <section id="children">
            <span className="sec-num">09</span>
            <h2>Children's privacy</h2>
            <p>
              Baaat is not directed at, and is not intended for use by, children under the age of 13 (or the
              minimum age required in your country to consent to data processing without parental approval — 16 in
              some jurisdictions covered by GDPR). We do not knowingly collect personal data from children below
              this age. Baaat's signup form does not currently ask for or verify date of birth; if we become aware
              that an account belongs to a child under the applicable minimum age, we will delete that account and
              its associated data. If you believe a child has created an account, contact us using the details in
              §12.
            </p>
          </section>

          <section id="rights">
            <span className="sec-num">10</span>
            <h2>Your rights</h2>
            <p>Depending on where you live, you have rights over your personal data. We honor these for all Baaat users, not just where legally required.</p>

            <h3>If you're in India — Digital Personal Data Protection Act, 2023 (DPDP Act)</h3>
            <p>As a Data Principal under the DPDP Act, you have the right to:</p>
            <ul>
              <li>Obtain a summary of your personal data we hold and the processing activities we carry out on it</li>
              <li>Request correction, completion, or updating of your personal data</li>
              <li>Request erasure of your personal data once it's no longer needed for the purpose it was collected (see §8)</li>
              <li>Nominate another individual to exercise these rights on your behalf in the event of your death or incapacity</li>
              <li>Withdraw consent at any time, and file a complaint with the Data Protection Board of India if unsatisfied with our response</li>
            </ul>

            <h3>If you're in the EU/EEA/UK — General Data Protection Regulation (GDPR)</h3>
            <p>As a data subject, you have the right to:</p>
            <ul>
              <li>Access the personal data we hold about you</li>
              <li>Rectify inaccurate or incomplete data</li>
              <li>Erasure ("right to be forgotten") — see §8 for how account deletion currently works</li>
              <li>Restrict or object to certain processing</li>
              <li>Data portability — receive your data in a structured, machine-readable format</li>
              <li>Lodge a complaint with your local data protection supervisory authority</li>
            </ul>

            <p>To exercise any of the above, contact us at the address in §12. We will respond within the timeframe required by the applicable law (generally 30 days).</p>
          </section>

          <section id="changes">
            <span className="sec-num">11</span>
            <h2>Changes to this policy</h2>
            <p>
              If we materially change what we collect or how we use it, we'll update the effective date at the top
              of this page and, where the change is significant, notify you in-app or by email before it takes
              effect.
            </p>
          </section>

          <section id="contact">
            <span className="sec-num">12</span>
            <h2>Contact</h2>
            <p>For privacy questions, data access/deletion requests, or anything in this policy:</p>
            <address>
              <p>
                <strong>Email:</strong> <a href="mailto:baaat.app@gmail.com">baaat.app@gmail.com</a>
                <br />
                <strong>App:</strong> Baaat
              </p>
            </address>
            <a className="backtotop" href="#collect">↑ Back to top</a>
          </section>
        </main>
      </div>

      <footer>
        <div className="layout-pad">
          © 2026 Baaat. This policy describes Baaat's actual data practices as implemented in the app; it is
          reviewed against the codebase, not written from a template.
          {' · '}
          <Link to="/login" className="hover:underline">Sign in</Link>
        </div>
      </footer>
    </div>
  )
}
