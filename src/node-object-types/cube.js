/**
 * Cube Node Object Type
 *
 * Creates a cube/box mesh for nodes.
 *
 * Node properties:
 * - val: affects cube size (default: 1)
 * - color: cube color (default: '#ffffaa')
 * - opacity: cube opacity (default: 0.75)
 * - cubeSize: explicit size override
 */

export const typeName = 'cube';

export function create(node, THREE, factory) {
  const val = node.val || 1;
  const size = node.cubeSize || Math.cbrt(val) * 4;
  const color = node.color || '#ffffaa';
  const opacity = node.opacity !== undefined ? node.opacity : 0.75;

  // Use factory cache for geometry if available
  const geometry = factory
    ? factory.getGeometry(`cube_${size}`, () => new THREE.BoxGeometry(size, size, size))
    : new THREE.BoxGeometry(size, size, size);

  // Use factory cache for material if available
  const materialKey = `lambert_${color}_${opacity}`;
  const material = factory
    ? factory.getMaterial(materialKey, () => new THREE.MeshLambertMaterial({
        color,
        transparent: true,
        opacity
      }))
    : new THREE.MeshLambertMaterial({
        color,
        transparent: true,
        opacity
      });

  return new THREE.Mesh(geometry, material);
}

export default { typeName, create };
