import React from 'react';
import './DetailField.css';

/** Label / value line for detail panels and drawers. */
const DetailField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="detail-field">
    <span>{label}</span>
    <strong>{children}</strong>
  </div>
);

export default DetailField;
