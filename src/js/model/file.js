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
 * @fileoverview
 *   This class represents a File opend by Silex,
 *   which is rendered by the Stage class
 *   It has methods to manipulate the File
 *
 */


goog.require('silex.model.ModelBase');
goog.provide('silex.model.File');
goog.require('silex.Config');


/**
 * @constructor
 * @param  {element} bodyElement  HTML element which holds the body section of the opened file
 * @param  {element} headElement  HTML element which holds the head section of the opened file
 */
silex.model.File = function(bodyElement, headElement) {
  // call super
  goog.base(this, bodyElement, headElement);
};

// inherit from silex.model.ModelBase
goog.inherits(silex.model.File, silex.model.ModelBase);


/**
 * current file url
 * if the current file is a new file, it has no url
 */
silex.model.File.prototype.url;


/**
 * build the html content
 * Parse the raw html and fill the bodyElement and headElement
 */
silex.model.File.prototype.setHtml = function(rawHtml) {
  // reset the previous page model
  var pages = silex.model.Page.getPages();
  while (pages.length > 0) {
    var page = pages[0];
    page.detach();
  }

  var bodyHtml, headHtml;

  // use lower case to find head and body tags
  var lowerCaseHtml = rawHtml.toLowerCase();
  // split head and body tags
  var headOpenIdx = lowerCaseHtml.indexOf('<head>');
  if (headOpenIdx === -1) headOpenIdx = lowerCaseHtml.indexOf('<head ');
  var headCloseIdx = lowerCaseHtml.indexOf('</head>');
  var bodyOpenIdx = lowerCaseHtml.indexOf('<body>');
  if (bodyOpenIdx === -1) bodyOpenIdx = lowerCaseHtml.indexOf('<body ');
  var bodyCloseIdx = lowerCaseHtml.indexOf('</body>');

  if (headOpenIdx > -1 && headCloseIdx > -1) {
    // look for the first ">" after "<head"
    var closingTagIdx = lowerCaseHtml.indexOf('>', headOpenIdx);
    // extract the head section
    headHtml = rawHtml.substring(closingTagIdx + 1, headCloseIdx);
  }
  if (bodyOpenIdx > -1 && bodyCloseIdx > -1) {
    // look for the first ">" after "<body"
    var closingTagIdx = lowerCaseHtml.indexOf('>', bodyOpenIdx);
    // extract the body section
    bodyHtml = rawHtml.substring(closingTagIdx + 1, bodyCloseIdx);
  }
  // extract body style
  var bodyHtml = rawHtml.substring(bodyOpenIdx, bodyCloseIdx + 1);
  var styleStart = bodyHtml.indexOf('"');
  var styleEnd = bodyHtml.indexOf('"', styleStart + 1);
  var bodyStyle = bodyHtml.substring(styleStart + 1, styleEnd);
  var absolutePathStyle = this.bodyElement.relative2absolute(this.bodyStyle, this.getUrl());
  bodyStyle = absolutePathStyle;

  // update model
  this.bodyElement.innerHTML = bodyHtml;
  this.bodyElement.setAttribute('style', bodyStyle);
  this.headElement.innerHTML = headHtml;
};


/**
 * build a string of the raw html content
 * use the bodyTag and headTag objects
 */
silex.model.File.prototype.getHtml = function() {
  // handle background url of the body style
  var styleStr = this.bodyElement.getAttribute('style');

  var html = '';
  html += '<html>';
  html += '<head>' + this.headElement.innerHTML + '</head>';
  html += '<body style="' + styleStr + '">' + this.bodyElement.innerHTML + '</body>';
  html += '</html>';

  return html;
};


/**
 * load an empty new file
 */
silex.model.File.prototype.newFile = function(cbk, opt_errCbk) {
  this.openFromUrl(silex.model.File.CREATION_TEMPLATE, cbk, opt_errCbk);
};


/**
 * load an arbitrary url as a silex html file
 * will not be able to save
 */
silex.model.File.prototype.openFromUrl = function(url, cbk, opt_errCbk) {
  silex.service.CloudStorage.getInstance().loadLocal(url,
      goog.bind(function(rawHtml) {
        this.setUrl(null);
        if (cbk) cbk(rawHtml);
      }, this), opt_errCbk);
};


/**
 * save a file with a new name
 */
silex.model.File.prototype.saveAs = function(url, rawHtml, cbk, opt_errCbk) {
  // save the data
  this.setUrl(url);
  this.save(rawHtml, cbk, opt_errCbk);
};


/**
 * write content to the file
 */
silex.model.File.prototype.save = function(rawHtml, cbk, opt_errCbk) {
  silex.service.CloudStorage.getInstance().save(
    this.getUrl(), 
    rawHtml, 
    function() {
      if (cbk) cbk();
    }, 
    opt_errCbk);
};


/**
 * load a new file
 */
silex.model.File.prototype.open = function(url, cbk, opt_errCbk) {
  // let the user choose the file
  this.fileExplorer.openDialog(
      goog.bind(function(url) {
        silex.service.CloudStorage.getInstance().load(
          url,
          goog.bind(function(rawHtml) {
            // update model
            this.close();
            this.setUrl(url);
            if (cbk) cbk(rawHtml);
          }, this), opt_errCbk);
      }, this),
      ['text/html', 'text/plain'],
      opt_errCbk);
};


/**
 * reset data, close file
 */
silex.model.File.prototype.close = function() {
  this.url = null;
};


/**
 * get the url of the file
 * @param    head     an HtmlDom element containing a new version of the head tag
 */
silex.model.File.prototype.getUrl = function() {
  return this.url;
};


/**
 * store url of this file
 * @param    head     an HtmlDom element containing a new version of the head tag
 */
silex.model.File.prototype.setUrl = function(url) {
  this.url = url;
};


/**
 * publish the file to a folder
 */
silex.model.File.prototype.publish = function(url) {
  this.cleanup(
      goog.bind(function(html, css, files) {
        silex.service.SilexTasks.getInstance().publish(url, html, css, files, cbk, opt_errCbk);
      }, this),
      goog.bind(function(error) {
        console.error('publish cleanup error', error);
        if (opt_errCbk) {
          opt_errCbk(error);
        }
      }, this));
};


/**
 * cleanup html page
 * remove Silex specific data from HTML
 * create an external CSS file
 * generates a list of js scripts and assets to be eported with the file
 * @return
 */
silex.model.Body.prototype.cleanup = function(cbk, opt_errCbk) {
  // build a clean body clone
  var bodyStr = goog.dom.getOuterHtml(this.bodyElement);

  // head
  var headStr = this.headElement.innerHTML;

  // list of css and files (assets, scripts...)
  var cssArray = [];
  var files = [];

  // **
  // get all files and put them into assets/ or scripts/
  if (!this.getUrl()) {
    if (opt_errCbk) {
      opt_errCbk({
        message: 'The file must be saved before I can clean it up for you.'
      });
    }
    return;
  }
  var baseUrl = silex.utils.Url.getBaseUrl(this.getUrl());

  // image source
  bodyStr = bodyStr.replace(/<img[^"]*src="?([^" ]*)"/g, function(match, group1, group2) {
    var absolute = silex.utils.Url.getAbsolutePath(group1, baseUrl);
    var relative = silex.utils.Url.getRelativePath(absolute, silex.Helper.BaseUrl);
    // replace the '../' by '/', e.g. ../api/v1.0/www/exec/get/silex.png becomes /api/v1.0/www/exec/get/silex.png
    if (!silex.Helper.isAbsoluteUrl(relative)) {
      relative = relative.replace('../', '/');
    }
    var fileName = absolute.substr(absolute.lastIndexOf('/') + 1);
    var newRelativePath = 'assets/' + fileName;
    files.push({
      url: absolute
, destPath: newRelativePath
, srcPath: relative
    });
    var res = match.replace(group1, newRelativePath);
    return res;
  });
  // background-image / url(...)
  bodyStr = bodyStr.replace(/url\((['"])(.+?)\1\)/g, goog.bind(function(match, group1, group2) {
    return this.filterBgImage(baseUrl, files, match, group1, group2);
  }, this));
  // css
  headStr = headStr.replace(/href="?([^" ]*)"/g, function(match, group1, group2) {
    var preventDownload = false;
    var absolute = silex.utils.Url.getAbsolutePath(group1, baseUrl);
    var relative = silex.utils.Url.getRelativePath(absolute, silex.Helper.BaseUrl);
    // replace the '../' by '/', e.g. ../api/v1.0/www/exec/get/silex.png becomes /api/v1.0/www/exec/get/silex.png
    if (!silex.Helper.isAbsoluteUrl(relative)) {
      relative = relative.replace('../', '/');
    }
    else {
      // only allowed domains
      if (absolute.indexOf('http://static.silex.me') !== 0) {
        preventDownload = true;
      }
    }
    if (!preventDownload) {
      var fileName = absolute.substr(absolute.lastIndexOf('/') + 1);
      var newRelativePath = 'css/' + fileName;
      files.push({
        url: absolute
, destPath: newRelativePath
, srcPath: relative
      });
      var res = match.replace(group1, newRelativePath);
      return res;
    }
    return match;
  });
  // scripts
  headStr = headStr.replace(/src="?([^"]*)"/g, function(match, group1, group2) {
    var preventDownload = false;
    var absolute = silex.utils.Url.getAbsolutePath(group1, baseUrl);
    var relative = silex.utils.Url.getRelativePath(absolute, silex.Helper.BaseUrl);
    // replace the '../' by '/', e.g. ../api/v1.0/www/exec/get/silex.png becomes /api/v1.0/www/exec/get/silex.png
    if (!silex.Helper.isAbsoluteUrl(relative)) {
      relative = relative.replace('../', '/');
    }
    else {
      // only allowed domains
      if (absolute.indexOf('http://static.silex.me') !== 0) {
        preventDownload = true;
      }
    }
    if (!preventDownload) {
      var fileName = absolute.substr(absolute.lastIndexOf('/') + 1);
      var newRelativePath = 'js/' + fileName;
      files.push({
        url: absolute
, destPath: newRelativePath
, srcPath: relative
      });
      var res = match.replace(group1, newRelativePath);
      return res;
    }
    return match;
  });

  // build a clean body clone
  var bodyElement = goog.dom.createElement('div');
  bodyElement.innerHTML = bodyStr;

  // head
  var headElement = goog.dom.createElement('div');
  headElement.innerHTML = headStr;
  $('meta[name="publicationPath"]', headElement).remove();

  // **
  // replace internal links <div data-silex-href="..." by <a href="..."
  // do a first pass, in order to avoid replacing the elements in the <a> containers
  var components = goog.dom.getElementsByClass('editable-style', bodyElement);
  goog.array.forEach(components, function(node) {
    var component = new silex.model.Component(node);
    var href = component.element.getAttribute('data-silex-href');
    if (href)
    {
      component.element.setAttribute('href', href);
      component.element.removeAttribute('data-silex-href');

      // create a clone with a different tagname
      var outerHtml = goog.dom.getOuterHtml(component.element);
      outerHtml = '<a' + outerHtml.substring(4, outerHtml.length - 6) + '</a>'; // 4 is for <div and 6 for </div>

      // insert the clone at the place of the original and remove the original
      var fragment = goog.dom.htmlToDocumentFragment(outerHtml);
      goog.dom.insertSiblingBefore(fragment, component.element);
      goog.dom.removeNode(component.element);

      // store the reference to the new node
      component.element = fragment;
    }
  }, this);
  // **
  // URLs
  /* better that to replace in the html string: goes through each node
does not work because
this does nothing: node.style.backgroundImage = "url('" + info.destPath + "')";

    // apply body style
    var s = silex.Helper.stringToStyle(this.stage.getBodyStyle());
    goog.object.forEach(s, function(val, index, obj) {
      if(val) goog.style.setStyle(bodyElement, index, val);
    }, this);

    var components = goog.dom.getElementsByTagNameAndClass(null, null, bodyElement);
    goog.array.forEach(components, function(node) {
      console.info(node.nodeType, node.nodeName)
      files.concat(this.handleNodeUrls(node, baseUrl));
    }, this);
    // handle also the body
    files.concat(this.handleNodeUrls(bodyElement, baseUrl));
  */

  // **
  // extract the components styles to external .css file
  var components = goog.dom.getElementsByClass('editable-style', bodyElement);
  var componentIdx = 0;
  goog.array.forEach(components, function(node) {
    var component = new silex.model.Component(node);

    // add the component type
    var classNameType = 'silex-' + component.type;
    component.addClass(classNameType);
    // create a class name for this css
    var className = 'component-' + (componentIdx++);
    component.addClass(className);
    // add the css for this context
    var cssNormal = component.getCss(silex.model.Component.CONTEXT_NORMAL);
    cssArray.push({
      classNames: ['.' + className]
            , styles: cssNormal
    });
    // add the css for this context
    if (component.hasStyle(silex.model.Component.CONTEXT_HOVER)) {
      var cssHover = component.getCss(silex.model.Component.CONTEXT_HOVER);
      cssArray.push({
        classNames: ['.' + className + ':hover']
                , styles: cssHover
      });
    }
    // add the css for this context
    if (component.hasStyle(silex.model.Component.CONTEXT_PRESSED)) {
      var cssPressed = component.getCss(silex.model.Component.CONTEXT_PRESSED);
      cssArray.push({
        classNames: ['.' + className + ':pressed']
                , styles: cssPressed
      });
    }

    // cleanup styles used during edition
    component.removeClass('editable-style');
    component.element.removeAttribute('data-silex-type');
    component.element.removeAttribute('data-silex-sub-type');
    // remove inline css styles
    component.element.removeAttribute('data-style-' + silex.model.Component.CONTEXT_NORMAL);
    component.element.removeAttribute('data-style-' + silex.model.Component.CONTEXT_HOVER);
    component.element.removeAttribute('data-style-' + silex.model.Component.CONTEXT_PRESSED);
    component.element.removeAttribute('style');
  }, this);

  // body style
  var bodyStyleStr = this.stage.getBodyStyle();
  bodyStyleStr = bodyStyleStr.replace(/url\((['"])(.+?)\1\)/g, goog.bind(function(match, group1, group2) {
    return this.filterBgImage(baseUrl, files, match, group1, group2);
  }, this));
  cssArray.push({
    classNames: ['body']
        , styles: silex.Helper.stringToStyle(bodyStyleStr)
  });
  // fixme: find patterns to reduce the number of css classes
  // final css
  var cssStr = '';
  goog.array.forEach(cssArray, function(cssData) {
    var elementCssStr = '';
    // compute class names
    goog.array.forEach(cssData.classNames, function(className) {
      if (elementCssStr != '') elementCssStr += ', ';
      elementCssStr += className;
    }, this);
    // compute styles
    elementCssStr += '{\n\t' + silex.Helper.styleToString(cssData.styles) + '\n}';
    cssStr += '\n' + elementCssStr;
  }, this);
  // format css
  cssStr.replace('; ', ';\n\t');

  // final html page
  var html = '';
  html += '<html>';
  html += '<head><link href="css/styles.css" rel="stylesheet">' + headElement.innerHTML + '</head>';
  html += '<body>' + bodyElement.innerHTML + '</body>';
  html += '</html>';

  // callback
  cbk(html, cssStr, files);
};
silex.model.Body.prototype.filterBgImage = function(baseUrl, files, match, group1, group2) {
  var absolute = silex.utils.Url.getAbsolutePath(group2, baseUrl);
  var relative = silex.utils.Url.getRelativePath(absolute, silex.Helper.BaseUrl);
  // replace the '../' by '/', e.g. ../api/v1.0/www/exec/get/silex.png becomes /api/v1.0/www/exec/get/silex.png
  if (!silex.Helper.isAbsoluteUrl(relative)) {
    relative = relative.replace('../', '/');
  }
  var fileName = absolute.substr(absolute.lastIndexOf('/') + 1);
  var newRelativePath = 'assets/' + fileName;
  var res = "url('../" + newRelativePath + "')";
  files.push({
    url: absolute
, destPath: newRelativePath
, srcPath: relative
  });
  return res;
};
/**
 * Determine what to do with a node in function of the URLs it carries
 *
 * @param     {Element} node    the node
 * @return    {array} an array of info about the URLs of the element,
 *     which will be served locally.
 *     This objects in this array have these parameters
 *     - url: the absolute url
 *     - destPath: the destination path (local, relative to the published file)
 *     - srcPath: the source path or relative URL (relative to the current file)
 *
silex.model.Body.prototype.handleNodeUrls = function (node, baseUrl) {
  var filesToBeServedLocally = [];
  switch (node.nodeName){
    case 'IMG':
      // get the ressource URL
      var url = node.getAttribute('src');
      // det if it should be served locally
      var info = this.getPublicationInfo(url, baseUrl, 'assets/');
      if (info) {
        // store the publication info
        filesToBeServedLocally.push(info);
        // update with local path
        node.setAttribute('src', info.destPath);
      }
      break;
  }
  // background-image / url(...)
  if (node.style.backgroundImage){
    // get the ressource URL
    var url = node.style.backgroundImage;
    url = url.substr(url.indexOf('url(') + 4);
    url = url.substring(0, url.lastIndexOf(')'));
    // det if it should be served locally
    // (../ because it is relative to css/style.css)
    var info = this.getPublicationInfo(url, baseUrl, '../assets/');
    if (info) {
      // store the publication info
      filesToBeServedLocally.push(info);
      // update with local path
      //bug: do nothing:
      node.style.backgroundImage = "url('" + info.destPath + "')";
      //goog.style.setStyle(node, 'background-image', "xxxurl('xxxxx" + info.destPath + "')");
      //node.style.backgroundImage = undefined;
      //goog.style.setStyle(node, 'background-image', undefined);
      console.warn('replace', info.destPath, node.style.backgroundImage)
    }
  }
  return filesToBeServedLocally;
}
/**
 * Determine if the ressource with the given URL can be downloaded
 *     and served locally after publish is done
 * @param     {string} url    the URL of the ressource
 * @return    {object} the info about the object if it is possible,
 *     or null otherwise. This object has these parameters
 *     - url: the absolute url
 *     - destPath: the destination path (local, relative to the published file)
 *     - srcPath: the source path or relative URL (relative to the current file)
 *
silex.model.Body.prototype.getPublicationInfo = function (url, baseUrl, localFolder) {
  var absolute = silex.utils.Url.getAbsolutePath(url, baseUrl);
  var relative = silex.utils.Url.getRelativePath(absolute, silex.Helper.BaseUrl);
  // replace the '../' by '/', e.g. ../api/v1.0/www/exec/get/silex.png becomes /api/v1.0/www/exec/get/silex.png
  if (!silex.Helper.isAbsoluteUrl(relative)) {
      relative = relative.replace('../', '/');
  }
  var fileName = absolute.substr(absolute.lastIndexOf('/') + 1);
  var newRelativePath = localFolder + fileName;
  var res = {
      url: absolute
      , destPath: newRelativePath
      , srcPath: relative
  };
  return res;
}
/* */
