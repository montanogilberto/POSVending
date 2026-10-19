import { IonButton, IonIcon } from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import React from 'react';
import type { DoorSpec } from '../world3d/rooms/doors';
import { WORLD3D_CONFIG } from '../world3d/world3dConstants';
import './MissionMap.css';

interface Vec3Like {
  x: number;
  z: number;
}

/** Matches RoomDefinition3D's shape loosely (id is a plain string there, not RoomId) — this
    component only ever displays name/emoji and compares id against DoorSpec.toRoom, so it doesn't
    need the narrower type. */
interface RoomMeta {
  id: string;
  name: string;
  emoji: string;
}

interface MissionMapProps {
  currentRoom: RoomMeta;
  /** Top-down furniture footprints for the CURRENT room — reuses the same Box3 obstacle list
      Player3D already collides against (room.getObstacles()), so the map can never drift out of
      sync with the actual room layout it's drawn from. */
  obstacles: { min: Vec3Like; max: Vec3Like }[];
  doors: DoorSpec[];
  missionRoom: RoomMeta;
  /** Only meaningful when currentRoom.id === missionRoom.id — item/container positions are in
      that room's own coordinate space (see README §18/§20's inMissionRoom guard). */
  inMissionRoom: boolean;
  itemPosition: Vec3Like;
  containerPosition: Vec3Like;
  itemName: string;
  containerName: string;
  playerPosition: Vec3Like | null;
  onClose: () => void;
}

const { ROOM_SIZE } = WORLD3D_CONFIG;
const SVG_SIZE = 260;
const PADDING = 14;
const SCALE = (SVG_SIZE - PADDING * 2) / ROOM_SIZE;
const HALF = ROOM_SIZE / 2;

const toSvgX = (worldX: number) => PADDING + (worldX + HALF) * SCALE;
const toSvgY = (worldZ: number) => PADDING + (worldZ + HALF) * SCALE;

/**
 * A schematic, not a photo: drawn directly from the same position data the 3D scene already uses
 * (furniture Box3s, door specs, mission item/container coordinates) rather than a second hand-
 * authored floor plan — the map can't fall out of sync with the room it's showing. Deliberately
 * NOT an IonModal for the same reason as VictoryModal (full-bleed overlay, not admin-dialog chrome).
 */
const MissionMap: React.FC<MissionMapProps> = ({
  currentRoom, obstacles, doors, missionRoom, inMissionRoom,
  itemPosition, containerPosition, itemName, containerName, playerPosition, onClose,
}) => {
  const doorToMissionRoom = doors.find((d) => d.toRoom === missionRoom.id);

  return (
    <div className="mission-map">
      <div className="mission-map__card">
        <div className="mission-map__header">
          <div className="mission-map__title">
            {currentRoom.emoji} Estás en: {currentRoom.name}
          </div>
          <IonButton fill="clear" className="mission-map__close" onClick={onClose} aria-label="Cerrar mapa">
            <IonIcon slot="icon-only" icon={closeOutline} />
          </IonButton>
        </div>

        {inMissionRoom ? (
          <p className="mission-map__hint">🔎 {itemName} y su lugar están en este cuarto — mira los puntos abajo.</p>
        ) : (
          <p className="mission-map__hint mission-map__hint--target">
            🔎 {itemName} está en: {missionRoom.emoji} <strong>{missionRoom.name}</strong>
            {doorToMissionRoom ? ` — usa la puerta "${doorToMissionRoom.label}"` : ''}
          </p>
        )}

        <svg viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} className="mission-map__svg" role="img" aria-label={`Mapa de ${currentRoom.name}`}>
          <rect x={PADDING} y={PADDING} width={SVG_SIZE - PADDING * 2} height={SVG_SIZE - PADDING * 2} className="mission-map__floor" />

          {obstacles.map((box, i) => (
            <rect
              key={i}
              x={toSvgX(box.min.x)}
              y={toSvgY(box.min.z)}
              width={Math.max(toSvgX(box.max.x) - toSvgX(box.min.x), 2)}
              height={Math.max(toSvgY(box.max.z) - toSvgY(box.min.z), 2)}
              className="mission-map__furniture"
            />
          ))}

          {doors.map((door) => (
            <g key={door.id} transform={`translate(${toSvgX(door.position.x)}, ${toSvgY(door.position.z)})`}>
              <circle r={7} className={door.toRoom === missionRoom.id && !inMissionRoom ? 'mission-map__door mission-map__door--target' : 'mission-map__door'} />
              <text y={-11} textAnchor="middle" className="mission-map__door-label">🚪 {door.toRoom === missionRoom.id ? missionRoom.name : ''}</text>
            </g>
          ))}

          {inMissionRoom && (
            <>
              <g transform={`translate(${toSvgX(itemPosition.x)}, ${toSvgY(itemPosition.z)})`}>
                <circle r={8} className="mission-map__marker mission-map__marker--item" />
                <text y={4} textAnchor="middle" className="mission-map__marker-emoji">🔎</text>
              </g>
              <g transform={`translate(${toSvgX(containerPosition.x)}, ${toSvgY(containerPosition.z)})`}>
                <circle r={8} className="mission-map__marker mission-map__marker--container" />
                <text y={4} textAnchor="middle" className="mission-map__marker-emoji">🧺</text>
              </g>
            </>
          )}

          {playerPosition && (
            <circle cx={toSvgX(playerPosition.x)} cy={toSvgY(playerPosition.z)} r={6} className="mission-map__player" />
          )}
        </svg>

        {inMissionRoom && (
          <div className="mission-map__legend">
            <span><span className="mission-map__legend-dot mission-map__legend-dot--item" />{itemName}</span>
            <span><span className="mission-map__legend-dot mission-map__legend-dot--container" />{containerName}</span>
            <span><span className="mission-map__legend-dot mission-map__legend-dot--player" />Tú</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MissionMap;
