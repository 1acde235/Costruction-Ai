import React, { useState } from 'react';
import { Play, MessageSquarePlus, ChevronRight, CheckSquare, Square, Layers, Hammer, PaintBucket, Zap, Wind, Droplets, DoorOpen, Brush } from 'lucide-react';

interface InstructionViewProps {
  fileName: string;
  onStart: (instructions: string, scopes: string[]) => void;
  onCancel: () => void;
}

const SUGGESTIONS = [
  "Use Trench Fill Foundation methodology",
  "Calculate for Deep Strip Foundations (> 2.5m)",
  "Assume Raft Foundation with 200mm slab",
  "Ignore external landscaping works",
  "Separate Ground Floor and First Floor brickwork"
];

const SCOPES = [
  { id: 'Sub Structure', label: 'Sub Structure', icon: Layers, desc: 'Excavation, Foundations, Grade Beams' },
  { id: 'Super Structure', label: 'Super Structure', icon: Hammer, desc: 'Columns, Beams, Slabs, Walls' },
  { id: 'Openings', label: 'Doors & Windows', icon: DoorOpen, desc: 'Doors, Windows, Frames, Ironmongery' },
  { id: 'Finishing Works', label: 'Gen. Finishes', icon: PaintBucket, desc: 'Flooring, Ceilings, Plastering' },
  { id: 'Painting', label: 'Painting', icon: Brush, desc: 'Internal & External Wall Painting, Decoration' },
  { id: 'Electrical', label: 'Electrical', icon: Zap, desc: 'Power, Lighting, Data' },
  { id: 'Mechanical', label: 'Mechanical', icon: Wind, desc: 'HVAC, Ducting, AC Units' },
  { id: 'Sanitary', label: 'Plumbing/Sanitary', icon: Droplets, desc: 'Water Supply, Drainage, Fixtures' },
];

export const InstructionView: React.FC<InstructionViewProps> = ({ fileName, onStart, onCancel }) => {
  const [instructions, setInstructions] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(SCOPES.map(s => s.id));

  const handleSuggestionClick = (text: string) => {
    setInstructions(prev => prev ? `${prev}\n${text}` : text);
  };

  const toggleScope = (id: string) => {
    setSelectedScopes(prev => 
      prev.includes(id) 
        ? prev.filter(s => s !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">
      
      {/* Left: Configuration */}
      <div className="flex-1 flex flex-col">
        <div className="bg-slate-50 border-b border-slate-200 px-8 py-6">
          <h2 className="text-xl font-bold text-slate-800">Configuration</h2>
          <p className="text-slate-500 text-sm mt-1">
            Setup analysis for <strong>{fileName}</strong>.
          </p>
        </div>

        <div className="p-8 space-y-8 flex-1">
          
          {/* Scope Selector */}
          <div>
             <label className="block text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">
              Scope of Work
            </label>
            <p className="text-xs text-slate-500 mb-4">Select the trades you want to include in this takeoff.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SCOPES.map((scope) => {
                const isSelected = selectedScopes.includes(scope.id);
                const Icon = scope.icon;
                return (
                  <button
                    key={scope.id}
                    onClick={() => toggleScope(scope.id)}
                    className={`flex items-start space-x-3 p-3 rounded-lg border text-left transition-all duration-200 ${
                      isSelected 
                        ? 'bg-brand-50 border-brand-200 ring-1 ring-brand-200' 
                        : 'bg-white border-slate-200 hover:bg-slate-50 opacity-70'
                    }`}
                  >
                    <div className={`mt-0.5 ${isSelected ? 'text-brand-600' : 'text-slate-400'}`}>
                      {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                    </div>
                    <div>
                      <span className={`block text-sm font-medium ${isSelected ? 'text-brand-900' : 'text-slate-600'}`}>
                        {scope.label}
                      </span>
                      <span className="text-xs text-slate-400 leading-tight block mt-0.5">
                        {scope.desc}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Text Instructions */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">
              Specific Instructions
            </label>
            <textarea
              className="w-full h-32 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none text-slate-800 placeholder:text-slate-400 text-sm"
              placeholder="E.g., 'Exclude the garage area', 'Use C25 concrete for all slabs', 'Measure skirting in meters'..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.slice(0, 3).map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-xs bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-600 px-3 py-1.5 rounded-md border border-slate-200 transition-colors flex items-center"
                >
                  <MessageSquarePlus className="w-3 h-3 mr-1.5" />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-8 py-4 border-t border-slate-200 flex justify-between items-center">
          <button
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-800 text-sm font-medium px-4 py-2"
          >
            Cancel
          </button>
          <button
            onClick={() => onStart(instructions, selectedScopes)}
            disabled={selectedScopes.length === 0}
            className={`px-6 py-2.5 rounded-lg font-medium flex items-center shadow-sm transition-all ${
              selectedScopes.length === 0 
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-brand-600 hover:bg-brand-700 text-white hover:shadow-md'
            }`}
          >
            <span>Start Detailed Analysis</span>
            <ChevronRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};