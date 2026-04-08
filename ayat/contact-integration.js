/**
 * Contact Integration Module
 *
 * This module provides contact functionality for the 3D tour application,
 * reading all contact info from window.BRAND (loaded from brand-config.json).
 *
 * Usage:
 *   - Contact.open() - Open contact modal
 *   - Contact.call(number) - Initiate phone call
 *   - Contact.email() - Open email client
 *   - Contact.whatsapp() - Open WhatsApp chat
 *   - Contact.share() - Share via Web Share API
 */

const ContactConfig = {
  get company() {
    const b = (window.BRAND && window.BRAND.brand) || {};
    return {
      name: b.companyName || 'Company',
      fullName: b.companyName || 'Company',
      website: (window.BRAND.contact && window.BRAND.contact.website) || ''
    };
  },
  get contact() {
    return (window.BRAND && window.BRAND.contact) || { phones: [], emails: [], whatsapp: {}, social: {} };
  },
  get displaySettings() {
    return (window.BRAND && window.BRAND.displaySettings) || {};
  },
  get ui() {
    return (window.BRAND && window.BRAND.ui) || {};
  },
  get contactForm() {
    return (window.BRAND && window.BRAND.contactForm) || { fields: [], submitButton: { label: 'Send' } };
  }
};

const Contact = {
  modal: null,

  /**
   * Initialize contact modal
   */
  init() {
    if (this.modal) return;

    this.modal = document.createElement('div');
    this.modal.id = 'contact-modal';
    this.modal.className = 'contact-modal';
    this.modal.innerHTML = this.renderModal();
    document.body.appendChild(this.modal);

    this.bindEvents();
  },

  /**
   * Render modal HTML
   */
  renderModal() {
    const cfg = ContactConfig;
    const contact = cfg.contact;
    const company = cfg.company;
    const location = (window.BRAND && window.BRAND.contact && window.BRAND.contact.address) || '';
    const socials = Object.values(contact.social || {}).filter(s => s && s.enabled);
    const ui = cfg.ui;
    const contactLabels = ui.contact || {};
    const formCfg = cfg.contactForm;
    const formFields = formCfg.fields || [];
    const submitLabel = formCfg.submitButton?.label || 'Send Message';
    const brandLogo = (window.BRAND && window.BRAND.brand && window.BRAND.brand.logo) || '';

    return `
      <div class="cm-overlay" onclick="Contact.close()"></div>
      <div class="cm-content">
        <div class="cm-header">
          <div class="cm-logo">${brandLogo ? `<img src="${brandLogo}" alt="${company.name}">` : '🏢'}</div>
          <div class="cm-title">
            <h3>${company.name}</h3>
            <p>${location}</p>
          </div>
          <button class="cm-close" onclick="Contact.close()">✕</button>
        </div>

        <div class="cm-body">
          <!-- Quick Actions -->
          <div class="cm-quick-actions">
            ${(contact.phones || []).filter(p => p.primary).map(p => `
              <button class="cm-action-btn primary" onclick="Contact.call('${p.value}')">
                📞 ${contactLabels.callNow || 'Call Now'}
              </button>
            `).join('')}
            <button class="cm-action-btn" onclick="Contact.whatsapp()">
              💬 ${contactLabels.whatsappLabel || 'WhatsApp'}
            </button>
            <button class="cm-action-btn" onclick="Contact.email()">
              📧 ${contactLabels.emailLabel || 'Email'}
            </button>
            <button class="cm-action-btn" onclick="Contact.share()">
              📤 ${contactLabels.shareLabel || 'Share'}
            </button>
          </div>

          <!-- Phone Numbers -->
          ${cfg.contact.phones && cfg.contact.phones.length > 0 ? `
          <div class="cm-section">
            <h4>📞 ${contactLabels.sectionPhones || 'Phone Numbers'}</h4>
            <div class="cm-phones">
              ${cfg.contact.phones.map(p => `
                <div class="cm-phone-item" onclick="Contact.call('${p.value}')">
                  <div class="cm-phone-label">${p.label}${p.primary ? ' ⭐' : ''}</div>
                  <div class="cm-phone-value">${p.display}</div>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          <!-- Email -->
          ${cfg.contact.emails && cfg.contact.emails.length > 0 ? `
          <div class="cm-section">
            <h4>📧 ${contactLabels.sectionEmail || 'Email'}</h4>
            <div class="cm-email-item" onclick="Contact.email()">
              <div class="cm-email-label">${cfg.contact.emails[0].label}</div>
              <div class="cm-email-value">${cfg.contact.emails[0].value}</div>
            </div>
          </div>
          ` : ''}

          <!-- WhatsApp -->
          ${cfg.contact.whatsapp.enabled ? `
          <div class="cm-section">
            <h4>💬 ${contactLabels.sectionWhatsApp || 'WhatsApp'}</h4>
            <div class="cm-whatsapp-item" onclick="Contact.whatsapp()">
              <div class="cm-wa-label">${contactLabels.chatWithUs || 'Chat with us'}</div>
              <div class="cm-wa-value">${cfg.contact.whatsapp.display}</div>
            </div>
          </div>
          ` : ''}

          <!-- Social Media -->
          ${socials.length > 0 ? `
          <div class="cm-section">
            <h4>🌐 ${contactLabels.sectionSocial || 'Follow Us'}</h4>
            <div class="cm-social">
              ${socials.map(s => {
                const platform = Contact.getSocialKey(s);
                return `
                <a class="cm-social-link" href="${s.url}" target="_blank" rel="noopener" data-platform="${platform}">
                  <span class="cm-social-icon">${Contact.getSocialIcon(platform)}</span>
                  <span>${s.handle}</span>
                </a>`;
              }).join('')}
            </div>
          </div>
          ` : ''}

          <!-- Contact Form -->
          ${formFields.length > 0 ? `
          <div class="cm-section">
            <h4>📝 ${contactLabels.sectionForm || 'Send Message'}</h4>
            <form class="cm-form" onsubmit="Contact.submitForm(event)">
              ${formFields.map(f => {
                const tag = f.type === 'textarea' ? 'textarea' : 'input';
                const attrs = f.type !== 'textarea'
                  ? `type="${f.type}" name="${f.name}" placeholder="${f.placeholder || ''}" ${f.required ? 'required' : ''} class="cm-input"`
                  : `name="${f.name}" placeholder="${f.placeholder || ''}" ${f.required ? 'required' : ''} class="cm-textarea" rows="4"`;
                return `<div class="cm-form-group"><${tag} ${attrs}></${tag}></div>`;
              }).join('')}
              <button type="submit" class="cm-submit-btn">
                📤 ${submitLabel}
              </button>
            </form>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  },
  
  /**
   * Get social media SVG icon
   */
  getSocialIcon(platform) {
    const icons = {
      facebook: `<svg viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
      instagram: `<svg viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
      youtube: `<svg viewBox="0 0 24 24" fill="white"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
      tiktok: `<svg viewBox="0 0 24 24" fill="white"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`,
      linkedin: `<svg viewBox="0 0 24 24" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
      twitter: `<svg viewBox="0 0 24 24" fill="white"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>`,
      telegram: `<svg viewBox="0 0 24 24" fill="white"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`
    };
    return icons[platform] || `<svg viewBox="0 0 24 24" fill="white"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7a5 5 0 000 10h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4a5 5 0 000-10z"/></svg>`;
  },

  /**
   * Get social media platform key
   */
  getSocialKey(social) {
    const platforms = ['facebook', 'instagram', 'youtube', 'tiktok', 'linkedin', 'twitter', 'telegram'];
    return platforms.find(p => social.url && social.url.includes(p)) || 'facebook';
  },
  
  /**
   * Bind event listeners
   */
  bindEvents() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal?.classList.contains('open')) {
        this.close();
      }
    });
  },
  
  /**
   * Open contact modal
   */
  open() {
    if (!this.modal) this.init();
    this.modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  },
  
  /**
   * Close contact modal
   */
  close() {
    this.modal?.classList.remove('open');
    document.body.style.overflow = '';
  },
  
  /**
   * Initiate phone call
   */
  call(number) {
    window.location.href = `tel:${number}`;
  },
  
  /**
   * Open email client
   */
  email() {
    const cfg = ContactConfig.contact;
    const subject = encodeURIComponent(`Inquiry about ${ContactConfig.company.name}`);
    const body = encodeURIComponent(`Hello ${ContactConfig.company.name},\n\nI am interested in learning more about your properties.\n\nThank you!`);
    window.location.href = `${cfg.emails[0].mailto}?subject=${subject}&body=${body}`;
  },
  
  /**
   * Open WhatsApp chat
   */
  whatsapp() {
    const cfg = ContactConfig.contact.whatsapp;
    const number = cfg.number.replace(/\+/g, '');
    const message = encodeURIComponent(cfg.message);
    window.open(`https://wa.me/${number}?text=${message}`, '_blank');
  },
  
  /**
   * Share via Web Share API
   */
  share() {
    const cfg = ContactConfig;
    const shareData = {
      title: cfg.company.name,
      text: `Check out ${cfg.company.fullName}`,
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData).catch(console.error);
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href).then(() => {
        const msg = getBrandMsg ? getBrandMsg('share.linkCopied', 'Link copied!') : 'Link copied!';
        alert(msg);
      });
    }
  },

  /**
   * Submit contact form
   */
  async submitForm(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      message: formData.get('message')
    };

    // Show loading state
    const btn = form.querySelector('.cm-submit-btn');
    const originalText = btn.textContent;
    btn.textContent = '⏳ Sending...';
    btn.disabled = true;

    try {
      // TODO: Replace with actual API endpoint
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const successMsg = getBrandMsg ? getBrandMsg('contact.messageSuccess', 'Message sent successfully!') : 'Message sent successfully!';
      alert('✅ ' + successMsg);
      form.reset();
      this.close();
    } catch (error) {
      const errMsg = getBrandMsg ? getBrandMsg('contact.messageError', 'Error sending message. Please try again.') : 'Error sending message. Please try again.';
      alert('❌ ' + errMsg);
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  }
};

// Add styles
const contactStyles = document.createElement('style');
contactStyles.textContent = `
  /* Contact Modal */
  .contact-modal {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 10px;
  }
  .contact-modal.open {
    display: flex;
  }
  .cm-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
  }
  .cm-content {
    position: relative;
    width: 100%;
    max-width: 480px;
    max-height: calc(100vh - 20px);
    background: #fff;
    border-radius: 18px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    animation: scaleIn 0.3s ease;
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.94); }
    to { opacity: 1; transform: scale(1); }
  }
  .cm-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: linear-gradient(135deg, var(--pri), var(--pri-d));
    color: #fff;
  }
  .cm-logo {
    width: 42px;
    height: 42px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 4px;
  }
  .cm-logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .cm-title h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
  }
  .cm-title p {
    margin: 2px 0 0;
    font-size: 11px;
    opacity: 0.9;
  }
  .cm-close {
    margin-left: auto;
    width: 28px;
    height: 28px;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 50%;
    color: #fff;
    font-size: 16px;
    cursor: pointer;
    transition: background 0.2s;
  }
  .cm-close:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  .cm-body {
    padding: 16px;
    overflow-y: auto;
    max-height: calc(100vh - 140px);
  }
  .cm-quick-actions {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 16px;
  }
  .cm-action-btn {
    padding: 10px 14px;
    border: none;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    background: #f4f5f7;
    color: #333;
  }
  .cm-action-btn.primary {
    background: linear-gradient(135deg, var(--pri), var(--pri-d));
    color: #fff;
  }
  .cm-action-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  .cm-section {
    margin-bottom: 16px;
  }
  .cm-section h4 {
    margin: 0 0 8px;
    font-size: 12px;
    font-weight: 700;
    color: #333;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .cm-phones {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .cm-phone-item,
  .cm-email-item,
  .cm-whatsapp-item {
    padding: 10px 12px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .cm-phone-item:hover,
  .cm-email-item:hover,
  .cm-whatsapp-item:hover {
    background: #f0f1f3;
    border-color: var(--pri);
  }
  .cm-phone-label,
  .cm-email-label,
  .cm-wa-label {
    font-size: 9px;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-bottom: 2px;
  }
  .cm-phone-value,
  .cm-email-value,
  .cm-wa-value {
    font-size: 13px;
    font-weight: 600;
    color: #333;
  }
  /* Social media links with proper icons */
  .cm-social {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
  }
  .cm-social-link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    text-decoration: none;
    color: #333;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.2s;
  }
  .cm-social-link:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  .cm-social-icon {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .cm-social-icon svg {
    width: 16px;
    height: 16px;
  }
  /* Platform-specific colors */
  .cm-social-link[data-platform="facebook"] { border-color: #1877f2; }
  .cm-social-link[data-platform="facebook"] .cm-social-icon { background: #1877f2; }
  .cm-social-link[data-platform="instagram"] { border-color: #e4405f; }
  .cm-social-link[data-platform="instagram"] .cm-social-icon { background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); }
  .cm-social-link[data-platform="youtube"] { border-color: #ff0000; }
  .cm-social-link[data-platform="youtube"] .cm-social-icon { background: #ff0000; }
  .cm-social-link[data-platform="tiktok"] { border-color: #010101; }
  .cm-social-link[data-platform="tiktok"] .cm-social-icon { background: #010101; }
  .cm-social-link[data-platform="linkedin"] { border-color: #0a66c2; }
  .cm-social-link[data-platform="linkedin"] .cm-social-icon { background: #0a66c2; }
  .cm-social-link[data-platform="twitter"] { border-color: #1da1f2; }
  .cm-social-link[data-platform="twitter"] .cm-social-icon { background: #1da1f2; }
  .cm-social-link[data-platform="telegram"] { border-color: #26a5e4; }
  .cm-social-link[data-platform="telegram"] .cm-social-icon { background: #26a5e4; }
  .cm-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .cm-input,
  .cm-textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s;
  }
  .cm-input:focus,
  .cm-textarea:focus {
    border-color: var(--pri);
  }
  .cm-textarea {
    resize: vertical;
    min-height: 80px;
  }
  .cm-submit-btn {
    padding: 12px 16px;
    background: linear-gradient(135deg, var(--pri), var(--pri-d));
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .cm-submit-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(132, 164, 65, 0.3);
  }
  .cm-submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  /* Dark mode support */
  [data-theme="dark"] .cm-content {
    background: #222240;
  }
  [data-theme="dark"] .cm-phone-item,
  [data-theme="dark"] .cm-email-item,
  [data-theme="dark"] .cm-whatsapp-item,
  [data-theme="dark"] .cm-social-link {
    background: #282848;
    border-color: rgba(255, 255, 255, 0.1);
  }
  [data-theme="dark"] .cm-phone-item:hover,
  [data-theme="dark"] .cm-email-item:hover,
  [data-theme="dark"] .cm-whatsapp-item:hover,
  [data-theme="dark"] .cm-social-link:hover {
    background: #2c2c4c;
  }
  [data-theme="dark"] .cm-input,
  [data-theme="dark"] .cm-textarea {
    background: #2c2c4c;
    border-color: rgba(255, 255, 255, 0.1);
    color: #e4e4f0;
  }
  [data-theme="dark"] .cm-section h4 {
    color: #e4e4f0;
  }
  [data-theme="dark"] .cm-phone-value,
  [data-theme="dark"] .cm-email-value,
  [data-theme="dark"] .cm-wa-value,
  [data-theme="dark"] .cm-social-link {
    color: #e4e4f0;
  }
`;
document.head.appendChild(contactStyles);

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
  Contact.init();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Contact, ContactConfig };
}
