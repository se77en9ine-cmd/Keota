/**
 * Mobile Haptic Feedback Utility
 * Uses the Vibration API where supported on mobile devices
 */
export const haptics = {
  /**
   * Light tap vibration (e.g. keypress, item tap)
   */
  light: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {
        // Ignore devices that don't support or disallow vibration
      }
    }
  },

  /**
   * Medium vibration (e.g. add to cart, toggle switch)
   */
  medium: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(30);
      } catch {
        // Ignore
      }
    }
  },

  /**
   * Success vibration pattern (e.g. payment completed, barcode scanned)
   */
  success: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([20, 50, 40]);
      } catch {
        // Ignore
      }
    }
  },

  /**
   * Error vibration pattern (e.g. out of stock, validation failure)
   */
  error: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([50, 100, 50, 100, 50]);
      } catch {
        // Ignore
      }
    }
  },
};
