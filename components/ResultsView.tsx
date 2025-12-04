import React, { useState, useMemo } from 'react';
import { TakeoffResult, UploadedFile, TakeoffItem } from '../types';
import { Download, LayoutTemplate, FileText, ChevronLeft, Search, Filter, FileCode, Grip, Sigma, DollarSign } from 'lucide-react';
import * as XLSX from 'xlsx';
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

const COLORS = ['#0ea5e9', '#22c55e', '#f97316', '#eab308', '#ef4444', '#8b5cf6'];

interface GroupedItem {
  name: string;
  unit: string;
  category: string;
  items: (TakeoffItem & { axis: string })[];
  totalQuantity: number;
}

// Logical Construction Order
const CATEGORY_ORDER = [
  'Sub Structure', 
  'Super Structure', 
  'Openings', 
  'Finishing Works', 
  'Painting', 
  'Electrical', 
  'Mechanical', 
  'Sanitary'
];

export const ResultsView: React.FC<ResultsViewProps> = ({ data, file, onReset }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'boq' | 'rebar' | 'analytics'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  
  // State for Unit Prices
  const [unitPrices, setUnitPrices] = useState<Record<string, number>>({});

  // Updated categories list to include new separate categories
  const categories = ['All', ...CATEGORY_ORDER];

  // --- GROUPING LOGIC FOR DIM SHEET ---
  const groupedData = useMemo(() => {
    const groups: Record<string, GroupedItem> = {};

    data.items.forEach(item => {
      // Filter logic
      const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;

      if (matchesSearch && matchesCategory) {
        // Parse Description: Expected format "Element - Material - Axis"
        // We group by Element + Material, and treat Axis as the detail
        const parts = item.description.split(' - ');
        
        let groupName = item.description;
        let axis = 'General';

        // Attempt to split if the format follows the convention
        if (parts.length >= 3) {
            // "Beam - Concrete - Grid A" -> Name: "Beam - Concrete", Axis: "Grid A"
            axis = parts.pop() || 'General';
            groupName = parts.join(' - ');
        } else if (parts.length === 2) {
            // Fallback for simpler items
            axis = parts[1];
            groupName = parts[0];
        }

        const key = `${groupName}|${item.unit}|${item.category}`;

        if (!groups[key]) {
          groups[key] = {
            name: groupName,
            unit: item.unit,
            category: item.category,
            items: [],
            totalQuantity: 0
          };
        }

        groups[key].items.push({ ...item, axis });
        groups[key].totalQuantity += item.quantity;
      }
    });

    // Sort by Category Order, then by Name
    return Object.values(groups).sort((a, b) => {
        const idxA = CATEGORY_ORDER.indexOf(a.category);
        const idxB = CATEGORY_ORDER.indexOf(b.category);
        
        // If categories are different, sort by the fixed order
        if (idxA !== idxB) {
            // If one isn't in the list (unknown), put it at the end
            const sortA = idxA === -1 ? 999 : idxA;
            const sortB = idxB === -1 ? 999 : idxB;
            return sortA - sortB;
        }
        
        // If categories are same, sort alphabetical by item name
        return a.name.localeCompare(b.name);
    });
  }, [data.items, searchTerm, categoryFilter]);

  // --- FILTERED REBAR ITEMS ---
  const filteredRebar = useMemo(() => {
    return (data.rebarItems || []).filter(item => {
      const lowerSearch = searchTerm.toLowerCase();
      return (
        item.member.toLowerCase().includes(lowerSearch) ||
        item.id.toLowerCase().includes(lowerSearch) ||
        item.barType.toLowerCase().includes(lowerSearch)
      );
    });
  }, [data.rebarItems, searchTerm]);

  // --- AGGREGATION LOGIC FOR REBAR SUMMARY ---
  const rebarSummary = useMemo(() => {
    const summaryMap = new Map<string, number>();
    
    (data.rebarItems || []).forEach(item => {
      const currentWeight = summaryMap.get(item.barType) || 0;
      summaryMap.set(item.barType, currentWeight + item.totalWeight);
    });

    return Array.from(summaryMap.entries()).map(([type, weight]) => ({
      name: `Reinforcement Bars (Type ${type})`,
      totalQuantity: weight,
      unit: 'kg'
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [data.rebarItems]);

  const chartData = data.items.reduce((acc, item) => {
    const existing = acc.find(x => x.name === item.category);
    if (existing) {
      existing.count += 1;
      existing.value += item.quantity; 
    } else {
      acc.push({ name: item.category, count: 1, value: item.quantity });
    }
    return acc;
  }, [] as {name: string, count: number, value: number}[]);

  // Calculate Grand Total for BOQ
  const grandTotalCost = useMemo(() => {
    let total = 0;
    // Main items
    groupedData.forEach(group => {
      const rate = unitPrices[group.name] || 0;
      total += group.totalQuantity * rate;
    });
    // Rebar items
    rebarSummary.forEach(group => {
       const rate = unitPrices[group.name] || 0;
       total += group.totalQuantity * rate;
    });
    return total;
  }, [groupedData, rebarSummary, unitPrices]);

  const handleUnitPriceChange = (name: string, value: string) => {
    const numValue = parseFloat(value);
    setUnitPrices(prev => ({
      ...prev,
      [name]: isNaN(numValue) ? 0 : numValue
    }));
  };

  const handleExport = () => {
    // Create a new Workbook
    const wb = XLSX.utils.book_new();

    // ---------------------------------------------------------
    // SHEET 1: DIM SHEET (Standard Takeoff)
    // ---------------------------------------------------------
    const dimRows: any[][] = [];
    dimRows.push(['Timesing', 'Description', 'Dimension', 'Quantity']); // Header (Row 0)
    
    // Track where the subtotals are located for the BOQ formulas
    // Map of groupName -> Excel Cell Address (e.g. "'Dim Sheet'!D15")
    const groupAddressMap: Record<string, string> = {};

    let lastCat = '';
    let currentRowIdx = 1; // Start after header

    groupedData.forEach(group => {
       // Category Header
       if (group.category !== lastCat) {
          dimRows.push(['', group.category.toUpperCase(), '', '']);
          lastCat = group.category;
          currentRowIdx++;
       }

       // Item Group Header
       dimRows.push(['', group.name, '', '']);
       currentRowIdx++;

       // Item Details
       group.items.forEach(item => {
          // Row 1: Data (Timesing, Description, Dimension) - Quantity Empty
          dimRows.push([
             item.timesing > 1 ? item.timesing : 1, 
             item.axis, 
             item.dimension, 
             ""
          ]);
          currentRowIdx++;

          // Row 2: Calculation (Empty, Empty, Empty, Quantity Formula)
          
          // --- FORMULA SANITIZATION LOGIC ---
          // 1. Split raw dimension string by 'x', 'X', or '*'
          const rawParts = item.dimension.split(/[xX*]/);
          const sanitizedParts: string[] = [];

          for (const part of rawParts) {
            // STRICT REGEX: Extract only numbers (integers or decimals)
            // Removes 'm', 'mm', 'kg', spaces, etc.
            // Matches: 123, 123.45, .45, -10
            const match = part.match(/[+-]?([0-9]*[.])?[0-9]+/);
            if (match) {
               sanitizedParts.push(match[0]);
            }
          }
          
          // Formula is valid only if we successfully extracted numbers
          const isValidCalc = sanitizedParts.length > 0;

          let quantityCell: any = { t: 'n', v: item.quantity }; // Default to plain value
          
          if (isValidCalc) {
            // Check timesing
            const timesingVal = item.timesing || 1;
            const timesingStr = timesingVal !== 1 ? `${timesingVal}*` : '';
            
            // Construct Formula: Timesing * CleanDim1 * CleanDim2
            // Example: 2*15.00*0.60
            const formulaStr = `${timesingStr}${sanitizedParts.join('*')}`;
            
            // Assign cell with formula (f) and value (v)
            quantityCell = { t: 'n', f: formulaStr, v: item.quantity };
          }

          dimRows.push([
             "", 
             "", 
             "", 
             quantityCell 
          ]);
          currentRowIdx++;
       });

       // Subtotal Row
       dimRows.push(['', 'SUBTOTAL', '', { t: 'n', v: group.totalQuantity }]); 
       
       // Calculate Excel Address
       const cellAddress = XLSX.utils.encode_cell({r: currentRowIdx, c: 3}); // Column D
       groupAddressMap[group.name] = `'Dim Sheet'!${cellAddress}`;
       
       currentRowIdx++;

       // Spacer
       dimRows.push([]); 
       currentRowIdx++;
    });

    const wsDim = XLSX.utils.aoa_to_sheet(dimRows);
    
    // Apply column widths
    wsDim['!cols'] = [
      { wch: 10 }, // Timesing
      { wch: 40 }, // Description
      { wch: 20 }, // Dimension
      { wch: 15 }  // Quantity
    ];

    XLSX.utils.book_append_sheet(wb, wsDim, "Dim Sheet");

    // ---------------------------------------------------------
    // SHEET 3: REBAR SCHEDULE (Generated before BOQ for referencing)
    // ---------------------------------------------------------
    const rebarRows: any[][] = [];
    // Columns: A, B, C, D, E, F, G, H, I, J
    const rebarHeaders = ['Member', 'Bar Mark', 'Type/Size', 'Shape Code', 'No. Members', 'Bars/Member', 'Total Bars', 'Length (m)', 'Total Length (m)', 'Total Weight (kg)'];
    rebarRows.push(rebarHeaders);

    (data.rebarItems || []).forEach(item => {
       rebarRows.push([
          item.member,
          item.id,
          item.barType,
          item.shapeCode,
          item.noOfMembers,
          item.barsPerMember,
          item.totalBars,
          item.lengthPerBar,
          item.totalLength,
          item.totalWeight // Column J
       ]);
    });

    const wsRebar = XLSX.utils.aoa_to_sheet(rebarRows);
    XLSX.utils.book_append_sheet(wb, wsRebar, "Rebar Schedule");


    // ---------------------------------------------------------
    // SHEET 2: BILL OF QUANTITIES (With Formulas)
    // ---------------------------------------------------------
    const boqRows: any[] = [];
    boqRows.push(['Item Description', 'Unit', 'Total Quantity', 'Unit Rate', 'Total Amount']); // Header

    let boqRowIndex = 1; // Start at 1 (Row 2 in Excel)

    // Helper for formula cells
    const createFormulaCell = (f: string) => ({ t: 'n', f: f });
    const createNumberCell = (v: number) => ({ t: 'n', v: v });

    groupedData.forEach(group => {
       const rate = unitPrices[group.name] || 0;
       
       // Formula for Quantity: Link to Dim Sheet
       const qtyRef = groupAddressMap[group.name];
       
       // If reference exists, use formula, otherwise static value
       const qtyCell = qtyRef ? createFormulaCell(qtyRef) : createNumberCell(group.totalQuantity);
       
       const excelRow = boqRowIndex + 1;
       // Formula: C2*D2 (Quantity * Rate)
       const amountFormula = `C${excelRow}*D${excelRow}`;

       boqRows.push([
         group.name,
         group.unit,
         qtyCell,
         createNumberCell(rate),
         createFormulaCell(amountFormula)
       ]);
       
       boqRowIndex++;
    });

    // Rebar Summary in BOQ (Using SUMIF)
    if (rebarSummary.length > 0) {
       boqRows.push(['', '', '', '', '']); // Spacer
       boqRows.push(['REBAR SUMMARY', '', '', '', '']); // Header
       boqRowIndex += 2;

       rebarSummary.forEach(r => {
          const rate = unitPrices[r.name] || 0;
          
          // Clean bar type name for matching (e.g. "Y16")
          const barType = r.name.replace('Reinforcement Bars (Type ', '').replace(')', '');
          
          // Formula: SUMIF('Rebar Schedule'!C:C, "Y16", 'Rebar Schedule'!J:J)
          // Note: SheetJS usually handles raw formulas well without leading '=' in 'f' prop
          const sumIfFormula = `SUMIF('Rebar Schedule'!C:C, "${barType}", 'Rebar Schedule'!J:J)`;
          
          const excelRow = boqRowIndex + 1;
          const amountFormula = `C${excelRow}*D${excelRow}`;

          boqRows.push([
            r.name,
            r.unit,
            createFormulaCell(sumIfFormula),
            createNumberCell(rate),
            createFormulaCell(amountFormula)
          ]);
          boqRowIndex++;
       });
    }

    // Grand Total Row
    boqRows.push(['', '', '', '', '']); 
    // SUM(E2:E[end])
    boqRows.push(['GRAND TOTAL', '', '', '', { t: 'n', f: `SUM(E2:E${boqRowIndex})` }]); 

    const wsBoq = XLSX.utils.aoa_to_sheet(boqRows);
    wsBoq['!cols'] = [
      { wch: 50 }, // Desc
      { wch: 10 }, // Unit
      { wch: 15 }, // Qty
      { wch: 15 }, // Rate
      { wch: 15 }  // Amount
    ];
    XLSX.utils.book_append_sheet(wb, wsBoq, "Bill of Quantities");

    // Write File
    const cleanProjectName = (data.projectName || 'Takeoff').replace(/\s+/g, '_');
    XLSX.writeFile(wb, `${cleanProjectName}_Complete_Takeoff.xlsx`);
  };

  const renderPreview = () => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    
    if (isImage) {
      return <img src={file.url} alt="Blueprint" className="w-full h-full object-contain bg-slate-800/5" />;
    } else if (isPdf) {
      return <iframe src={file.url} className="w-full h-full" title="Document Preview" />;
    } else {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400">
           <FileCode className="w-16 h-16 mb-4 opacity-50" />
           <p className="font-medium">Preview not available for {file.name.split('.').pop()?.toUpperCase()} files.</p>
           <p className="text-xs mt-2">The file is being processed by the AI.</p>
        </div>
      );
    }
  };

  let lastCategory = '';

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
            <p className="text-sm text-slate-500">Metric Takeoff • {file.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center space-x-2 transition-all ${
                activeTab === 'list' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Dim Sheet</span>
            </button>
            <button 
              onClick={() => setActiveTab('boq')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center space-x-2 transition-all ${
                activeTab === 'boq' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Sigma className="w-4 h-4" />
              <span>Bill of Quantities</span>
            </button>
            <button 
              onClick={() => setActiveTab('rebar')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center space-x-2 transition-all ${
                activeTab === 'rebar' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Grip className="w-4 h-4" />
              <span>Rebar</span>
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center space-x-2 transition-all ${
                activeTab === 'analytics' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutTemplate className="w-4 h-4" />
              <span>Analytics</span>
            </button>
          </div>
          <div className="h-6 w-px bg-slate-200 mx-2"></div>
          <button 
            onClick={handleExport}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg flex items-center space-x-2 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export to Excel</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex">
        
        {/* Left Pane: Document Preview */}
        <div className="w-1/2 bg-slate-100 border-r border-slate-200 p-4 flex flex-col">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex-1 overflow-hidden relative">
             <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm z-10">
                Original Document
             </div>
             {renderPreview()}
          </div>
          <div className="mt-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
             <h3 className="text-sm font-semibold text-slate-800 mb-1">AI Scope Summary</h3>
             <p className="text-sm text-slate-600">{data.summary}</p>
          </div>
        </div>

        {/* Right Pane: Data / Analytics */}
        <div className="w-1/2 flex flex-col bg-white">
          {activeTab === 'list' && (
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

              {/* Table - STANDARD FORMAT (Staggered Rows) */}
              <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-24">Timesing</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Description</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-32">Dimension</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-right w-32">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groupedData.map((group, groupIdx) => {
                      const showCategoryHeader = group.category !== lastCategory;
                      lastCategory = group.category;

                      return (
                        <React.Fragment key={groupIdx}>
                          
                          {/* Main Category Header (e.g. SUB STRUCTURE) */}
                          {showCategoryHeader && (
                             <tr className="bg-slate-800 border-b border-slate-700">
                               <td colSpan={4} className="px-4 py-2 text-sm font-bold text-white uppercase tracking-wider">
                                 {group.category}
                               </td>
                             </tr>
                          )}

                          {/* Item Group Header (The Item Name) */}
                          <tr className="bg-brand-50/50 border-l-4 border-brand-500">
                            <td colSpan={4} className="px-4 py-2 text-sm font-bold text-brand-800">
                              {group.name}
                            </td>
                          </tr>
                          
                          {/* Items Rows (STAGGERED) */}
                          {group.items.map((item, itemIdx) => (
                            <React.Fragment key={`${groupIdx}-${itemIdx}`}>
                              {/* Row 1: Timesing | Axis | Dimension | (Empty) */}
                              <tr className="hover:bg-slate-50 transition-colors border-none">
                                <td className="px-4 pt-2 text-sm text-slate-500 font-mono text-center border-l-4 border-transparent">
                                  {item.timesing > 1 ? item.timesing : 1}
                                </td>
                                <td className="px-4 pt-2 text-sm text-slate-700 pl-8 font-medium">
                                  {item.axis}
                                </td>
                                <td className="px-4 pt-2 text-sm text-slate-600 font-mono">
                                  {item.dimension}
                                </td>
                                <td className="px-4 pt-2 text-sm text-right">
                                  {/* Empty in Row 1 */}
                                </td>
                              </tr>
                              
                              {/* Row 2: (Empty) | (Empty) | (Empty) | = Quantity */}
                              <tr className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                                <td className="px-4 pb-2"></td>
                                <td className="px-4 pb-2"></td>
                                <td className="px-4 pb-2"></td>
                                <td className="px-4 pb-2 text-sm font-bold text-slate-900 text-right">
                                  ={item.quantity.toFixed(2)} <span className="text-slate-400 font-normal ml-1">{item.unit}</span>
                                </td>
                              </tr>
                            </React.Fragment>
                          ))}
                          
                          {/* Subtotal Row */}
                          <tr className="bg-slate-50 border-t border-slate-200">
                            <td colSpan={2}></td>
                            <td className="px-4 py-2 text-xs font-bold text-slate-500 text-right uppercase tracking-wider">
                              Subtotal
                            </td>
                            <td className="px-4 py-2 text-sm font-bold text-slate-900 text-right border-t-2 border-slate-300">
                              {group.totalQuantity.toFixed(2)} {group.unit}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                    
                    {groupedData.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                          No items found matching your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'boq' && (
             <div className="flex-1 overflow-auto custom-scrollbar p-6 bg-slate-50">
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                   <div>
                     <h2 className="text-lg font-bold text-slate-800">Bill of Quantities</h2>
                     <p className="text-xs text-slate-500">Enter your unit rates below to calculate project total.</p>
                   </div>
                   <div className="bg-brand-50 px-4 py-2 rounded-lg border border-brand-100 flex flex-col items-end">
                      <span className="text-xs font-semibold text-brand-600 uppercase">Grand Total</span>
                      <span className="text-xl font-bold text-brand-700">${grandTotalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                   </div>
                 </div>
                 
                 <table className="w-full text-left">
                   <thead className="bg-white border-b border-slate-200">
                     <tr>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Item Description</th>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Quantity</th>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right w-40">Unit Price</th>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Amount</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {groupedData.map((group, idx) => {
                       const rate = unitPrices[group.name] || 0;
                       const amount = group.totalQuantity * rate;
                       return (
                        <tr key={`boq-${idx}`} className="hover:bg-slate-50">
                          <td className="px-6 py-3 text-sm text-slate-700 font-medium">
                            <div className="font-semibold">{group.name}</div>
                            <div className="text-xs text-slate-400 font-normal uppercase">{group.category}</div>
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-700 text-right">
                            {group.totalQuantity.toFixed(2)} <span className="text-xs text-slate-400">{group.unit}</span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                              <input 
                                type="number" 
                                className="w-full pl-6 pr-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-right"
                                placeholder="0.00"
                                value={unitPrices[group.name] || ''}
                                onChange={(e) => handleUnitPriceChange(group.name, e.target.value)}
                              />
                            </div>
                          </td>
                          <td className="px-6 py-3 text-sm font-bold text-slate-900 text-right">
                             {amount.toFixed(2)}
                          </td>
                        </tr>
                       );
                     })}
                     
                     {rebarSummary.length > 0 && (
                        <>
                          <tr className="bg-slate-100 border-t border-b border-slate-200">
                            <td colSpan={4} className="px-6 py-2 text-xs font-bold text-slate-500 uppercase">Reinforcement Schedule Items</td>
                          </tr>
                          {rebarSummary.map((r, idx) => {
                             const rate = unitPrices[r.name] || 0;
                             const amount = r.totalQuantity * rate;
                             return (
                              <tr key={`rebar-boq-${idx}`} className="hover:bg-slate-50">
                                <td className="px-6 py-3 text-sm text-slate-700 font-medium pl-8 border-l-4 border-yellow-400">
                                  {r.name}
                                </td>
                                <td className="px-6 py-3 text-sm text-slate-700 text-right">
                                  {r.totalQuantity.toFixed(2)} <span className="text-xs text-slate-400">{r.unit}</span>
                                </td>
                                <td className="px-6 py-3 text-right">
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                    <input 
                                      type="number" 
                                      className="w-full pl-6 pr-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-right"
                                      placeholder="0.00"
                                      value={unitPrices[r.name] || ''}
                                      onChange={(e) => handleUnitPriceChange(r.name, e.target.value)}
                                    />
                                  </div>
                                </td>
                                <td className="px-6 py-3 text-sm font-bold text-slate-900 text-right">
                                  {amount.toFixed(2)}
                                </td>
                              </tr>
                             );
                          })}
                        </>
                     )}
                   </tbody>
                   <tfoot className="bg-slate-50 border-t border-slate-200">
                      <tr>
                         <td colSpan={3} className="px-6 py-4 text-sm font-bold text-slate-600 text-right uppercase">Total Project Cost</td>
                         <td className="px-6 py-4 text-lg font-bold text-brand-700 text-right border-t-2 border-brand-200">
                           ${grandTotalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                         </td>
                      </tr>
                   </tfoot>
                 </table>
               </div>
             </div>
          )}

          {activeTab === 'rebar' && (
             <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Member</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Bar Mark</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Type</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Shape</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center">No.</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center">Len (m)</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-right">Total Wgt (kg)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {filteredRebar.map((item, idx) => (
                       <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2 text-sm text-slate-700 font-medium">{item.member}</td>
                          <td className="px-4 py-2 text-sm text-slate-500 font-mono">{item.id}</td>
                          <td className="px-4 py-2 text-sm text-slate-700 font-bold text-brand-600">{item.barType}</td>
                          <td className="px-4 py-2 text-sm text-slate-500">{item.shapeCode}</td>
                          <td className="px-4 py-2 text-sm text-slate-600 text-center">
                            {item.totalBars} <span className="text-xs text-slate-400">({item.noOfMembers}x{item.barsPerMember})</span>
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-600 text-center">{item.lengthPerBar.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm font-bold text-slate-900 text-right">{item.totalWeight.toFixed(2)}</td>
                       </tr>
                     ))}
                     {filteredRebar.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                            No rebar items found. (Ensure this is a structural drawing)
                          </td>
                        </tr>
                     )}
                  </tbody>
                </table>
             </div>
          )}

          {activeTab === 'analytics' && (
            <div className="flex-1 p-8 overflow-auto">
              <h2 className="text-lg font-bold text-slate-800 mb-6">Material Breakdown</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Pie Chart */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                   <h3 className="text-sm font-semibold text-slate-600 mb-4">Items by Category</h3>
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
                            dataKey="value"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                     </ResponsiveContainer>
                   </div>
                   <div className="mt-4 flex flex-wrap gap-2 justify-center">
                      {chartData.map((entry, index) => (
                        <div key={index} className="flex items-center text-xs text-slate-500">
                           <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                           {entry.name}
                        </div>
                      ))}
                   </div>
                </div>

                {/* Bar Chart */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-600 mb-4">Quantity Distribution</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} />
                        <YAxis tick={{fontSize: 10}} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};