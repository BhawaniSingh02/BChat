import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

// ─── Shared shell for the standalone, publicly-routed legal pages (Privacy
// Policy, Terms & Conditions, Cookie Policy). Self-contained paper/serif
// styling that doesn't lean on the app's chat theme, so it reads well as a
// document, not a settings panel. ───────────────────────────────────────────
export const legalStyles = `
.legal-page{
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
.dark .legal-page{
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

.legal-page *{box-sizing:border-box;}
.legal-page a{color:var(--accent);}
.legal-page a:focus-visible, .legal-page button:focus-visible{
  outline:2px solid var(--focus); outline-offset:3px; border-radius:2px;
}

.legal-page .masthead{border-bottom:1px solid var(--line); background:var(--paper-raised);}
.legal-page .masthead-inner{max-width:920px; margin:0 auto; padding:2.6rem 1.75rem 2rem;}
.legal-page .brandrow{display:flex; align-items:center; justify-content:space-between; gap:.65rem; margin-bottom:1.4rem;}
.legal-page .brandrow-left{display:flex; align-items:center; gap:.65rem;}
.legal-page .mark{
  width:34px; height:34px; border-radius:9px;
  background:var(--accent); color:var(--accent-ink);
  display:flex; align-items:center; justify-content:center;
  font-family:'Archivo',sans-serif; font-weight:800; font-size:1.05rem;
  flex:none;
}
.legal-page .brandname{font-family:'Archivo',sans-serif; font-weight:700; font-size:1.05rem; letter-spacing:.01em;}
.legal-page .legal-nav{display:flex; gap:1.1rem; font-family:'Archivo',sans-serif; font-size:.8rem; font-weight:600;}
.legal-page .legal-nav a{color:var(--ink-faint); text-decoration:none;}
.legal-page .legal-nav a:hover, .legal-page .legal-nav a.active{color:var(--accent);}
.legal-page h1{
  font-family:'Archivo',sans-serif; font-weight:800;
  font-size:clamp(1.9rem, 4.4vw, 2.7rem);
  line-height:1.08; letter-spacing:-.01em; margin:0 0 .85rem;
  text-wrap:balance; max-width:20ch;
}
.legal-page .dek{color:var(--ink-soft); font-size:1.08rem; max-width:56ch; margin:0 0 1.4rem;}
.legal-page .metarow{
  display:flex; flex-wrap:wrap; gap:.5rem 1.6rem;
  font-family:'IBM Plex Mono', ui-monospace, monospace;
  font-size:.78rem; color:var(--ink-faint); letter-spacing:.02em;
}

.legal-page .layout{
  max-width:920px; margin:0 auto; padding:0 1.75rem 6rem;
  display:grid; grid-template-columns: 210px minmax(0,1fr); gap:3rem;
}
@media (max-width: 800px){
  .legal-page .layout{grid-template-columns:1fr; padding-top:1.5rem;}
  .legal-page nav.toc{display:none;}
}

.legal-page nav.toc{
  position:sticky; top:1.75rem; align-self:start;
  padding-top:2.4rem; max-height:calc(100vh - 3.5rem); overflow-y:auto;
}
.legal-page nav.toc .toc-label{
  font-family:'Archivo',sans-serif; font-size:.72rem; font-weight:700;
  text-transform:uppercase; letter-spacing:.09em; color:var(--ink-faint);
  margin-bottom:.75rem;
}
.legal-page nav.toc ol{list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:.05rem;}
.legal-page nav.toc a{
  display:block; text-decoration:none; color:var(--ink-soft);
  font-family:'Archivo',sans-serif; font-size:.83rem; font-weight:500;
  padding:.32rem .1rem; border-left:2px solid transparent;
  padding-left:.7rem; margin-left:-.1rem;
}
.legal-page nav.toc a:hover{color:var(--ink); border-left-color:var(--line-strong);}

.legal-page main{padding-top:2.4rem; min-width:0;}

.legal-page .callout{
  display:flex; gap:.85rem; background:var(--accent-tint);
  border:1px solid var(--line); border-radius:10px;
  padding:1.1rem 1.25rem; margin:0 0 2.4rem;
  font-family:'Archivo',sans-serif; font-size:.86rem; line-height:1.55; color:var(--ink-soft);
}
.legal-page .callout b{color:var(--ink);}

.legal-page section{padding:2.3rem 0; border-bottom:1px solid var(--line); scroll-margin-top:1.5rem;}
.legal-page section:last-of-type{border-bottom:none;}

.legal-page .sec-num{
  font-family:'IBM Plex Mono', ui-monospace, monospace;
  font-size:.78rem; color:var(--accent); letter-spacing:.03em;
  display:block; margin-bottom:.4rem;
}
.legal-page h2{
  font-family:'Archivo',sans-serif; font-weight:700; font-size:1.4rem;
  letter-spacing:-.005em; margin:0 0 1rem; text-wrap:balance;
}
.legal-page h3{font-family:'Archivo',sans-serif; font-weight:600; font-size:1.02rem; margin:1.6rem 0 .7rem;}
.legal-page p{margin:0 0 1rem; max-width:66ch; color:var(--ink-soft);}
.legal-page p:last-child{margin-bottom:0;}
.legal-page strong{color:var(--ink); font-weight:600;}

.legal-page ul, .legal-page ol.plain{margin:0 0 1rem; padding-left:1.3rem; max-width:64ch; color:var(--ink-soft);}
.legal-page ul li, .legal-page ol.plain li{margin-bottom:.4rem;}
.legal-page ul li::marker{color:var(--accent);}

.legal-page table{border-collapse:collapse; width:100%; margin:0; font-family:'Archivo',sans-serif; font-size:.86rem;}
.legal-page .tablewrap{overflow-x:auto; margin:1rem 0 1.4rem; border:1px solid var(--line); border-radius:10px;}
.legal-page th, .legal-page td{text-align:left; padding:.65rem .85rem; border-bottom:1px solid var(--line); vertical-align:top;}
.legal-page th{
  background:var(--paper-raised); font-weight:700; font-size:.72rem;
  text-transform:uppercase; letter-spacing:.06em; color:var(--ink-faint);
}
.legal-page tr:last-child td{border-bottom:none;}
.legal-page td{color:var(--ink-soft);}
.legal-page td.who{color:var(--ink); font-weight:600; white-space:nowrap;}

.legal-page .fact-grid{
  display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
  gap:.85rem; margin:1rem 0 1.4rem;
}
.legal-page .fact{border:1px solid var(--line); border-radius:10px; padding:.9rem 1rem; background:var(--paper-raised);}
.legal-page .fact .fk{
  font-family:'Archivo',sans-serif; font-size:.68rem; font-weight:700;
  text-transform:uppercase; letter-spacing:.06em; color:var(--ink-faint); margin-bottom:.35rem;
}
.legal-page .fact .fv{font-family:'Archivo',sans-serif; font-weight:600; font-size:.92rem; color:var(--ink);}
.legal-page .fact .fv.no{color:var(--no);}
.legal-page .fact .fv.yes{color:var(--good);}

.legal-page .note{
  border-left:3px solid var(--warn); background:var(--warn-tint);
  border-radius:0 8px 8px 0; padding:.85rem 1.1rem; margin:1rem 0;
  font-family:'Archivo',sans-serif; font-size:.85rem; color:var(--ink-soft);
}
.legal-page .note b{color:var(--ink);}
.legal-page .note.good{border-left-color:var(--good); background:var(--good-tint);}

.legal-page address{font-style:normal;}

.legal-page footer{
  max-width:920px; margin:0 auto; padding:0 1.75rem 4rem;
  color:var(--ink-faint); font-size:.82rem; font-family:'Archivo',sans-serif;
}
.legal-page footer .layout-pad{padding-left:calc(210px + 3rem);}
@media (max-width:800px){.legal-page footer .layout-pad{padding-left:0;}}

.legal-page .backtotop{
  display:inline-block; margin-top:1.5rem;
  font-family:'Archivo',sans-serif; font-size:.78rem; font-weight:600;
  color:var(--ink-faint); text-decoration:none;
}
`

const LEGAL_NAV = [
  { to: '/privacy-policy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms & Conditions' },
  { to: '/cookie-policy', label: 'Cookie Policy' },
]

interface LegalLayoutProps {
  title: string
  dek: string
  toc: [string, string][]
  calloutIcon: string
  calloutBody: ReactNode
  footerNote: ReactNode
  activePath: string
  children: ReactNode
}

export default function LegalLayout({ title, dek, toc, calloutIcon, calloutBody, footerNote, activePath, children }: LegalLayoutProps) {
  return (
    <div className="legal-page">
      <style>{legalStyles}</style>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600&family=IBM+Plex+Mono:wght@500&display=swap"
      />

      <div className="masthead">
        <div className="masthead-inner">
          <div className="brandrow">
            <div className="brandrow-left">
              <div className="mark" aria-hidden="true">B</div>
              <div className="brandname">Baaat</div>
            </div>
            <nav className="legal-nav" aria-label="Legal pages">
              {LEGAL_NAV.map((item) => (
                <Link key={item.to} to={item.to} className={item.to === activePath ? 'active' : ''}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <h1>{title}</h1>
          <p className="dek">{dek}</p>
        </div>
      </div>

      <div className="layout">
        <nav className="toc" aria-label="Table of contents">
          <div className="toc-label">Contents</div>
          <ol>
            {toc.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`}>{label}</a>
              </li>
            ))}
          </ol>
        </nav>

        <main>
          <div className="callout">
            <span aria-hidden="true">{calloutIcon}</span>
            <span>{calloutBody}</span>
          </div>

          {children}
        </main>
      </div>

      <footer>
        <div className="layout-pad">{footerNote}</div>
      </footer>
    </div>
  )
}
