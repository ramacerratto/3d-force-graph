/**
 * Built-in Node Object Types
 *
 * This module exports built-in THREE object types and a convenience
 * function to register them with the factory.
 */

import nodeObjectFactory from '../node-object-factory.js';

// Import built-in types
import * as cube from './cube.js';
import * as cone from './cone.js';
import * as cylinder from './cylinder.js';

// Collection of all built-in types
export const builtInTypes = {
  cube,
  cone,
  cylinder
};

/**
 * Register all built-in node object types with the singleton factory
 */
export function registerBuiltInTypes() {
  Object.values(builtInTypes).forEach(typeModule => {
    nodeObjectFactory.registerType(typeModule.typeName, typeModule.create);
  });
}

// Re-export individual types for direct import
export { cube, cone, cylinder };
