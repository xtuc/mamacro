const {parse} = require("babylon");
const generate = require("@babel/generator").default;

const parserOptions = {
  allowReturnOutsideFunction: true,
  allowAwaitOutsideFunction: true,
  allowImportExportEverywhere: true,
  allowSuperOutsideMethod: true
};

function hasFlag(name) {
  return process.env["WITH_" + name.toUpperCase()] === "1";
}

function joinAndRenderTemplate(template) {
  return template.quasis.reduce((acc, el) => {
    acc += el.value.raw;

    const expr = template.expressions.shift();

    if (typeof expr !== "undefined") {
      acc += generate(expr).code;
    }

    return acc;
  }, '');
}

function replaceTempateExpressionWith(template, search, remplacement) {
  template.expressions = template.expressions.reduce((acc, expr) => {

    if (expr.name === search) {
      acc.push(remplacement);
    } else {
      acc.push(expr);
    }

    return acc;
  }, []);
}

function macro({types: t}) {
  const macroMap = {};

  function renderMacro(originalMacro, args) {
    // args.reverse();
    const macro = t.cloneDeep(originalMacro);

    const templateParams = macro.params;
    const template = macro.body;

    // replace in template
    templateParams.forEach((templateArg, index) => {
      const calledWithArg = args[index];

      let remplacement = calledWithArg;

      if (typeof calledWithArg === "undefined") {
        remplacement = t.identifier("undefined");
      }

      replaceTempateExpressionWith(template, templateArg.name, remplacement);
    });

    // render
    return joinAndRenderTemplate(template);
  }

  function defineMacro(ident, fn, isDefault) {
    const {name} = ident;

    if (t.isArrowFunctionExpression(fn) === false) {
      throw new Error("Unsupported macro");
    }

    if (name === "trace" && hasFlag("trace") === false) {
      return;
    }

    macroMap[name] = fn;
    macroMap[name].isDefault = isDefault;
  }

  /**
   * Default macros
   */
  defineMacro(
    t.identifier("assert"),
    parse([
      "(cond, msg) => `if (!(${cond})) {",
        "throw new Error('${cond}' + \" error: \" + (${msg} || \"unknown\"));",
      "}`"
    ].join("\n")).program.body[0].expression,
    true
  );

  defineMacro(
    t.identifier("assertRuntimeError"),
    parse([
      "(cond, msg) => `if (!(${cond})) {",
        "throw new RuntimeError('${cond}' + \" error: \" + (${msg} || \"unknown\"));",
      "}`"
    ].join("\n")).program.body[0].expression,
    true
  );

  return {
    visitor: {
      Program(path, state) {
        if (typeof state.importedFromMamacro === "undefined") {
          state.importedFromMamacro = [];
        }
      },

      /**
       * Collect maros to be processed
       */
      ImportDeclaration(path, state) {
        const { source, specifiers } = path.node;

        if (t.isStringLiteral(source, { value: "mamacro" }) === false) {
          return;
        }

        specifiers.forEach(({ imported }) =>
          state.importedFromMamacro.push(imported.name)
        );

        path.remove();
      },

      /**
       * Process macros
       */
      CallExpression(path, state) {
        const {node} = path;

        /**
         * Register macro
         */
        const hasDefineBeenImported = state.importedFromMamacro.indexOf("define") !== -1;
        if (
          hasDefineBeenImported === true
          && t.isIdentifier(node.callee, {name: "define"})
        ) {
          defineMacro(node.arguments[0], node.arguments[1]);
          path.remove();

          return;
        }

        /**
         * Process macro
         */
        const macro = macroMap[node.callee.name];
        const hasMacroBeenImported = state.importedFromMamacro.indexOf(node.callee.name);

        if (typeof macro !== "undefined") {

          // if it's a default macro and has not been imported, it's likely a
          // collision
          if (
            macro.isDefault === true
            && state.importedFromMamacro.indexOf(node.callee.name) === -1
          ) {
            return;
          }

          const callExpressionArgs = node.arguments;

          const string = renderMacro(macro, callExpressionArgs);
          const ast = parse(string, parserOptions).program.body;

          path.replaceWithMultiple(ast);
        }

        if (node.callee.name === "trace" && hasFlag("trace") === false) {
          path.remove();
        }

      }
    }
  }
}

module.exports = macro;
