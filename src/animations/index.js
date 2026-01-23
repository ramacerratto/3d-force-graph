/**
 * Built-in Animations
 *
 * This module exports built-in animation types and a convenience
 * function to register them with the animation manager.
 */

import animationManager from '../animation-manager.js';

// Import built-in animations
import * as pulse from './pulse.js';
import * as spin from './spin.js';
import * as glow from './glow.js';

// Collection of all built-in animations
export const builtInAnimations = {
  pulse,
  spin,
  glow
};

/**
 * Register all built-in animations with the singleton animation manager
 * @param {AnimationManager} [manager] - Optional manager instance (uses singleton if not provided)
 */
export function registerBuiltInAnimations(manager = animationManager) {
  Object.values(builtInAnimations).forEach(animModule => {
    manager.registerAnimation(animModule.name, {
      update: animModule.update,
      defaultOptions: animModule.defaultOptions,
      init: animModule.init,
      cleanup: animModule.cleanup
    });
  });
}

// Re-export individual animations for direct import
export { pulse, spin, glow };
