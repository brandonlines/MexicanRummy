// Accessibility utilities

export function announce(message, level = 'polite') {
  const announcement = document.createElement('div');
  // role=status is implicitly polite and VoiceOver downgrades an explicit
  // assertive on it; use role=alert for assertive so it actually interrupts.
  announcement.setAttribute('role', level === 'assertive' ? 'alert' : 'status');
  announcement.setAttribute('aria-live', level);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => announcement.remove(), 1000);
}

export function focusElement(element) {
  if (element) {
    element.focus();
    // For custom elements that don't receive focus naturally
    if (element.getAttribute('role') === 'button' && !element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0');
    }
  }
}

export function setAriaLabel(element, label) {
  element.setAttribute('aria-label', label);
}

export function setAriaDescription(element, description) {
  element.setAttribute('aria-description', description);
}

export function markAsInvalid(element, message) {
  element.setAttribute('aria-invalid', 'true');
  if (message) {
    setAriaDescription(element, message);
  }
}

export function markAsValid(element) {
  element.setAttribute('aria-invalid', 'false');
  element.removeAttribute('aria-description');
}
