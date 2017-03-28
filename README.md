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

## Build/installation

```
npm run build
```

Build artifacts will be located in `./dist` when the build completes. Create a
new directory `HTML/ultralight` in your LMS themes dir and copy the files from
`./dist` into it.

Unfortunately the server needs to be patched to serve the font files. For now
the workaround is to apply a (hacky) patch (
[`lms-ultralight-server.patch`](lms-ultralight-server.patch)) to
`Slim/Web/HTTP.pm`

Once the patch is applied and the `ultralight` theme directory has been
populated, the theme can be accessed at http://localhost:9000/ultralight/
(assuming the Logitech Media Server is running on localhost port 9000).
