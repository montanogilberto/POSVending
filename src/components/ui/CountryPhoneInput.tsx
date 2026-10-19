import React from 'react';
import { IonInput, IonSelect, IonSelectOption } from '@ionic/react';
import { COUNTRIES, Country, formatNational } from '../../utils/phone';
import './CountryPhoneInput.css';

interface CountryPhoneInputProps {
  country: Country;
  onCountryChange: (country: Country) => void;
  /** What the person typed (formatted or not); the parent turns it into E.164 with toE164. */
  value: string;
  onValueChange: (national: string) => void;
  disabled?: boolean;
}

/** Country code (LADA, +52 by default) next to the number, so people don't type the prefix themselves. */
const CountryPhoneInput: React.FC<CountryPhoneInputProps> = ({ country, onCountryChange, value, onValueChange, disabled }) => (
  <div className="cpi">
    <IonSelect
      aria-label="Código de país"
      interface="popover"
      className="cpi-country"
      disabled={disabled}
      value={country.id}
      selectedText={`${country.flag} ${country.dial}`}
      onIonChange={e => onCountryChange(COUNTRIES.find(c => c.id === e.detail.value) ?? country)}
    >
      {COUNTRIES.map(c => (
        <IonSelectOption key={c.id} value={c.id}>{c.flag} {c.name} ({c.dial})</IonSelectOption>
      ))}
    </IonSelect>
    <IonInput
      type="tel"
      inputmode="numeric"
      className="login-input cpi-number"
      aria-label="Número de teléfono"
      placeholder="662 123 4567"
      autocomplete="tel-national"
      disabled={disabled}
      value={value}
      onIonInput={e => onValueChange(formatNational(String(e.detail.value ?? '')))}
    />
  </div>
);

export default CountryPhoneInput;
