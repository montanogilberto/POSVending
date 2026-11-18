import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { IonInput } from '@ionic/react';
import { PIN_LENGTH } from '../../utils/pin';
import './PinInput.css';

export interface PinInputHandle {
  /** Focus the first empty box (or the first box when all are empty). */
  focus: () => void;
}

interface PinInputProps {
  /** The PIN so far: a string of 0..length digits. */
  value: string;
  onChange: (value: string) => void;
  /** Fires once every box has a digit (typed or pasted). */
  onComplete?: (value: string) => void;
  /** Enter pressed on the last box with every box filled. */
  onEnter?: () => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  /** `one-time-code` lets iOS/Android SMS autofill drop the whole PIN into the first box. */
  autocomplete?: 'one-time-code' | 'new-password' | 'current-password' | 'off';
  ariaLabel?: string;
}

const onlyDigits = (s: string) => s.replace(/\D/g, '');

// Ionic re-renders the native <input> asynchronously, so right after mount or after
// `disabled` flips off it may not be focusable yet: retry for a few frames.
const focusBox = async (el: HTMLIonInputElement | null | undefined, tries = 10) => {
  if (!el) return;
  const input = await el.getInputElement();
  if (input.disabled && tries > 0) {
    requestAnimationFrame(() => { void focusBox(el, tries - 1); });
    return;
  }
  input.focus();
  // Select the digit so typing over a filled box replaces it instead of appending.
  input.select();
};

/** One-digit-per-box PIN entry (4 boxes by default): auto-advance, backspace-back, paste/SMS autofill fills all. */
const PinInput = forwardRef<PinInputHandle, PinInputProps>(({
  value, onChange, onComplete, onEnter, length = PIN_LENGTH, disabled = false, autoFocus = false,
  autocomplete = 'one-time-code', ariaLabel = 'PIN',
}, ref) => {
  const boxes = useRef<(HTMLIonInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  useImperativeHandle(ref, () => ({
    focus: () => { void focusBox(boxes.current[Math.min(onlyDigits(value).length, length - 1)] ?? boxes.current[0]); },
  }), [value, length]);

  // IonInput's own autoFocus is unreliable (shadow-less input renders late): focus the first box on mount.
  useEffect(() => {
    if (autoFocus) void focusBox(boxes.current[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = (next: string[], focusIndex: number) => {
    // The value is the digits in order; clearing a middle box closes the gap.
    const joined = next.join('').slice(0, length);
    onChange(joined);
    void focusBox(boxes.current[Math.max(0, Math.min(focusIndex, joined.length, length - 1))]);
    if (joined.length === length) onComplete?.(joined);
  };

  /** Spread a run of digits (paste / autofill) over the boxes, starting at `start`. */
  const fillFrom = (start: number, incoming: string) => {
    const next = [...digits];
    // A full-length paste always means "this is the PIN", whatever box it landed in.
    const from = incoming.length >= length ? 0 : start;
    const chars = incoming.slice(0, length - from).split('');
    chars.forEach((d, k) => { next[from + k] = d; });
    commit(next, from + chars.length);
  };

  const handleInput = (i: number, e: CustomEvent<{ value?: string | null }>) => {
    const raw = onlyDigits(String(e.detail.value ?? ''));
    const el = e.target as HTMLIonInputElement;
    if (raw.length > 1) {
      // Typing over a box that already had a digit gives "old+new": keep the new one.
      const incoming = raw.length === 2 && digits[i] && raw.includes(digits[i])
        ? raw.replace(digits[i], '')
        : raw;
      el.value = incoming.length === 1 ? incoming : digits[i];
      if (incoming.length === 1) {
        const next = [...digits]; next[i] = incoming;
        commit(next, i + 1);
      } else {
        fillFrom(i, incoming);
      }
      return;
    }
    // Letters etc. are dropped: force the native field back to the stored digit.
    el.value = raw;
    const next = [...digits]; next[i] = raw;
    commit(next, raw ? i + 1 : i);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      e.preventDefault();
      const next = [...digits]; next[i - 1] = '';
      commit(next, i - 1);
    } else if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault(); void focusBox(boxes.current[i - 1]);
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      e.preventDefault(); void focusBox(boxes.current[i + 1]);
    } else if (e.key === 'Enter') {
      // Handled here (not by implicit form submit) so a half-typed PIN never submits.
      e.preventDefault();
      if (onlyDigits(value).length === length) onEnter?.();
    }
  };

  const handlePaste = (i: number, e: React.ClipboardEvent) => {
    const pasted = onlyDigits(e.clipboardData.getData('text'));
    e.preventDefault();
    if (pasted) fillFrom(i, pasted);
  };

  return (
    <div className="pin-input" role="group" aria-label={ariaLabel}>
      {digits.map((d, i) => (
        <IonInput
          key={i}
          ref={el => { boxes.current[i] = el; }}
          className="pin-input-box"
          type="text"
          inputmode="numeric"
          enterkeyhint={i === length - 1 ? 'go' : 'next'}
          autocomplete={i === 0 ? autocomplete : 'off'}
          aria-label={`${ariaLabel} dígito ${i + 1} de ${length}`}
          value={d}
          disabled={disabled}
          onIonInput={e => handleInput(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={e => handlePaste(i, e)}
          onIonFocus={e => { void (e.target as HTMLIonInputElement).getInputElement().then(input => input.select()); }}
        />
      ))}
    </div>
  );
});

PinInput.displayName = 'PinInput';

export default PinInput;
