import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, Database, Users, Package, Shield } from 'lucide-react';

export default function InitializationOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Show overlay for first 3 seconds after page load
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 500);

    // Simulate initialization progress
    const steps = [
      { time: 1000, progress: 20, step: 'Connecting to database...' },
      { time: 3000, progress: 40, step: 'Creating admin account...' },
      { time: 6000, progress: 60, step: 'Seeding products...' },
      { time: 9000, progress: 80, step: 'Setting up storage...' },
      { time: 12000, progress: 100, step: 'Complete!' },
    ];

    const timers: NodeJS.Timeout[] = [];

    steps.forEach(({ time, progress: prog, step }) => {
      const timer = setTimeout(() => {
        setProgress(prog);
        setCurrentStep(step);
        if (prog === 100) {
          setIsComplete(true);
          // Hide after completion
          setTimeout(() => {
            setIsVisible(false);
          }, 2000);
        }
      }, time);
      timers.push(timer);
    });

    // Hide automatically after 15 seconds regardless
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, 15000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      timers.forEach(clearTimeout);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-green-900/95 to-emerald-900/95 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-3xl">M</span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
          {isComplete ? 'Ready to Go!' : 'Setting Up Your Store'}
        </h2>
        <p className="text-center text-gray-600 mb-6">
          {isComplete 
            ? 'Your marketplace is ready. Redirecting...' 
            : 'Please wait while we prepare everything'}
        </p>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-green-500 to-emerald-600 h-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>{progress}%</span>
            <span>{isComplete ? 'Complete!' : 'In Progress...'}</span>
          </div>
        </div>

        {/* Current Step */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {isComplete ? (
            <CheckCircle className="w-6 h-6 text-green-600 animate-bounce" />
          ) : (
            <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
          )}
          <span className="text-gray-700 font-medium">{currentStep}</span>
        </div>

        {/* Features Being Setup */}
        <div className="space-y-3">
          <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
            progress >= 20 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'
          }`}>
            <Database className="w-5 h-5" />
            <span className="text-sm font-medium">Database Connection</span>
            {progress >= 20 && <CheckCircle className="w-4 h-4 ml-auto" />}
          </div>
          
          <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
            progress >= 40 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'
          }`}>
            <Shield className="w-5 h-5" />
            <span className="text-sm font-medium">Admin Account</span>
            {progress >= 40 && <CheckCircle className="w-4 h-4 ml-auto" />}
          </div>
          
          <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
            progress >= 60 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'
          }`}>
            <Package className="w-5 h-5" />
            <span className="text-sm font-medium">Product Catalog</span>
            {progress >= 60 && <CheckCircle className="w-4 h-4 ml-auto" />}
          </div>
          
          <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
            progress >= 80 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'
          }`}>
            <Users className="w-5 h-5" />
            <span className="text-sm font-medium">User Management</span>
            {progress >= 80 && <CheckCircle className="w-4 h-4 ml-auto" />}
          </div>
        </div>

        {/* Note */}
        {!isComplete && (
          <p className="text-xs text-center text-gray-500 mt-6">
            This only happens once. Future loads will be instant! ⚡
          </p>
        )}
      </div>
    </div>
  );
}
