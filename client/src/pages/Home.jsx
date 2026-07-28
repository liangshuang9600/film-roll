import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RollCard from '../components/RollCard';
import CreateRollModal from '../components/CreateRollModal';

export default function Home() {
  const [rolls, setRolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  const fetchRolls = async () => {
    try {
      const res = await fetch('/api/rolls');
      const data = await res.json();
      setRolls(data);
    } catch (err) {
      console.error('Failed to fetch rolls:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRolls(); }, []);

  const handleRollClick = (roll) => {
    navigate(`/roll/${roll.id}`);
  };

  const handleCreate = (newRoll) => {
    setRolls(prev => [{ ...newRoll, photo_count: 0, previews: [] }, ...prev]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-film-amber/40 border-t-film-amber rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 font-mono text-sm">Loading rolls...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-mono font-light text-gray-200 tracking-wide">My Film Rolls</h2>
          <p className="text-sm text-gray-500 mt-1">{rolls.length} rolls in collection</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-film-amber/10 border border-film-amber/30 
            text-film-amber rounded-lg hover:bg-film-amber/20 transition-colors font-mono text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Roll
        </button>
      </div>

      {/* Roll list */}
      {rolls.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4 opacity-30">🎞️</div>
          <h3 className="text-xl text-gray-400 font-mono mb-2">No rolls yet</h3>
          <p className="text-gray-600 mb-6">Create your first roll and start uploading photos</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-film-amber text-black font-medium rounded-lg hover:bg-film-amber/90 transition-colors"
          >
            Create First Roll
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {rolls.map(roll => (
            <RollCard key={roll.id} roll={roll} onClick={handleRollClick} />
          ))}
        </div>
      )}

      <CreateRollModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
