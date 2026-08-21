import LegalLayout from './legal/LegalLayout'

const TOC: [string, string][] = [
  ['acceptance', '1. Acceptance of these terms'],
  ['service', '2. What Baaat is'],
  ['eligibility', '3. Eligibility'],
  ['account', '4. Your account'],
  ['acceptable-use', '5. Acceptable use'],
  ['content', '6. Your content'],
  ['calls', '7. Calls'],
  ['enforcement', '8. Enforcement & account actions'],
  ['availability', '9. Service availability & "as-is" disclaimer'],
  ['liability', '10. Limitation of liability'],
  ['third-party', '11. Third-party services'],
  ['termination', '12. Ending your account'],
  ['changes', '13. Changes to these terms'],
  ['law', '14. Governing law'],
  ['contact', '15. Contact'],
]

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms & Conditions"
      dek="The rules for using Baaat, written to match what the app actually lets you do — not a boilerplate template."
      activePath="/terms"
      toc={TOC}
      calloutIcon="📋"
      calloutBody={
        <>
          <b>The short version:</b> Don't harass, spam, or share illegal content. Your messages and media are
          yours — we just store and transmit them so the app works. We can restrict or terminate accounts that
          break these rules, and you can block anyone at any time. Baaat is provided "as is," with no uptime
          guarantee, and these terms are governed by the laws of India.
        </>
      }
      footerNote={<>© 2026 Baaat. These terms describe Baaat's actual features and moderation tools as implemented in the app.</>}
    >
      <section id="acceptance">
        <span className="sec-num">01</span>
        <h2>Acceptance of these terms</h2>
        <p>
          By creating a Baaat account or using the Baaat web, desktop, or mobile app, you agree to these Terms &amp;
          Conditions and to our <a href="/privacy-policy">Privacy Policy</a> and <a href="/cookie-policy">Cookie
          Policy</a>. If you don't agree, don't use Baaat.
        </p>
      </section>

      <section id="service">
        <span className="sec-num">02</span>
        <h2>What Baaat is</h2>
        <p>Baaat is a messaging app. As implemented today, it lets you:</p>
        <ul>
          <li>Send text messages in group rooms and one-to-one direct messages</li>
          <li>Send voice messages (recorded in-app), images, video, and other files</li>
          <li>Make peer-to-peer voice and video calls (WebRTC)</li>
          <li>Post 24-hour disappearing Stories, visible to your accepted contacts</li>
          <li>Reply in threads, react to, star, forward, and search your messages</li>
          <li>Create and manage group rooms, including adding, removing ("kicking"), and muting members as a room admin</li>
          <li>Block other users, and control who can message you and see your last-seen/online status</li>
          <li>Receive push notifications for new messages and incoming calls</li>
        </ul>
        <p>We may add, change, or remove features over time. This document is kept in sync with what the app actually does.</p>
      </section>

      <section id="eligibility">
        <span className="sec-num">03</span>
        <h2>Eligibility</h2>
        <p>
          You must be at least 13 years old (or the minimum age required in your country to use online services
          without parental consent — 16 in some jurisdictions covered by GDPR) to create a Baaat account. Baaat's
          signup form does not currently ask for or verify your date of birth — by registering, you're confirming
          you meet this age requirement. We reserve the right to remove any account we later determine belongs to
          someone under the applicable minimum age.
        </p>
        <p>You need a valid email address to register. One account per person; you're responsible for keeping your login credentials confidential.</p>
      </section>

      <section id="account">
        <span className="sec-num">04</span>
        <h2>Your account</h2>
        <p>
          Your password is stored as a salted hash — we cannot see or recover it. You're responsible for all
          activity under your account. If you believe your account has been compromised, change your password
          immediately and contact us (see §15).
        </p>
        <p>
          We apply automatic, temporary account lockouts after repeated failed login attempts as an anti-abuse
          measure; this is a security control, not a punitive action, and lifts automatically.
        </p>
      </section>

      <section id="acceptable-use">
        <span className="sec-num">05</span>
        <h2>Acceptable use</h2>
        <p>When using Baaat, you agree not to:</p>
        <ul>
          <li>Harass, threaten, bully, or abuse other users</li>
          <li>Send spam, unsolicited bulk messages, or use Baaat for phishing</li>
          <li>Upload, send, or share illegal content, or content that infringes someone else's intellectual property or privacy</li>
          <li>Impersonate another person or misrepresent your affiliation with anyone</li>
          <li>Attempt to bypass rate limits, security controls, or access another user's account without authorization</li>
          <li>Use automated tools (bots, scrapers) against Baaat's API outside of what the app itself does</li>
        </ul>
        <p>
          If someone violates these rules, you can <strong>block</strong> them (they immediately lose the ability to
          message you or see your presence), and, in a group room, a <strong>room admin</strong> can remove or mute
          them. Baaat does not currently have an in-app "report user" button; to report abuse for us to review,
          email us at the address in §15 with as much detail as you can (usernames, room/conversation, and what
          happened).
        </p>
      </section>

      <section id="content">
        <span className="sec-num">06</span>
        <h2>Your content</h2>
        <p>
          You own the messages, voice notes, images, videos, and files you send through Baaat ("your content"). We
          don't claim ownership of it.
        </p>
        <p>
          To make the app work, you grant Baaat a limited, non-exclusive license to store, copy, transmit, and
          display your content — for example, saving a message to the database, hosting an uploaded image on
          Cloudinary, and delivering it to the room members or DM recipient you sent it to. This license exists only
          to operate the service; we don't use your content for advertising, and we don't sell it.
        </p>
        <p>
          Deleting a message replaces it with a "this message was deleted" placeholder in the conversation; per our{' '}
          <a href="/privacy-policy">Privacy Policy</a> §2 and §8, the underlying record isn't immediately purged
          from our database. You're responsible for having the right to share any content you send — don't upload
          anything you don't have permission to share.
        </p>
      </section>

      <section id="calls">
        <span className="sec-num">07</span>
        <h2>Calls</h2>
        <p>
          Voice and video calls are peer-to-peer using WebRTC — the audio/video stream itself is not routed through
          or stored on Baaat's servers. We do store call metadata (who called whom, call type, timestamps, and
          duration) so you have a call history. Call quality depends on both parties' network conditions and is not
          guaranteed.
        </p>
      </section>

      <section id="enforcement">
        <span className="sec-num">08</span>
        <h2>Enforcement &amp; account actions</h2>
        <p>
          We want to be direct about how enforcement actually works today, rather than describe tooling that
          doesn't exist yet:
        </p>
        <div className="fact-grid">
          <div className="fact"><div className="fk">User blocking</div><div className="fv yes">In-app, immediate, reversible by you</div></div>
          <div className="fact"><div className="fk">Room admin kick/mute</div><div className="fv yes">In-app, for group rooms</div></div>
          <div className="fact"><div className="fk">In-app content reporting</div><div className="fv no">Not built yet — email us instead</div></div>
          <div className="fact"><div className="fk">Automated account bans</div><div className="fv no">Not built yet — handled manually</div></div>
        </div>
        <p>
          We reserve the right to suspend, restrict, or permanently terminate any account that violates §5
          (Acceptable use) or these terms generally, or that we reasonably believe poses a risk to other users or to
          Baaat. Because there is no automated moderation system, enforcement today is a manual process initiated
          from a report we receive (email, §15) — we investigate before acting, and we'll tell you why if we
          restrict your account, except where doing so would itself create a safety risk (e.g. tipping off someone
          engaged in abuse).
        </p>
      </section>

      <section id="availability">
        <span className="sec-num">09</span>
        <h2>Service availability &amp; "as-is" disclaimer</h2>
        <p>
          Baaat is provided <strong>"as is" and "as available,"</strong> without warranties of any kind, express or
          implied, including implied warranties of merchantability, fitness for a particular purpose, or
          non-infringement. We don't guarantee that the service will be uninterrupted, secure, or error-free.
        </p>
        <p>
          In particular: Baaat's backend runs on a free/low-cost hosting tier that can "cold start" — the first
          request after a period of inactivity may take 30–70 seconds. Message delivery, calls, and push
          notifications depend on third-party infrastructure (see §11) that is outside our control. We're not
          liable for outages, data loss from third-party providers, or missed messages/calls/notifications caused by
          network conditions, device settings, or provider downtime.
        </p>
      </section>

      <section id="liability">
        <span className="sec-num">10</span>
        <h2>Limitation of liability</h2>
        <p>
          To the maximum extent permitted by applicable law, Baaat and its operator will not be liable for any
          indirect, incidental, special, consequential, or punitive damages, or any loss of data, revenue, or
          goodwill, arising out of or related to your use of (or inability to use) the service — even if we've been
          advised of the possibility of such damages.
        </p>
        <p>
          Nothing in these terms excludes or limits liability that cannot be excluded or limited under applicable
          law (for example, liability for fraud or for death or personal injury caused by negligence).
        </p>
      </section>

      <section id="third-party">
        <span className="sec-num">11</span>
        <h2>Third-party services</h2>
        <p>
          Baaat relies on named third-party infrastructure providers (Cloudinary, Brevo, MongoDB Atlas, Render,
          Vercel, Firebase Cloud Messaging, Apple Push Notification service) to operate. See{' '}
          <a href="/privacy-policy">Privacy Policy</a> §3 for the full list and what each one handles. Your use of
          Baaat is also subject to the availability and terms of these providers.
        </p>
      </section>

      <section id="termination">
        <span className="sec-num">12</span>
        <h2>Ending your account</h2>
        <p>
          You can stop using Baaat at any time. Baaat does not yet have a self-serve "delete my account" button in
          the app; to close your account and have your personal data deleted, email us at the address in §15 from
          the address on your account — see <a href="/privacy-policy">Privacy Policy</a> §8 for exactly what
          happens to your data on deletion.
        </p>
      </section>

      <section id="changes">
        <span className="sec-num">13</span>
        <h2>Changes to these terms</h2>
        <p>
          We may update these terms as the app changes. If we make a material change, we'll update the effective
          date at the top of this page and, where the change is significant, notify you in-app or by email before
          it takes effect. Continuing to use Baaat after a change takes effect means you accept the updated terms.
        </p>
      </section>

      <section id="law">
        <span className="sec-num">14</span>
        <h2>Governing law</h2>
        <p>
          These terms are governed by, and construed in accordance with, the laws of India, without regard to
          conflict-of-law principles. Any dispute arising out of or relating to these terms or your use of Baaat
          will be subject to the exclusive jurisdiction of the courts of India.
        </p>
      </section>

      <section id="contact">
        <span className="sec-num">15</span>
        <h2>Contact</h2>
        <p>For questions about these terms, to report abuse, or to request account deletion:</p>
        <address>
          <p>
            <strong>Email:</strong> <a href="mailto:baaat.app@gmail.com">baaat.app@gmail.com</a>
            <br />
            <strong>App:</strong> Baaat
          </p>
        </address>
        <a className="backtotop" href="#acceptance">↑ Back to top</a>
      </section>
    </LegalLayout>
  )
}
