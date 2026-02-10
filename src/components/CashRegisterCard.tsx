import React, { useEffect, useState } from "react";
import { IonButton, IonIcon, IonSpinner } from "@ionic/react";
import { lockOpen, lockClosed, addCircle, removeCircle, logIn, logOut } from "ionicons/icons";
import { postCashRegister } from "../api/cashRegisterApi";

type Props = {
  companyId: number;
  userId: number;
  onToast: (msg: string, color?: "success" | "danger" | "warning") => void;
};

export default function CashRegisterCard({ companyId, userId, onToast }: Props) {
  const [loading, setLoading] = useState(false);
  const [openSession, setOpenSession] = useState<any>(null); // output_json from action=4
  const [showMove, setShowMove] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [moveType, setMoveType] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const loadOpen = async () => {
    try {
      setLoading(true);
      console.log('[CashRegister] Checking open session for companyId:', companyId);
      const data = await postCashRegister({
        register: [{ action: 4, companyId }],
      });

      console.log('[CashRegister] loadOpen response:', data);
      // Handle the actual response format - {result: [{output_json: {...}}]} object
      const result = data?.result || [];
      const rows = Array.isArray(result) ? result : [];
      console.log('[CashRegister] rows count:', rows.length);
      const session = rows.length > 0 ? rows[0] : null;
      // Extract output_json for session data
      const sessionData = session?.output_json || null;
      console.log('[CashRegister] sessionData:', sessionData);
      setOpenSession(sessionData);
    } catch (e: any) {
      console.error('[CashRegister] Error loading session:', e);
      onToast(e.message || "Error consultando caja", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOpen(); }, []);

  const openCaja = async () => {
    try {
      setLoading(true);
      const openingCash = Number(amount || 0);
      const notes = description || "Inicio de turno";
      console.log('[CashRegister] Opening box:', { companyId, userId, openingCash, notes });
      await postCashRegister({
        register: [{ action: 1, companyId, userId, openingCash, notes }],
      });
      console.log('[CashRegister] Box opened successfully');
      onToast("Caja abierta", "success");
      setAmount("");
      setDescription("");
      await loadOpen();
    } catch (e: any) {
      console.error('[CashRegister] Error opening box:', e);
      onToast(e.message || "No se pudo abrir caja", "danger");
    } finally {
      setLoading(false);
    }
  };

  const closeCaja = async () => {
    try {
      setLoading(true);
      const closingCash = Number(amount || 0);
      const notes = description || "Cierre de turno";
      console.log('[CashRegister] Closing box:', { companyId, userId, closingCash, notes });
      await postCashRegister({
        register: [{ action: 2, companyId, userId, closingCash, notes }],
      });
      console.log('[CashRegister] Box closed successfully');
      onToast("Caja cerrada", "success");
      setAmount("");
      setDescription("");
      await loadOpen();
    } catch (e: any) {
      console.error('[CashRegister] Error closing box:', e);
      onToast(e.message || "No se pudo cerrar caja", "danger");
    } finally {
      setLoading(false);
    }
  };

  const addMovement = async () => {
    try {
      const amt = Number(amount || 0);
      if (!amt || amt <= 0) {
        onToast("Monto inválido", "warning");
        return;
      }
      const notes = description || (moveType === "in" ? "Entrada manual" : "Salida manual");
      setLoading(true);
      console.log('[CashRegister] Adding movement:', { companyId, userId, moveType, amt, notes });
      await postCashRegister({
        register: [{
          action: 3,
          companyId,
          userId,
          movementType: moveType,
          amount: amt,
          notes,
        }],
      });
      console.log('[CashRegister] Movement added successfully');
      onToast("Movimiento registrado", "success");
      setAmount("");
      setDescription("");
      setShowMove(false);
      await loadOpen();
    } catch (e: any) {
      console.error('[CashRegister] Error adding movement:', e);
      onToast(e.message || "No se pudo registrar movimiento", "danger");
    } finally {
      setLoading(false);
    }
  };

  const isOpen = !!openSession?.sessionId;

  return (
    <div className="cash-box">
      <div className="cash-box-head">
        <div className="cash-box-title">CAJA</div>

        {loading ? <IonSpinner name="crescent" /> : (
          <div className={`cash-status ${isOpen ? "open" : "closed"}`}>
            <IonIcon icon={isOpen ? lockOpen : lockClosed} />
            {isOpen ? "Abierta" : "Cerrada"}
          </div>
        )}
      </div>

      {isOpen ? (
        <div className="cash-box-body">
          <div className="kv">
            <span>Apertura</span>
            <span>${Number(openSession.openingCash ?? 0).toFixed(2)}</span>
          </div>
          <div className="kv">
            <span>Sistema</span>
            <span>${Number(openSession.systemBalance ?? 0).toFixed(2)}</span>
          </div>

          {!showMove && !showClose ? (
            <div className="cash-actions">
              <IonButton fill="outline" onClick={() => { setShowMove(true); setMoveType("in"); }}>
                <IonIcon icon={addCircle} slot="start" />
                Entrada
              </IonButton>
              <IonButton fill="outline" onClick={() => { setShowMove(true); setMoveType("out"); }}>
                <IonIcon icon={removeCircle} slot="start" />
                Salida
              </IonButton>
              <IonButton color="danger" fill="outline" onClick={() => { setShowClose(true); }}>
                <IonIcon icon={logOut} slot="start" />
                Cerrar
              </IonButton>
            </div>
          ) : showClose ? (
            <div className="cash-move">
              <div className="cash-move-title">CERRAR CAJA</div>
              <div className="cash-move-hint">
                Efectivo en caja: ${Number(openSession.systemBalance ?? 0).toFixed(2)}
              </div>
              <input
                className="cash-move-input"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Efectivo real (opcional)"
                min={0}
                step="0.01"
              />
              <input
                className="cash-move-input"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción (opcional)"
              />
              <div className="cash-actions">
                <IonButton color="danger" onClick={closeCaja}>
                  <IonIcon icon={logOut} slot="start" />
                  Confirmar Cierre
                </IonButton>
                <IonButton fill="outline" onClick={() => { setShowClose(false); setAmount(""); setDescription(""); }}>
                  Cancelar
                </IonButton>
              </div>
            </div>
          ) : (
            <div className="cash-move">
              <div className="cash-move-title">
                {moveType === "in" ? "Entrada (IN)" : "Salida (OUT)"}
              </div>
              <input
                className="cash-move-input"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Monto"
                min={0}
                step="0.01"
              />
              <input
                className="cash-move-input"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción"
              />
              <div className="cash-actions">
                <IonButton onClick={addMovement}>
                  <IonIcon icon={moveType === "in" ? addCircle : removeCircle} slot="start" />
                  Guardar
                </IonButton>
                <IonButton fill="outline" onClick={() => { setShowMove(false); setAmount(""); setDescription(""); }}>
                  Cancelar
                </IonButton>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="cash-box-body">
          <div className="cash-box-hint">No hay caja abierta.</div>
          <div className="cash-open">
            <input
              className="cash-move-input"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Efectivo inicial"
              min={0}
              step="0.01"
            />
            <input
              className="cash-move-input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción (opcional)"
            />
            <IonButton onClick={openCaja}>
              <IonIcon icon={logIn} slot="start" />
              Abrir caja
            </IonButton>
          </div>
        </div>
      )}
    </div>
  );
}

