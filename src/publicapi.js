/*********************************************************
 * The actual jQuery plugin and document ready handlers.
 ********************************************************/

//The publicy exposed method of jQuery.prototype, available (and meant to be
//called) on jQuery-wrapped HTML DOM elements.
$.fn.mathquill = function(cmd, latex) {
  switch (cmd) {
  case 'redraw':
    return this.each(function() {
      var data = $(this).data(jQueryDataKey);
      if (data && data.block) {
        (function postOrder(node) {
          node.eachChild(postOrder);
          if ('redraw' in node) node.redraw();
        }(data.block));
      }
    });
  case 'revert':
    return this.each(function() {
      var data = $(this).data(jQueryDataKey);
      if (data && data.revert)
        data.revert();
    });
  case 'latex':
    if (arguments.length > 1) {
      return this.each(function() {
        var data = $(this).data(jQueryDataKey);
        if (data && data.block && data.block.renderLatex)
          data.block.renderLatex(latex);
      });
    }

    var data = this.data(jQueryDataKey);
    return data && data.block && data.block.latex();
  case 'text':
    var data = this.data(jQueryDataKey);
    return data && data.block && data.block.text();
  case 'html':
    return this.html().replace(/<span class="?cursor( blink)?"?><\/span>/i, '')
      .replace(/<span class="?textarea"?><textarea><\/textarea><\/span>/i, '');
  case 'write':
    if (arguments.length > 1)
      return this.each(function() {
        var data = $(this).data(jQueryDataKey),
          block = data && data.block,
          cursor = block && block.cursor;

        if (cursor) {
          cursor.writeLatex(latex);
          block.blur();
        }
      });
  default:
    var textbox = cmd === 'textbox',
      include_toolbar = cmd === 'editor',
      editable = include_toolbar || textbox || cmd === 'editable',
      RootBlock = textbox ? RootTextBlock : RootMathBlock;
    return this.each(function() {
      createRoot($(this), new RootBlock, textbox, editable, include_toolbar);
    });
  }
};

//on document ready, mathquill-ify all `<tag class="mathquill-*">latex</tag>`
//elements according to their CSS class.
$(function() {
  $('.mathquill-editable').mathquill('editable');
  $('.mathquill-editor').mathquill('editor');
  $('.mathquill-textbox').mathquill('textbox');
  $('.mathquill-embedded-latex').mathquill();
});

