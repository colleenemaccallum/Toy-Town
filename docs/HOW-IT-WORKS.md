# Stuffie Town: how the first build works

A web app: plain HTML, CSS and JavaScript, no build step. Open `index.html` from any web host.
On the iPad: open the link in Safari, tap Share, then "Add to Home Screen". It then opens full screen like an app
and keeps working offline after the first visit (`sw.js`; bump its VERSION after changes, and bump the matching `?v=` number on the css/js links in index.html so the iPad never mixes old and new files).

## The loop
1. **Start**: Maddie and Baby Bear wave; tap the play button.
2. **Street**: swipe sideways (3 screens wide). Gold stars bounce over the houses that are open: Baby Bear's and the Playroom. Other houses wiggle ("not home yet").
3. **Baby Bear tidy-up, round 1 (colors)**: drag 8 toys into the red, blue, yellow and green boxes. A wrong box sends the toy gently back. No timer, no losing.
4. **Cheer + pick a toy**: three prizes (doll, race car, paint easel), shuffled, no labels. Tap one.
5. **Playroom**: Maddie and Sandy; earned toys appear and can be dragged anywhere. Kept on the iPad between visits.

The house and toy-box home buttons go back to the street.

**Grown-up reset**: hold the "Stuffie Town" banner on the start screen for 5 seconds to empty the playroom.

## Files
- `art/` webp copies of the felt pieces (made from the project's art-pieces folder, trimmed and shrunk).
- `audio/narrator/` Colleen's recordings go here; see NARRATOR-LINES.md.
- `fonts/` Fredoka (SIL Open Font License, see fonts/OFL.txt).
- The game is laid out on a 1366 x 1024 stage (iPad Pro 12.9" landscape) and scales to fit other screens. Portrait shows "Turn me sideways!".

## Not yet
Tidy-up rounds 2-4 (shapes, shape + color, counting), the other houses, Rive animation, more prize toys.

## Music
`audio/music/background.m4a` loops quietly and gets softer while a narrator line plays.
Current song: "Music box, cute tune" from [4 Music Box Tracks](https://opengameart.org/content/4-music-box-tracks) (CC0, no credit needed).
The purple music-note button on the start screen turns music on or off (remembered on the iPad).

## Playroom furniture (ChatGPT felt pieces)
Cubby bookcase, window seat, toy chest, tea table with two chairs. Toys dropped near a flat top settle onto it,
shrink to fit inside cubbies, and drop to the floor if let go on the wall. Positions are set in `FURNITURE` in js/game.js.

## Art rule
Every picture comes from ChatGPT. Nothing is drawn in code.
