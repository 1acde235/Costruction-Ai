import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { AnalysisView } from './components/AnalysisView';
import { ResultsView } from './components/ResultsView';
import { generateTakeoff } from './services/geminiService';
import { AppState, TakeoffResult, UploadedFile } from './types';
import { HardHat, LayoutDashboard } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [takeoffData, setTakeoffData] = useState<TakeoffResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setError(null);
    
    // File Validation
    const validTypes = ['image/png', 'image/jpeg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError("Unsupported file format. Please upload PDF, PNG, or JPG.");
      return;
    }

    if (file.size > 100 * 10000 * 10000) { // 100MB limit
      setError("File is too large. Please upload a file smaller than 10MB.");
      return;
    }

    // Prepare File
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result) {
        const base64Data = (e.target.result as string).split(',')[1];
        const fileUrl = URL.createObjectURL(file);
        
        setUploadedFile({
          name: file.name,
          type: file.type,
          data: base64Data,
          url: fileUrl
        });

        setAppState(AppState.ANALYZING);

        try {
          const result = await generateTakeoff(base64Data, file.type);
          setTakeoffData(result);
          setAppState(AppState.RESULTS);
        } catch (err) {
          console.error(err);
          setError("Failed to analyze document. Please ensure the API Key is valid and the image is clear.");
          setAppState(AppState.UPLOAD);
        }
      }
    };
    reader.onerror = () => {
      setError("Error reading file.");
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setAppState(AppState.UPLOAD);
    setUploadedFile(null);
    setTakeoffData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {appState !== AppState.RESULTS && (
        <nav className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-brand-600 p-2 rounded-lg text-white">
                <HardHat className="w-6 h-6" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-700 to-brand-500">
                ConstructAI
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-500">
              <span className="hover:text-brand-600 cursor-pointer">Dashboard</span>
              <span className="hover:text-brand-600 cursor-pointer">Projects</span>
              <span className="hover:text-brand-600 cursor-pointer">Settings</span>
            </div>
          </div>
        </nav>
      )}

      {appState === AppState.UPLOAD && (
        <main className="max-w-7xl mx-auto px-6 py-12 flex flex-col items-center justify-center min-h-[80vh]">
          <div className="text-center mb-12 max-w-2xl">
            <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Automated Quantity Takeoffs
            </h1>
            <p className="text-lg text-slate-500">
              Upload your architectural drawings (PDF or Images) and let our AI extract materials, quantities, and generate your takeoff sheet in seconds.
            </p>
          </div>
          <FileUpload onFileSelect={handleFileSelect} error={error} />
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl">
            {[
              { title: 'Multimodal AI', desc: 'Analyzes visual blueprints and text specifications simultaneously.' },
              { title: 'Instant Categorization', desc: 'Auto-groups items into Structural, MEP, and Finishing.' },
              { title: 'Export Ready', desc: 'Download structured CSVs directly to your estimation software.' }
            ].map((feature, i) => (
              <div key={i} className="p-6 bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <LayoutDashboard className="w-8 h-8 text-brand-500 mb-4" />
                <h3 className="font-semibold text-slate-800 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </main>
      )}

      {appState === AppState.ANALYZING && uploadedFile && (
        <main className="max-w-7xl mx-auto px-6 py-12 flex items-center justify-center min-h-[80vh]">
          <AnalysisView fileName={uploadedFile.name} />
        </main>
      )}

      {appState === AppState.RESULTS && takeoffData && uploadedFile && (
        <div className="h-screen flex flex-col">
          <ResultsView data={takeoffData} file={uploadedFile} onReset={handleReset} />
        </div>
      )}

    </div>
  );
};

export default App;
