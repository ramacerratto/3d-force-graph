/**
 * Easing Functions
 *
 * Standard easing functions for smooth animations.
 * All functions take a normalized time value t (0-1) and return a normalized output (0-1).
 */

export const easing = {
  /**
   * Linear interpolation - constant speed
   */
  linear: t => t,

  /**
   * Quadratic ease in - accelerating from zero velocity
   */
  easeInQuad: t => t * t,

  /**
   * Quadratic ease out - decelerating to zero velocity
   */
  easeOutQuad: t => 1 - (1 - t) * (1 - t),

  /**
   * Quadratic ease in-out - acceleration until halfway, then deceleration
   */
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,

  /**
   * Cubic ease out - stronger deceleration than quadratic
   */
  easeOutCubic: t => 1 - Math.pow(1 - t, 3),

  /**
   * Cubic ease in - stronger acceleration than quadratic
   */
  easeInCubic: t => t * t * t,

  /**
   * Cubic ease in-out - smooth acceleration and deceleration
   */
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,

  /**
   * Elastic ease out - overshoots then settles
   */
  easeOutElastic: t => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 :
      Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },

  /**
   * Bounce ease out - bounces at the end
   */
  easeOutBounce: t => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  }
};

/**
 * Get an easing function by name
 * @param {string|Function} easingOrName - Easing function or name
 * @returns {Function} The easing function
 */
export function getEasing(easingOrName) {
  if (typeof easingOrName === 'function') {
    return easingOrName;
  }
  return easing[easingOrName] || easing.linear;
}

export default easing;
