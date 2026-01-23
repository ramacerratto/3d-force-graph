import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnimationManager } from '../src/animation-manager.js';
import { easing, getEasing } from '../src/animations/easing.js';
import { registerBuiltInAnimations, builtInAnimations } from '../src/animations/index.js';

// Mock THREE.js objects
function createMockObject3D() {
  return {
    scale: {
      x: 1, y: 1, z: 1,
      setScalar(v) { this.x = this.y = this.z = v; },
      clone() { return { x: this.x, y: this.y, z: this.z }; },
      copy(other) { this.x = other.x; this.y = other.y; this.z = other.z; }
    },
    rotation: {
      x: 0, y: 0, z: 0,
      clone() { return { x: this.x, y: this.y, z: this.z }; },
      copy(other) { this.x = other.x; this.y = other.y; this.z = other.z; }
    },
    position: {
      x: 0, y: 0, z: 0,
      clone() { return { x: this.x, y: this.y, z: this.z }; },
      copy(other) { this.x = other.x; this.y = other.y; this.z = other.z; }
    },
    material: null
  };
}

// Simple test animation
const testAnimation = {
  update: (object, state, deltaTime, options, transitionProgress) => {
    state.updateCount = (state.updateCount || 0) + 1;
    state.lastDeltaTime = deltaTime;
    state.lastTransitionProgress = transitionProgress;
    return state;
  },
  defaultOptions: { testOption: 'default' },
  init: (object, options) => ({ initialized: true, options }),
  cleanup: (object, state, options) => { state.cleanedUp = true; }
};

describe('AnimationManager', () => {
  let manager;

  beforeEach(() => {
    manager = new AnimationManager();
  });

  afterEach(() => {
    manager.clear(true);
  });

  describe('registerAnimation', () => {
    it('should register an animation type', () => {
      manager.registerAnimation('test', testAnimation);
      expect(manager.hasAnimation('test')).toBe(true);
    });

    it('should throw error for invalid name', () => {
      expect(() => manager.registerAnimation('', testAnimation)).toThrow();
      expect(() => manager.registerAnimation(null, testAnimation)).toThrow();
    });

    it('should throw error for missing update function', () => {
      expect(() => manager.registerAnimation('test', {})).toThrow();
    });

    it('should list registered animations', () => {
      manager.registerAnimation('anim1', testAnimation);
      manager.registerAnimation('anim2', testAnimation);
      const registered = manager.getRegisteredAnimations();
      expect(registered).toContain('anim1');
      expect(registered).toContain('anim2');
    });
  });

  describe('unregisterAnimation', () => {
    it('should unregister an animation type', () => {
      manager.registerAnimation('test', testAnimation);
      expect(manager.unregisterAnimation('test')).toBe(true);
      expect(manager.hasAnimation('test')).toBe(false);
    });

    it('should return false for non-existent animation', () => {
      expect(manager.unregisterAnimation('nonexistent')).toBe(false);
    });
  });

  describe('startAnimation', () => {
    beforeEach(() => {
      manager.registerAnimation('test', testAnimation);
    });

    it('should start animation on object', () => {
      const obj = createMockObject3D();
      const id = manager.startAnimation(obj, 'test');
      expect(id).toBeGreaterThan(0);
      expect(manager.isAnimating(obj, 'test')).toBe(true);
    });

    it('should return -1 for null object', () => {
      const id = manager.startAnimation(null, 'test');
      expect(id).toBe(-1);
    });

    it('should return -1 for unregistered animation', () => {
      const obj = createMockObject3D();
      const id = manager.startAnimation(obj, 'nonexistent');
      expect(id).toBe(-1);
    });

    it('should merge options with defaults', () => {
      const obj = createMockObject3D();
      manager.startAnimation(obj, 'test', { customOption: 'value' });
      const state = manager.getAnimationState(obj, 'test');
      expect(state.options.testOption).toBe('default');
      expect(state.options.customOption).toBe('value');
    });

    it('should call init function', () => {
      const obj = createMockObject3D();
      manager.startAnimation(obj, 'test');
      const state = manager.getAnimationState(obj, 'test');
      expect(state.initialized).toBe(true);
    });

    it('should not start duplicate animation', () => {
      const obj = createMockObject3D();
      const id1 = manager.startAnimation(obj, 'test');
      const id2 = manager.startAnimation(obj, 'test');
      expect(id1).toBe(id2);
    });

    it('should allow multiple different animations on same object', () => {
      manager.registerAnimation('test2', testAnimation);
      const obj = createMockObject3D();
      manager.startAnimation(obj, 'test');
      manager.startAnimation(obj, 'test2');
      expect(manager.isAnimating(obj, 'test')).toBe(true);
      expect(manager.isAnimating(obj, 'test2')).toBe(true);
    });
  });

  describe('stopAnimation', () => {
    beforeEach(() => {
      manager.registerAnimation('test', testAnimation);
    });

    it('should mark animation as stopping', () => {
      const obj = createMockObject3D();
      manager.startAnimation(obj, 'test');
      manager.stopAnimation(obj, 'test');
      // Animation should still exist but be in stopping state
      expect(manager.isAnimating(obj, 'test')).toBe(false);
    });

    it('should immediately remove animation when immediate=true', () => {
      const obj = createMockObject3D();
      manager.startAnimation(obj, 'test');
      manager.stopAnimation(obj, 'test', true);
      expect(manager.isAnimating(obj)).toBe(false);
    });

    it('should handle null object gracefully', () => {
      expect(() => manager.stopAnimation(null, 'test')).not.toThrow();
    });
  });

  describe('stopAllAnimations', () => {
    beforeEach(() => {
      manager.registerAnimation('test1', testAnimation);
      manager.registerAnimation('test2', testAnimation);
    });

    it('should stop all animations on object', () => {
      const obj = createMockObject3D();
      manager.startAnimation(obj, 'test1');
      manager.startAnimation(obj, 'test2');

      // Both should be animating
      expect(manager.isAnimating(obj, 'test1')).toBe(true);
      expect(manager.isAnimating(obj, 'test2')).toBe(true);

      // Stop all immediately
      manager.stopAllAnimations(obj, true);

      // Both should be stopped
      expect(manager.isAnimating(obj, 'test1')).toBe(false);
      expect(manager.isAnimating(obj, 'test2')).toBe(false);
    });
  });

  describe('toggleAnimation', () => {
    beforeEach(() => {
      manager.registerAnimation('test', testAnimation);
    });

    it('should start animation when not running', () => {
      const obj = createMockObject3D();
      const result = manager.toggleAnimation(obj, 'test');
      expect(result).toBe(true);
      expect(manager.isAnimating(obj, 'test')).toBe(true);
    });

    it('should stop animation when running', () => {
      const obj = createMockObject3D();
      manager.startAnimation(obj, 'test');
      const result = manager.toggleAnimation(obj, 'test', {}, true);
      expect(result).toBe(false);
      expect(manager.isAnimating(obj, 'test')).toBe(false);
    });

    it('should pass options when starting', () => {
      const obj = createMockObject3D();
      manager.toggleAnimation(obj, 'test', { customOption: 'toggled' });
      const state = manager.getAnimationState(obj, 'test');
      expect(state.options.customOption).toBe('toggled');
    });

    it('should return false for null object', () => {
      const result = manager.toggleAnimation(null, 'test');
      expect(result).toBe(false);
    });
  });

  describe('isAnimating', () => {
    beforeEach(() => {
      manager.registerAnimation('test', testAnimation);
    });

    it('should return true when animation is running', () => {
      const obj = createMockObject3D();
      manager.startAnimation(obj, 'test');
      expect(manager.isAnimating(obj, 'test')).toBe(true);
    });

    it('should return false when no animation', () => {
      const obj = createMockObject3D();
      expect(manager.isAnimating(obj, 'test')).toBe(false);
    });

    it('should check for any animation when name not specified', () => {
      const obj = createMockObject3D();
      manager.startAnimation(obj, 'test');
      expect(manager.isAnimating(obj)).toBe(true);
    });

    it('should return false for null object', () => {
      expect(manager.isAnimating(null)).toBe(false);
    });
  });

  describe('getAnimationState', () => {
    beforeEach(() => {
      manager.registerAnimation('test', testAnimation);
    });

    it('should return state for specific animation', () => {
      const obj = createMockObject3D();
      manager.startAnimation(obj, 'test');
      const state = manager.getAnimationState(obj, 'test');
      expect(state.initialized).toBe(true);
    });

    it('should return all states when name not specified', () => {
      manager.registerAnimation('test2', testAnimation);
      const obj = createMockObject3D();
      manager.startAnimation(obj, 'test');
      manager.startAnimation(obj, 'test2');
      const states = manager.getAnimationState(obj);
      expect(states.test).toBeDefined();
      expect(states.test2).toBeDefined();
    });

    it('should return null for non-animated object', () => {
      const obj = createMockObject3D();
      expect(manager.getAnimationState(obj, 'test')).toBeNull();
    });
  });

  describe('tick', () => {
    beforeEach(() => {
      manager.registerAnimation('test', testAnimation);
    });

    it('should call update function with delta time', () => {
      const obj = createMockObject3D();
      manager.startAnimation(obj, 'test');
      manager.tick(0.016); // ~60fps
      const state = manager.getAnimationState(obj, 'test');
      expect(state.updateCount).toBe(1);
      expect(state.lastDeltaTime).toBe(0.016);
    });

    it('should increment transition progress', () => {
      const obj = createMockObject3D();
      manager.startAnimation(obj, 'test', { transitionDuration: 0.2 });
      manager.tick(0.1); // 50% of transition
      const state = manager.getAnimationState(obj, 'test');
      expect(state.lastTransitionProgress).toBeCloseTo(0.5, 1);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      manager.registerAnimation('test1', testAnimation);
      manager.registerAnimation('test2', testAnimation);

      const obj1 = createMockObject3D();
      const obj2 = createMockObject3D();

      manager.startAnimation(obj1, 'test1');
      manager.startAnimation(obj1, 'test2');
      manager.startAnimation(obj2, 'test1');

      const stats = manager.getStats();
      expect(stats.animatedObjects).toBe(2);
      expect(stats.totalAnimations).toBe(3);
      expect(stats.registeredTypes).toBe(2);
      expect(stats.byType.test1).toBe(2);
      expect(stats.byType.test2).toBe(1);
    });
  });

  describe('clear', () => {
    it('should stop all animations on all objects', () => {
      manager.registerAnimation('test', testAnimation);
      const obj1 = createMockObject3D();
      const obj2 = createMockObject3D();
      manager.startAnimation(obj1, 'test');
      manager.startAnimation(obj2, 'test');

      manager.clear(true);

      expect(manager.isAnimating(obj1)).toBe(false);
      expect(manager.isAnimating(obj2)).toBe(false);
      expect(manager.getStats().animatedObjects).toBe(0);
    });
  });
});

describe('Easing Functions', () => {
  describe('easing object', () => {
    it('should have all expected easing functions', () => {
      expect(typeof easing.linear).toBe('function');
      expect(typeof easing.easeInQuad).toBe('function');
      expect(typeof easing.easeOutQuad).toBe('function');
      expect(typeof easing.easeInOutQuad).toBe('function');
      expect(typeof easing.easeOutCubic).toBe('function');
      expect(typeof easing.easeInCubic).toBe('function');
      expect(typeof easing.easeInOutCubic).toBe('function');
      expect(typeof easing.easeOutElastic).toBe('function');
      expect(typeof easing.easeOutBounce).toBe('function');
    });

    it('should return 0 at t=0 for all functions', () => {
      Object.keys(easing).forEach(name => {
        expect(easing[name](0)).toBeCloseTo(0, 5);
      });
    });

    it('should return 1 at t=1 for all functions', () => {
      Object.keys(easing).forEach(name => {
        expect(easing[name](1)).toBeCloseTo(1, 5);
      });
    });

    it('linear should return input value', () => {
      expect(easing.linear(0.5)).toBe(0.5);
      expect(easing.linear(0.25)).toBe(0.25);
    });
  });

  describe('getEasing', () => {
    it('should return easing function by name', () => {
      const fn = getEasing('easeOutQuad');
      expect(fn).toBe(easing.easeOutQuad);
    });

    it('should return linear for unknown name', () => {
      const fn = getEasing('unknown');
      expect(fn).toBe(easing.linear);
    });

    it('should return function if passed a function', () => {
      const customFn = t => t * t * t;
      const fn = getEasing(customFn);
      expect(fn).toBe(customFn);
    });
  });
});

describe('Built-in Animations', () => {
  let manager;

  beforeEach(() => {
    manager = new AnimationManager();
  });

  afterEach(() => {
    manager.clear(true);
  });

  describe('registerBuiltInAnimations', () => {
    it('should register all built-in animations', () => {
      registerBuiltInAnimations(manager);
      expect(manager.hasAnimation('pulse')).toBe(true);
      expect(manager.hasAnimation('spin')).toBe(true);
      expect(manager.hasAnimation('glow')).toBe(true);
    });
  });

  describe('builtInAnimations', () => {
    it('should export pulse animation module', () => {
      expect(builtInAnimations.pulse.name).toBe('pulse');
      expect(typeof builtInAnimations.pulse.update).toBe('function');
      expect(builtInAnimations.pulse.defaultOptions).toBeDefined();
    });

    it('should export spin animation module', () => {
      expect(builtInAnimations.spin.name).toBe('spin');
      expect(typeof builtInAnimations.spin.update).toBe('function');
      expect(builtInAnimations.spin.defaultOptions).toBeDefined();
    });

    it('should export glow animation module', () => {
      expect(builtInAnimations.glow.name).toBe('glow');
      expect(typeof builtInAnimations.glow.update).toBe('function');
      expect(builtInAnimations.glow.defaultOptions).toBeDefined();
    });
  });

  describe('pulse animation', () => {
    beforeEach(() => {
      registerBuiltInAnimations(manager);
    });

    it('should modify object scale', () => {
      const obj = createMockObject3D();
      manager.startAnimation(obj, 'pulse', { transitionDuration: 0 });
      manager.tick(0.1);
      // Scale should have changed from initial value
      expect(obj.scale.x).not.toBe(1);
    });
  });

  describe('spin animation', () => {
    beforeEach(() => {
      registerBuiltInAnimations(manager);
    });

    it('should modify object rotation', () => {
      const obj = createMockObject3D();
      manager.startAnimation(obj, 'spin', { transitionDuration: 0, axis: 'y' });
      manager.tick(0.1);
      // Rotation should have changed
      expect(obj.rotation.y).not.toBe(0);
    });
  });
});

describe('Animation Integration', () => {
  let manager;

  beforeEach(() => {
    manager = new AnimationManager();
    registerBuiltInAnimations(manager);
  });

  afterEach(() => {
    manager.clear(true);
  });

  it('should support multiple animations on same object', () => {
    const obj = createMockObject3D();
    manager.startAnimation(obj, 'pulse');
    manager.startAnimation(obj, 'spin');

    expect(manager.isAnimating(obj, 'pulse')).toBe(true);
    expect(manager.isAnimating(obj, 'spin')).toBe(true);

    const stats = manager.getStats();
    expect(stats.totalAnimations).toBe(2);
  });

  it('should toggle between running and stopped', () => {
    const obj = createMockObject3D();

    // Start
    expect(manager.toggleAnimation(obj, 'pulse')).toBe(true);
    expect(manager.isAnimating(obj, 'pulse')).toBe(true);

    // Stop
    expect(manager.toggleAnimation(obj, 'pulse', {}, true)).toBe(false);
    expect(manager.isAnimating(obj, 'pulse')).toBe(false);

    // Start again
    expect(manager.toggleAnimation(obj, 'pulse')).toBe(true);
    expect(manager.isAnimating(obj, 'pulse')).toBe(true);
  });

  it('should restore initial values on stop', () => {
    const obj = createMockObject3D();
    const initialScale = obj.scale.x;

    manager.startAnimation(obj, 'pulse', { transitionDuration: 0 });
    manager.tick(0.1);

    // Scale changed
    expect(obj.scale.x).not.toBe(initialScale);

    // Stop immediately
    manager.stopAnimation(obj, 'pulse', true);

    // Scale restored
    expect(obj.scale.x).toBe(initialScale);
  });
});
