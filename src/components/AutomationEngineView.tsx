import React, { useState } from 'react';
import { WorkflowExecutionLog } from '../types/editorial';
import { 
  Play, 
  Pause, 
  AlertOctagon, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCw, 
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

interface AutomationEngineViewProps {
  workflowLogs: WorkflowExecutionLog[];
  schedulePaused: boolean;
  emergencyStop: boolean;
  onTogglePause: () => Promise<void>;
  onToggleEmergencyStop: () => void;
  onRunStage: (stage: any) => Promise<void>;
  isProcessing?: boolean;
}

export const AutomationEngineView: React.FC<AutomationEngineViewProps> = ({
  workflowLogs,
  schedulePaused,
  emergencyStop,
  onTogglePause,
  onToggleEmergencyStop,
  onRunStage,
  isProcessing,
}) => {
  const [selectedStage, setSelectedStage] = useState<string>('08:00 Research');

  const scheduleSlots = [
    { time: '08:00', stage: '08:00 Research', title: 'Fashion Editorial Research', desc: 'Discovers up to 20 relevant editorial candidates, filters duplicates.' },
    { time: '09:00', stage: '09:00 Editorial evaluation', title: 'Artistic & Visual Evaluation', desc: 'Evaluates composition, chiaroscuro lighting, and assigns scores.' },
    { time: '10:00', stage: '10:00 Daily Selection', title: 'Daily Selection Generation', desc: 'Selects the top 5; prepares publishing drafts for rights-cleared works.' },
    { time: '11:00', stage: '11:00 Post Preparation', title: 'Instagram Post Packaging', desc: 'Prepares aspect ratios, verified credits, English captions, and hashtags.' },
    { time: '14:00', stage: '14:00 First Slot', title: 'First Publishing Window', desc: 'Publishes approved/autopilot content to Instagram via Meta Graph API.' },
    { time: '20:00', stage: '20:00 Second Slot', title: 'Second Publishing Window', desc: 'Publishes evening scheduled slot if daily publishing quota permits.' },
  ];

  return (
    <div className="space-y-8">
      {/* Top Header & Master Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#222222] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#c5a880] mb-1 font-mono">
            <span>Server-Authoritative Cron Engine</span>
            <span>·</span>
            <span>Timezone: Europe/Istanbul</span>
          </div>
          <h1 className="font-editorial text-3xl md:text-4xl text-[#f4f3ef] font-normal tracking-tight">
            Automation Engine
          </h1>
          <p className="text-sm text-[#8e8d8a] mt-1 max-w-2xl font-sans">
            Autonomous server-side schedule running independently of browser sessions. Dispatches research, evaluation, post preparation, and dual-window publishing slots.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onTogglePause}
            disabled={isProcessing}
            className={`px-4 py-2 border rounded text-xs font-semibold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${
              schedulePaused
                ? 'bg-[#1e1e1e] border-[#c5a880] text-[#c5a880] hover:bg-[#262626]'
                : 'bg-[#181818] border-[#333333] text-[#f4f3ef] hover:bg-[#222222]'
            }`}
          >
            {schedulePaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{schedulePaused ? 'Resume All Workflows' : 'Pause All Workflows'}</span>
          </button>

          <button
            onClick={onToggleEmergencyStop}
            className={`px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${
              emergencyStop
                ? 'bg-[#ef4444] text-white'
                : 'bg-[#2a1212] border border-[#5c1d1d] text-[#ef4444] hover:bg-[#381818]'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>{emergencyStop ? 'Emergency Stopped' : 'Emergency Stop'}</span>
          </button>
        </div>
      </div>

      {/* Schedule Pipeline Visualizer */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-widest text-[#71717a] font-mono">
            Daily Scheduled Execution Windows (Europe/Istanbul)
          </h2>
          <span className="text-xs font-mono text-[#8e8d8a]">
            Active Engine Status: {emergencyStop ? 'STOPPED' : schedulePaused ? 'PAUSED' : 'ONLINE'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scheduleSlots.map((slot, idx) => {
            return (
              <div
                key={slot.time}
                className="p-5 bg-[#121212] border border-[#222222] rounded hover:border-[#333333] transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs mb-2">
                    <span className="text-[#c5a880] font-semibold text-sm">{slot.time}</span>
                    <span className="text-[10px] text-[#71717a] uppercase">Stage 0{idx + 1}</span>
                  </div>
                  <h3 className="font-editorial text-xl text-[#f4f3ef] mb-1 font-normal">
                    {slot.title}
                  </h3>
                  <p className="text-xs text-[#8e8d8a] font-sans leading-relaxed">
                    {slot.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#1e1e1e] flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#71717a]">
                    Scheduled Daily
                  </span>
                  <button
                    onClick={() => onRunStage(slot.stage)}
                    disabled={isProcessing || emergencyStop}
                    className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#242424] text-xs font-mono text-[#f4f3ef] rounded border border-[#2a2a2a] transition cursor-pointer flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 text-[#c5a880]" />
                    <span>Run Now</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Manual Immediate Trigger Console */}
      <div className="p-6 bg-[#121212] border border-[#222222] rounded flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[#f4f3ef]">Manual Execution Override</h3>
          <p className="text-xs text-[#8e8d8a]">Trigger any pipeline stage synchronously without waiting for schedule clock.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="bg-[#181818] border border-[#262626] text-[#f4f3ef] rounded px-3 py-2 text-xs font-mono focus:outline-none"
          >
            {scheduleSlots.map(s => (
              <option key={s.stage} value={s.stage}>{s.stage} — {s.title}</option>
            ))}
            <option value="Manual Run">Manual Full Audit Run</option>
          </select>
          <button
            onClick={() => onRunStage(selectedStage)}
            disabled={isProcessing || emergencyStop}
            className="px-4 py-2 bg-[#f4f3ef] text-[#0a0a0a] text-xs font-semibold uppercase tracking-wider rounded hover:bg-white transition cursor-pointer flex items-center gap-1.5"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Execute Stage</span>
          </button>
        </div>
      </div>

      {/* Execution History & Audit Logs */}
      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-[#71717a] font-mono">
          Recent Execution Audit Trail
        </h2>

        <div className="bg-[#121212] border border-[#222222] rounded overflow-hidden">
          <div className="divide-y divide-[#1e1e1e]">
            {workflowLogs.map((log) => {
              const isSuccess = log.status === 'success';
              const isEmergency = log.status === 'skipped_emergency_stop';

              return (
                <div key={log.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isSuccess ? (
                        <CheckCircle2 className="w-4 h-4 text-[#a3e635]" />
                      ) : isEmergency ? (
                        <AlertOctagon className="w-4 h-4 text-[#ef4444]" />
                      ) : (
                        <XCircle className="w-4 h-4 text-[#ef4444]" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-[#f4f3ef] font-medium">{log.stage}</span>
                        <span className="text-[#71717a]">·</span>
                        <span className="text-[#8e8d8a]">{new Date(log.timestamp).toLocaleTimeString('en-GB')}</span>
                        {log.itemsProcessed !== undefined && (
                          <>
                            <span className="text-[#71717a]">·</span>
                            <span className="text-[#c5a880]">{log.itemsProcessed} items</span>
                          </>
                        )}
                      </div>
                      <p className="text-[#a1a1aa] font-sans mt-0.5">{log.summary}</p>
                    </div>
                  </div>

                  <span className={`font-mono uppercase text-[10px] tracking-wider shrink-0 ${
                    isSuccess ? 'text-[#a3e635]' : isEmergency ? 'text-[#ef4444]' : 'text-[#f87171]'
                  }`}>
                    {log.status.replace(/_/g, ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
