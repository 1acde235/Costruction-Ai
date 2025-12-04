import React, { useEffect, useState } from 'react';
import { Loader2, Zap } from 'lucide-react';

interface AnalysisViewProps {
  fileName: string;
}

const steps = [
  "Securely uploading document...",
  "Scanning grid system & structural axes...",
  "Reading text labels, dimensions & leader lines...",
  "Cross-referencing legend & specifications...",
  "Performing rigorous quantity calculations...",
  "Generating dimension sheet & rebar schedule..."
];

export const AnalysisView: React.FC<AnalysisViewProps> = ({ fileName }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Slower step progression to imply careful analysis
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2000); 

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[500px] w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-brand-200 rounded-full animate-ping opacity-25"></div>
        <div className="relative bg-brand-50 p-6 rounded-full border-2 border-brand-100">
          <Zap className="w-12 h-12 text-brand-600 animate-pulse" />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Analyzing {fileName}</h2>
      <p className="text-slate-500 mb-8 text-center max-w-md">
        Our AI is systematically scanning your drawing grid-by-grid to ensure every element is captured.
      </p>

      <div className="w-full max-w-md space-y-4">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border ${
              index < currentStep 
                ? 'bg-green-500 border-green-500 text-white' 
                : index === currentStep 
                  ? 'border-brand-500 text-brand-500' 
                  : 'border-slate-200 text-slate-200'
            }`}>
              {index < currentStep ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : index === currentStep ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className="text-xs">{index + 1}</span>
              )}
            </div>
            <span className={`text-sm ${
              index <= currentStep ? 'text-slate-700 font-medium' : 'text-slate-400'
            }`}>
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};