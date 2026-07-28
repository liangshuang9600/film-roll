import { useState } from 'react';

export default function CreateRollModal({ isOpen, onClose, onCreate }) {
  const [form, setForm] = useState({
    roll_number: '',
    title: '',
    shoot_date: '',
    location: '',
    camera: '',
    film_stock: '',
    notes: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.roll_number.trim()) return;

    try {
      const res = await fetch('/api/rolls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const roll = await res.json();
      setForm({ roll_number: '', title: '', shoot_date: '', location: '', camera: '', film_stock: '', notes: '' });
      onCreate?.(roll);
      onClose();
    } catch (err) {
      alert('Failed to create roll');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-film-dark border border-film-border rounded-xl w-full max-w-lg">
        <div className="p-5 border-b border-film-border">
          <h2 className="text-lg font-mono text-gray-200">New Roll</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 font-mono mb-1 block">Roll Number *</label>
              <input
                type="text"
                value={form.roll_number}
                onChange={(e) => setForm({ ...form, roll_number: e.target.value })}
                placeholder="001"
                className="w-full bg-film-darker border border-film-border rounded-lg px-3 py-2 
                  text-sm text-gray-200 font-mono focus:outline-none focus:border-film-amber/50"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-mono mb-1 block">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Tokyo Streets"
                className="w-full bg-film-darker border border-film-border rounded-lg px-3 py-2 
                  text-sm text-gray-200 focus:outline-none focus:border-film-amber/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 font-mono mb-1 block">Date</label>
              <input
                type="date"
                value={form.shoot_date}
                onChange={(e) => setForm({ ...form, shoot_date: e.target.value })}
                className="w-full bg-film-darker border border-film-border rounded-lg px-3 py-2 
                  text-sm text-gray-200 font-mono focus:outline-none focus:border-film-amber/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-mono mb-1 block">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Shinjuku, Tokyo"
                className="w-full bg-film-darker border border-film-border rounded-lg px-3 py-2 
                  text-sm text-gray-200 focus:outline-none focus:border-film-amber/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 font-mono mb-1 block">Camera</label>
              <input
                type="text"
                value={form.camera}
                onChange={(e) => setForm({ ...form, camera: e.target.value })}
                placeholder="Contax T2"
                className="w-full bg-film-darker border border-film-border rounded-lg px-3 py-2 
                  text-sm text-gray-200 focus:outline-none focus:border-film-amber/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-mono mb-1 block">Film Stock</label>
              <input
                type="text"
                value={form.film_stock}
                onChange={(e) => setForm({ ...form, film_stock: e.target.value })}
                placeholder="Kodak Portra 400"
                className="w-full bg-film-darker border border-film-border rounded-lg px-3 py-2 
                  text-sm text-gray-200 focus:outline-none focus:border-film-amber/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-mono mb-1 block">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any notes about this roll..."
              rows={2}
              className="w-full bg-film-darker border border-film-border rounded-lg px-3 py-2 
                text-sm text-gray-200 focus:outline-none focus:border-film-amber/50 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-film-amber text-black font-medium rounded-lg text-sm hover:bg-film-amber/90 transition-colors"
            >
              Create Roll
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
