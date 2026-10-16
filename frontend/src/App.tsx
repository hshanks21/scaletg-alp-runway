import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { EngagementsPage } from './pages/EngagementsPage';
import { EngagementDetailPage } from './pages/EngagementDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<EngagementsPage />} />
          <Route path="/engagements" element={<EngagementsPage />} />
          <Route path="/engagements/:id" element={<EngagementDetailPage />} />
          <Route path="/engagements/:id/budget-vs-actual" element={<EngagementDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
