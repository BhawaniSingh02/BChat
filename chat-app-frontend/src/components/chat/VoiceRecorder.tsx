import { useCallback, useEffect, useRef, useState } from 'react'
import { uploadApi } from '../../api/upload'

const MAX_DURATION_SECONDS = 120
const WAVEFORM_POINTS = 40

interface VoiceRecorderProps {
  onSend: (url: string, durationSeconds: number, waveform: number[]) => void
  onCancel: () => void
}

/** Formats seconds into m:ss */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Downsamples a recorded audio blob into a fixed number of normalized (0-100) amplitude
 * peaks, for a static waveform rendered at playback time. Best-effort: returns [] if the
 * blob can't be decoded (e.g. unsupported codec in a given browser), which callers treat
 * as "no waveform" rather than a fatal error.
 */
async function computeWaveformPeaks(blob: Blob, points = WAVEFORM_POINTS): Promise<number[]> {
  try {
    const arrayBuffer = await blob.arrayBuffer()
    const audioCtx = new AudioContext()
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
    const channelData = audioBuffer.getChannelData(0)
    const blockSize = Math.max(1, Math.floor(channelData.length / points))
    const raw: number[] = []
    for (let i = 0; i < points; i++) {
      const start = i * blockSize
      let sum = 0
      let count = 0
      for (let j = start; j < start + blockSize && j < channelData.length; j++) {
        sum += Math.abs(channelData[j])
        count++
      }
      raw.push(count > 0 ? sum / count : 0)
    }
    audioCtx.close()
    const max = Math.max(...raw, 0.0001)
    return raw.map((v) => Math.round((v / max) * 100))
  } catch {
    return []
  }
}

export default function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [waveform, setWaveform] = useState<number[]>(Array(20).fill(4))

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  // Stable ref so the timer interval can invoke stopAndUpload without a stale closure
  const stopAndUploadRef = useRef<() => void>(() => {})
  // Retained after a failed upload so the user can retry without re-recording
  const recordedBlobRef = useRef<Blob | null>(null)
  const recordedDurationRef = useRef<number>(0)
  const recordedWaveformRef = useRef<number[]>([])

  const stopTimerAndAnimation = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = 0 }
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Set up analyser for waveform visualisation
      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)
      analyserRef.current = analyser

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/ogg'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.start(100) // collect data every 100ms
      setRecording(true)
      startTimeRef.current = Date.now()
      setElapsed(0)

      // Timer
      timerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setElapsed(secs)
        if (secs >= MAX_DURATION_SECONDS) {
          // Auto-stop at max duration — call stopAndUpload so onstop is set before stop()
          stopAndUploadRef.current()
        }
      }, 500)

      // Waveform animation
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const animate = () => {
        analyser.getByteFrequencyData(dataArray)
        const bars = Array.from({ length: 20 }, (_, i) => {
          const idx = Math.floor((i / 20) * dataArray.length)
          return Math.max(4, Math.round((dataArray[idx] / 255) * 28))
        })
        setWaveform(bars)
        animFrameRef.current = requestAnimationFrame(animate)
      }
      animate()
    } catch {
      setError('Microphone access denied. Please allow microphone access and try again.')
    }
  }, [])

  const attemptUpload = useCallback(async (blob: Blob, durationSeconds: number, waveformPeaks: number[]) => {
    setError(null)
    setUploading(true)
    setUploadProgress(0)
    try {
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type })
      const result = await uploadApi.uploadFile(file, (pct) => setUploadProgress(pct))
      onSend(result.url, durationSeconds, waveformPeaks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      setUploading(false)
    }
  }, [onSend])

  const stopAndUpload = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') return

    const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000)
    stopTimerAndAnimation()

    recorder.onstop = async () => {
      audioCtxRef.current?.close(); audioCtxRef.current = null
      streamRef.current?.getTracks().forEach((t) => t.stop())
      const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type ?? 'audio/webm' })

      if (blob.size === 0) { setError('Recording was empty.'); setRecording(false); return }

      setRecording(false)

      const waveformPeaks = await computeWaveformPeaks(blob)
      recordedBlobRef.current = blob
      recordedDurationRef.current = durationSeconds
      recordedWaveformRef.current = waveformPeaks

      attemptUpload(blob, durationSeconds, waveformPeaks)
    }

    recorder.stop()
  }, [attemptUpload, stopTimerAndAnimation])

  const handleRetry = useCallback(() => {
    if (!recordedBlobRef.current) return
    attemptUpload(recordedBlobRef.current, recordedDurationRef.current, recordedWaveformRef.current)
  }, [attemptUpload])

  const handleCancel = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.ondataavailable = null
      recorder.onstop = null
      recorder.stop()
    }
    audioCtxRef.current?.close(); audioCtxRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    stopTimerAndAnimation()
    onCancel()
  }, [onCancel, stopTimerAndAnimation])

  // Keep stopAndUploadRef current so the timer's auto-stop path always uses the latest closure
  useEffect(() => {
    stopAndUploadRef.current = stopAndUpload
  }, [stopAndUpload])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimerAndAnimation()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      audioCtxRef.current?.close(); audioCtxRef.current = null
    }
  }, [stopTimerAndAnimation])

  // Auto-start recording when component mounts
  useEffect(() => {
    startRecording()
  }, [startRecording])

  return (
    <div className="flex items-center gap-3 px-3 py-2" data-testid="voice-recorder">
      {/* Cancel */}
      <button
        onClick={handleCancel}
        className="w-9 h-9 flex items-center justify-center rounded-full text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
        aria-label="Cancel recording"
        data-testid="voice-cancel-btn"
        disabled={uploading}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Waveform + timer */}
      <div className="flex-1 flex items-center gap-2 bg-white dark:bg-[#2a3942] rounded-3xl px-4 py-2 shadow-sm min-w-0">
        {/* Animated waveform bars */}
        <div className="flex items-center gap-0.5 h-8" aria-hidden>
          {waveform.map((h, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-100 ${recording ? 'bg-red-500' : 'bg-gray-300'}`}
              style={{ height: `${h}px` }}
            />
          ))}
        </div>

        {/* Timer */}
        <span
          className="text-sm font-mono text-gray-600 ml-2 flex-shrink-0"
          data-testid="voice-timer"
        >
          {formatDuration(elapsed)}
        </span>

        {/* Recording indicator */}
        {recording && (
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" aria-label="Recording" />
        )}

        {/* Upload progress */}
        {uploading && (
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
                role="progressbar"
                aria-valuenow={uploadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                data-testid="voice-upload-progress"
              />
            </div>
            <span className="text-xs text-gray-500">{uploadProgress}%</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 absolute bottom-14 left-4 right-4 bg-white/90 dark:bg-[#1a242b]/95 rounded px-2 py-1 shadow">
          <p className="text-xs text-red-500 flex-1" data-testid="voice-error">{error}</p>
          {recordedBlobRef.current && (
            <button
              onClick={handleRetry}
              className="text-xs font-semibold text-[#075e54] hover:underline flex-shrink-0"
              data-testid="voice-retry-btn"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Send */}
      <button
        onClick={stopAndUpload}
        disabled={!recording || uploading}
        className="w-10 h-10 bg-[#075e54] hover:bg-[#128c7e] disabled:bg-gray-300 rounded-full
          flex items-center justify-center text-white transition-colors flex-shrink-0 shadow-sm"
        aria-label="Send voice message"
        data-testid="voice-send-btn"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </div>
  )
}
