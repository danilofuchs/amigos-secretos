let hapticSwitch: HTMLLabelElement | null = null;

/**
 * A short tap, or a firmer double tap for a limit: vibration where the browser allows it, and the
 * system switch tick on iPhone.
 */
export function haptic(limit = false) {
  if (typeof navigator.vibrate === 'function') {
    // Chrome logs an error for vibrate until the page has had a tap or key press.
    if (navigator.userActivation?.hasBeenActive !== false)
      navigator.vibrate(limit ? [22, 70, 30] : 10);
    return;
  }
  // Safari on iPhone has no vibrate, but toggling a native switch plays its haptic tick.
  if (!/iPhone|iPad/.test(navigator.userAgent) && navigator.maxTouchPoints < 2) return;
  if (!hapticSwitch) {
    hapticSwitch = document.createElement('label');
    hapticSwitch.ariaHidden = 'true';
    hapticSwitch.style.cssText =
      'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    hapticSwitch.append(input);
    document.body.append(hapticSwitch);
  }
  hapticSwitch.click();
  if (limit) setTimeout(() => hapticSwitch?.click(), 90);
}
