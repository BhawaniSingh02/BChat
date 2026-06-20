import { useCallback, useEffect, useState } from 'react'
import {
  getPreferredMicId, getPreferredCameraId, getPreferredSpeakerId,
  setPreferredMicId, setPreferredCameraId, setPreferredSpeakerId,
} from '../../../utils/mediaPreferences'

interface DeviceOption {
  deviceId: string
  label: string
}

const speakerSelectionSupported =
  typeof window !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype

export default function VideoVoicePanel() {
  const [mics, setMics] = useState<DeviceOption[]>([])
  const [cameras, setCameras] = useState<DeviceOption[]>([])
  const [speakers, setSpeakers] = useState<DeviceOption[]>([])
  const [mic, setMic] = useState(getPreferredMicId())
  const [camera, setCamera] = useState(getPreferredCameraId())
  const [speaker, setSpeaker] = useState(getPreferredSpeakerId())
  const [needsPermission, setNeedsPermission] = useState(false)
  const [unsupported, setUnsupported] = useState(false)

  const loadDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      setUnsupported(true)
      return
    }
    const devices = await navigator.mediaDevices.enumerateDevices()
    const toOption = (d: MediaDeviceInfo, fallback: string): DeviceOption => ({
      deviceId: d.deviceId,
      label: d.label || fallback,
    })
    const ins = devices.filter((d) => d.kind === 'audioinput').map((d, i) => toOption(d, `Microphone ${i + 1}`))
    const cams = devices.filter((d) => d.kind === 'videoinput').map((d, i) => toOption(d, `Camera ${i + 1}`))
    const outs = devices.filter((d) => d.kind === 'audiooutput').map((d, i) => toOption(d, `Speaker ${i + 1}`))
    setMics(ins)
    setCameras(cams)
    setSpeakers(outs)
    // Labels are blank until the user grants media permission at least once.
    setNeedsPermission([...ins, ...cams].length > 0 && [...ins, ...cams].every((d) => !d.label))
  }, [])

  useEffect(() => {
    void loadDevices()
    // Capture the reference so cleanup is safe even if mediaDevices changes.
    const md = navigator?.mediaDevices
    if (md?.addEventListener) {
      md.addEventListener('devicechange', loadDevices)
      return () => md.removeEventListener?.('devicechange', loadDevices)
    }
  }, [loadDevices])

  const requestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      stream.getTracks().forEach((t) => t.stop())
    } catch {
      // user may deny camera but allow mic — still re-enumerate to pick up labels
    }
    setNeedsPermission(false)
    await loadDevices()
  }

  const onMic = (v: string) => { setMic(v); setPreferredMicId(v) }
  const onCamera = (v: string) => { setCamera(v); setPreferredCameraId(v) }
  const onSpeaker = (v: string) => { setSpeaker(v); setPreferredSpeakerId(v) }

  if (unsupported) {
    return (
      <PanelShell title="Video & voice">
        <p className="text-sm text-gray-500">Device selection isn’t supported in this environment.</p>
      </PanelShell>
    )
  }

  return (
    <PanelShell title="Video & voice" subtitle="Choose the devices used for calls.">
      {needsPermission && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">Allow camera & microphone access to see device names.</p>
          <button
            onClick={requestPermission}
            className="flex-shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
            data-testid="grant-media-permission"
          >
            Allow
          </button>
        </div>
      )}

      <DeviceSelect
        label="Microphone" value={mic} options={mics} onChange={onMic} testId="mic-select"
      />
      <DeviceSelect
        label="Camera" value={camera} options={cameras} onChange={onCamera} testId="camera-select"
      />
      {speakerSelectionSupported ? (
        <DeviceSelect
          label="Speaker" value={speaker} options={speakers} onChange={onSpeaker} testId="speaker-select"
        />
      ) : (
        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-gray-600">Speaker</label>
          <p className="text-xs text-gray-400">Your browser uses the system default speaker for calls.</p>
        </div>
      )}
    </PanelShell>
  )
}

interface DeviceSelectProps {
  label: string
  value: string
  options: DeviceOption[]
  onChange: (v: string) => void
  testId: string
}

function DeviceSelect({ label, value, options, onChange, testId }: DeviceSelectProps) {
  return (
    <div className="mt-4">
      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-[#2a3942] dark:text-gray-100 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        data-testid={testId}
      >
        <option value="">System default</option>
        {options.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
        ))}
      </select>
    </div>
  )
}

function PanelShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
      {subtitle && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  )
}
