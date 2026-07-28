import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import RollDetail from './pages/RollDetail';
import SharedView from './pages/SharedView';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-film-darker">
        <header className="border-b border-film-border bg-film-dark/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded bg-film-amber/20 flex items-center justify-center">
                <span className="text-film-amber text-lg">🎞️</span>
              </div>
              <h1 className="text-xl font-mono font-light tracking-wider text-gray-200 group-hover:text-film-amber transition-colors">
                FILM ROLL
              </h1>
            </a>
          </div>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/roll/:id" element={<RollDetail />} />
            <Route path="/s/:token" element={<SharedView />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
