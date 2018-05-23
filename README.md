# mamacro

## babel-plugin-mamacro

**You need** to install the Babel plugin: `babel-plugin-mamacro`.

## Examples

```js
import { assert } from "mamacro";

assert(true === false, "it's false"); // Error: true === false error: it's false
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
