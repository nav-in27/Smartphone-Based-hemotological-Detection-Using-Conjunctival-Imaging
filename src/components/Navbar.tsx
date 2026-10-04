import React from 'react';
import {
  Camera,
  Activity,
  BarChart2,
  SlidersHorizontal,
  Database,
  FileSpreadsheet,
  Binary,
} from 'lucide-react';

export type ActiveTab = 'screen' | 'result' | 'research' | 'models' | 'dataset' | 'about';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  hasCurrentResult: boolean;
  isDemoMode: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  hasCurrentResult,
  isDemoMode,
}) => {
  const navItems = [
    {
      id: 'screen' as ActiveTab,
      label: 'Acquisition & ROI',
      icon: Camera,
    },
    {
      id: 'result' as ActiveTab,
      label: 'Diagnostic Triage',
      icon: Activity,
      disabled: !hasCurrentResult,
    },
    {
      id: 'research' as ActiveTab,
      label: 'Validation Curves',
      icon: BarChart2,
    },
    {
      id: 'models' as ActiveTab,
      label: 'Classifiers & Ablation',
      icon: SlidersHorizontal,
    },
    {
      id: 'dataset' as ActiveTab,
      label: 'Patient Cohort',
      icon: Database,
    },
    {
      id: 'about' as ActiveTab,
      label: 'Protocol & Card',
      icon: FileSpreadsheet,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-zinc-950 border-b border-zinc-800 text-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand identity */}
        <div
          onClick={() => setActiveTab('screen')}
          className="flex items-center gap-3 cursor-pointer select-none"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded border border-zinc-700 bg-zinc-900 text-zinc-300 font-mono font-bold text-xs">
            <Binary className="w-4 h-4 text-zinc-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-zinc-100 font-mono">
                CONJUNCTI<span className="text-rose-400 font-bold">LAB</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-400 border border-zinc-700/80 px-1 py-0.2">
                REV-1.0
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono leading-none hidden sm:block">
              Conjunctival Microvascular Screening Workstation
            </p>
          </div>
        </div>

        {/* Console tab navigation */}
        <nav className="hidden lg:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                disabled={item.disabled}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer border-b-2 ${
                  isActive
                    ? 'border-rose-500 text-zinc-100 font-semibold bg-zinc-900/60'
                    : item.disabled
                    ? 'border-transparent text-zinc-600 cursor-not-allowed'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-rose-400' : 'text-zinc-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Action button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('screen')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-mono font-semibold transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-zinc-950" />
            <span>New Scan</span>
          </button>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="lg:hidden flex items-center overflow-x-auto px-4 py-1.5 border-t border-zinc-800 gap-1 bg-zinc-900/90 no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              disabled={item.disabled}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'bg-zinc-800 text-zinc-100 font-semibold border-b border-rose-400'
                  : item.disabled
                  ? 'text-zinc-600'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className={`w-3 h-3 ${isActive ? 'text-rose-400' : 'text-zinc-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
