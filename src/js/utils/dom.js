//////////////////////////////////////////////////
// Silex, live web creation
// http://projects.silexlabs.org/?/silex/
//
// Copyright (c) 2012 Silex Labs
// http://www.silexlabs.org/
//
// Silex is available under the GPL license
// http://www.silexlabs.org/silex/silex-licensing/
//////////////////////////////////////////////////

/**
 * @fileoverview Helper class for common tasks
 *
 */


goog.provide('silex.utils.Dom');

/**
 * @constructor
 * @struct
 * @param {string} name
 * @param {string} displayName
 */
silex.utils.Dom = function() {
  throw('this is a static class and it canot be instanciated');
}


silex.utils.Dom.resolveTemplate = function (template, data) {
  var res = '';
  // for each item in data, e.g. each page in the list
  for (itemIdx in data){
    // build an item
    var item = template;
    // replace each key by its value
    for (key in data[itemIdx]){
      var value = data[itemIdx][key];
      item = item.replace(key, value);
    }
    // add the item to the rendered template
    res += item;
  }
  return res;
}
