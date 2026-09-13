(function () {
  'use strict';

  function removeAttributeFromAll(selector, attribute) {
    var elements = document.querySelectorAll(selector);
    var index;

    for (index = 0; index < elements.length; index += 1) {
      elements[index].removeAttribute(attribute);
    }
  }

  function restoreRuntime() {
    var template = document.getElementById('portfolio-runtime');
    var stylesheet = document.getElementById('portfolio-enhancement-styles');
    var savedScripts;
    var index;
    var sourceScript;
    var restoredScript;

    if (!template || !template.content) return;

    restoreStaticCopy();
    if (stylesheet && stylesheet.parentNode) stylesheet.parentNode.removeChild(stylesheet);
    document.body.className = document.body.className.replace(/(^|\s)portfolio-lightweight(?=\s|$)/g, ' ').replace(/^\s+|\s+$/g, '');
    removeAttributeFromAll('[data-portfolio-disabled]', 'disabled');
    removeAttributeFromAll('[data-portfolio-disabled]', 'data-portfolio-disabled');

    // Recreate each saved tag. Moving a script out of template content is not
    // consistently executable across the browsers this page supports.
    savedScripts = template.content.querySelectorAll('script');
    for (index = 0; index < savedScripts.length; index += 1) {
      sourceScript = savedScripts[index];
      restoredScript = document.createElement('script');
      copyAttributes(sourceScript, restoredScript);
      restoredScript.text = sourceScript.text || sourceScript.textContent || '';
      document.body.appendChild(restoredScript);
    }

    template.parentNode.removeChild(template);
  }

  function restoreStaticCopy() {
    var replacements = document.querySelectorAll('[data-portfolio-static-copy]');
    var index;
    var replacement;

    for (index = 0; index < replacements.length; index += 1) {
      replacement = replacements[index];
      replacement.parentNode.replaceChild(
        document.createTextNode(replacement.getAttribute('data-portfolio-static-copy')),
        replacement
      );
    }
  }

  function copyAttributes(source, destination) {
    var index;
    var attribute;

    for (index = 0; index < source.attributes.length; index += 1) {
      attribute = source.attributes[index];
      destination.setAttribute(attribute.name, attribute.value);
    }
  }

  // Older browsers keep the complete static document and disabled controls.
  var template = document.getElementById('portfolio-runtime');
  var supportsModules = 'noModule' in document.createElement('script');
  if (template && template.content && supportsModules) restoreRuntime();
}());
