/**
 * Pulse Animation
 *
 * Oscillates the scale of an object, creating a pulsing/breathing effect.
 */

export const name = 'pulse';

export const defaultOptions = {
  speed: 2,           // Oscillation speed (cycles per second)
  amplitude: 0.2,     // Scale amplitude (0.2 = 20% size variation)
  baseScale: null,    // Base scale (null = use object's current scale)
  axis: 'all'         // 'all', 'x', 'y', 'z' - which axes to pulse
};

/**
 * Initialize pulse animation state
 * @param {THREE.Object3D} object - The object to animate
 * @param {Object} options - Animation options
 * @returns {Object} Initial state
 */
export function init(object, options) {
  return {
    phase: 0,
    baseScale: options.baseScale !== null
      ? options.baseScale
      : object.scale.x // Assume uniform scale
  };
}

/**
 * Update pulse animation
 * @param {THREE.Object3D} object - The object being animated
 * @param {Object} state - Current animation state
 * @param {number} deltaTime - Time since last frame (seconds)
 * @param {Object} options - Animation options
 * @param {number} transitionProgress - Transition progress (0-1)
 * @returns {Object} Updated state
 */
export function update(object, state, deltaTime, options, transitionProgress) {
  // Advance phase
  state.phase += deltaTime * options.speed * Math.PI * 2;

  // Calculate scale with sine wave
  const amplitude = options.amplitude * transitionProgress;
  const scaleOffset = Math.sin(state.phase) * amplitude;
  const scale = state.baseScale + scaleOffset;

  // Apply scale based on axis option
  switch (options.axis) {
    case 'x':
      object.scale.x = scale;
      break;
    case 'y':
      object.scale.y = scale;
      break;
    case 'z':
      object.scale.z = scale;
      break;
    case 'all':
    default:
      object.scale.setScalar(scale);
  }

  return state;
}

/**
 * Cleanup - restore original scale
 * @param {THREE.Object3D} object - The object
 * @param {Object} state - Animation state
 * @param {Object} options - Animation options
 */
export function cleanup(object, state, options) {
  // Scale will be restored by AnimationManager from initialValues
}

export default { name, defaultOptions, init, update, cleanup };
