import React, { useState } from 'react';
import { TakeoffResult, UploadedFile, TakeoffItem } from '../types';
import { Download, LayoutTemplate, FileText, ChevronLeft, Search, Filter } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface ResultsViewProps {
  data: TakeoffResult;
  file: UploadedFile;
  onReset: () => void;
}

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6'];

export const ResultsView: React.FC<ResultsViewProps> = ({ data, file, onReset }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(data.items.map(i => i.category)))];

  const filteredItems = data.items.filter(item => {
    const matchesSearch = item.item.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const chartData = categories.filter(c => c !== 'All').map(cat => ({
    name: cat,
    count: data.items.filter(i => i.category === cat).length
  }));

  const handleExport = () => {
    const headers = ['ID', 'Item', 'Description', 'Quantity', 'Unit', 'Category', 'Confidence'];
    const csvContent = [
      headers.join(','),
      ...data.items.map(item => [
        item.id,
        `"${item.item}"`,
        `"${item.description}"`,
        item.quantity,
        item.unit,
        item.category,
        item.confidence
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${data.projectName.replace(/\s+/g, '_')}_takeoff.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <button onClick={onReset} className="text-slate-500 hover:text-slate-800 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{data.projectName || 'Untitled Project'}</h1>
            <p className="text-sm text-slate-500">Generated from {file.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center space-x-2 transition-colors ${
              activeTab === 'list' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Line Items</span>
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center space-x-2 transition-colors ${
              activeTab === 'analytics' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <LayoutTemplate className="w-4 h-4" />
            <span>Analytics</span>
          </button>
          <div className="h-6 w-px bg-slate-200 mx-2"></div>
          <button 
            onClick={handleExport}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg flex items-center space-x-2 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex">
        
        {/* Left Pane: Document Preview */}
        <div className="w-1/2 bg-slate-100 border-r border-slate-200 p-4 flex flex-col">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex-1 overflow-hidden relative">
             <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                Original Document
             </div>
             {file.type === 'application/pdf' ? (
                <iframe src={file.url} className="w-full h-full" title="Document Preview" />
             ) : (
                <img src={file.url} alt="Blueprint" className="w-full h-full object-contain bg-slate-800/5" />
             )}
          </div>
          <div className="mt-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
             <h3 className="text-sm font-semibold text-slate-800 mb-1">AI Summary</h3>
             <p className="text-sm text-slate-600">{data.summary}</p>
          </div>
        </div>

        {/* Right Pane: Data / Analytics */}
        <div className="w-1/2 flex flex-col bg-white">
          {activeTab === 'list' ? (
            <>
              {/* Toolbar */}
              <div className="p-4 border-b border-slate-100 flex items-center space-x-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search items..." 
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <select 
                    className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none cursor-pointer"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">ID</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Item</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Category</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-right">Qty</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-brand-50/50 transition-colors group">
                        <td className="px-6 py-4 text-sm text-slate-500 font-mono">{item.id || idx + 1}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-slate-900">{item.item}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>
                        </td>
                        <td className="px-6 py-4">
                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                             {item.category}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900 font-semibold text-right">{item.quantity}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{item.unit}</td>
                      </tr>
                    ))}
                    {filteredItems.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                          No items found matching your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* Analytics Tab */
            <div className="flex-1 overflow-auto p-8 space-y-8">
               
               <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                 <h3 className="text-lg font-semibold text-slate-900 mb-6">Material Distribution by Category</h3>
                 <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <Tooltip 
                          cursor={{fill: '#f1f5f9'}}
                          contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        />
                        <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                 </div>
               </div>

               <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row">
                  <div className="flex-1">
                     <h3 className="text-lg font-semibold text-slate-900 mb-6">Composition</h3>
                     <div className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie
                             data={chartData}
                             cx="50%"
                             cy="50%"
                             innerRadius={60}
                             outerRadius={80}
                             paddingAngle={5}
                             dataKey="count"
                           >
                             {chartData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                             ))}
                           </Pie>
                           <Tooltip />
                         </PieChart>
                       </ResponsiveContainer>
                     </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-center space-y-3 p-4">
                     {chartData.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between">
                           <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                              <span className="text-sm text-slate-600">{entry.name}</span>
                           </div>
                           <span className="text-sm font-bold text-slate-900">{entry.count} items</span>
                        </div>
                     ))}
                  </div>
               </div>

            </div>
          )}
          
          {/* Footer Stats */}
          <div className="border-t border-slate-200 px-6 py-3 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
            <span>Total Items: {data.items.length}</span>
            <span>Generated by ConstructAI • Gemini 2.5 Flash</span>
          </div>
        </div>
      </main>
    </div>
  );
};
