/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SupportForm from './components/SupportForm';
import AdminPortal from './components/AdminPortal';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SupportForm />} />
        <Route path="/admin" element={<AdminPortal />} />
      </Routes>
    </Router>
  );
}
