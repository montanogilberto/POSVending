/**
 * ArcadeView — solo presentacion (MVVM).
 * Sin fetch ni logica de negocio: todo viene de useArcade().
 */
import React from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonIcon, IonToast, IonSpinner, IonList, IonItem, IonLabel, IonBadge,
} from '@ionic/react';
import {
  gameControllerOutline, timeOutline, informationCircle,
} from 'ionicons/icons';
import EmptyState from '../../../components/ui/EmptyState';
import StatusBadge from '../../../components/ui/StatusBadge';
import { ARCADE_OUTCOME } from '../../../components/ui/statusMaps';
import { fmtInt, mxDate } from '../../../utils/format';
import { useArcade } from './ArcadeLogic';
import { CATEGORY_LABELS } from './ArcadeConstants';
import CoinWalletHero from './components/CoinWalletHero';
import GameTile from './components/GameTile';
import GameRail from './components/GameRail';
import LiveWinsTicker from './components/LiveWinsTicker';

const ArcadeView: React.FC = () => {
  const vm = useArcade();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>
            <span className="arc-badge">
              <IonIcon icon={gameControllerOutline} />
            </span>
            Arcade
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="arc-content">
        <IonToast {...vm.toastProps} />

        {vm.loading ? (
          <div className="arc-loading">
            <IonSpinner name="dots" />
          </div>
        ) : (
          <>
            <CoinWalletHero vm={vm} />

            <div className="arc-disclaimer">
              <IonIcon icon={informationCircle} />
              <p>Las fichas son solo para jugar. No son dinero y no se canjean.</p>
            </div>

            <LiveWinsTicker wins={vm.liveWins} />

            <GameRail
              title="Seguir jugando"
              subtitle={`${vm.recentlyPlayed.length}`}
              tiles={vm.recentlyPlayed}
              onOpen={vm.openGame}
            />

            <GameRail
              title="Originales"
              subtitle={`${vm.originals.length} juegos`}
              tiles={vm.originals}
              onOpen={vm.openGame}
            />

            {vm.tiles.length === 0 ? (
              <EmptyState
                icon={gameControllerOutline}
                text="El arcade todavía no tiene juegos disponibles."
                className="arc-empty"
              />
            ) : (
              <>
                {/* Primero las categorias con algo jugable, en filas anchas: la
                    prominencia sigue a lo que el jugador puede abrir hoy. */}
                {vm.openCategories.map(({ category, tiles, playable }) => (
                  <section key={category} className="arc-section">
                    <div className="arc-section__head">
                      <h2 className="arc-section__title">{CATEGORY_LABELS[category]}</h2>
                      <span className="arc-section__count">{playable} para jugar</span>
                    </div>
                    <div className="arc-featured">
                      {tiles.map(tile => (
                        <GameTile key={tile.gameKey} tile={tile} onOpen={vm.openGame} variant="featured" />
                      ))}
                    </div>
                  </section>
                ))}

                {/* Las que estan todas bloqueadas van juntas en rejilla compacta
                    y, en escritorio, a dos columnas para no dejar medio renglon
                    vacio cuando la categoria solo trae dos juegos. */}
                <div className="arc-locked-zone">
                  {vm.lockedCategories.map(({ category, tiles }) => (
                    <section key={category} className="arc-section">
                      <div className="arc-section__head">
                        <h2 className="arc-section__title">{CATEGORY_LABELS[category]}</h2>
                        <span className="arc-section__count">Próximamente</span>
                      </div>
                      <div className="arc-grid">
                        {tiles.map(tile => (
                          <GameTile key={tile.gameKey} tile={tile} onOpen={vm.openGame} variant="compact" />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </>
            )}

            <section className="arc-section">
              <div className="arc-section__head">
                <h2 className="arc-section__title">
                  <IonIcon icon={timeOutline} /> Tus últimas rondas
                </h2>
              </div>

              {vm.rounds.length === 0 ? (
                <span className="arc-note">
                  Todavía no juegas ninguna ronda. {vm.playableCount} juegos te esperan.
                </span>
              ) : (
                <IonList className="arc-history" lines="full">
                  {vm.rounds.map(round => (
                    <IonItem key={round.roundId}>
                      <IonLabel>
                        <h3>{round.gameKey}</h3>
                        <p>{mxDate(round.settledAt ?? round.created_At)} · apuesta {fmtInt(round.betAmount)}</p>
                      </IonLabel>
                      <div className="arc-history__right" slot="end">
                        <StatusBadge status={round.outcome} map={ARCADE_OUTCOME} />
                        <IonBadge
                          color={round.payoutAmount - round.betAmount >= 0 ? 'success' : 'medium'}
                        >
                          {round.payoutAmount - round.betAmount >= 0 ? '+' : ''}
                          {fmtInt(round.payoutAmount - round.betAmount)}
                        </IonBadge>
                      </div>
                    </IonItem>
                  ))}
                </IonList>
              )}
            </section>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default ArcadeView;
