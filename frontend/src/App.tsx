import { BrowserRouter, Routes, Route } from 'react-router-dom';

function EngagementsPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-primary-900 mb-2">Engagements</h1>
        <p className="text-gray-500 mb-8">Plan, track, and forecast engagement profitability.</p>
        <div className="bg-white rounded-xl border border-surface-border p-12 text-center text-gray-400">
          Engagement list will render here.
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EngagementsPage />} />
        <Route path="/engagements" element={<EngagementsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
