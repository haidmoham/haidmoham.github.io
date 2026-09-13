// Native form submission remains available when JavaScript is disabled or fetch is unavailable.
(function contactFormEnhancement() {
  const form = document.querySelector('#contact-form');
  if (!form || typeof window.fetch !== 'function') return;

  const button = form.querySelector('[data-fs-submit-btn]');
  const success = document.querySelector('[data-fs-success]');
  const error = document.querySelector('[data-fs-error=""]');
  const defaultButtonLabel = button.textContent;
  const submissionError = 'message could not be sent. please try again or email hi@mhaider.dev.';

  function setHidden(element, hidden) {
    element.hidden = hidden;
  }

  function clearFormState() {
    setHidden(success, true);
    setHidden(error, true);
    error.textContent = '';
  }

  function showError(message) {
    error.textContent = message;
    setHidden(error, false);
    error.focus();
  }

  async function submitContactForm(event) {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    clearFormState();
    button.disabled = true;
    button.textContent = 'sending…';
    form.setAttribute('aria-busy', 'true');

    try {
      const response = await window.fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(submissionError);
      }

      form.reset();
      setHidden(success, false);
      success.focus();
    } catch (failure) {
      showError(failure instanceof Error && failure.message === submissionError ? failure.message : submissionError);
    } finally {
      form.removeAttribute('aria-busy');
      button.disabled = false;
      button.textContent = defaultButtonLabel;
    }
  }

  form.addEventListener('submit', submitContactForm);
  window.ContactForm = { submitContactForm };
}());
