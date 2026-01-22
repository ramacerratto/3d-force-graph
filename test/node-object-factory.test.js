import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import nodeObjectFactory, { NodeObjectFactory } from '../src/node-object-factory.js';
import { registerBuiltInTypes, builtInTypes } from '../src/node-object-types/index.js';

// Mock THREE.js
const createMockTHREE = () => ({
  Mesh: class Mesh {
    constructor(geometry, material) {
      this.geometry = geometry;
      this.material = material;
      this.visible = true;
    }
  },
  BoxGeometry: class BoxGeometry {
    constructor(w, h, d) {
      this.type = 'BoxGeometry';
      this.width = w;
      this.height = h;
      this.depth = d;
    }
    dispose() { this._disposed = true; }
  },
  ConeGeometry: class ConeGeometry {
    constructor(r, h, s) {
      this.type = 'ConeGeometry';
      this.radius = r;
      this.height = h;
      this.segments = s;
    }
    dispose() { this._disposed = true; }
  },
  CylinderGeometry: class CylinderGeometry {
    constructor(rt, rb, h, s) {
      this.type = 'CylinderGeometry';
      this.radiusTop = rt;
      this.radiusBottom = rb;
      this.height = h;
      this.segments = s;
    }
    dispose() { this._disposed = true; }
  },
  SphereGeometry: class SphereGeometry {
    constructor(r, ws, hs) {
      this.type = 'SphereGeometry';
      this.radius = r;
    }
    dispose() { this._disposed = true; }
  },
  MeshLambertMaterial: class MeshLambertMaterial {
    constructor(params) {
      this.type = 'MeshLambertMaterial';
      this.color = params?.color;
      this.transparent = params?.transparent;
      this.opacity = params?.opacity;
    }
    dispose() { this._disposed = true; }
  }
});

describe('NodeObjectFactory', () => {
  let THREE;

  beforeEach(() => {
    THREE = createMockTHREE();
    nodeObjectFactory.dispose();
  });

  afterEach(() => {
    nodeObjectFactory.dispose();
  });

  describe('Singleton behavior', () => {
    it('should export a singleton instance', () => {
      expect(nodeObjectFactory).toBeDefined();
      expect(typeof nodeObjectFactory.registerType).toBe('function');
    });

    it('should allow creating new instances via class export', () => {
      const factory1 = new NodeObjectFactory();
      const factory2 = new NodeObjectFactory();
      expect(factory1).not.toBe(factory2);
      expect(factory1).not.toBe(nodeObjectFactory);
    });
  });

  describe('Type registration', () => {
    it('should register a new type', () => {
      const creator = (node, THREE) => new THREE.Mesh();
      nodeObjectFactory.registerType('test', creator);
      expect(nodeObjectFactory.hasType('test')).toBe(true);
    });

    it('should list registered types', () => {
      nodeObjectFactory.registerType('type1', () => ({}));
      nodeObjectFactory.registerType('type2', () => ({}));
      const types = nodeObjectFactory.getRegisteredTypes();
      expect(types).toContain('type1');
      expect(types).toContain('type2');
    });

    it('should throw on empty type name', () => {
      expect(() => nodeObjectFactory.registerType('', () => ({}))).toThrow();
    });

    it('should throw on non-string type name', () => {
      expect(() => nodeObjectFactory.registerType(123, () => ({}))).toThrow();
    });

    it('should throw on non-function creator', () => {
      expect(() => nodeObjectFactory.registerType('test', 'not a function')).toThrow();
    });

    it('should unregister a type', () => {
      nodeObjectFactory.registerType('temp', () => ({}));
      expect(nodeObjectFactory.hasType('temp')).toBe(true);
      const result = nodeObjectFactory.unregisterType('temp');
      expect(result).toBe(true);
      expect(nodeObjectFactory.hasType('temp')).toBe(false);
    });

    it('should return false when unregistering non-existent type', () => {
      const result = nodeObjectFactory.unregisterType('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('Built-in types registration', () => {
    it('should register all built-in types', () => {
      registerBuiltInTypes();
      expect(nodeObjectFactory.hasType('cube')).toBe(true);
      expect(nodeObjectFactory.hasType('cone')).toBe(true);
      expect(nodeObjectFactory.hasType('cylinder')).toBe(true);
    });

    it('should have correct built-in type modules', () => {
      expect(builtInTypes.cube.typeName).toBe('cube');
      expect(builtInTypes.cone.typeName).toBe('cone');
      expect(builtInTypes.cylinder.typeName).toBe('cylinder');
      expect(typeof builtInTypes.cube.create).toBe('function');
      expect(typeof builtInTypes.cone.create).toBe('function');
      expect(typeof builtInTypes.cylinder.create).toBe('function');
    });
  });

  describe('Object creation', () => {
    beforeEach(() => {
      registerBuiltInTypes();
    });

    it('should create cube object for node with cube type', () => {
      const node = { id: 1, nodeThreeObjectType: 'cube', color: '#ff0000' };
      const obj = nodeObjectFactory.createObject(node, THREE);
      expect(obj).toBeDefined();
      expect(obj.geometry.type).toBe('BoxGeometry');
    });

    it('should create cone object for node with cone type', () => {
      const node = { id: 2, nodeThreeObjectType: 'cone', color: '#00ff00' };
      const obj = nodeObjectFactory.createObject(node, THREE);
      expect(obj).toBeDefined();
      expect(obj.geometry.type).toBe('ConeGeometry');
    });

    it('should create cylinder object for node with cylinder type', () => {
      const node = { id: 3, nodeThreeObjectType: 'cylinder', color: '#0000ff' };
      const obj = nodeObjectFactory.createObject(node, THREE);
      expect(obj).toBeDefined();
      expect(obj.geometry.type).toBe('CylinderGeometry');
    });

    it('should return null for node without type', () => {
      const node = { id: 4, color: '#ffffff' };
      const obj = nodeObjectFactory.createObject(node, THREE);
      expect(obj).toBeNull();
    });

    it('should return null and warn for unregistered type', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const node = { id: 5, nodeThreeObjectType: 'nonexistent' };
      const obj = nodeObjectFactory.createObject(node, THREE);
      expect(obj).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('nonexistent'));
      warnSpy.mockRestore();
    });

    it('should use custom type attribute', () => {
      nodeObjectFactory.registerType('custom', (node, THREE) => {
        return new THREE.Mesh(new THREE.SphereGeometry(5), new THREE.MeshLambertMaterial());
      });
      const node = { id: 6, myType: 'custom' };
      const obj = nodeObjectFactory.createObject(node, THREE, 'myType');
      expect(obj).toBeDefined();
      expect(obj.geometry.type).toBe('SphereGeometry');
    });

    it('should pass factory to creator function', () => {
      const creatorSpy = vi.fn((node, THREE, factory) => {
        expect(factory).toBe(nodeObjectFactory);
        return new THREE.Mesh();
      });
      nodeObjectFactory.registerType('spyType', creatorSpy);
      const node = { id: 7, nodeThreeObjectType: 'spyType' };
      nodeObjectFactory.createObject(node, THREE);
      expect(creatorSpy).toHaveBeenCalled();
    });
  });

  describe('Accessor creation', () => {
    beforeEach(() => {
      registerBuiltInTypes();
    });

    it('should create accessor function', () => {
      const accessor = nodeObjectFactory.createAccessor(THREE);
      expect(typeof accessor).toBe('function');
    });

    it('should accessor return object for typed node', () => {
      const accessor = nodeObjectFactory.createAccessor(THREE);
      const node = { id: 1, nodeThreeObjectType: 'cube' };
      const obj = accessor(node);
      expect(obj).toBeDefined();
      expect(obj.geometry.type).toBe('BoxGeometry');
    });

    it('should accessor return null for untyped node', () => {
      const accessor = nodeObjectFactory.createAccessor(THREE);
      const node = { id: 2 };
      const obj = accessor(node);
      expect(obj).toBeNull();
    });

    it('should use fallback accessor for untyped nodes', () => {
      const fallbackObj = new THREE.Mesh();
      const accessor = nodeObjectFactory.createAccessor(THREE, () => fallbackObj);
      const node = { id: 3 };
      const obj = accessor(node);
      expect(obj).toBe(fallbackObj);
    });

    it('should use fallback object directly', () => {
      const fallbackObj = new THREE.Mesh();
      const accessor = nodeObjectFactory.createAccessor(THREE, fallbackObj);
      const node = { id: 4 };
      const obj = accessor(node);
      expect(obj).toBe(fallbackObj);
    });
  });

  describe('Geometry and material caching', () => {
    it('should cache and reuse geometry', () => {
      let createCount = 0;
      const geom1 = nodeObjectFactory.getGeometry('test_geom', () => {
        createCount++;
        return new THREE.BoxGeometry(1, 1, 1);
      });
      const geom2 = nodeObjectFactory.getGeometry('test_geom', () => {
        createCount++;
        return new THREE.BoxGeometry(1, 1, 1);
      });
      expect(geom1).toBe(geom2);
      expect(createCount).toBe(1);
    });

    it('should cache and reuse material', () => {
      let createCount = 0;
      const mat1 = nodeObjectFactory.getMaterial('test_mat', () => {
        createCount++;
        return new THREE.MeshLambertMaterial({ color: '#fff' });
      });
      const mat2 = nodeObjectFactory.getMaterial('test_mat', () => {
        createCount++;
        return new THREE.MeshLambertMaterial({ color: '#fff' });
      });
      expect(mat1).toBe(mat2);
      expect(createCount).toBe(1);
    });

    it('should create different cache entries for different keys', () => {
      const geom1 = nodeObjectFactory.getGeometry('key1', () => new THREE.BoxGeometry(1, 1, 1));
      const geom2 = nodeObjectFactory.getGeometry('key2', () => new THREE.BoxGeometry(2, 2, 2));
      expect(geom1).not.toBe(geom2);
      expect(geom1.width).toBe(1);
      expect(geom2.width).toBe(2);
    });
  });

  describe('Object pooling and lifecycle', () => {
    beforeEach(() => {
      registerBuiltInTypes();
    });

    it('should track active objects', () => {
      const node1 = { id: 'n1', nodeThreeObjectType: 'cube' };
      const node2 = { id: 'n2', nodeThreeObjectType: 'cone' };
      nodeObjectFactory.createObject(node1, THREE);
      nodeObjectFactory.createObject(node2, THREE);
      const stats = nodeObjectFactory.getStats();
      expect(stats.activeObjects).toBe(2);
    });

    it('should release object back to pool', () => {
      const node = { id: 'pooltest', nodeThreeObjectType: 'cube' };
      const obj = nodeObjectFactory.createObject(node, THREE);
      expect(obj.visible).toBe(true);

      nodeObjectFactory.releaseObject('pooltest');
      expect(obj.visible).toBe(false);

      const stats = nodeObjectFactory.getStats();
      expect(stats.activeObjects).toBe(0);
      expect(stats.pooledObjects['cube']).toBe(1);
    });

    it('should reuse pooled objects', () => {
      const node1 = { id: 'first', nodeThreeObjectType: 'cube' };
      const obj1 = nodeObjectFactory.createObject(node1, THREE);
      nodeObjectFactory.releaseObject('first');

      const node2 = { id: 'second', nodeThreeObjectType: 'cube' };
      const obj2 = nodeObjectFactory.createObject(node2, THREE);

      expect(obj2).toBe(obj1);
      expect(obj2.visible).toBe(true);
    });

    it('should clear pools', () => {
      const node = { id: 'cleartest', nodeThreeObjectType: 'cube' };
      nodeObjectFactory.createObject(node, THREE);
      nodeObjectFactory.releaseObject('cleartest');

      let stats = nodeObjectFactory.getStats();
      expect(stats.pooledObjects['cube']).toBe(1);

      nodeObjectFactory.clearPools();
      stats = nodeObjectFactory.getStats();
      expect(stats.pooledObjects['cube']).toBe(0);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      registerBuiltInTypes();
    });

    it('should return correct statistics', () => {
      nodeObjectFactory.getGeometry('g1', () => new THREE.BoxGeometry(1, 1, 1));
      nodeObjectFactory.getGeometry('g2', () => new THREE.BoxGeometry(2, 2, 2));
      nodeObjectFactory.getMaterial('m1', () => new THREE.MeshLambertMaterial());

      const node1 = { id: 1, nodeThreeObjectType: 'cube' };
      const node2 = { id: 2, nodeThreeObjectType: 'cone' };
      nodeObjectFactory.createObject(node1, THREE);
      nodeObjectFactory.createObject(node2, THREE);
      nodeObjectFactory.releaseObject(1);

      const stats = nodeObjectFactory.getStats();
      expect(stats.registeredTypes).toBe(3);
      expect(stats.activeObjects).toBe(1);
      expect(stats.cachedGeometries).toBeGreaterThanOrEqual(2);
      expect(stats.cachedMaterials).toBeGreaterThanOrEqual(1);
      expect(stats.pooledObjects['cube']).toBe(1);
    });
  });

  describe('Cleanup and disposal', () => {
    it('should clear all state', () => {
      registerBuiltInTypes();
      nodeObjectFactory.getGeometry('g', () => new THREE.BoxGeometry(1, 1, 1));
      const node = { id: 1, nodeThreeObjectType: 'cube' };
      nodeObjectFactory.createObject(node, THREE);

      nodeObjectFactory.clear();

      expect(nodeObjectFactory.hasType('cube')).toBe(false);
      expect(nodeObjectFactory.getRegisteredTypes()).toHaveLength(0);
      const stats = nodeObjectFactory.getStats();
      expect(stats.activeObjects).toBe(0);
    });

    it('should dispose cache', () => {
      nodeObjectFactory.getGeometry('g', () => new THREE.BoxGeometry(1, 1, 1));
      nodeObjectFactory.getMaterial('m', () => new THREE.MeshLambertMaterial());

      let stats = nodeObjectFactory.getStats();
      expect(stats.cachedGeometries).toBe(1);
      expect(stats.cachedMaterials).toBe(1);

      nodeObjectFactory.disposeCache();

      stats = nodeObjectFactory.getStats();
      expect(stats.cachedGeometries).toBe(0);
      expect(stats.cachedMaterials).toBe(0);
    });

    it('should dispose everything', () => {
      registerBuiltInTypes();
      nodeObjectFactory.getGeometry('g', () => new THREE.BoxGeometry(1, 1, 1));
      const node = { id: 1, nodeThreeObjectType: 'cube' };
      nodeObjectFactory.createObject(node, THREE);
      nodeObjectFactory.releaseObject(1);

      nodeObjectFactory.dispose();

      const stats = nodeObjectFactory.getStats();
      expect(stats.registeredTypes).toBe(0);
      expect(stats.activeObjects).toBe(0);
      expect(stats.cachedGeometries).toBe(0);
      expect(stats.cachedMaterials).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should handle creator function errors gracefully', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      nodeObjectFactory.registerType('errorType', () => {
        throw new Error('Creator error');
      });
      const node = { id: 1, nodeThreeObjectType: 'errorType' };
      const obj = nodeObjectFactory.createObject(node, THREE);
      expect(obj).toBeNull();
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should handle release of non-existent object', () => {
      expect(() => nodeObjectFactory.releaseObject('nonexistent')).not.toThrow();
    });
  });

  describe('Custom type registration', () => {
    it('should allow registering and using custom types', () => {
      nodeObjectFactory.registerType('diamond', (node, THREE, factory) => {
        const size = node.size || 5;
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshLambertMaterial({ color: node.color || '#fff' });
        return new THREE.Mesh(geometry, material);
      });

      const node = { id: 1, nodeThreeObjectType: 'diamond', size: 10, color: '#ff00ff' };
      const obj = nodeObjectFactory.createObject(node, THREE);

      expect(obj).toBeDefined();
      expect(obj.geometry.width).toBe(10);
      expect(obj.material.color).toBe('#ff00ff');
    });

    it('should allow custom types to use factory caching', () => {
      let geomCreateCount = 0;

      nodeObjectFactory.registerType('cachedType', (node, THREE, factory) => {
        const geometry = factory.getGeometry('shared_geom', () => {
          geomCreateCount++;
          return new THREE.SphereGeometry(5);
        });
        const material = new THREE.MeshLambertMaterial();
        return new THREE.Mesh(geometry, material);
      });

      const node1 = { id: 1, nodeThreeObjectType: 'cachedType' };
      const node2 = { id: 2, nodeThreeObjectType: 'cachedType' };
      nodeObjectFactory.createObject(node1, THREE);
      nodeObjectFactory.createObject(node2, THREE);

      expect(geomCreateCount).toBe(1);
    });
  });
});
