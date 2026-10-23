# KrackedDSky

KrackedDSky is a browser-based 3D cabin-service game for players managing the KDMirah Crew. [Play KD SKY](https://krackeddsky-kdmirahcrew.vercel.app/).

Serve passengers, balance the tray through turbulence, resolve cabin incidents, and deliver PA announcements. Choose Economy, VIP, or 1v1 against a computer-controlled rival. Flights earn career XP and Sky Credits. Advance through ranks, buy equipment upgrades, and unlock six sectors.

## Run locally

Requires Node.js and npm. Run these commands from the repository root:

```sh
cd KDMirahCrew
npm ci
npm run dev
```

Open the local URL printed by Vite. A browser with WebGL support is required. PA speech uses the browser's Web Speech API when available; the teleprompter uses timed highlighting otherwise.

## Controls

| Input | Action |
| --- | --- |
| Click a row or WASD / arrow keys | Move through the cabin |
| 1–8 or item buttons | Load an item at the galley, or walk there to load it |
| Space / E or Serve | Serve a nearby passenger; hold and release for drinks, press to stop meal plating |
| C or PA | Select an announcement; press again to hang up |
| G or Salam | Calm nearby passengers |
| V or Camera | Switch camera view |
| Drag / scroll | Orbit / zoom the camera |
| P / Escape | Pause or close an open menu |

Touch controls include an on-screen joystick and Serve button.

## Build

```sh
cd KDMirahCrew
npm run build
npm run preview
```

Vite writes the production build to `KDMirahCrew/dist/`. The app uses React, TypeScript, Three.js, Tailwind CSS, and Vite. Career progress, preferences, skills, and the top-eight score list stay in the browser's localStorage. They do not sync between browsers or devices.

## License

[MIT](LICENSE).
