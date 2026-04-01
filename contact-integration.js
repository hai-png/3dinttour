/**
 * Temer Properties Contact Integration
 * 
 * This module provides contact functionality for the 3D tour application,
 * integrating with Temer Real Estate Ethiopia's contact information.
 * 
 * Usage:
 *   - Contact.open() - Open contact modal
 *   - Contact.call(number) - Initiate phone call
 *   - Contact.email() - Open email client
 *   - Contact.whatsapp() - Open WhatsApp chat
 *   - Contact.share() - Share via Web Share API
 */

const ContactConfig = {
  company: {
    name: "Temer Properties",
    fullName: "Temer Real Estate Ethiopia",
    website: "https://temerproperties.com"
  },
  
  contact: {
    phones: [
      {
        type: "hotline",
        label: "Hotline",
        value: "6033",
        tel: "tel:6033",
        display: "6033",
        primary: true
      },
      {
        type: "mobile",
        label: "Mobile 1",
        value: "+251975666699",
        tel: "tel:+251975666699",
        display: "+251 975 666 699"
      },
      {
        type: "mobile",
        label: "Mobile 2",
        value: "+251939555558",
        tel: "tel:+251939555558",
        display: "+251 939 555 558",
        whatsapp: true
      }
    ],
    
    emails: [
      {
        type: "general",
        label: "General Inquiry",
        value: "info@temerproperties.com",
        mailto: "mailto:info@temerproperties.com",
        primary: true
      }
    ],
    
    whatsapp: {
      enabled: true,
      number: "+251939555558",
      display: "+251 939 555 558",
      message: "Hello Temer Properties, I'm interested in learning more about your properties."
    },
    
    social: {
      facebook: {
        enabled: true,
        url: "https://www.facebook.com/temerproperties?mibextid=JRoKGi",
        handle: "@temerproperties",
        icon: "facebook"
      },
      twitter: {
        enabled: true,
        url: "https://x.com/TemerProperties",
        handle: "@TemerProperties",
        icon: "twitter"
      },
      youtube: {
        enabled: true,
        url: "https://www.youtube.com/@TemerProperties",
        handle: "@TemerProperties",
        icon: "youtube"
      },
      instagram: {
        enabled: true,
        url: "https://www.instagram.com/temerproperties?igsh=MXJ6ZGozY3QwaXBsMQ",
        handle: "@temerproperties",
        icon: "instagram"
      },
      tiktok: {
        enabled: true,
        url: "https://www.tiktok.com/@temer_properties?_t=8opa5yBARtd&_r=1",
        handle: "@temer_properties",
        icon: "tiktok"
      }
    }
  },
  
  location: {
    address: "Piyassa, Addis Ababa, Ethiopia",
    city: "Addis Ababa",
    country: "Ethiopia",
    coordinates: {
      lat: 9.036278,
      lng: 38.752639
    }
  },
  
  displaySettings: {
    primaryColor: "#84a441",
    secondaryColor: "#b09048"
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
    const socials = Object.values(cfg.contact.social).filter(s => s.enabled);
    
    return `
      <div class="cm-overlay" onclick="Contact.close()"></div>
      <div class="cm-content">
        <div class="cm-header">
          <div class="cm-logo">🏢</div>
          <div class="cm-title">
            <h3>${cfg.company.name}</h3>
            <p>${cfg.location.address}</p>
          </div>
          <button class="cm-close" onclick="Contact.close()">✕</button>
        </div>
        
        <div class="cm-body">
          <!-- Quick Actions -->
          <div class="cm-quick-actions">
            ${cfg.contact.phones.filter(p => p.primary).map(p => `
              <button class="cm-action-btn primary" onclick="Contact.call('${p.value}')">
                📞 Call Now
              </button>
            `).join('')}
            <button class="cm-action-btn" onclick="Contact.whatsapp()">
              💬 WhatsApp
            </button>
            <button class="cm-action-btn" onclick="Contact.email()">
              📧 Email
            </button>
            <button class="cm-action-btn" onclick="Contact.share()">
              📤 Share
            </button>
          </div>
          
          <!-- Phone Numbers -->
          <div class="cm-section">
            <h4>📞 Phone Numbers</h4>
            <div class="cm-phones">
              ${cfg.contact.phones.map(p => `
                <div class="cm-phone-item" onclick="Contact.call('${p.value}')">
                  <div class="cm-phone-label">${p.label}${p.primary ? ' ⭐' : ''}</div>
                  <div class="cm-phone-value">${p.display}</div>
                </div>
              `).join('')}
            </div>
          </div>
          
          <!-- Email -->
          <div class="cm-section">
            <h4>📧 Email</h4>
            <div class="cm-email-item" onclick="Contact.email()">
              <div class="cm-email-label">${cfg.contact.emails[0].label}</div>
              <div class="cm-email-value">${cfg.contact.emails[0].value}</div>
            </div>
          </div>
          
          <!-- WhatsApp -->
          ${cfg.contact.whatsapp.enabled ? `
          <div class="cm-section">
            <h4>💬 WhatsApp</h4>
            <div class="cm-whatsapp-item" onclick="Contact.whatsapp()">
              <div class="cm-wa-label">Chat with us</div>
              <div class="cm-wa-value">${cfg.contact.whatsapp.display}</div>
            </div>
          </div>
          ` : ''}
          
          <!-- Social Media -->
          ${socials.length > 0 ? `
          <div class="cm-section">
            <h4>🌐 Follow Us</h4>
            <div class="cm-social">
              ${socials.map(s => `
                <a class="cm-social-link" href="${s.url}" target="_blank" rel="noopener">
                  ${this.getSocialIcon(s.icon)}
                  <span>${s.handle}</span>
                </a>
              `).join('')}
            </div>
          </div>
          ` : ''}
          
          <!-- Contact Form -->
          <div class="cm-section">
            <h4>📝 Send Message</h4>
            <form class="cm-form" onsubmit="Contact.submitForm(event)">
              <div class="cm-form-group">
                <input type="text" name="name" placeholder="Your Name" required class="cm-input">
              </div>
              <div class="cm-form-group">
                <input type="email" name="email" placeholder="Your Email" required class="cm-input">
              </div>
              <div class="cm-form-group">
                <input type="tel" name="phone" placeholder="Your Phone" class="cm-input">
              </div>
              <div class="cm-form-group">
                <textarea name="message" placeholder="Your Message" required class="cm-textarea" rows="4"></textarea>
              </div>
              <button type="submit" class="cm-submit-btn">
                📤 Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    `;
  },
  
  /**
   * Get social media icon
   */
  getSocialIcon(platform) {
    const icons = {
      facebook: '📘',
      twitter: '🐦',
      youtube: '📺',
      instagram: '📷',
      tiktok: '🎵'
    };
    return icons[platform] || '🔗';
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
    const body = encodeURIComponent('Hello Temer Properties,\n\nI am interested in learning more about your properties.\n\nThank you!');
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
      text: `Check out ${cfg.company.fullName} - ${cfg.location.address}`,
      url: window.location.href
    };
    
    if (navigator.share) {
      navigator.share(shareData).catch(console.error);
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Link copied to clipboard!');
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
      console.log('Contact form submission:', data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('✅ Thank you! Your message has been sent successfully.');
      form.reset();
      this.close();
    } catch (error) {
      console.error('Form submission error:', error);
      alert('❌ Sorry, there was an error sending your message. Please try again.');
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
    background: linear-gradient(135deg, #84a441, #5a8a2a);
    color: #fff;
  }
  
  .cm-logo {
    width: 42px;
    height: 42px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
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
    background: linear-gradient(135deg, #84a441, #5a8a2a);
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
  
  .cm-phones,
  .cm-social {
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
    border-color: #84a441;
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
  
  .cm-social-link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
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
    background: #f0f1f3;
    border-color: #84a441;
  }
  
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
    border-color: #84a441;
  }
  
  .cm-textarea {
    resize: vertical;
    min-height: 80px;
  }
  
  .cm-submit-btn {
    padding: 12px 16px;
    background: linear-gradient(135deg, #84a441, #5a8a2a);
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
