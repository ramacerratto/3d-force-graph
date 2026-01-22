/**
 * Cone Node Object Type
 *
 * Creates a cone mesh for nodes.
 *
 * Node properties:
 * - val: affects cone size (default: 1)
 * - color: cone color (default: '#ffffaa')
 * - opacity: cone opacity (default: 0.75)
 * - coneRadius: explicit radius override
 * - coneHeight: explicit height override
 * - coneSegments: radial segments (default: 8)
 */

export const typeName = 'cone';

export function create(node, THREE, factory) {
  const val = node.val || 1;
  const baseSize = Math.cbrt(val) * 4;
  const radius = node.coneRadius || baseSize / 2;
  const height = node.coneHeight || baseSize;
  const segments = node.coneSegments || 8;
  const color = node.color || '#ffffaa';
  const opacity = node.opacity !== undefined ? node.opacity : 0.75;

  // Use factory cache for geometry if available
  const geometryKey = `cone_${radius}_${height}_${segments}`;
  const geometry = factory
    ? factory.getGeometry(geometryKey, () => new THREE.ConeGeometry(radius, height, segments))
    : new THREE.ConeGeometry(radius, height, segments);

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
