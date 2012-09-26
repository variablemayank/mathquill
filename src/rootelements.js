/*********************************************
 * Root math elements with event delegation.
 ********************************************/

function createRoot(jQ, root, textbox, editable, include_toolbar) {
  var contents = jQ.contents().detach();

  if (!textbox)
    jQ.addClass('mathquill-rendered-math');

  root.jQ = jQ.data(jQueryDataKey, {
    block: root,
    revert: function() {
      jQ.empty().unbind('.mathquill')
        .removeClass('mathquill-rendered-math mathquill-editable mathquill-textbox mathquill-editor')
        .append(contents);
    }
  });

  var cursor = root.cursor = new Cursor(root);

  root.renderLatex(contents.text());

  if (!editable) //if static, quit once we render the LaTeX
    return;

  root.textarea = $('<span class="textarea"><textarea></textarea></span>')
    .prependTo(jQ.addClass('mathquill-editable'));
  var textarea = root.textarea.children();
  if (textbox)
    jQ.addClass('mathquill-textbox');
  if (include_toolbar)
    addToolbar(root, jQ);

  textarea.focus(function(e) {
    if (!cursor.parent)
      cursor.appendTo(root);
    cursor.parent.jQ.addClass('hasCursor');
    if (cursor.selection)
      cursor.selection.jQ.removeClass('blur');
    else
      cursor.show();
    e.stopPropagation();
  }).blur(function(e) {
    cursor.hide().parent.blur();
    if (cursor.selection)
      cursor.selection.jQ.addClass('blur');
    e.stopPropagation();
  }).bind('selectstart', function(e) {
    e.stopPropagation();
  });

  //trigger virtual textInput event (see Wiki page "Keyboard Events")
  function textInput() {
    var text = textarea.val();
    if (!text) return;
    textarea.val('');
    cursor.parent.textInput(text);
  }

  var lastKeydn = {}; //see Wiki page "Keyboard Events"
  jQ.bind('focus.mathquill blur.mathquill', function(e) {
    textarea.trigger(e);
  }).bind('keydown.mathquill', function(e) { //see Wiki page "Keyboard Events"
    lastKeydn.evt = e;
    lastKeydn.happened = true;
    lastKeydn.returnValue = cursor.parent.keydown(e);
    if (lastKeydn.returnValue)
      return true;
    else {
      e.stopImmediatePropagation();
      return false;
    }
  }).bind('keypress.mathquill', function(e) {
    //on auto-repeated key events, keypress may get triggered but not keydown
    //  (see Wiki page "Keyboard Events")
    if (lastKeydn.happened)
      lastKeydn.happened = false;
    else
      lastKeydn.returnValue = cursor.parent.keydown(lastKeydn.evt);

    //prevent default and cancel keypress if keydown returned false,
    //even in browsers where that doesn't automatically happen
    //  (see Wiki page "Keyboard Events")
    if (!lastKeydn.returnValue)
      return false;

    //after keypress event, trigger virtual textInput event if text was
    //input to textarea
    //  (see Wiki page "Keyboard Events")
    setTimeout(textInput);
  }).bind('mousedown.mathquill', function(e) {
    cursor.seek($(e.target), e.pageX, e.pageY).blink = $.noop;

    anticursor = new Cursor(root);
    anticursor.jQ = anticursor._jQ = $();
    if (cursor.next)
      anticursor.insertBefore(cursor.next);
    else
      anticursor.appendTo(cursor.parent);

    jQ.mousemove(mousemove);
    $(e.target.ownerDocument).mousemove(docmousemove).mouseup(mouseup);

    setTimeout(function(){textarea.focus();});
  }).bind('selectstart.mathquill', false).blur();

  function mousemove(e) {
    cursor.seek($(e.target), e.pageX, e.pageY);

    if (cursor.prev === anticursor.prev && cursor.parent === anticursor.parent)
      cursor.clearSelection();
    else
      cursor.selectFrom(anticursor);

    return false;
  }
  function docmousemove(e) {
    delete e.target;
    return mousemove(e);
  }
  function mouseup(e) {
    anticursor = undefined;
    cursor.blink = blink;
    if (!cursor.selection) cursor.show();
    jQ.unbind('mousemove', mousemove);
    $(e.target.ownerDocument).unbind('mousemove', docmousemove).unbind('mouseup', mouseup);
  }

  var anticursor, blink = cursor.blink;
}

function addToolbar(root, jQ) {
  // the button groups include most LatexCmds, de-duped and categorized.
  // functions like "log" are excluded, since we have some fu to auto-convert
  // them as they are typed (i.e. you can just type "log", don't need the \ )
  var button_tabs = [
    { name: 'Basic',
      example: '+',
      button_groups: [
        ["subscript", "supscript", "frac", "sqrt", "nthroot", "langle", "binomial", "vector", "f", "prime"],
        ["+", "-", "pm", "mp", "cdot", "=", "times", "div", "ast"],
        ["therefore", "because"],
        ["sum", "prod", "coprod", "int"],
        ["N", "P", "Z", "Q", "R", "C", "H"]
      ]},
    { name: 'Greek',
      example: '&pi;',
      button_groups: [
        ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta", "iota", "kappa", "lambda", "mu", "nu", "xi", "pi", "rho", "sigma", "tau", "upsilon", "phi", "chi", "psi", "omega"],
        ["digamma", "varepsilon", "vartheta", "varkappa", "varpi", "varrho", "varsigma", "varphi"],
        ["Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Upsilon", "Phi", "Psi", "Omega"]
      ]},
    { name: 'Operators',
      example: '&oplus;',
      button_groups: [["wedge", "vee", "cup", "cap", "diamond", "bigtriangleup", "ominus", "uplus", "otimes", "oplus", "bigtriangledown", "sqcap", "triangleleft", "sqcup", "triangleright", "odot", "bigcirc", "dagger", "ddagger", "wr", "amalg"]
      ]},
    { name: 'Relationships',
      example: '&le;',
      button_groups: [["<", ">", "equiv", "cong", "sim", "notin", "ne", "propto", "approx", "le", "ge", "in", "ni", "notni", "subset", "supset", "notsubset", "notsupset", "subseteq", "supseteq", "notsubseteq", "notsupseteq", "models", "prec", "succ", "preceq", "succeq", "simeq", "mid", "ll", "gg", "parallel", "bowtie", "sqsubset", "sqsupset", "smile", "sqsubseteq", "sqsupseteq", "doteq", "frown", "vdash", "dashv", "exists", "varnothing"]
      ]},
    { name: 'Arrows',
      example: '&hArr;',
      button_groups: [["longleftarrow", "longrightarrow", "Longleftarrow", "Longrightarrow", "longleftrightarrow", "updownarrow", "Longleftrightarrow", "Updownarrow", "mapsto", "nearrow", "hookleftarrow", "hookrightarrow", "searrow", "leftharpoonup", "rightharpoonup", "swarrow", "leftharpoondown", "rightharpoondown", "nwarrow", "downarrow", "Downarrow", "uparrow", "Uparrow", "rightarrow", "Rightarrow", "leftarrow", "lArr", "leftrightarrow", "Leftrightarrow"]
      ]},
    { name: 'Delimiters',
      example: '{',
      button_groups: [["lfloor", "rfloor", "lceil", "rceil", "slash", "opencurlybrace", "closecurlybrace"]
      ]},
    { name: 'Misc',
      example: '&infin;',
      button_groups: [["forall", "ldots", "cdots", "vdots", "ddots", "surd", "triangle", "ell", "top", "flat", "natural", "sharp", "wp", "bot", "clubsuit", "diamondsuit", "heartsuit", "spadesuit", "caret", "underscore", "backslash", "vert", "perp", "nabla", "hbar", "AA", "circ", "bullet", "setminus", "neg", "dots", "Re", "Im", "partial", "infty", "aleph", "deg", "angle"]
      ]}
  ];

  //some html_templates aren't very pretty/useful, so we override them.
  var html_template_overrides = {
    binomial: '<span style="font-size: 0.5em"><span class="paren" style="font-size: 2.087912087912088em; ">(</span><span class="array"><span><var>n</var></span><span><var>m</var></span></span><span class="paren" style="font-size: 2.087912087912088em; ">)</span></span>',
    frac: '<span style="font-size: 0.55em" class="fraction"><span class="numerator"><var>n</var></span><span class="denominator"><var>m</var></span><span style="width:0"></span></span>',
    sqrt: '<span style="font-size: 0.8em; padding-top: 3px"><span class="sqrt-prefix">&radic;</span><span class="sqrt-stem" style="border-top-width: 1.7142857142857144px;">&nbsp;</span></span>',
    nthroot: '<span style="font-size: 0.7em"><sup class="nthroot"><var>n</var></sup><span><span class="sqrt-prefix">&radic;</span><span class="sqrt-stem" style="border-top-width: 1.7142857142857144px; ">&nbsp;</span></span></span>',
    supscript: '<sup style="font-size: 0.6em">sup</sup>',
    subscript: '<sub style="font-size: 0.6em; line-height: 3.5;">sub</sub>',
    vector: '<span class="array" style="font-size: 0.6em"><span class=""><var>a</var><span> </span><var>b</var></span><span class=""><var>c</var><span> </span><var>d</var></span></span>'
  }

  var tabs = [];
  var panes = [];
  $.each(button_tabs, function(index, tab){
    tabs.push('<li><a href="#' + tab.name + '_tab"><span class="mathquill-rendered-math">' + tab.example + '</span>' + tab.name + '</a></li>');
    var buttons = [];
    $.each(tab.button_groups, function(index, group) {
      $.each(group, function(index, cmd) {
        var obj = new LatexCmds[cmd](undefined, cmd);
        buttons.push('<li><a class="mathquill-rendered-math" title="' + (cmd.match(/^[a-z]+$/i) ? '\\' + cmd : cmd) + '">' +
                     (html_template_overrides[cmd] ? html_template_overrides[cmd] : '<span style="line-height: 1.5em">' + obj.html_template.join('') + '</span>') +
                     '</a></li>');
      });
      buttons.push('<li class="mathquill-button-spacer"></li>');
    });
    panes.push('<div class="mathquill-tab-pane" id="' + tab.name + '_tab"><ul>' + buttons.join('') + '</ul></div>');
  });
  root.toolbar = $('<div class="mathquill-toolbar"><ul class="mathquill-tab-bar">' + tabs.join('') + '</ul><div class="mathquill-toolbar-panes">' + panes.join('') + '</div></div>').prependTo(jQ);

  jQ.find('.mathquill-tab-bar li a')
  .click(false) // don't go to linked fragment
  .mouseenter(function() {
    jQ.find('.mathquill-tab-bar li').removeClass('mathquill-tab-selected');
    jQ.find('.mathquill-tab-pane').removeClass('mathquill-tab-pane-selected');
    $(this).parent().addClass('mathquill-tab-selected');
    $(this.href.replace(/.*#/, '#'), this.ownerDocument).addClass('mathquill-tab-pane-selected');
  });
  jQ.find('.mathquill-tab-bar li:first-child a').mouseenter();
  jQ.find('a.mathquill-rendered-math')
  .mousedown(false) // don't drag-to-select when clicking toolbar buttons
  .click(function(){
    root.cursor.writeLatex(this.title, true);
    jQ.focus();
  });
}

function RootMathBlock(){}
_ = RootMathBlock.prototype = new MathBlock;
_.latex = function() {
  return MathBlock.prototype.latex.call(this).replace(/(\\[a-z]+) (?![a-z])/ig,'$1');
};
_.text = function() {
  return this.foldChildren('', function(text, child) {
    return text + child.text();
  });
};
_.renderLatex = function(latex) {
  this.jQ.children().slice(1).remove();
  this.firstChild = this.lastChild = 0;
  this.cursor.appendTo(this).writeLatex(latex);
  this.blur();
};
_.keydown = function(e)
{
  this.skipTextInput = true;
  e.ctrlKey = e.ctrlKey || e.metaKey;
  switch ((e.originalEvent && e.originalEvent.keyIdentifier) || e.which) {
  case 8: //backspace
  case 'Backspace':
  case 'U+0008':
    if (e.ctrlKey)
      while (this.cursor.prev || this.cursor.selection)
        this.cursor.backspace();
    else
      this.cursor.backspace();
    break;
  case 27: //may as well be the same as tab until we figure out what to do with it
  case 'Esc':
  case 'U+001B':
  case 9: //tab
  case 'Tab':
  case 'U+0009':
    if (e.ctrlKey) break;

    var parent = this.cursor.parent;
    if (e.shiftKey) { //shift+Tab = go one block left if it exists, else escape left.
      if (parent === this) //cursor is in root editable, continue default
        break;
      else if (parent.prev) //go one block left
        this.cursor.appendTo(parent.prev);
      else //get out of the block
        this.cursor.insertBefore(parent.parent);
    }
    else { //plain Tab = go one block right if it exists, else escape right.
      if (parent === this) //cursor is in root editable, continue default
        return this.skipTextInput = true;
      else if (parent.next) //go one block right
        this.cursor.prependTo(parent.next);
      else //get out of the block
        this.cursor.insertAfter(parent.parent);
    }

    this.cursor.clearSelection();
    return false;
  case 13: //enter
  case 'Enter':
    e.preventDefault();
    break;
  case 35: //end
  case 'End':
    if (e.shiftKey)
      while (this.cursor.next || (e.ctrlKey && this.cursor.parent !== this))
        this.cursor.selectRight();
    else //move to the end of the root block or the current block.
      this.cursor.clearSelection().appendTo(e.ctrlKey ? this : this.cursor.parent);
    e.preventDefault();
    return false;
  case 36: //home
  case 'Home':
    if (e.shiftKey)
      while (this.cursor.prev || (e.ctrlKey && this.cursor.parent !== this))
        this.cursor.selectLeft();
    else //move to the start of the root block or the current block.
      this.cursor.clearSelection().prependTo(e.ctrlKey ? this : this.cursor.parent);
    e.preventDefault();
    return false;
  case 37: //left
  case 'Left':
    if (e.ctrlKey) break;

    if (e.shiftKey)
      this.cursor.selectLeft();
    else
      this.cursor.moveLeft();
    e.preventDefault();
    return false;
  case 38: //up
  case 'Up':
    if (e.ctrlKey) break;

    if (e.shiftKey) {
      if (this.cursor.prev)
        while (this.cursor.prev)
          this.cursor.selectLeft();
      else
        this.cursor.selectLeft();
    }
    else if (this.cursor.parent.prev)
      this.cursor.clearSelection().appendTo(this.cursor.parent.prev);
    else if (this.cursor.prev)
      this.cursor.clearSelection().prependTo(this.cursor.parent);
    else if (this.cursor.parent !== this)
      this.cursor.clearSelection().insertBefore(this.cursor.parent.parent);
    e.preventDefault();
    return false;
  case 39: //right
  case 'Right':
    if (e.ctrlKey) break;

    if (e.shiftKey)
      this.cursor.selectRight();
    else
      this.cursor.moveRight();
    e.preventDefault();
    return false;
  case 40: //down
  case 'Down':
    if (e.ctrlKey) break;

    if (e.shiftKey) {
      if (this.cursor.next)
        while (this.cursor.next)
          this.cursor.selectRight();
      else
        this.cursor.selectRight();
    }
    else if (this.cursor.parent.next)
      this.cursor.clearSelection().prependTo(this.cursor.parent.next);
    else if (this.cursor.next)
      this.cursor.clearSelection().appendTo(this.cursor.parent);
    else if (this.cursor.parent !== this)
      this.cursor.clearSelection().insertAfter(this.cursor.parent.parent);
    e.preventDefault();
    return false;
  case 46: //delete
  case 'Del':
  case 'U+007F':
    if (e.ctrlKey)
      while (this.cursor.next || this.cursor.selection)
        this.cursor.deleteForward();
    else
      this.cursor.deleteForward();
    break;
  case 65: //the 'A' key, as in Ctrl+A Select All
  case 'A':
  case 'U+0041':
    if (e.ctrlKey && !e.shiftKey && !e.altKey) {
      if (this !== this.cursor.root) //so not stopPropagation'd at RootMathCommand
        return this.parent.keydown(e);

      this.cursor.clearSelection().appendTo(this);
      while (this.cursor.prev)
        this.cursor.selectLeft();
      e.preventDefault();
      return false;
    }
    else
      this.skipTextInput = false;
    break;
  case 67: //the 'C' key, as in Ctrl+C Copy
  case 'C':
  case 'U+0043':
    if (e.ctrlKey && !e.shiftKey && !e.altKey) {
      if (this !== this.cursor.root) //so not stopPropagation'd at RootMathCommand
        return this.parent.keydown(e);

      if (!this.cursor.selection) return true;
    }
    else
      this.skipTextInput = false;
    break;
  case 86: //the 'V' key, as in Ctrl+V Paste
  case 'V':
  case 'U+0056':
    if (e.ctrlKey && !e.shiftKey && !e.altKey) {
      if (this !== this.cursor.root) //so not stopPropagation'd at RootMathCommand
        return this.parent.keydown(e);

      var self = this;
      setTimeout(function(){
        self.cursor.writeLatex(self.cursor.root.textarea.children().val());
        self.cursor.clearSelection();
      });
    }
    else
      this.skipTextInput = false;
    break;
  case 88: //the 'X' key, as in Ctrl+X Cut
  case 'X':
  case 'U+0058':
    if (e.ctrlKey && !e.shiftKey && !e.altKey) {
      if (this !== this.cursor.root) //so not stopPropagation'd at RootMathCommand
        return this.parent.keydown(e);

      if (!this.cursor.selection) return true;

      this.cursor.deleteSelection();
    }
    else
      this.skipTextInput = false;
    break;
  default:
    this.skipTextInput = false;
  }
  return true;
};
_.textInput = function(ch) {
  if (!this.skipTextInput)
    this.cursor.write(ch);
};

function RootMathCommand(cursor) {
  MathCommand.call(this, '$');
  this.firstChild.cursor = cursor;
  this.firstChild.textInput = function(ch) {
    if (this.skipTextInput) return;

    if (ch !== '$' || cursor.parent !== this)
      cursor.write(ch);
    else if (this.isEmpty()) {
      cursor.insertAfter(this.parent).backspace()
        .insertNew(new VanillaSymbol('\\$','$')).show();
    }
    else if (!cursor.next)
      cursor.insertAfter(this.parent);
    else if (!cursor.prev)
      cursor.insertBefore(this.parent);
    else
      cursor.write(ch);
  };
}
_ = RootMathCommand.prototype = new MathCommand;
_.html_template = ['<span class="mathquill-rendered-math"></span>'];
_.initBlocks = function() {
  this.firstChild =
  this.lastChild =
  this.jQ.data(jQueryDataKey).block =
    new RootMathBlock;

  this.firstChild.parent = this;
  this.firstChild.jQ = this.jQ;
};

function RootTextBlock(){}
_ = RootTextBlock.prototype = new MathBlock;
_.renderLatex = function(latex) {
  var self = this, cursor = self.cursor;
  self.jQ.children().slice(1).remove();
  self.firstChild = self.lastChild = 0;
  cursor.show().appendTo(self);

  latex = latex.match(/(?:\\\$|[^$])+|\$(?:\\\$|[^$])*\$|\$(?:\\\$|[^$])*$/g) || '';
  for (var i = 0; i < latex.length; i += 1) {
    var chunk = latex[i];
    if (chunk[0] === '$') {
      if (chunk[-1+chunk.length] === '$' && chunk[-2+chunk.length] !== '\\')
        chunk = chunk.slice(1, -1);
      else
        chunk = chunk.slice(1);

      var root = new RootMathCommand(cursor);
      cursor.insertNew(root);
      root.firstChild.renderLatex(chunk);
      cursor.show().insertAfter(root);
    }
    else {
      for (var j = 0; j < chunk.length; j += 1)
        this.cursor.insertNew(new VanillaSymbol(chunk[j]));
    }
  }
};
_.keydown = RootMathBlock.prototype.keydown;
_.textInput = function(ch) {
  if (this.skipTextInput) return;

  this.cursor.deleteSelection();
  if (ch === '$')
    this.cursor.insertNew(new RootMathCommand(this.cursor));
  else
    this.cursor.insertNew(new VanillaSymbol(ch));
};

