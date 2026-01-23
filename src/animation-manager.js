/**
 * Animation Manager
 *
 * Manages animations for THREE.js objects in the force graph.
 * Supports multiple simultaneous animations per object, configurable
 * looping, easing, and smooth transitions.
 */

import { getEasing } from './animations/easing.js';

// Use WeakMap to track animations by object reference (allows GC)
const objectAnimations = new WeakMap();

// Counter for unique animation instance IDs
let animationIdCounter = 0;

/**
 * Animation instance state
 * @typedef {Object} AnimationInstance
 * @property {number} id - Unique instance ID
 * @property {string} name - Animation type name
 * @property {Object} state - Animation-specific state
 * @property {Object} options - Merged options
 * @property {number} startTime - When animation started
 * @property {boolean} stopping - Whether animation is transitioning out
 * @property {number} stopStartTime - When stop transition started
 * @property {Object} initialValues - Original object values for restoration
 */

class AnimationManager {
  constructor() {
    // Registry of animation types: name → { update, defaultOptions, init?, cleanup? }
    this._animationTypes = new Map();

    // Set of all animated objects for iteration during tick
    this._animatedObjects = new Set();
  }

  /**
   * Register an animation type
   * @param {string} name - Animation name (e.g., 'pulse', 'spin')
   * @param {Object} config - Animation configuration
   * @param {Function} config.update - Update function(object, state, deltaTime, options) → state
   * @param {Object} [config.defaultOptions] - Default options
   * @param {Function} [config.init] - Init function(object, options) → initialState
   * @param {Function} [config.cleanup] - Cleanup function(object, state, options)
   */
  registerAnimation(name, config) {
    if (typeof name !== 'string' || !name) {
      throw new Error('Animation name must be a non-empty string');
    }
    if (typeof config.update !== 'function') {
      throw new Error('Animation config must have an update function');
    }

    this._animationTypes.set(name, {
      update: config.update,
      defaultOptions: config.defaultOptions || {},
      init: config.init || null,
      cleanup: config.cleanup || null
    });
  }

  /**
   * Unregister an animation type
   * @param {string} name - Animation name to remove
   * @returns {boolean} Whether the animation was found and removed
   */
  unregisterAnimation(name) {
    return this._animationTypes.delete(name);
  }

  /**
   * Check if an animation type is registered
   * @param {string} name - Animation name
   * @returns {boolean}
   */
  hasAnimation(name) {
    return this._animationTypes.has(name);
  }

  /**
   * Get all registered animation names
   * @returns {string[]}
   */
  getRegisteredAnimations() {
    return Array.from(this._animationTypes.keys());
  }

  /**
   * Start an animation on a THREE.js object
   * @param {THREE.Object3D} object - The object to animate
   * @param {string} animationName - Name of registered animation
   * @param {Object} [options] - Animation options
   * @param {boolean} [options.loop=true] - Whether to loop the animation
   * @param {number} [options.duration] - Duration in seconds (for non-looping)
   * @param {string|Function} [options.easing='linear'] - Easing function
   * @param {number} [options.transitionDuration=0.2] - Transition in/out duration
   * @returns {number} Animation instance ID (for stopping specific instance)
   */
  startAnimation(object, animationName, options = {}) {
    if (!object) {
      console.warn('AnimationManager: Cannot animate null object');
      return -1;
    }

    const animType = this._animationTypes.get(animationName);
    if (!animType) {
      console.warn(`AnimationManager: Animation "${animationName}" not registered`);
      return -1;
    }

    // Get or create animations array for this object
    let animations = objectAnimations.get(object);
    if (!animations) {
      animations = [];
      objectAnimations.set(object, animations);
    }

    // Check if this animation type is already running on this object
    const existing = animations.find(a => a.name === animationName && !a.stopping);
    if (existing) {
      // Update options on existing animation
      existing.options = { ...animType.defaultOptions, ...options };
      return existing.id;
    }

    // Merge options with defaults
    const mergedOptions = {
      loop: true,
      duration: 1,
      easing: 'linear',
      transitionDuration: 0.2,
      ...animType.defaultOptions,
      ...options
    };

    // Resolve easing function
    mergedOptions.easingFn = getEasing(mergedOptions.easing);

    // Initialize animation state
    const initialState = animType.init
      ? animType.init(object, mergedOptions)
      : {};

    // Store initial values for restoration
    const initialValues = {
      scale: object.scale.clone(),
      rotation: object.rotation.clone(),
      position: object.position.clone()
    };

    // Store material properties if available
    if (object.material) {
      const mat = object.material;
      initialValues.material = {
        emissive: mat.emissive?.clone(),
        emissiveIntensity: mat.emissiveIntensity,
        opacity: mat.opacity,
        color: mat.color?.clone()
      };
    }

    // Create animation instance
    const instance = {
      id: ++animationIdCounter,
      name: animationName,
      state: initialState,
      options: mergedOptions,
      startTime: performance.now() / 1000,
      stopping: false,
      stopStartTime: 0,
      initialValues,
      transitionProgress: 0
    };

    animations.push(instance);
    this._animatedObjects.add(object);

    return instance.id;
  }

  /**
   * Stop an animation on an object
   * @param {THREE.Object3D} object - The animated object
   * @param {string|number} [animationNameOrId] - Animation name or instance ID (omit to stop all)
   * @param {boolean} [immediate=false] - If true, stop immediately without transition
   */
  stopAnimation(object, animationNameOrId, immediate = false) {
    if (!object) return;

    const animations = objectAnimations.get(object);
    if (!animations || animations.length === 0) return;

    const now = performance.now() / 1000;

    // Iterate in reverse to safely splice while iterating
    for (let i = animations.length - 1; i >= 0; i--) {
      const anim = animations[i];
      const shouldStop =
        animationNameOrId === undefined ||
        anim.name === animationNameOrId ||
        anim.id === animationNameOrId;

      if (shouldStop && !anim.stopping) {
        if (immediate) {
          this._cleanupAnimation(object, anim);
          animations.splice(i, 1);
        } else {
          anim.stopping = true;
          anim.stopStartTime = now;
        }
      }
    }

    // Remove object from set if no more animations
    if (animations.length === 0) {
      this._animatedObjects.delete(object);
      objectAnimations.delete(object);
    }
  }

  /**
   * Stop all animations on an object
   * @param {THREE.Object3D} object - The animated object
   * @param {boolean} [immediate=false] - If true, stop immediately without transition
   */
  stopAllAnimations(object, immediate = false) {
    this.stopAnimation(object, undefined, immediate);
  }

  /**
   * Toggle an animation on an object - starts if not running, stops if running
   * @param {THREE.Object3D} object - The object to animate
   * @param {string} animationName - Name of registered animation
   * @param {Object} [options] - Animation options (used when starting)
   * @param {boolean} [immediate=false] - If true, stop immediately without transition
   * @returns {boolean} True if animation was started, false if it was stopped
   */
  toggleAnimation(object, animationName, options = {}, immediate = false) {
    if (!object) {
      console.warn('AnimationManager: Cannot toggle animation on null object');
      return false;
    }

    if (this.isAnimating(object, animationName)) {
      this.stopAnimation(object, animationName, immediate);
      return false;
    } else {
      this.startAnimation(object, animationName, options);
      return true;
    }
  }

  /**
   * Check if an object has a specific animation running
   * @param {THREE.Object3D} object - The object to check
   * @param {string} [animationName] - Animation name (omit to check for any)
   * @returns {boolean}
   */
  isAnimating(object, animationName) {
    if (!object) return false;

    const animations = objectAnimations.get(object);
    if (!animations || animations.length === 0) return false;

    if (animationName) {
      return animations.some(a => a.name === animationName && !a.stopping);
    }
    return animations.some(a => !a.stopping);
  }

  /**
   * Get animation state for an object
   * @param {THREE.Object3D} object - The object
   * @param {string} [animationName] - Specific animation name
   * @returns {Object|null} Animation state or null
   */
  getAnimationState(object, animationName) {
    if (!object) return null;

    const animations = objectAnimations.get(object);
    if (!animations) return null;

    if (animationName) {
      const anim = animations.find(a => a.name === animationName);
      return anim ? anim.state : null;
    }

    // Return all states
    const states = {};
    for (const anim of animations) {
      states[anim.name] = anim.state;
    }
    return states;
  }

  /**
   * Update all animations - call this every frame
   * @param {number} deltaTime - Time since last frame in seconds
   */
  tick(deltaTime) {
    const now = performance.now() / 1000;

    for (const object of this._animatedObjects) {
      const animations = objectAnimations.get(object);
      if (!animations) continue;

      // Process animations in reverse order for safe removal
      for (let i = animations.length - 1; i >= 0; i--) {
        const anim = animations[i];
        const animType = this._animationTypes.get(anim.name);

        if (!animType) {
          animations.splice(i, 1);
          continue;
        }

        // Handle transition in
        if (anim.transitionProgress < 1 && !anim.stopping) {
          anim.transitionProgress = Math.min(1,
            anim.transitionProgress + deltaTime / anim.options.transitionDuration
          );
        }

        // Handle transition out (stopping)
        if (anim.stopping) {
          const stopElapsed = now - anim.stopStartTime;
          const stopProgress = Math.min(1, stopElapsed / anim.options.transitionDuration);

          if (stopProgress >= 1) {
            // Animation fully stopped
            this._cleanupAnimation(object, anim);
            animations.splice(i, 1);
            continue;
          }

          // Blend towards initial values
          anim.transitionProgress = 1 - stopProgress;
        }

        // Check duration for non-looping animations
        if (!anim.options.loop) {
          const elapsed = now - anim.startTime;
          if (elapsed >= anim.options.duration) {
            anim.stopping = true;
            anim.stopStartTime = now;
          }
        }

        // Run the animation update
        try {
          anim.state = animType.update(
            object,
            anim.state,
            deltaTime,
            anim.options,
            anim.transitionProgress
          );
        } catch (error) {
          console.error(`AnimationManager: Error in "${anim.name}" update:`, error);
          animations.splice(i, 1);
        }
      }

      // Clean up object if no more animations
      if (animations.length === 0) {
        this._animatedObjects.delete(object);
        objectAnimations.delete(object);
      }
    }
  }

  /**
   * Clean up an animation and restore initial values
   * @private
   */
  _cleanupAnimation(object, anim) {
    const animType = this._animationTypes.get(anim.name);

    // Run custom cleanup if defined
    if (animType?.cleanup) {
      try {
        animType.cleanup(object, anim.state, anim.options);
      } catch (error) {
        console.error(`AnimationManager: Error in "${anim.name}" cleanup:`, error);
      }
    }

    // Restore initial values
    const initial = anim.initialValues;
    if (initial) {
      if (initial.scale) object.scale.copy(initial.scale);
      if (initial.rotation) object.rotation.copy(initial.rotation);
      // Note: position is typically managed by force graph, don't restore

      if (initial.material && object.material) {
        const mat = object.material;
        if (initial.material.emissive && mat.emissive) {
          mat.emissive.copy(initial.material.emissive);
        }
        if (initial.material.emissiveIntensity !== undefined) {
          mat.emissiveIntensity = initial.material.emissiveIntensity;
        }
        if (initial.material.opacity !== undefined) {
          mat.opacity = initial.material.opacity;
        }
        if (initial.material.color && mat.color) {
          mat.color.copy(initial.material.color);
        }
      }
    }
  }

  /**
   * Get statistics about current animations
   * @returns {Object} Stats object
   */
  getStats() {
    let totalAnimations = 0;
    const byType = {};

    for (const object of this._animatedObjects) {
      const animations = objectAnimations.get(object);
      if (animations) {
        totalAnimations += animations.length;
        for (const anim of animations) {
          byType[anim.name] = (byType[anim.name] || 0) + 1;
        }
      }
    }

    return {
      animatedObjects: this._animatedObjects.size,
      totalAnimations,
      registeredTypes: this._animationTypes.size,
      byType
    };
  }

  /**
   * Clear all animations
   * @param {boolean} [immediate=true] - If true, stop immediately without transition
   */
  clear(immediate = true) {
    for (const object of this._animatedObjects) {
      this.stopAllAnimations(object, immediate);
    }
    this._animatedObjects.clear();
  }
}

// Singleton instance
const instance = new AnimationManager();

export default instance;
export { AnimationManager };
