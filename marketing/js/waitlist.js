/**
 * TrackPay Marketing Waitlist - Client-side Handler
 *
 * Intercepts the hero form submit
 * POSTs to Netlify Function
 * Shows bilingual success/error messages
 * Handles loading states
 *
 * @version 1.0.1
 */

(function () {
  const form = document.querySelector('form[name="waitlist"]');
  if (!form) return;

  const emailInput = form.querySelector('input[name="email"]');
  const submitBtn = form.querySelector('button[type="submit"]');

  // Create message container for success/error feedback
  const msg = document.createElement('div');
  msg.setAttribute('role', 'status');
  msg.setAttribute('aria-live', 'polite');
  msg.className = 'form-message';
  form.appendChild(msg);

  /**
   * Get current language (aligns with i18n.js)
   */
  function getLang() {
    const saved = localStorage.getItem('trackpay-lang');
    if (saved === 'es' || saved === 'en') return saved;
    return (navigator.language || '').startsWith('es') ? 'es' : 'en';
  }

  /**
   * Bilingual copy
   */
  const copy = {
    en: {
      successTitle: 'You\'re on the list!',
      successBody: 'We\'ll email you the moment TrackPay is ready.',
      invalidEmail: 'Please enter a valid email address.',
      genericError: 'Something went wrong. Please try again.',
      submitting: 'Joining…',
      cta: 'Join the Waitlist'
    },
    es: {
      successTitle: '¡Estás en la lista!',
      successBody: 'Te avisaremos por correo cuando TrackPay esté listo.',
      invalidEmail: 'Por favor ingresa un correo válido.',
      genericError: 'Algo salió mal. Inténtalo de nuevo.',
      submitting: 'Uniéndote…',
      cta: 'Únete a la lista de espera'
    }
  };

  /**
   * Set loading state on submit button
   */
  function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    const lang = getLang();
    submitBtn.textContent = loading ? copy[lang].submitting : copy[lang].cta;
  }

  /**
   * Basic email validation
   */
  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  /**
   * Extract UTM parameters from URL
   */
  function getUtmParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || null,
      utm_campaign: params.get('utm_campaign') || null
    };
  }

  /**
   * Handle form submission
   */
  async function handleSubmit(e) {
    e.preventDefault();
    const lang = getLang();

    // Validate email
    const email = (emailInput?.value || '').trim();
    if (!isValidEmail(email)) {
      msg.className = 'form-message error';
      msg.textContent = copy[lang].invalidEmail;
      return;
    }

    // Clear previous messages and set loading state
    setLoading(true);
    msg.className = 'form-message';
    msg.textContent = '';

    try {
      // Get UTM parameters
      const utmParams = getUtmParams();

      // POST to Netlify Function
      const res = await fetch('/.netlify/functions/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: '',  // Can add a name field later if needed
          language: lang,
          ...utmParams
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Use server error message if available
        const serverMsg = data?.error || copy[lang].genericError;
        throw new Error(serverMsg);
      }

      // Success! Clear form and show success message
      form.reset();
      msg.className = 'form-message success';
      msg.innerHTML = `
        <strong>${copy[lang].successTitle}</strong><br>
        ${copy[lang].successBody}
      `;

    } catch (err) {
      // Show error message
      msg.className = 'form-message error';
      msg.textContent = err.message || copy[lang].genericError;
    } finally {
      setLoading(false);
    }
  }

  // Attach submit handler
  form.addEventListener('submit', handleSubmit);
})();
