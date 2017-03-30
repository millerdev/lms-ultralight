# Ultralight (preview) - a Logitech Media Server theme

Ultralight is a responsive theme for Logitech Media Server that works well
on desktop and mobile browsers. 

![Ultralight](ultralight.png?raw=true "Ultralight")

Features

- Basic player controls.
- Responsive layout adjusts to various screen sizes.
- Drag/drop to sort tracks in playlist, even multiple tracks at once.
- Select and delete multiple items at once (requires keyboard with Delete or
  Backspace key).

There is no support for adding items to the playlist yet, so it is recommended
to not set ultralight as the default theme. Instead, use the default theme to
browse the media library and add items to the playlist, and use ultralight on
your mobile device and/or to rearrange or delete items in the playlist. A media
library browser will hopefully be developed someday.


## Development

```
# install dependencies
npm install

# run dev server
npm run dev

# run tests
npm test
```

## Build/package/install

```
npm run build
npm package
```

This creates a packaged version file: `UltralightSkin-vX.Y.Z.zip`

Unzip this file into your [LMS Plugins folder](http://wiki.slimdevices.com/index.php/Logitech_Media_Server_Plugins)
and restart Logitech Media Server.
