/**
 * Glow Animation
 *
 * Animates the emissive intensity of a material to create a glowing effect.
 * Works with MeshStandardMaterial, MeshPhongMaterial, and MeshLambertMaterial.
 */

export const name = 'glow';

export const defaultOptions = {
  speed: 2,                   // Oscillation speed (cycles per second)
  minIntensity: 0,            // Minimum emissive intensity
  maxIntensity: 1,            // Maximum emissive intensity
  color: null,                // Emissive color (null = use material's current or white)
  pulse: true                 // If true, oscillates; if false, stays at max
};

/**
 * Initialize glow animation state
 * @param {THREE.Object3D} object - The object to animate
 * @param {Object} options - Animation options
 * @returns {Object} Initial state
 */
export function init(object, options) {
  const material = object.material;

  // Store original material properties
  const state = {
    phase: 0,
    hasMaterial: !!material,
    originalEmissive: null,
    originalIntensity: 0
  };

  if (material) {
    // Store original emissive color if it exists
    if (material.emissive) {
      state.originalEmissive = material.emissive.clone();
    }
    state.originalIntensity = material.emissiveIntensity || 0;

    // Set emissive color if specified and material supports it
    if (options.color && material.emissive) {
      if (typeof options.color === 'number') {
        material.emissive.setHex(options.color);
      } else if (typeof options.color === 'string') {
        material.emissive.set(options.color);
      } else if (options.color.isColor) {
        material.emissive.copy(options.color);
      }
    } else if (material.emissive && material.emissive.getHex() === 0x000000) {
      // Default to white emissive if currently black
      material.emissive.setHex(0xffffff);
    }
  }

  return state;
}

/**
 * Update glow animation
 * @param {THREE.Object3D} object - The object being animated
 * @param {Object} state - Current animation state
 * @param {number} deltaTime - Time since last frame (seconds)
 * @param {Object} options - Animation options
 * @param {number} transitionProgress - Transition progress (0-1)
 * @returns {Object} Updated state
 */
export function update(object, state, deltaTime, options, transitionProgress) {
  if (!state.hasMaterial || !object.material) {
    return state;
  }

  const material = object.material;

  // Advance phase
  state.phase += deltaTime * options.speed * Math.PI * 2;

  // Calculate intensity
  let intensity;
  if (options.pulse) {
    // Oscillate between min and max
    const range = options.maxIntensity - options.minIntensity;
    const sineValue = (Math.sin(state.phase) + 1) / 2; // 0 to 1
    intensity = options.minIntensity + sineValue * range;
  } else {
    // Constant at max intensity
    intensity = options.maxIntensity;
  }

  // Apply transition progress
  intensity *= transitionProgress;

  // Set emissive intensity
  if (material.emissiveIntensity !== undefined) {
    material.emissiveIntensity = intensity;
  }

  return state;
}

/**
 * Cleanup - restore original emissive properties
 * @param {THREE.Object3D} object - The object
 * @param {Object} state - Animation state
 * @param {Object} options - Animation options
 */
export function cleanup(object, state, options) {
  if (!state.hasMaterial || !object.material) {
    return;
  }

  const material = object.material;

  // Restore original emissive color
  if (state.originalEmissive && material.emissive) {
    material.emissive.copy(state.originalEmissive);
  }

  // Restore original intensity
  if (material.emissiveIntensity !== undefined) {
    material.emissiveIntensity = state.originalIntensity;
  }
}

export default { name, defaultOptions, init, update, cleanup };
