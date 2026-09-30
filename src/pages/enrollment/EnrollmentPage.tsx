/**
 * EnrollmentPage — router shell only. Implementation lives in Enrollment/
 * (MVVM): View → useEnrollment() → Constants.
 * Route: /enroll/:product  (product = smartloans | factory)
 */
import React from 'react';
import './EnrollmentPage.css';
import EnrollmentView from './Enrollment/EnrollmentView';

const EnrollmentPage: React.FC = () => <EnrollmentView />;

export default EnrollmentPage;
