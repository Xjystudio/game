const toTrustedHtml = (function() {
  let unsanitizedPolicy;

  return function(s) {
    if (!unsanitizedPolicy) {
      unsanitizedPolicy = trustedTypes.createPolicy(
          'parse-html-subset',
          {createHTML: unsanitizedHtml => unsanitizedHtml});
    }
    return unsanitizedPolicy.createHTML(s);
  };
})();
let SanitizeInnerHtmlOpts;
const sanitizeInnerHtml = function(rawString, opts) {
  opts = opts || {};
  return parseHtmlSubset('<b>' + rawString + '</b>', opts.tags, opts.attrs)
      .firstChild.innerHTML;
};
const parseHtmlSubset = (function() {
  'use strict';

  let AllowFunction;

  const allowAttribute = (node, value) => true;

  const allowedAttributes = new Map([
    [
      'href',
      (node, value) => {
        
        return node.tagName === 'A' &&
            (value.startsWith('edge://') || value.startsWith('https://') ||
             value === '#');
      }
    ],
    [
      'target',
      (node, value) => {
        return node.tagName === 'A' && value === '_blank';
      }
    ],
  ]);

  const allowedOptionalAttributes = new Map([
    ['class', allowAttribute],
    ['id', allowAttribute],
    ['is', (node, value) => value === 'action-link' || value === ''],
    ['role', (node, value) => value === 'link'],
    [
      'src',
      (node, value) => {
        return node.tagName === 'IMG' && value.startsWith('edge://');
      }
    ],
    ['tabindex', allowAttribute],
    ['aria-hidden', allowAttribute],
    ['aria-labelledby', allowAttribute],
  ]);

  const allowedTags =
      new Set(['A', 'B', 'BR', 'DIV', 'KBD', 'P', 'PRE', 'SPAN', 'STRONG']);

  const allowedOptionalTags = new Set(['IMG', 'LI', 'UL']);

  function mergeTags(optTags) {
    const clone = new Set(allowedTags);
    optTags.forEach(str => {
      const tag = str.toUpperCase();
      if (allowedOptionalTags.has(tag)) {
        clone.add(tag);
      }
    });
    return clone;
  }

  function mergeAttrs(optAttrs) {
    const clone = new Map([...allowedAttributes]);
    optAttrs.forEach(key => {
      if (allowedOptionalAttributes.has(key)) {
        clone.set(key, allowedOptionalAttributes.get(key));
      }
    });
    return clone;
  }

  function walk(n, f) {
    f(n);
    for (let i = 0; i < n.childNodes.length; i++) {
      walk(n.childNodes[i], f);
    }
  }

  function assertElement(tags, node) {
    if (!tags.has(node.tagName)) {
      throw Error(node.tagName + ' is not supported');
    }
  }

  function assertAttribute(attrs, attrNode, node) {
    const n = attrNode.nodeName;
    const v = attrNode.nodeValue;
    if (!attrs.has(n) || !attrs.get(n)(node, v)) {
      throw Error(node.tagName + '[' + n + '="' + v + '"] is not supported');
    }
  }

  return function(s, opt_extraTags, opt_extraAttrs) {
    const tags = opt_extraTags ? mergeTags(opt_extraTags) : allowedTags;
    const attrs =
        opt_extraAttrs ? mergeAttrs(opt_extraAttrs) : allowedAttributes;

    const doc = document.implementation.createHTMLDocument('');
    const r = doc.createRange();
    r.selectNode(doc.body);

    if (window.trustedTypes) {
      s = toTrustedHtml(s);
    }

    const df = r.createContextualFragment(s);
    walk(df, function(node) {
      switch (node.nodeType) {
        case Node.ELEMENT_NODE:
          assertElement(tags, node);
          const nodeAttrs = node.attributes;
          for (let i = 0; i < nodeAttrs.length; ++i) {
            assertAttribute(attrs, nodeAttrs[i], node);
          }
          break;

        case Node.COMMENT_NODE:
        case Node.DOCUMENT_FRAGMENT_NODE:
        case Node.TEXT_NODE:
          break;

        default:
          throw Error('Node type ' + node.nodeType + ' is not supported');
      }
    });
    return df;
  };
})();

console.warn('crbug/1173575, non-JS module files deprecated.');
const parseToSafeHtml = (function() {
  'use strict';

  return function(s, opt_extraTags, opt_extraAttrs) {
    const div = document.createElement('div');
    div.appendChild(parseHtmlSubset(s, opt_extraTags, opt_extraAttrs));
    if (!window.trustedTypes) {
      return div.innerHTML;
    }

    return toTrustedHtml(div.innerHTML);
  };
})();
