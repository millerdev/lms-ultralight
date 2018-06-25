# Ultralight - a Logitech Media Server skin

Ultralight is a responsive skin for Logitech Media Server that works well
on desktop and mobile browsers. 

![Ultralight](ultralight.png?raw=true "Ultralight")

Features

- Basic player controls.
- Responsive layout adjusts to various screen sizes.
- Drag/drop to sort tracks in playlist, even multiple tracks at once.
- Drag/drop items from search results into playlist.
- Select and delete multiple items at once.

## Installation

Installation instructions:

- Go to the [releases page](https://github.com/millerdev/lms-ultralight/releases)
- Download the `UltralightSkin-vX.Y.Z.zip` file under *Downloads* of the latest
  release.
- Follow instructions on [LMS Plugins Installation](http://wiki.slimdevices.com/index.php/Logitech_Media_Server_Plugins#Installation)
  to install the plugin.
- Go to http://localhost:9000/ultralight to view the skin (adjust host and port
  if they are different on your system).

## Development

```
# install dependencies
npm install

# run dev server
npm run dev

# run tests
npm test
```

### Build/package

```
npm run build
npm package
```

This creates a packaged version file: `UltralightSkin-vX.Y.Z.zip`

Follow [installation](#installation) instructions above, using this file instead
of the one downloaded from the releases page.
