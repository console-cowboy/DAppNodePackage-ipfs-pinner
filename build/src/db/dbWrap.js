/**
 * Wraps a level db instance to provide custom behaviour
 *
 * @param {Object} db level db instance
 */
function wrapDb(db) {
  /**
   * Returns value at key
   * @param {String} key
   * @param {*} data
   */
  function get(key) {
    return db.get(key).value();
  }

  /**
   * Set value at key
   * @param {String} key
   */
  function set(key, data) {
    return db.set(key, data).write();
  }

  /**
   * Deletes a key
   * @param {String} key
   */
  function del(key) {
    return db.unset(key).write();
  }

  function merge(key, data) {
    const prevData = get(key) || {};
    // Ensure data types
    if (typeof prevData !== "object" || Array.isArray(prevData))
      throw Error(`prevData must be an object: ${JSON.stringify(prevData)}`);
    if (typeof data !== "object" || Array.isArray(data))
      throw Error(`data must be an object: ${JSON.stringify(data)}`);
    return set(key, { ...prevData, ...data });
  }

  return {
    get,
    set,
    del,
    merge
  };
}

module.exports = wrapDb;
