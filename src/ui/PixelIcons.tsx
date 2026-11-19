/**
 * Hand-crafted crisp pixel-art inline SVG icons (shape-rendering="crispEdges")
 * matched 1-to-1 to the 32-color isometric voxel world.
 */

interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

export function PixelIcon({ name, size = 20, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
    >
      {renderIconPixels(name)}
    </svg>
  );
}

function renderIconPixels(name: string) {
  switch (name) {
    // === HUD CATEGORIES ===
    case 'build':
      return (
        <>
          <rect x="2" y="9" width="12" height="5" fill="#cf8d59" />
          <rect x="2" y="9" width="12" height="1" fill="#ffe478" />
          <rect x="4" y="4" width="8" height="5" fill="#e6b84c" />
          <rect x="6" y="2" width="4" height="2" fill="#e0534f" />
          <rect x="1" y="13" width="14" height="2" fill="#14121d" />
        </>
      );
    case 'staff':
      return (
        <>
          <rect x="5" y="2" width="6" height="2" fill="#3d241d" />
          <rect x="5" y="4" width="6" height="4" fill="#f5d5b8" />
          <rect x="6" y="5" width="1" height="1" fill="#14121d" />
          <rect x="9" y="5" width="1" height="1" fill="#14121d" />
          <rect x="4" y="8" width="8" height="5" fill="#4ea8de" />
          <rect x="5" y="13" width="2" height="2" fill="#1f2233" />
          <rect x="9" y="13" width="2" height="2" fill="#1f2233" />
        </>
      );
    case 'research':
      return (
        <>
          <rect x="6" y="2" width="4" height="2" fill="#b8c0cf" />
          <rect x="7" y="4" width="2" height="3" fill="#8de4ff" />
          <rect x="5" y="7" width="6" height="3" fill="#4ea8de" />
          <rect x="3" y="10" width="10" height="4" fill="#8ce063" />
          <rect x="4" y="11" width="2" height="2" fill="#c2f7a8" />
        </>
      );
    case 'data':
      return (
        <>
          <rect x="3" y="2" width="10" height="3" fill="#e6b84c" />
          <rect x="4" y="3" width="8" height="1" fill="#ffe478" />
          <rect x="3" y="6" width="10" height="3" fill="#4ea8de" />
          <rect x="4" y="7" width="8" height="1" fill="#8de4ff" />
          <rect x="3" y="10" width="10" height="4" fill="#3b73b5" />
          <rect x="10" y="11" width="2" height="1" fill="#8ce063" />
        </>
      );
    case 'models':
      return (
        <>
          <rect x="2" y="3" width="3" height="3" fill="#4ea8de" />
          <rect x="2" y="10" width="3" height="3" fill="#4ea8de" />
          <rect x="7" y="6" width="3" height="4" fill="#e6b84c" />
          <rect x="12" y="4" width="3" height="3" fill="#8ce063" />
          <rect x="12" y="9" width="3" height="3" fill="#9966cc" />
          <rect x="5" y="5" width="2" height="1" fill="#faf7eb" />
          <rect x="5" y="10" width="2" height="1" fill="#faf7eb" />
          <rect x="10" y="6" width="2" height="1" fill="#faf7eb" />
          <rect x="10" y="9" width="2" height="1" fill="#faf7eb" />
        </>
      );
    case 'finance':
      return (
        <>
          <rect x="2" y="11" width="3" height="3" fill="#4da858" />
          <rect x="6" y="8" width="3" height="6" fill="#8ce063" />
          <rect x="10" y="4" width="3" height="10" fill="#e6b84c" />
          <rect x="10" y="3" width="3" height="1" fill="#ffe478" />
          <rect x="1" y="14" width="14" height="1" fill="#faf7eb" />
        </>
      );
    case 'rivals':
      return (
        <>
          <rect x="4" y="2" width="8" height="5" fill="#e6b84c" />
          <rect x="2" y="3" width="2" height="3" fill="#ffe478" />
          <rect x="12" y="3" width="2" height="3" fill="#ffe478" />
          <rect x="6" y="7" width="4" height="3" fill="#cf8d59" />
          <rect x="5" y="10" width="6" height="2" fill="#e6b84c" />
          <rect x="3" y="12" width="10" height="2" fill="#6b3b2a" />
        </>
      );
    case 'settings':
      return (
        <>
          <rect x="6" y="2" width="4" height="12" fill="#b8c0cf" />
          <rect x="2" y="6" width="12" height="4" fill="#b8c0cf" />
          <rect x="4" y="4" width="8" height="8" fill="#8c96ab" />
          <rect x="6" y="6" width="4" height="4" fill="#14121d" />
        </>
      );

    // === RESOURCES ===
    case 'cash':
      return (
        <>
          <rect x="2" y="4" width="12" height="8" fill="#2f6e49" />
          <rect x="3" y="5" width="10" height="6" fill="#4da858" />
          <rect x="7" y="6" width="2" height="4" fill="#ffe478" />
          <rect x="6" y="7" width="4" height="2" fill="#ffe478" />
        </>
      );
    case 'compute':
      return (
        <>
          <rect x="4" y="4" width="8" height="8" fill="#2e344b" />
          <rect x="5" y="5" width="6" height="6" fill="#4ea8de" />
          <rect x="6" y="6" width="4" height="4" fill="#8de4ff" />
          <rect x="6" y="2" width="1" height="2" fill="#e6b84c" />
          <rect x="9" y="2" width="1" height="2" fill="#e6b84c" />
          <rect x="6" y="12" width="1" height="2" fill="#e6b84c" />
          <rect x="9" y="12" width="1" height="2" fill="#e6b84c" />
          <rect x="2" y="6" width="2" height="1" fill="#e6b84c" />
          <rect x="2" y="9" width="2" height="1" fill="#e6b84c" />
          <rect x="12" y="6" width="2" height="1" fill="#e6b84c" />
          <rect x="12" y="9" width="2" height="1" fill="#e6b84c" />
        </>
      );
    case 'power':
      return (
        <>
          <rect x="8" y="1" width="4" height="2" fill="#ffe478" />
          <rect x="6" y="3" width="4" height="3" fill="#ffe478" />
          <rect x="4" y="6" width="8" height="3" fill="#e6b84c" />
          <rect x="7" y="9" width="4" height="3" fill="#e6b84c" />
          <rect x="5" y="12" width="4" height="3" fill="#f59876" />
        </>
      );
    case 'cooling':
      return (
        <>
          <rect x="7" y="2" width="2" height="12" fill="#8de4ff" />
          <rect x="2" y="7" width="12" height="2" fill="#8de4ff" />
          <rect x="4" y="4" width="2" height="2" fill="#4ea8de" />
          <rect x="10" y="4" width="2" height="2" fill="#4ea8de" />
          <rect x="4" y="10" width="2" height="2" fill="#4ea8de" />
          <rect x="10" y="10" width="2" height="2" fill="#4ea8de" />
        </>
      );
    case 'rep':
      return (
        <>
          <rect x="7" y="1" width="2" height="4" fill="#ffe478" />
          <rect x="2" y="5" width="12" height="3" fill="#e6b84c" />
          <rect x="4" y="8" width="8" height="3" fill="#e6b84c" />
          <rect x="3" y="11" width="3" height="3" fill="#cf8d59" />
          <rect x="10" y="11" width="3" height="3" fill="#cf8d59" />
        </>
      );

    // === BUILD CATALOG ITEMS ===
    case 'floor_garage':
    case 'floor_lab':
    case 'floor_server':
    case 'floor_lounge': {
      const col =
        name === 'floor_lab'
          ? '#e6e2d3'
          : name === 'floor_server'
            ? '#2e6e70'
            : name === 'floor_lounge'
              ? '#cf8d59'
              : '#8c96ab';
      return (
        <>
          <rect x="2" y="4" width="12" height="8" fill={col} />
          <rect x="3" y="5" width="10" height="1" fill="#faf7eb" opacity="0.5" />
          <rect x="2" y="11" width="12" height="2" fill="#14121d" opacity="0.5" />
        </>
      );
    }
    case 'desk_basic':
    case 'desk_pro':
      return (
        <>
          <rect x="4" y="2" width="8" height="5" fill="#1f2233" />
          <rect x="5" y="3" width="6" height="3" fill="#4ea8de" />
          <rect x="2" y="8" width="12" height="3" fill={name === 'desk_pro' ? '#b8c0cf' : '#cf8d59'} />
          <rect x="3" y="11" width="2" height="4" fill="#2e344b" />
          <rect x="11" y="11" width="2" height="4" fill="#2e344b" />
        </>
      );
    case 'whiteboard':
      return (
        <>
          <rect x="2" y="2" width="12" height="8" fill="#65708a" />
          <rect x="3" y="3" width="10" height="6" fill="#faf7eb" />
          <rect x="4" y="5" width="2" height="2" fill="#3b73b5" />
          <rect x="8" y="4" width="3" height="2" fill="#e0534f" />
          <rect x="4" y="10" width="2" height="4" fill="#45506b" />
          <rect x="10" y="10" width="2" height="4" fill="#45506b" />
        </>
      );
    case 'coffee_machine':
      return (
        <>
          <rect x="4" y="2" width="8" height="6" fill="#a82c3a" />
          <rect x="5" y="3" width="6" height="2" fill="#b8c0cf" />
          <rect x="3" y="8" width="10" height="6" fill="#6b3b2a" />
          <rect x="10" y="6" width="2" height="2" fill="#faf7eb" />
        </>
      );
    case 'gpu_rig_2010':
    case 'server_rack':
    case 'tensor_pod':
    case 'liquid_cluster': {
      const top =
        name === 'gpu_rig_2010'
          ? '#4da858'
          : name === 'tensor_pod'
            ? '#e6b84c'
            : name === 'liquid_cluster'
              ? '#9966cc'
              : '#3b73b5';
      return (
        <>
          <rect x="3" y="2" width="10" height="12" fill="#1f2233" />
          <rect x="3" y="2" width="10" height="2" fill={top} />
          <rect x="5" y="5" width="6" height="2" fill="#2e344b" />
          <rect x="5" y="8" width="6" height="2" fill="#2e344b" />
          <rect x="5" y="11" width="6" height="2" fill="#2e344b" />
          <rect x="10" y="5" width="2" height="1" fill="#8ce063" />
          <rect x="10" y="8" width="2" height="1" fill="#8de4ff" />
          <rect x="10" y="11" width="2" height="1" fill="#ffe478" />
        </>
      );
    }
    case 'ac_unit':
    case 'cooling_tower':
      return (
        <>
          <rect x="3" y="3" width="10" height="11" fill="#e6e2d3" />
          <rect x="3" y="3" width="10" height="2" fill="#4ea8de" />
          <rect x="5" y="6" width="6" height="4" fill="#2e344b" />
          <rect x="6" y="7" width="4" height="2" fill="#8de4ff" />
        </>
      );
    case 'power_gen':
    case 'substation':
      return (
        <>
          <rect x="3" y="4" width="10" height="9" fill="#e6b84c" />
          <rect x="5" y="2" width="2" height="2" fill="#65708a" />
          <rect x="9" y="2" width="2" height="2" fill="#f59876" />
          <rect x="5" y="7" width="6" height="3" fill="#2e344b" />
          <rect x="2" y="13" width="12" height="2" fill="#1f2233" />
        </>
      );
    case 'wall_glass':
      return (
        <>
          <rect x="2" y="2" width="12" height="12" fill="#45506b" />
          <rect x="4" y="4" width="8" height="6" fill="#8de4ff" />
          <rect x="3" y="10" width="10" height="4" fill="#e6e2d3" />
        </>
      );
    case 'potted_plant':
      return (
        <>
          <rect x="5" y="2" width="6" height="5" fill="#4da858" />
          <rect x="4" y="4" width="8" height="3" fill="#2f6e49" />
          <rect x="7" y="7" width="2" height="3" fill="#6b3b2a" />
          <rect x="5" y="10" width="6" height="4" fill="#9e5e3b" />
        </>
      );
    case 'bookshelf_posters':
      return (
        <>
          <rect x="3" y="2" width="10" height="12" fill="#6b3b2a" />
          <rect x="4" y="3" width="2" height="3" fill="#e0534f" />
          <rect x="7" y="3" width="2" height="3" fill="#4ea8de" />
          <rect x="10" y="3" width="2" height="3" fill="#e6b84c" />
          <rect x="4" y="8" width="2" height="3" fill="#4da858" />
          <rect x="7" y="8" width="2" height="3" fill="#9966cc" />
          <rect x="10" y="8" width="2" height="3" fill="#faf7eb" />
        </>
      );
    default:
      return <rect x="3" y="3" width="10" height="10" fill="#8c96ab" />;
  }
}
