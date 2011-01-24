/*********************************************
 * Root math elements with event delegation.
 ********************************************/

function createRoot(jQ, root, textbox, editable) {
  var contents = jQ.contents().detach();

  if (!textbox)
    jQ.addClass('mathquill-rendered-math');

  root.jQ = jQ.data(jQueryDataKey, {
    block: root,
    revert: function() {
      jQ.empty().unbind('.mathquill')
        .removeClass('mathquill-rendered-math mathquill-editable mathquill-textbox')
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
  });

  var lastKeydn = {}; //see Wiki page "Keyboard Events"
  jQ.bind('keydown.mathquill', function(e) { //see Wiki page "Keyboard Events"
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

    //ignore commands, shortcuts and control characters
    //in ASCII, below 32 there are only control chars
    if (e.ctrlKey || e.metaKey || e.which < 32)
      return true;

    if (cursor.parent.keypress(e))
      return true;
    else {
      e.stopImmediatePropagation();
      return false;
    };
  }).bind('click.mathquill', function(e) {
    var clicked = $(e.target);
    if (clicked.hasClass('empty')) {
      cursor.clearSelection().prependTo(clicked.data(jQueryDataKey).block);
      return false;
    }

    var data = clicked.data(jQueryDataKey);
    if (data) {
      //if clicked a symbol, insert of whichever side is closer
      if (data.cmd && !data.block) {
        cursor.clearSelection();
        if (clicked.outerWidth() > 2*(e.pageX - clicked.offset().left))
          cursor.insertBefore(data.cmd);
        else
          cursor.insertAfter(data.cmd);

        return false;
      }
    }
    //if no MathQuill data, try parent, if still no,
    //the user probably didn't click on the math after all
    else {
      clicked = clicked.parent();
      data = clicked.data(jQueryDataKey);
      if (!data)
        return;
    }

    cursor.clearSelection();
    if (data.cmd)
      cursor.insertAfter(data.cmd);
    else
      cursor.appendTo(data.block);

    //move cursor to position closest to click
    var prevPrevDist, prevDist, dist = cursor.jQ.offset().left - e.pageX;
    do {
      cursor.moveLeft();
      prevPrevDist = prevDist;
      prevDist = dist;
      dist = Math.abs(cursor.jQ.offset().left - e.pageX);
    }
    while (dist <= prevDist && dist != prevPrevDist);

    if (dist != prevPrevDist)
      cursor.moveRight();

    return false;
  }).bind('click.mathquill', function() {
    textarea.focus();
  }).bind('focus.mathquill blur.mathquill', function(e) {
    textarea.trigger(e);
  }).bind('mousemove', function(e) {
    console.log('orig', originalMouseDown);
    if (!originalMouseDown) return;

    var cmd = closestCmd(e.target);
    if (!cmd) return;

    anc = commonAncestor(cmd, originalMouseDown);
    cursor.clearSelection().selection = new Selection(
      anc.left.parent,
      anc.left.prev,
      anc.right.next
    );
    cursor.insertAfter(cmd);
  }).bind('mousedown', function(e) {
    e.preventDefault();
    originalMouseDown = closestCmd(e.target);
  }).blur();

  $(document).bind('mouseup', function(e) {
    originalMouseDown = undefined;
  })

  var originalMouseDown;
}

function closestCmd(el) {
  // bubble up until we find something with data
  for (
    var $el = $(el), data;
    !(data && data.cmd) && !$el.hasClass('mathquill-editable');
    $el = $el.parent()
  ) {
    data = $el.data(jQueryDataKey);
  }

  data || console.log(el);
  return data && data.cmd;
}

function commonAncestor(cmd, orig) {
  for (var cmdA = cmd, origA = orig;
       cmdA && origA;
       cmdA = cmdA.parent.parent, origA = origA.parent.parent
  ) {
    if (!cmdA.parent.parent) {
      while (origA.parent.parent)
        origA = origA.parent.parent;
      return leftRight(cmdA, origA);
    }
    if (!origA.parent.parent) {
      while (cmdA.parent.parent)
        cmdA = cmdA.parent.parent;
      return leftRight(cmdA, origA);
    }

    for (var cmdI = cmd; cmdI.parent.parent; cmdI = cmdI.parent.parent)
      if (cmdI.parent === origA.parent)
        return leftRight(cmdI, origA);

    for (var origI = orig; origI.parent.parent; origI = origI.parent.parent)
      if (cmdA.parent === origI.parent)
        return leftRight(cmdA, origI);
  }
}
function leftRight(cmd, orig) {
  for (var next = cmd; next; next = next.next)
    if (next === orig)
      return {left: cmd, right: orig};
  return {left: orig, right: cmd};
}
window.test = function() {
  var cmd=$('.sqrt-stem').parent().data('[[mathquill internal data]]').cmd;
  var orig=$('.sqrt-stem').eq(1).parent().data('[[mathquill internal data]]').cmd;
  return commonAncestor(cmd, orig);
}

function RootMathBlock(){}
_ = RootMathBlock.prototype = new MathBlock;
_.latex =function() {
  return MathBlock.prototype.latex.call(this).replace(/(\\[a-z]+) (?![a-z])/ig,'$1');
};
_.renderLatex = function(latex) {
  latex = latex.match(/\\[a-z]*|[^\s]/ig);
  this.jQ.children().slice(1).remove();
  this.firstChild = this.lastChild = 0;
  this.cursor.show().appendTo(this);
  if (latex) {
    (function recurse(cursor) {
      while (latex.length) {
        var token = latex.shift(); //pop first item
        if (!token || token === '}') return;

        var cmd;
        if (token === '\\text') {
          var text = latex.shift();
          if (text === '{') {
            text = token = latex.shift();
            while (token !== '}') {
              if (token === '\\') //skip tokens immediately following backslash
                text += token = latex.shift();

              text += token = latex.shift();
            }
            text = text.slice(0,-1); //cut trailing '}'
          }
          cmd = new TextBlock(text);
          cursor.insertNew(cmd).insertAfter(cmd);
          continue; //skip recursing through children
        }
        else if (token === '\\left' || token === '\\right') { //REMOVEME HACK for parens
          token = latex.shift();
          if (token === '\\')
            token = latex.shift();

          cursor.write(token);
          cmd = cursor.prev || cursor.parent.parent;

          if (cursor.prev) //was a close-paren, so break recursion
            return;
          else //was an open-paren, hack to put the following latex
            latex.unshift('{'); //in the ParenBlock in the math DOM
        }
        else if (/^\\[a-z]+$/i.test(token)) {
          token = token.slice(1);
          var cmd = LatexCmds[token];
          if (cmd)
            cursor.insertNew(cmd = new cmd(undefined, token));
          else {
            cmd = new TextBlock(token);
            cursor.insertNew(cmd).insertAfter(cmd);
            continue; //skip recursing through children
          }
        }
        else {
          if (token.match(/[a-eg-zA-Z]/)) //exclude f because want florin
            cmd = new Variable(token);
          else if (cmd = LatexCmds[token])
            cmd = new cmd;
          else
            cmd = new VanillaSymbol(token);

          cursor.insertNew(cmd);
        }
        cmd.eachChild(function(child) {
          cursor.appendTo(child);
          var token = latex.shift();
          if (!token) return false;

          if (token === '{')
            recurse(cursor);
          else
            cursor.write(token);
        });
        cursor.insertAfter(cmd);
      }
    })(this.cursor);
  }

  this.cursor.hide();
  this.blur();
};
_.keydown = function(e)
{
  this.skipKeypress = true;
  e.ctrlKey = e.ctrlKey || e.metaKey;
  switch ((e.originalEvent && e.originalEvent.keyIdentifier) || e.which) {
  case 8: //backspace
  case 'Backspace':
  case 'U+0008':
    if (e.ctrlKey)
      while (this.cursor.prev)
        this.cursor.backspace();
    else
      this.cursor.backspace();
    break;
  case 27: //esc does something weird in keypress, may as well be the same as tab
           //  until we figure out what to do with it
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
        return this.skipKeypress = true;
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
    break;
  case 36: //home
  case 'Home':
    if (e.shiftKey)
      while (this.cursor.prev || (e.ctrlKey && this.cursor.parent !== this))
        this.cursor.selectLeft();
    else //move to the start of the root block or the current block.
      this.cursor.clearSelection().prependTo(e.ctrlKey ? this : this.cursor.parent);
    break;
  case 37: //left
  case 'Left':
    if (e.ctrlKey) break;

    if (e.shiftKey)
      this.cursor.selectLeft();
    else
      this.cursor.moveLeft();
    break;
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
    break;
  case 39: //right
  case 'Right':
    if (e.ctrlKey) break;

    if (e.shiftKey)
      this.cursor.selectRight();
    else
      this.cursor.moveRight();
    break;
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
    break;
  case 46: //delete
  case 'Del':
  case 'U+007F':
    if (e.ctrlKey)
      while (this.cursor.next)
        this.cursor.deleteForward();
    else
      this.cursor.deleteForward();
    break;
  case 65: //'a' character, as in Select All
  case 'A':
  case 'U+0041':
    if (!e.ctrlKey || e.shiftKey || e.altKey) {
      this.skipKeypress = false;
      break;
    }

    if (this.parent) //so not stopPropagation'd at RootMathCommand
      return this.parent.keydown(e);

    this.cursor.clearSelection().appendTo(this);
    while (this.cursor.prev)
      this.cursor.selectLeft();
    break;
  default:
    this.skipKeypress = false;
  }
  return true;
};
_.keypress = function(e) {
  if (this.skipKeypress) return true;

  this.cursor.show().write(String.fromCharCode(e.which));
  e.preventDefault();
  return true;
};

function RootMathCommand(cursor) {
  MathCommand.call(this, '$');
  this.firstChild.cursor = cursor;
  this.firstChild.keypress = function(e) {
    if (this.skipKeypress) return true;

    var ch = String.fromCharCode(e.which);
    if (ch === '$' && cursor.parent == this) {
      if (this.isEmpty()) {
        cursor.insertAfter(this.parent).backspace()
          .insertNew(new VanillaSymbol('\\$','$')).show();
      }
      else if (!cursor.next)
        cursor.insertAfter(this.parent);
      else if (!cursor.prev)
        cursor.insertBefore(this.parent);
      else
        cursor.show().write(ch);
    }
    else
      cursor.show().write(ch);

    e.preventDefault();
    return true;
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
  this.jQ.children().slice(1).remove();
  this.firstChild = this.lastChild = 0;
  this.cursor.show().appendTo(this);

  var math, text, nextDollar;
  while (latex) {
    math = text = '';
    nextDollar = latex.indexOf('$');
    if (nextDollar >= 0) {
      text = latex.slice(0, nextDollar);
      latex = latex.slice(nextDollar+1);
    }
    else {
      text = latex;
      latex = '';
    }

    for (var i=0; i < text.length; i+=1) {
      this.cursor.insertNew(new VanillaSymbol(text.charAt(i)));
    }

    nextDollar = latex.indexOf('$');
    if (nextDollar >= 0) {
      math = latex.slice(0, nextDollar);
      latex = latex.slice(nextDollar+1);
    }
    else {
      math=latex;
      latex='';
    }

    if (math) {
      var root = new RootMathCommand(this.cursor);
      this.cursor.insertNew(root);
      root.firstChild.renderLatex(math);
      this.cursor.show().insertAfter(root);
    }
  }
};
_.keydown = RootMathBlock.prototype.keydown;
_.keypress = function(e) {
  if (this.skipKeypress) return true;

  this.cursor.deleteSelection();
  var ch = String.fromCharCode(e.which);
  if (ch === '$')
    this.cursor.insertNew(new RootMathCommand(this.cursor));
  else
    this.cursor.insertNew(new VanillaSymbol(ch));

  e.preventDefault();
  return true;
};
