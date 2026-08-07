import React from 'react';
import { IonAlert, IonDatetime } from '@ionic/react';

interface DateTypeAlertProps {
  isOpen: boolean;
  onDidDismiss: () => void;
  onDateTypeChange: (type: 'single' | 'range') => void;
  dateType: 'single' | 'range';
  searchDate: string | null;
  startDate: string | null;
  endDate: string | null;
  handleDateChange: (e: CustomEvent) => void;
}

const DateTypeAlert: React.FC<DateTypeAlertProps> = ({
  isOpen,
  onDidDismiss,
  onDateTypeChange,
  dateType,
  searchDate,
  startDate,
  endDate,
  handleDateChange,
}) => {
  return (
    <>
      <IonAlert
        isOpen={isOpen}
        onDidDismiss={onDidDismiss}
        header="Select Date Type"
        buttons={[
          { text: 'Single Date', handler: () => onDateTypeChange('single') },
          { text: 'Date Range', handler: () => onDateTypeChange('range') },
        ]}
      />
      {dateType === 'single' && (
        <IonDatetime value={searchDate} onIonChange={handleDateChange} />
      )}
      {dateType === 'range' && (
        <>
          <IonDatetime value={startDate} onIonChange={handleDateChange} />
          <IonDatetime value={endDate} onIonChange={handleDateChange} />
        </>
      )}
    </>
  );
};

export default DateTypeAlert;
