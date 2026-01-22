/**
 * Node Object Factory (Singleton)
 *
 * A factory to manage different THREE.js objects for node representations.
 * Provides object pooling and lifecycle management for memory optimization.
 * Nodes can specify a `nodeThreeObjectType` attribute to use a registered type.
 */

class NodeObjectFactory {
  constructor() {
    // Registry of node object creators indexed by type name
    this._typeRegistry = new Map();

    // Object pools for reusing disposed objects (indexed by type name)
    this._objectPools = new Map();

    // Track active objects by node id for lifecycle management
    this._activeObjects = new Map();

    // Geometry and material caches for memory optimization
    this._geometryCache = new Map();
    this._materialCache = new Map();
  }

  /**
   * Register a THREE object creator function for a given type name
   * @param {string} typeName - The type name to register
   * @param {Function} creatorFn - Function (node, THREE, factory) => THREE.Object3D
   */
  registerType(typeName, creatorFn) {
    if (typeof typeName !== 'string' || !typeName) {
      throw new Error('typeName must be a non-empty string');
    }
    if (typeof creatorFn !== 'function') {
      throw new Error('creatorFn must be a function');
    }
    this._typeRegistry.set(typeName, creatorFn);
    // Initialize pool for this type
    if (!this._objectPools.has(typeName)) {
      this._objectPools.set(typeName, []);
    }
  }

  /**
   * Unregister a THREE object type and dispose its pooled objects
   * @param {string} typeName - The type name to unregister
   * @returns {boolean} - Whether the type was found and removed
   */
  unregisterType(typeName) {
    // Dispose pooled objects for this type
    const pool = this._objectPools.get(typeName);
    if (pool) {
      pool.forEach(obj => this._disposeObject(obj));
      this._objectPools.delete(typeName);
    }
    return this._typeRegistry.delete(typeName);
  }

  /**
   * Check if a type is registered
   * @param {string} typeName - The type name to check
   * @returns {boolean}
   */
  hasType(typeName) {
    return this._typeRegistry.has(typeName);
  }

  /**
   * Get all registered type names
   * @returns {string[]}
   */
  getRegisteredTypes() {
    return Array.from(this._typeRegistry.keys());
  }

  /**
   * Get or create a cached geometry
   * @param {string} key - Cache key for the geometry
   * @param {Function} createFn - Function to create geometry if not cached
   * @returns {THREE.BufferGeometry}
   */
  getGeometry(key, createFn) {
    if (!this._geometryCache.has(key)) {
      this._geometryCache.set(key, createFn());
    }
    return this._geometryCache.get(key);
  }

  /**
   * Get or create a cached material
   * @param {string} key - Cache key for the material
   * @param {Function} createFn - Function to create material if not cached
   * @returns {THREE.Material}
   */
  getMaterial(key, createFn) {
    if (!this._materialCache.has(key)) {
      this._materialCache.set(key, createFn());
    }
    return this._materialCache.get(key);
  }

  /**
   * Create a THREE object for a node based on its type
   * @param {object} node - The node data object
   * @param {object} THREE - The THREE.js library reference
   * @param {string} [typeAttribute='nodeThreeObjectType'] - The node attribute to read the type from
   * @returns {THREE.Object3D|null} - The created object or null if no type specified/found
   */
  createObject(node, THREE, typeAttribute = 'nodeThreeObjectType') {
    const typeName = node[typeAttribute];

    if (!typeName) {
      return null; // No type specified, use default
    }

    const creatorFn = this._typeRegistry.get(typeName);

    if (!creatorFn) {
      console.warn(`Node object type "${typeName}" not registered. Using default.`);
      return null;
    }

    try {
      // Try to get object from pool first
      const pool = this._objectPools.get(typeName);
      let obj;

      if (pool && pool.length > 0) {
        obj = pool.pop();
        obj.visible = true;
      } else {
        // Create new object, passing factory for cache access
        obj = creatorFn(node, THREE, this);
      }

      // Track active object by node id
      const nodeId = node.id !== undefined ? node.id : node;
      this._activeObjects.set(nodeId, { object: obj, typeName });

      return obj;
    } catch (error) {
      console.error(`Error creating node object of type "${typeName}":`, error);
      return null;
    }
  }

  /**
   * Release an object back to the pool for reuse
   * @param {string|number} nodeId - The node id whose object to release
   */
  releaseObject(nodeId) {
    const entry = this._activeObjects.get(nodeId);
    if (entry) {
      const { object, typeName } = entry;
      object.visible = false;

      const pool = this._objectPools.get(typeName);
      if (pool) {
        pool.push(object);
      }

      this._activeObjects.delete(nodeId);
    }
  }

  /**
   * Dispose an object and free its resources
   * @param {THREE.Object3D} obj - The object to dispose
   */
  _disposeObject(obj) {
    if (obj.geometry && !this._geometryCache.has(obj.geometry)) {
      obj.geometry.dispose();
    }
    if (obj.material && !this._materialCache.has(obj.material)) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
  }

  /**
   * Clear all pools and dispose pooled objects
   */
  clearPools() {
    this._objectPools.forEach((pool, typeName) => {
      pool.forEach(obj => this._disposeObject(obj));
      pool.length = 0;
    });
  }

  /**
   * Clear all registered types and dispose resources
   */
  clear() {
    this.clearPools();
    this._typeRegistry.clear();
    this._objectPools.clear();
    this._activeObjects.clear();
  }

  /**
   * Dispose all cached geometries and materials
   */
  disposeCache() {
    this._geometryCache.forEach(geom => geom.dispose());
    this._geometryCache.clear();

    this._materialCache.forEach(mat => mat.dispose());
    this._materialCache.clear();
  }

  /**
   * Full cleanup - dispose everything
   */
  dispose() {
    this.clear();
    this.disposeCache();
  }

  /**
   * Create a nodeThreeObject accessor function that uses the factory
   * @param {object} THREE - The THREE.js library reference
   * @param {Function} [fallbackAccessor] - Optional fallback accessor for nodes without a type
   * @param {string} [typeAttribute='nodeThreeObjectType'] - The node attribute to read the type from
   * @returns {Function} - An accessor function compatible with nodeThreeObject
   */
  createAccessor(THREE, fallbackAccessor = null, typeAttribute = 'nodeThreeObjectType') {
    return (node) => {
      const factoryObject = this.createObject(node, THREE, typeAttribute);

      if (factoryObject) {
        return factoryObject;
      }

      // Use fallback accessor if provided
      if (fallbackAccessor) {
        return typeof fallbackAccessor === 'function'
          ? fallbackAccessor(node)
          : fallbackAccessor;
      }

      return null; // Use default sphere
    };
  }

  /**
   * Get statistics about the factory state
   * @returns {object}
   */
  getStats() {
    const poolStats = {};
    this._objectPools.forEach((pool, typeName) => {
      poolStats[typeName] = pool.length;
    });

    return {
      registeredTypes: this._typeRegistry.size,
      activeObjects: this._activeObjects.size,
      pooledObjects: poolStats,
      cachedGeometries: this._geometryCache.size,
      cachedMaterials: this._materialCache.size
    };
  }
}

// Singleton instance
const instance = new NodeObjectFactory();

// Export singleton instance
export default instance;

// Export class for testing or multiple instances if needed
export { NodeObjectFactory };
