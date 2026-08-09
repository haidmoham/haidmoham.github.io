(function () {
  var root = document.querySelector('[data-coupling-visual]');
  if (!root) return;
  var copy = {
    passive: ['Passive elbow / gravity on', 'Joint 2 moves even though its motor command is zero.', 'joint 2 · zero command'],
    hold: ['Held elbow / gravity on', 'Holding joint 2 changes the motion and makes the arm more organized.', 'joint 2 · held'],
    gravity: ['Gravity off', 'With gravitational load removed, the staged motion looks cleaner and more recognizable.', 'joint 2 · gravity off']
  };
  root.querySelectorAll('.visual-toggle').forEach(function (button) {
    button.addEventListener('click', function () {
      var state = button.dataset.state;
      root.dataset.state = state;
      root.querySelectorAll('.visual-toggle').forEach(function (item) { var active = item === button; item.classList.toggle('is-active', active); item.setAttribute('aria-pressed', active); });
      root.querySelector('[data-state-title]').textContent = copy[state][0];
      root.querySelector('[data-state-copy]').textContent = copy[state][1];
      root.querySelector('.elbow-label').textContent = copy[state][2];
    });
  });
}());
