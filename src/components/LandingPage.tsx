import "@/landing.css";
import screenshotUrl from "../../landing/assets/screenshot.svg";

interface LandingPageProps {
  onLaunchApp: () => void;
}

export function LandingPage({ onLaunchApp }: LandingPageProps) {
  return (
    <div className="landing-body min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo">
            <svg className="nav-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
            </svg>
            <span>Vault Drop</span>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <button
              onClick={onLaunchApp}
              className="text-slate-400 hover:text-slate-200 transition-colors font-medium text-sm bg-transparent border-none cursor-pointer"
            >
              Launch Web App
            </button>
            <a href="https://github.com/tildemark/vault-drop-explorer" target="_blank" rel="noopener">GitHub</a>
          </div>
          <a href="https://github.com/tildemark/vault-drop-explorer/releases/latest/download/Vault.Drop.Explorer_1.0.0_x64-setup.exe"
             className="nav-cta"
             id="nav-download">
            Download
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1"></div>
          <div className="hero-orb hero-orb-2"></div>
          <div className="hero-grid"></div>
        </div>

        <div className="hero-inner">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            Free &amp; Open Source · v1.0.0
          </div>

          <h1 className="hero-title">
            Drop files to the cloud.<br />
            <span className="hero-gradient">No typing required.</span>
          </h1>

          <p className="hero-subtitle">
            A lightweight desktop app for AWS S3 and OCI Object Storage.
            Select your region, click Connect — your buckets appear instantly.
            Upload and download with native OS file dialogs.
          </p>

          <div className="hero-actions">
            <a href="https://github.com/tildemark/vault-drop-explorer/releases/latest/download/Vault.Drop.Explorer_1.0.0_x64-setup.exe"
               className="btn btn-primary"
               id="hero-download">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download for Windows
              <span className="btn-label">.exe · 64-bit</span>
            </a>
            <button
              onClick={onLaunchApp}
              className="btn btn-ghost"
              id="hero-launch-app"
            >
              Launch Web App
            </button>
          </div>

          <div className="hero-platforms">
            <svg viewBox="0 0 24 24" fill="currentColor" className="platform-icon"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/></svg>
            <span>Windows 10 / 11</span>
            <span className="sep">·</span>
            <span>macOS coming soon</span>
            <span className="sep">·</span>
            <span>Linux coming soon</span>
          </div>
        </div>

        {/* App screenshot */}
        <div className="hero-screenshot-wrapper">
          <div className="screenshot-frame">
            <div className="screenshot-bar">
              <span className="dot dot-red"></span>
              <span className="dot dot-yellow"></span>
              <span className="dot dot-green"></span>
              <span className="frame-title">Vault Drop Explorer</span>
            </div>
            <img src={screenshotUrl} alt="Vault Drop Explorer app interface" className="screenshot-img" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features" id="features">
        <div className="landing-container">
          <div className="section-label">Features</div>
          <h2 className="section-title">Everything you need, nothing you don't</h2>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
                </svg>
              </div>
              <h3>Dual Cloud</h3>
              <p>Switch between Amazon S3 and Oracle Cloud Infrastructure Object Storage with a single click.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h3>Zero-Config Auth</h3>
              <p>Reads directly from <code>~/.aws/credentials</code>. Your keys never leave your machine.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              </div>
              <h3>No Typing Required</h3>
              <p>All AWS and OCI regions pre-populated. Select your region and OCI endpoint auto-fills.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <h3>Native OS Dialogs</h3>
              <p>Upload and download use your system's native file picker — secure and familiar.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <h3>Live Bucket Browser</h3>
              <p>Connect and your buckets appear as clickable tiles. Browse objects in a file-explorer view.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
                </svg>
              </div>
              <h3>Tiny Footprint</h3>
              <p>Built with Tauri v2 — under 10 MB, no bundled browser engine. Pure Rust backend.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works" id="how-it-works">
        <div className="landing-container">
          <div className="section-label">How it works</div>
          <h2 className="section-title">Up and running in 3 steps</h2>

          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-body">
                <h3>Configure credentials once</h3>
                <p>Add your AWS or OCI keys to <code>~/.aws/credentials</code>. The app reads them automatically — no UI setup needed.</p>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '12px' }}>
                  <a href="https://docs.aws.amazon.com/powershell/latest/userguide/pstools-appendix-sign-up.html" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors underline" style={{ color: '#818cf8', textDecoration: 'underline' }}>
                    How to setup AWS Account &amp; Keys
                  </a>
                  <span style={{ color: '#475569' }}>|</span>
                  <a href="https://docs.oracle.com/en-us/iaas/Content/Identity/Tasks/managingcredentials.htm#working_with_customer_secret_keys" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors underline" style={{ color: '#818cf8', textDecoration: 'underline' }}>
                    How to setup OCI Account &amp; Keys
                  </a>
                </div>
                <pre className="code-block"><span className="code-comment"># ~/.aws/credentials</span>
<span className="code-section">[default]</span>
aws_access_key_id = AKIA...
aws_secret_access_key = ...

<span className="code-section">[oci]</span>
aws_access_key_id = &lt;OCI Customer Secret Key ID&gt;
aws_secret_access_key = &lt;OCI Customer Secret Key&gt;</pre>
              </div>
            </div>

            <div className="step">
              <div className="step-number">2</div>
              <div className="step-body">
                <h3>Select your provider &amp; region</h3>
                <p>Pick the AWS or OCI tab, choose your region from the dropdown. For OCI, the S3-compatible endpoint auto-fills — just enter your tenancy namespace.</p>
              </div>
            </div>

            <div className="step">
              <div className="step-number">3</div>
              <div className="step-body">
                <h3>Browse, upload &amp; download</h3>
                <p>Click <strong>Connect</strong> — your buckets appear. Click a bucket to browse its objects. Hover over any file to reveal the download button, or click Upload to pick a local file via your OS dialog.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="landing-container">
          <div className="cta-card">
            <div className="cta-orb"></div>
            <h2>Ready to drop some files?</h2>
            <p>Free, open-source, and built for developers who work with object storage every day.</p>
            <a href="https://github.com/tildemark/vault-drop-explorer/releases/latest/download/Vault.Drop.Explorer_1.0.0_x64-setup.exe"
               className="btn btn-primary btn-large"
               id="cta-download">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download Vault Drop Explorer
            </a>
            <p className="cta-sub">Windows 64-bit · Free forever · No telemetry</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="landing-container footer-inner">
          <div className="footer-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
            </svg>
            Vault Drop Explorer
          </div>
          <div className="footer-links">
            <a href="https://github.com/tildemark/vault-drop-explorer" target="_blank" rel="noopener">GitHub</a>
            <a href="https://github.com/tildemark/vault-drop-explorer/releases" target="_blank" rel="noopener">Releases</a>
            <a href="https://github.com/tildemark/vault-drop-explorer/issues" target="_blank" rel="noopener">Issues</a>
          </div>
          <p className="footer-copy">MIT License · Built with Tauri, Rust &amp; React</p>
        </div>
      </footer>
    </div>
  );
}
