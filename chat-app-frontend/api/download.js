/**
 * /api/download?platform=win|mac|linux
 *
 * Acts as a stable download redirect endpoint.
 * The actual file lives on GitHub Releases, but users always hit
 * baaat.vercel.app/api/download?platform=win — a URL you own and control.
 *
 * To release a new version:
 *   1. Upload the new build to GitHub Releases
 *   2. Update VERSION below
 *   3. Redeploy (git push) — done
 */

const VERSION = '1.0.0'
const GITHUB = 'https://github.com/BhawaniSingh02/BChat/releases/download'

const RELEASE_URLS = {
  win:   `${GITHUB}/v${VERSION}/Baaat-Setup-${VERSION}.exe`,
  mac:   `${GITHUB}/v${VERSION}/Baaat-${VERSION}.dmg`,
  linux: `${GITHUB}/v${VERSION}/Baaat-${VERSION}.AppImage`,
}

export default function handler(req, res) {
  const platform = req.query.platform?.toLowerCase()

  if (!platform || !RELEASE_URLS[platform]) {
    return res.status(400).json({
      error: 'Invalid platform. Use: win, mac, linux',
      available: Object.keys(RELEASE_URLS),
    })
  }

  // 302 redirect — browser follows it and starts the download
  res.redirect(302, RELEASE_URLS[platform])
}
