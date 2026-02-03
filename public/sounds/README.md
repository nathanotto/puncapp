# Meeting Timer Sounds

This directory should contain sound files for the meeting timer warnings:

## Required Sound Files

1. **beep-beep.mp3** - Two quick beeps (Roadrunner style)
   - Used for Lightning Round at 15 seconds remaining
   - Should be short and attention-getting but not annoying

2. **tinkle.mp3** - Gentle tinkling sound
   - Used for Full Check-ins at 1 minute remaining
   - Should be softer and more gentle than beep-beep

## Alternative: Web Audio API

If sound files are not available, the TimerWidget component can use the Web Audio API to generate tones programmatically:

```javascript
function playBeepBeep() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()

  // First beep
  const osc1 = audioContext.createOscillator()
  osc1.frequency.value = 800
  osc1.connect(audioContext.destination)
  osc1.start()
  osc1.stop(audioContext.currentTime + 0.1)

  // Second beep
  setTimeout(() => {
    const osc2 = audioContext.createOscillator()
    osc2.frequency.value = 800
    osc2.connect(audioContext.destination)
    osc2.start()
    osc2.stop(audioContext.currentTime + 0.1)
  }, 150)
}
```

## TODO

- [ ] Add actual sound files or implement Web Audio API generation
- [ ] Test sound playback in different browsers
- [ ] Verify "Silence" button prevents sounds from playing
