# mamacro

## babel-plugin-mamacro

**You need** to install the Babel plugin: `babel-plugin-mamacro`.

## Examples

```js
import { assert } from "mamacro";

assert(false, "it's false");
```

```js
import { define } from "mamacro";

define(
  trace,
  msg => `
    console.log("trace " + ${msg});
  `
);

trace("foo");
```
