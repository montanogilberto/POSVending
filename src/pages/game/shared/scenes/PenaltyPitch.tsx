import React from 'react';

interface PenaltyPitchProps {
  /** Esquina a la que se tiro (0-4), capturada al cobrar; null antes del primer tiro. */
  shotZone: number | null;
  /** Esquina a la que se lanzo el portero segun el servidor; null antes del primer tiro. */
  keeperZone: number | null;
  /** Resultado del ultimo tiro segun el servidor; null antes del primer tiro. */
  scored: boolean | null;
  /** Cambia en cada tiro para reiniciar las animaciones. */
  sceneKey: string;
  /** Los botones de zona: se pintan SOBRE la porteria. */
  children: React.ReactNode;
}

const NET_LINES = Array.from({ length: 12 }, (_, i) => i);

const Keeper: React.FC = () => (
  <svg viewBox="0 0 44 64" role="presentation" aria-hidden="true">
    {/* Piernas y short */}
    <rect x="12" y="38" width="8" height="22" rx="3" fill="#1f2a44" />
    <rect x="24" y="38" width="8" height="22" rx="3" fill="#1f2a44" />
    <rect x="10" y="30" width="24" height="12" rx="4" fill="#111827" />
    {/* Camiseta y brazos abiertos */}
    <rect x="11" y="14" width="22" height="22" rx="6" fill="#f59e0b" />
    <path d="M12 18 L2 8" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" />
    <path d="M32 18 L42 8" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" />
    {/* Guantes */}
    <circle cx="2.5" cy="7" r="4.4" fill="#ef4444" />
    <circle cx="41.5" cy="7" r="4.4" fill="#ef4444" />
    {/* Cabeza */}
    <circle cx="22" cy="9" r="7" fill="#f3c9a0" />
    <path d="M15 8 Q22 0 29 8 Q22 4 15 8" fill="#3b2a1a" />
  </svg>
);

const Ball: React.FC = () => (
  <svg viewBox="0 0 40 40" role="presentation" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="#fff" stroke="#1f2937" strokeWidth="2" />
    <polygon points="20,10 27,15 24,23 16,23 13,15" fill="#1f2937" />
    <path d="M20 10 V3 M27 15 L34 12 M24 23 L29 30 M16 23 L11 30 M13 15 L6 12"
      stroke="#1f2937" strokeWidth="2" />
  </svg>
);

/**
 * Escena de penal: cancha, porteria con red, portero que se avienta y balon
 * que vuela a la esquina elegida. Todo lo que pasa (a donde se tira el
 * portero, si entra) viene del estado del servidor; aqui solo se dibuja.
 */
const PenaltyPitch: React.FC<PenaltyPitchProps> = ({
  shotZone, keeperZone, scored, sceneKey, children,
}) => {
  const kicked = shotZone !== null && keeperZone !== null;
  return (
    <div className="scn-pitch">
      <svg className="scn-pitch__bg" viewBox="0 0 300 190" preserveAspectRatio="xMidYMid slice"
        role="presentation" aria-hidden="true">
        <defs>
          <linearGradient id="pk-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7cc4ff" />
            <stop offset="100%" stopColor="#d7f0ff" />
          </linearGradient>
        </defs>
        <rect width="300" height="190" fill="url(#pk-sky)" />
        <rect y="86" width="300" height="104" fill="#3aa655" />
        {[0, 1, 2, 3, 4, 5].map(i => (
          <rect key={i} y={86 + i * 17.4} width="300" height="8.7" fill="#43b862" opacity="0.7" />
        ))}
        {/* Area chica y punto de penal */}
        <path d="M30 190 L58 112 H242 L270 190" fill="none" stroke="#fff" strokeWidth="2" opacity="0.8" />
        <circle cx="150" cy="163" r="2.6" fill="#fff" />
        {/* Red */}
        <rect x="40" y="25" width="220" height="100" fill="#0f172a" opacity="0.18" />
        {NET_LINES.map(i => (
          <line key={`v${i}`} x1={40 + i * 20} y1="25" x2={40 + i * 20} y2="125"
            stroke="#fff" strokeWidth="0.8" opacity="0.55" />
        ))}
        {[0, 1, 2, 3, 4].map(i => (
          <line key={`h${i}`} x1="40" y1={25 + i * 25} x2="260" y2={25 + i * 25}
            stroke="#fff" strokeWidth="0.8" opacity="0.55" />
        ))}
        {/* Postes y travesano */}
        <path d="M40 125 V25 H260 V125" fill="none" stroke="#fff" strokeWidth="6"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <div className="scn-goal">
        <div
          key={`keeper-${sceneKey}`}
          className={`scn-keeper${keeperZone !== null ? ` scn-keeper--z${keeperZone}` : ''}`}
        >
          <Keeper />
        </div>
        {children}
      </div>

      <div
        key={`ball-${sceneKey}`}
        className={`scn-ball${kicked ? ` scn-ball--z${shotZone}${scored ? '' : ' scn-ball--saved'}` : ''}`}
      >
        <Ball />
      </div>
    </div>
  );
};

export default PenaltyPitch;
