/**
 * Spin Animation
 *
 * Rotates an object continuously around an axis.
 */

export const name = 'spin';

export const defaultOptions = {
  speed: 1,           // Rotations per second
  axis: 'y',          // 'x', 'y', or 'z' - rotation axis
  direction: 1        // 1 for clockwise, -1 for counter-clockwise
};

/**
 * Initialize spin animation state
 * @param {THREE.Object3D} object - The object to animate
 * @param {Object} options - Animation options
 * @returns {Object} Initial state
 */
export function init(object, options) {
  return {
    totalRotation: 0,
    initialRotation: {
      x: object.rotation.x,
      y: object.rotation.y,
      z: object.rotation.z
    }
  };
}

/**
 * Update spin animation
 * @param {THREE.Object3D} object - The object being animated
 * @param {Object} state - Current animation state
 * @param {number} deltaTime - Time since last frame (seconds)
 * @param {Object} options - Animation options
 * @param {number} transitionProgress - Transition progress (0-1)
 * @returns {Object} Updated state
 */
export function update(object, state, deltaTime, options, transitionProgress) {
  // Calculate rotation delta
  const rotationSpeed = options.speed * Math.PI * 2 * options.direction;
  const delta = deltaTime * rotationSpeed * transitionProgress;

  state.totalRotation += delta;

  // Apply rotation to the specified axis
  const axis = options.axis.toLowerCase();
  const initial = state.initialRotation;

  switch (axis) {
    case 'x':
      object.rotation.x = initial.x + state.totalRotation;
      break;
    case 'y':
      object.rotation.y = initial.y + state.totalRotation;
      break;
    case 'z':
      object.rotation.z = initial.z + state.totalRotation;
      break;
  }

  return state;
}

/**
 * Cleanup - restore original rotation
 * @param {THREE.Object3D} object - The object
 * @param {Object} state - Animation state
 * @param {Object} options - Animation options
 */
export function cleanup(object, state, options) {
  // Rotation will be restored by AnimationManager from initialValues
}

export default { name, defaultOptions, init, update, cleanup };
