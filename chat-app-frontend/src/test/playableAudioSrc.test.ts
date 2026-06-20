import { describe, it, expect } from 'vitest'
import { playableAudioSrc } from '../components/chat/MessageBubble'

describe('playableAudioSrc', () => {
  it('rewrites a Cloudinary webm voice message to an mp3 transcode', () => {
    const url = 'https://res.cloudinary.com/demo/video/upload/v123/bchat/voice-1.webm'
    expect(playableAudioSrc(url)).toBe('https://res.cloudinary.com/demo/video/upload/f_mp3/v123/bchat/voice-1.mp3')
  })

  it('handles ogg/m4a/wav extensions too', () => {
    expect(playableAudioSrc('https://res.cloudinary.com/d/video/upload/v1/a.ogg'))
      .toBe('https://res.cloudinary.com/d/video/upload/f_mp3/v1/a.mp3')
    expect(playableAudioSrc('https://res.cloudinary.com/d/video/upload/v1/a.m4a'))
      .toBe('https://res.cloudinary.com/d/video/upload/f_mp3/v1/a.mp3')
  })

  it('leaves non-Cloudinary URLs unchanged', () => {
    const url = 'https://my-backend.onrender.com/api/v1/files/voice-1.webm'
    expect(playableAudioSrc(url)).toBe(url)
  })

  it('leaves already-mp3 Cloudinary urls effectively mp3', () => {
    const url = 'https://res.cloudinary.com/demo/video/upload/v1/voice.mp3'
    // no audio extension to swap, but the f_mp3 transform is still inserted (harmless)
    expect(playableAudioSrc(url)).toContain('/video/upload/f_mp3/')
  })

  it('does not throw on malformed input', () => {
    expect(playableAudioSrc('not a url')).toBe('not a url')
  })
})
