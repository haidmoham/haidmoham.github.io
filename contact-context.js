(function contactContext() {
  const allowedValues = {
    topic: new Set([
      'full-time-software-engineering',
      'research-scientific-computing',
      'creative-engineering-collaboration',
      'technical-conversation',
    ]),
    project: new Set([
      'c-1n',
      'robotics-test-bench',
      'lmlab',
      'indigo',
      'fourier',
      'jelly',
      'tiramisu',
      'magnet',
      'mural',
      'creative-engineering',
      'portfolio',
    ]),
    from: new Set([
      'portfolio',
      'project',
      'notes',
      'resume',
      'github',
      'linkedin',
      'referral',
    ]),
  };

  function oneAllowedValue(parameters, name) {
    const values = parameters.getAll(name);
    if (values.length !== 1 || !allowedValues[name].has(values[0])) return '';
    return values[0];
  }

  function readContactContext(search) {
    const parameters = new URLSearchParams(search);
    return {
      interest: oneAllowedValue(parameters, 'topic'),
      project: oneAllowedValue(parameters, 'project'),
      entrySurface: oneAllowedValue(parameters, 'from'),
    };
  }

  function applyContactContext(document, search) {
    const context = readContactContext(search);
    const fields = {
      interest: document.querySelector('#interest'),
      project: document.querySelector('#project'),
      entrySurface: document.querySelector('#entry-surface'),
    };
    for (const [key, field] of Object.entries(fields)) {
      if (field && context[key]) field.value = context[key];
    }
    return context;
  }

  window.ContactContext = { allowedValues, readContactContext, applyContactContext };
  const apply = () => applyContactContext(document, window.location.search);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }
}());
