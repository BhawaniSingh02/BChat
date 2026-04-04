import { useCallback, useEffect, useRef, useState } from 'react'
import { uploadApi } from '../../api/upload'

const MAX_DURATION_SECONDS = 120

interface VoiceRecorderProps {
  onSend: (url: string, durationSeconds: number) => void
  onCancel: () => void
}

/** Formats seconds into m:ss */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
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
          // Auto-stop at max duration
          recorder.stop()
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

  const stopAndUpload = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') return

    const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000)
    stopTimerAndAnimation()

    recorder.onstop = async () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type ?? 'audio/webm' })

      if (blob.size === 0) { setError('Recording was empty.'); setRecording(false); return }

      setRecording(false)
      setUploading(true)

      try {
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type })
        const result = await uploadApi.uploadFile(file, (pct) => setUploadProgress(pct))
        onSend(result.url, durationSeconds)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
        setUploading(false)
      }
    }

    recorder.stop()
  }, [onSend, stopTimerAndAnimation])

  const handleCancel = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.ondataavailable = null
      recorder.onstop = null
      recorder.stop()
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    stopTimerAndAnimation()
    onCancel()
  }, [onCancel, stopTimerAndAnimation])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimerAndAnimation()
      streamRef.current?.getTracks().forEach((t) => t.stop())
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
      <div className="flex-1 flex items-center gap-2 bg-white rounded-3xl px-4 py-2 shadow-sm min-w-0">
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
        <p className="text-xs text-red-500 absolute bottom-14 left-4 right-4 bg-white/90 rounded px-2 py-1 shadow" data-testid="voice-error">
          {error}
        </p>
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
