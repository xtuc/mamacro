function noop() {
  throw new Error("Macro has not been processed");
}

module.exports = {
  assert: noop
};
