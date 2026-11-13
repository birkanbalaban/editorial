import React from 'react';
import {
  AutomationStageConfig,
  AutomationStageId,
  OperationMode,
  WorkflowExecutionLog,
} from '../types/editorial';
import {
  Play,
  Pause,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Trash2,
} from 'lucide-react';

interface AutomationEngineViewProps {
  workflowLogs: WorkflowExecutionLog[];
  schedulePaused: boolean;
  emergencyStop: boolean;
  mode?: OperationMode;
  timezone?: string;
  automationSchedule?: AutomationStageConfig[];
  onUpdateSchedule?: (schedule: AutomationStageConfig[]) => Promise<void>;
  onTogglePause: () => Promise<void>;
  onToggleEmergencyStop: () => void;
  onRunStage: (stage: AutomationStageId) => Promise<void>;
  onClearLogs?: () => Promise<void>;
  isProcessing?: boolean;
}

const DEFAULT_STAGE_SCHEDULE: AutomationStageConfig[] = [
  { id: 'discovery', time: '08:00', enabled: true },
  { id: 'curation', time: '09:30', enabled: true },
  { id: 'first_slot', time: '14:00', enabled: true },
  { id: 'second_slot', time: '20:00', enabled: true },
];

const STAGE_META: Record<
  AutomationStageId,
  { step: string; title: string; desc: string }
> = {
  discovery: {
    step: 'Stage 01',
    title: 'Live RSS Discovery',
    desc: 'Scans enabled RSS feeds in Settings, extracts coherent editorial shoots, and avoids duplicates.',
  },
  curation: {
    step: 'Stage 02',
    title: 'AI Audit & Daily Top 5',
    desc: 'Audits pending candidates with Agent 2 + Learning Signals and refreshes the Daily Top 5 selection.',
  },
  first_slot: {
    step: 'Stage 03',
    title: 'First Instagram Slot',
    desc: 'Publishes the next approved (or autopilot-cleared) package to Instagram via Meta Graph API.',
  },
  second_slot: {
    step: 'Stage 04',
    title: 'Second Instagram Slot',
    desc: 'Publishes the evening scheduled package if daily quota and Instagram connection permit.',
  },
};

export const AutomationEngineView: React.FC<AutomationEngineViewProps> = ({
  workflowLogs,
  schedulePaused,
  emergencyStop,
  mode = 'APPROVAL',
  timezone = 'Europe/Istanbul',
  automationSchedule,
  onUpdateSchedule,
  onTogglePause,
  onToggleEmergencyStop,
  onRunStage,
  onClearLogs,
  isProcessing,
}) => {
  const schedule =
    automationSchedule && automationSchedule.length > 0
      ? automationSchedule
      : DEFAULT_STAGE_SCHEDULE;

  const handleTimeChange = async (id: AutomationStageId, nextTime: string) => {
    if (!onUpdateSchedule || !nextTime) return;
    const updated = schedule.map((s) => (s.id === id ? { ...s, time: nextTime } : s));
    await onUpdateSchedule(updated);
  };

  const handleStageToggle = async (id: AutomationStageId) => {
    if (!onUpdateSchedule) return;
    const updated = schedule.map((s) =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    await onUpdateSchedule(updated);
  };

  const latestLog = workflowLogs[0];
  const hasRecentError = latestLog?.status === 'failed';

  const engineStatus: {
    label: string;
    dotColor: string;
    pingColor: string;
    textColor: string;
    borderColor: string;
    pulse: boolean;
  } = emergencyStop
    ? {
        label: 'Emergency Stopped',
        dotColor: 'bg-[#ef4444]',
        pingColor: 'bg-[#ef4444]',
        textColor: 'text-[#ef4444]',
        borderColor: 'border-[#5c1d1d]',
        pulse: true,
      }
    : hasRecentError && !schedulePaused
    ? {
        label: 'Error (Check Logs)',
        dotColor: 'bg-[#ef4444]',
        pingColor: 'bg-[#ef4444]',
        textColor: 'text-[#ef4444]',
        borderColor: 'border-[#5c1d1d]',
        pulse: true,
      }
    : schedulePaused
    ? {
        label: 'Paused',
        dotColor: 'bg-[#facc15]',
        pingColor: 'bg-[#facc15]',
        textColor: 'text-[#facc15]',
        borderColor: 'border-[#4a3e14]',
        pulse: false,
      }
    : {
        label: 'Active',
        dotColor: 'bg-[#a3e635]',
        pingColor: 'bg-[#a3e635]',
        textColor: 'text-[#a3e635]',
        borderColor: 'border-[#2d4018]',
        pulse: true,
      };

  return (
    <div className="space-y-8">
      {/* Top Header & Master Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#222222] pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-editorial text-3xl md:text-4xl text-[#f4f3ef] font-normal tracking-tight">
              Automation Engine
            </h1>
            <div
              className={`inline-flex items-center gap-2 px-2.5 py-1 bg-[#121212] border ${engineStatus.borderColor} rounded text-[11px] font-mono uppercase tracking-wider ${engineStatus.textColor}`}
              title={`Engine status: ${engineStatus.label}`}
            >
              <span className="relative flex h-2 w-2">
                {engineStatus.pulse && (
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full ${engineStatus.pingColor} opacity-75`}
                  />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${engineStatus.dotColor}`}
                />
              </span>
              <span>{engineStatus.label}</span>
            </div>
          </div>
          <p className="text-sm text-[#8e8d8a] mt-1 max-w-2xl font-sans">
            Daily schedule for <span className="text-[#c5a880] font-mono">{mode}</span> mode ({timezone}). Customize trigger hours or pause individual stages.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onTogglePause}
            disabled={isProcessing}
            className={`px-4 py-2 border rounded text-xs font-semibold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${
              schedulePaused
                ? 'bg-[#1e1e1e] border-[#c5a880] text-[#c5a880] hover:bg-[#262626]'
                : 'bg-[#181818] border-[#333333] text-[#f4f3ef] hover:bg-[#222222]'
            }`}
          >
            {schedulePaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{schedulePaused ? 'Resume Schedule' : 'Pause Schedule'}</span>
          </button>

          <button
            type="button"
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

      {/* 4 Real Scheduled Stages */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-widest text-[#71717a] font-mono">
            Daily Scheduled Stages ({timezone})
          </h2>
          <div className={`inline-flex items-center gap-2 text-xs font-mono ${engineStatus.textColor}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${engineStatus.dotColor} ${engineStatus.pulse ? 'animate-pulse' : ''}`} />
            <span>Engine: {engineStatus.label.toUpperCase()}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {schedule.map((stage) => {
            const meta = STAGE_META[stage.id];
            return (
              <div
                key={stage.id}
                className={`p-5 bg-[#121212] border rounded transition flex flex-col justify-between space-y-4 ${
                  stage.enabled
                    ? 'border-[#222222] hover:border-[#333333]'
                    : 'border-[#1a1a1a] opacity-60'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <input
                      type="time"
                      value={stage.time}
                      onChange={(e) => handleTimeChange(stage.id, e.target.value)}
                      className="bg-[#0a0a0a] border border-[#2a2a2a] focus:border-[#c5a880] rounded px-2 py-1 text-sm font-semibold text-[#c5a880] tabular-nums focus:outline-none cursor-pointer"
                      aria-label={`${meta.title} time`}
                    />
                    <span className="text-[10px] text-[#71717a] uppercase">{meta.step}</span>
                  </div>

                  <div>
                    <h3 className="font-editorial text-xl text-[#f4f3ef] mb-1 font-normal">
                      {meta.title}
                    </h3>
                    <p className="text-xs text-[#8e8d8a] font-sans leading-relaxed">
                      {meta.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1e1e1e] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleStageToggle(stage.id)}
                    className={`px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider border transition cursor-pointer ${
                      stage.enabled
                        ? 'bg-[#1a2618] border-[#a3e635]/40 text-[#a3e635]'
                        : 'bg-[#161616] border-[#2a2a2a] text-[#71717a]'
                    }`}
                  >
                    {stage.enabled ? 'Active' : 'Off'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onRunStage(stage.id)}
                    disabled={isProcessing || emergencyStop}
                    className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#242424] disabled:opacity-40 text-xs font-mono text-[#f4f3ef] rounded border border-[#2a2a2a] hover:border-[#c5a880] transition cursor-pointer flex items-center gap-1"
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

      {/* Execution History & Audit Logs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-widest text-[#71717a] font-mono">
            Recent Execution Audit Trail ({workflowLogs.length})
          </h2>

          {onClearLogs && workflowLogs.length > 0 && (
            <button
              type="button"
              onClick={onClearLogs}
              disabled={isProcessing}
              className="px-2.5 py-1 bg-[#161616] hover:bg-[#1e1e1e] border border-[#2a2a2a] rounded text-[11px] font-mono text-[#8e8d8a] hover:text-[#f4f3ef] transition cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Logs</span>
            </button>
          )}
        </div>

        <div className="bg-[#121212] border border-[#222222] rounded overflow-hidden">
          {workflowLogs.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-[#71717a]">
              No automation or RSS execution logs yet. Trigger a stage above or run a search in AI Search Engine.
            </div>
          ) : (
            <div className="divide-y divide-[#1e1e1e]">
              {workflowLogs.map((log) => {
                const isSuccess = log.status === 'success';
                const isEmergency = log.status === 'skipped_emergency_stop';

                return (
                  <div
                    key={log.id}
                    className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-3 text-xs"
                  >
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
                        <div className="flex flex-wrap items-center gap-2 font-mono">
                          <span className="text-[#f4f3ef] font-medium">{log.stage}</span>
                          <span className="text-[#71717a]">·</span>
                          <span className="text-[#8e8d8a]">
                            {new Date(log.timestamp).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                          {log.itemsProcessed !== undefined && (
                            <>
                              <span className="text-[#71717a]">·</span>
                              <span className="text-[#c5a880] tabular-nums">
                                {log.itemsProcessed} item(s)
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-[#a1a1aa] font-sans mt-0.5">{log.summary}</p>
                        {log.details && (
                          <details className="mt-2">
                            <summary className="text-[10px] font-mono uppercase tracking-wider text-[#c5a880] cursor-pointer hover:underline select-none">
                              RSS & Extraction Log Details
                            </summary>
                            <div className="mt-1.5 p-2.5 bg-[#0a0a0a] border border-[#222222] rounded text-[11px] font-mono text-[#8e8d8a] space-y-1">
                              {log.details.split(' | ').map((line, i) => (
                                <div key={i} className="flex items-start gap-1.5">
                                  <span className="text-[#c5a880]">›</span>
                                  <span className="break-words">{line}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>

                    <span
                      className={`font-mono uppercase text-[10px] tracking-wider shrink-0 ${
                        isSuccess
                          ? 'text-[#a3e635]'
                          : isEmergency
                          ? 'text-[#ef4444]'
                          : 'text-[#f87171]'
                      }`}
                    >
                      {log.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
