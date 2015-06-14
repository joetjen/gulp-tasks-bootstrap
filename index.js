'use strict';

var gulp = require('gulp');
var glob = require('glob-all');
var path = require('path');

var conf = {};

function isArray(x) {
  return Array.isArray(x);
}
function isObject(x) {
  return typeof x === 'object';
}
function isFunction(x) {
  return typeof x === 'function';
}

function merge(dest, source) {
  for (var prop in source) {
    if (source.hasOwnProperty(prop)) {
      if (!dest[prop]) {
        dest[prop] = source[prop];
        continue;
      }

      if (isArray(dest[prop]) && isArray(source[prop])) {
        dest[prop] = dest[prop].concat(source[prop]);
        continue;
      }

      if (isObject(source[prop]) && isObject(dest[prop])) {
        dest[prop] = merge(dest[prop], source[prop]);
        continue;
      }

      dest[prop] = source[prop];
    }
  }

  return dest;
}

function findBase(a, b, l) {
  if (a === b) return a;

  l = l ? l - 1 : (a.length > b.length ? b.length : a.length);

  return findBase(a.substr(0, l), b.substr(0, l), l);
}

function createTask(task) {
  if (!task['dependencies'] && !task['task']) {
    throw new Error('Tasks must either have dependencies or a task function!');
  }

  gulp.task(task['name'], task['dependencies'], task['task']);
}

function loadTask(base) {
  return function (file) {
    var r = path.relative(base, file);
    var f = path.join(process.cwd(), file);
    var b = path.basename(r);
    var d = path.dirname(r);
    var e = path.extname(b);
    var x = require(f);

    var t = {
      name: (d === '.' ? '' : d.replace(path.sep, ':') + ':') + path.basename(b, e)
    };

    if (isFunction(x)) t.task = x;
    if (isObject(x)) {
      t = merge(t, x);

      if (t.hasOwnProperty('config')) {
        if (isFunction(t['config'])) t['config'](conf);
        else if (isObject(t.config)) t.config = merge(t['config'], conf);
        else t['config'] = conf;
      }
      else {
        t['config'] = conf;
      }
    }

    createTask(t);
  };
}

var Bootstrap = {

  /**
   * Merge `cfg` into the current configuration.
   *
   * @param {Object} cfg A configuration object
   * @returns {Bootstrap}
   */
  config: function (cfg) {
    conf = merge(conf, cfg);

    return this;
  },

  /**
   * Load tasks from paths.
   *
   * @param {string|string[]} paths A path or an array of paths
   * @returns {Bootstrap}
   */
  loadTasks: function (paths) {
    if (!Array.isArray(paths)) paths = [paths];

    var files = glob.sync(paths).sort();
    var base = files.reduce(function (a, b) {
      return findBase(a, b);
    });

    files.forEach(loadTask(base));

    return this;
  }

};

module.exports = Bootstrap;
