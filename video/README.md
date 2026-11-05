# How the demo video was made

The 2:19 demo on [YouTube](https://youtu.be/evy2Yd8vFI8) was put together from real screens, not mockups.

**Screens.** Each scene is a screen recording of the live site at phone size (452 by 978), recorded with Playwright driving Microsoft Edge. The page scrolls on its own so the important part ends up in view when the line about it is spoken. One scene, the seller's meetup QR code, was recorded on a local copy of the same code, because showing a live QR needs a payment that's still on hold. The video says so on screen.

**Privacy.** On the seller's deal page, the full IMEI and the handoff photos were blurred before recording. The demo deal uses documentation example IMEIs, not real phones.

**Voice and captions.** The narration is a Windows text to speech voice reading [docs/VIDEO_SCRIPT.md](../docs/VIDEO_SCRIPT.md). The voice engine reports when each word is spoken, and those timings place the captions, so the captions burned into the video match the voice. The full narration is in [docs/VIDEO_TRANSCRIPT.txt](../docs/VIDEO_TRANSCRIPT.txt).

**Slides and motion.** The headline, bullets and captions for each scene are drawn as separate images with Pillow, then animated with ffmpeg: each one slides and fades in on cue, the phone rises in, scenes dissolve into each other, and a progress bar runs along the bottom.

**Music.** A quiet four chord pad generated in ffmpeg from sine waves. No samples or copyrighted music.

**Facts.** Every number in the video comes from a real deal on the live site and can be checked on its proof page:

- Phone sale and PayPal dispute: [/p/jz8gdc2k34f7](https://avowly.vercel.app/p/jz8gdc2k34f7)
- Laptop rental: [/p/d6r8tnmjta2m](https://avowly.vercel.app/p/d6r8tnmjta2m)
- Judge demo deal: [/p/sjaz9ut96z6c](https://avowly.vercel.app/p/sjaz9ut96z6c)
