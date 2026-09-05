// Native form submission remains available when JavaScript is disabled.
const form = document.querySelector('#contact-form');
if (form) form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  const error = document.querySelector('[data-fs-error=""]');
  const success = document.querySelector('[data-fs-success]');
  button.disabled = true;
  button.textContent = 'sending…';
  error.style.display = 'none';
  try {
    const response = await fetch(form.action, { method:'POST', body:new FormData(form), headers:{Accept:'application/json'} });
    if (!response.ok) throw new Error('message could not be sent. please try again or email hi@mhaider.dev.');
    success.textContent = 'message sent. thanks for getting in touch.';
    success.style.display = 'block';
    success.setAttribute('role','status');
    form.reset();
  } catch (failure) {
    error.textContent = failure instanceof Error ? failure.message : 'message could not be sent. please try again.';
    error.style.display = 'block';
  } finally {
    button.disabled = false;
    button.textContent = 'send message';
  }
});
