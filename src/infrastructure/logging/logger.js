const log = (level, msg, fields = {}) => {
  const rec = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
  };

  console.log(JSON.stringify(rec));
};

module.exports = {
  info: (msg, fields) => log("info", msg, fields),
  error: (msg, fields) => log("error", msg, fields),
  warn: (msg, fields) => log("warn", msg, fields),
  trace: (msg, fields) => log("trace", msg, fields),
};
