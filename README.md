# fast-plist
A fast PLIST parser.

## Installing

```sh
npm install fast-plist
```

## Using

```javascript
var parse = require('fast-plist').parse;

console.log(
    parse(`
        <?xml version="1.0" encoding="UTF-8"?>
        <plist version="1.0">
        <dict>
            <key>name</key>
            <string>Brogrammer</string>
            <key>settings</key>
            <dict>
                <key>background</key>
                <string>#1a1a1a</string>
                <key>caret</key>
                <string>#ecf0f1</string>
                <key>foreground</key>
                <string>#ecf0f1</string>
                <key>invisibles</key>
                <string>#F3FFB51A</string>
                <key>lineHighlight</key>
                <string>#2a2a2a</string>
            </dict>
        </dict>
        </plist>`
    )
);
/* Output:
{
        "name": "Brogrammer",
        "settings": {
                "background": "#1a1a1a",
                "caret": "#ecf0f1",
                "foreground": "#ecf0f1",
                "invisibles": "#F3FFB51A",
                "lineHighlight": "#2a2a2a"
        }
}
*/
```

```javascript

parse(`bad string`);

/* Output:

Error: Near offset 1: expected < ~~~ad string~~~
*/
```

## Development

## License
[MIT](https://github.com/Microsoft/node-fast-plist/blob/master/LICENSE.md)
