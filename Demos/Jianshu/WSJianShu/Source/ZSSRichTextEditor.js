/*
 * ZSSRichTextEditor v1.0
 * http://www.zedsaid.com
 *
 * Copyright 2013 Zed Said Studio
 *
 * Modified By LostAbaddon for JianShu
 */

// If we are using iOS or desktop
var isUsingInsideApp = true;

var isMarkdown = false;
var isPreview = false;

// this hiddenChar helps with editing the content around images: http://stackoverflow.com/questions/18985261/cursor-in-wrong-place-in-contenteditable
var hiddenChar = '\ufeff';

// THe default callback parameter separator
var defaultCallbackSeparator = '~';

// The editor object
var ZSSEditor = {};

// Function Setting
ZSSEditor.usingColorSetting = false;
ZSSEditor.usingIndentAndJustify = false;
ZSSEditor.usingI8N = false;
ZSSEditor.usingActiveMonitor = true;

ZSSEditor.eventListeners = {
	log: true,
	selectionChanged: true,
	input: true,
	keydown: true,
	keyup: true,
	tap: true,
	focus: true,
	blur: true,
	sendWordage: false,
	showWordage: false,
};
ZSSEditor.eventBufferInterval = 500;

// These variables exist to reduce garbage (as in memory garbage) generation when typing real fast
// in the editor.
ZSSEditor.caretArguments = ['yOffset=' + 0, 'height=' + 0];
ZSSEditor.caretInfo = { y: 0, height: 0 };

// Is this device an iPad
ZSSEditor.isiPad = false;
ZSSEditor.isiPhone = false;
ZSSEditor.isAndroid = false;
ZSSEditor.isAndroidHighLevel = (navigator.userAgent.match(/HighLevel/) != null);

// The current selection
ZSSEditor.currentSelection = {
	startContainer: null,
	startOffset: 0,
	endContainer: null,
	endOffset: 0,
	isTextarea: false,
	update: function () {
		var sel = getSelection();
		if (sel.rangeCount < 1) return;
		var range = sel.getRangeAt(0);
		var start = range.startContainer.childNodes[range.startOffset];
		var nodeName = !!start ? start.nodeName.toLowerCase() : '';
		if (nodeName === 'input' || nodeName === 'textarea') {
			ZSSEditor.currentSelection.isTextarea = true;
			ZSSEditor.currentSelection.startContainer = start;
			ZSSEditor.currentSelection.endContainer = start;
			if (start.selectionStart > start.selectionEnd) {
				ZSSEditor.currentSelection.startOffset = start.selectionEnd;
				ZSSEditor.currentSelection.endOffset = start.selectionStart;
			}
			else {
				ZSSEditor.currentSelection.startOffset = start.selectionStart;
				ZSSEditor.currentSelection.endOffset = start.selectionEnd;
			}
		}
		else {
			ZSSEditor.currentSelection.isTextarea = false;
			ZSSEditor.currentSelection.startContainer = range.startContainer;
			ZSSEditor.currentSelection.startOffset = range.startOffset;
			ZSSEditor.currentSelection.endContainer = range.endContainer;
			ZSSEditor.currentSelection.endOffset = range.endOffset;
		}
	},
	restore: function () {
		var sel = getSelection();
		var range = document.createRange();
		if (ZSSEditor.currentSelection.isTextarea) {
			// ZSSEditor.currentSelection.startContainer.focus();
			// range.selectNodeContents(ZSSEditor.currentSelection.startContainer);
			// ZSSEditor.currentSelection.setRange(range);
			ZSSEditor.currentSelection.startContainer.focus();
			ZSSEditor.currentSelection.startContainer.selectionStart = ZSSEditor.currentSelection.startOffset;
			ZSSEditor.currentSelection.startContainer.selectionEnd = ZSSEditor.currentSelection.endOffset;
		}
		else {
			Maleskine.content().focus();
			range.setStart(ZSSEditor.currentSelection.startContainer, ZSSEditor.currentSelection.startOffset);
			range.setStart(ZSSEditor.currentSelection.endContainer, ZSSEditor.currentSelection.endOffset);
			ZSSEditor.currentSelection.setRange(range);
		}
	},
	setRange: function (range) {
		var sel = getSelection();
		sel.removeAllRanges();
		sel.addRange(range);
	}
};

// The current editing image
ZSSEditor.currentEditingImage;

// The current editing link
ZSSEditor.currentEditingLink;

ZSSEditor.focusedField = null;

// The objects that are enabled
ZSSEditor.enabledItems = {};

ZSSEditor.editableFields = {};

ZSSEditor.lastTappedNode = null;

ZSSEditor.titlePlaceholder = '请输入标题';
ZSSEditor.contentPlaceholder = '请输入正文';

// The default paragraph separator
ZSSEditor.defaultParagraphSeparator = 'p';

// Debug: remove element from dom tree will cause undoManager not working.
ZSSEditor.delegatorPool = null;
ZSSEditor.delegatorLimit = 10;
ZSSEditor.delegatorCurrentIndex = 0;
ZSSEditor.initDelegator = function () {
	if (navigator.userAgent.match(/Android/i) != null) {
		ZSSEditor.delegatorPool = true;
		return; // Andoird use JavascriptInterface to communicate.
	}
	ZSSEditor.delegatorPool = [];
	for (var i = 0; i < ZSSEditor.delegatorLimit; i++) {
		ZSSEditor.delegatorPool[i] = document.createElement('iframe');
		ZSSEditor.delegatorPool[i].className = "maleskine-communication";
		document.documentElement.appendChild(ZSSEditor.delegatorPool[i]);
	}
};
ZSSEditor.delegatorRequest = function (command) {
	if (ZSSEditor.isAndroid) {
		ZSSEditor.androidDelegatorRequest(command);
		return null;
	}
	else {
		return ZSSEditor.iOSDelegatorRequest(command);
	}
};
ZSSEditor.iOSDelegatorRequest = function (command) {
	var current = ZSSEditor.delegatorPool[ZSSEditor.delegatorCurrentIndex];
	ZSSEditor.delegatorCurrentIndex++;
	if (ZSSEditor.delegatorCurrentIndex === ZSSEditor.delegatorLimit) ZSSEditor.delegatorCurrentIndex = 0;
	if (!!command) {
		current.setAttribute('src', command);
	}
	return current;
};
ZSSEditor.androidDelegatorRequest = function (command) {
	command = command.split(':');
	scheme = command.splice(0, 1)[0];
	if (command.length === 0) {
		command = "";
	}
	else {
		command = command.join(':');
		command = decodeURIComponent(command);
	}
	switch (scheme) {
		case 'init':
			return AndroidDelegate.init();
		case 'callback-log':
			return AndroidDelegate.log(command);
		case 'callback-new-field':
			return AndroidDelegate.onNewField(command.replace(/^id=/, ''));
		case 'callback-dom-loaded':
			return AndroidDelegate.onDomLoaded(command);
		case 'callback-input':
			return AndroidDelegate.onInput();
		case 'callback-tap':
			return AndroidDelegate.onTap();
		case 'callback-link-tap':
			return AndroidDelegate.onTapLink(command);
		case 'callback-image-tap':
			return AndroidDelegate.onTapImage(command);
		case 'callback-selection-changed':
			return AndroidDelegate.onSelectionChanged(command);
		case 'callback-focus-out':
			return AndroidDelegate.onFocus(command);
		case 'callback-focus-in':
			return AndroidDelegate.onBlur(command);
		case 'callback-selection-style':
			return AndroidDelegate.onSelectionStyles(command);
	}
};

/*
* For Android JS-Java Communication
*/
var AndroidDelegate = {};
AndroidDelegate.init = function () {};
AndroidDelegate.log  = function () {};
AndroidDelegate.onNewField = function () {};
AndroidDelegate.onDomLoaded = function () {};
AndroidDelegate.onInput = function () {};
AndroidDelegate.onTap = function () {};
AndroidDelegate.onTapImage = function (info) {};
AndroidDelegate.onTapLink = function (info) {};
AndroidDelegate.onSelectionChanged = function () {};
AndroidDelegate.onPaste = function () {};
AndroidDelegate.onFocus = function (target) {};
AndroidDelegate.onBlur = function (target) {};
AndroidDelegate.onSelectionStyles = function (styles) {};
AndroidDelegate.getTitle = function (title) {};
AndroidDelegate.getContent = function (content) {};
AndroidDelegate.onGetImageStatus = function (imageStatus) {};
AndroidDelegate.onGetWordage = function (wordage) {};
AndroidDelegate.showKeyboard = function () {};
AndroidDelegate.hideKeyboard = function () {};
// end

/**
 * The initializer function that must be called onLoad
 */
ZSSEditor.init = function() {
	// Maleskine Initial

	Maleskine._title = $('#zss_field_title');
	Maleskine._title[0]._height = 0;
	Maleskine._titleResizer = $('#zss_field_title_hidden');
	Maleskine._contentResizer = $('#zss_field_content_hidden');

	Maleskine._contentMD = $('#zss_field_markdown');
	Maleskine._contentRT = $('#zss_field_content');

	document.body.appendChild(Maleskine.wordageUI[0]);

	// Maleskine Initial End

	// Change a few CSS values if the device is an iPad
	ZSSEditor.isiPhone = (navigator.userAgent.match(/iPhone/i) != null);
	if (ZSSEditor.isiPhone) {
		$(document.body).addClass('iphone_body');
	}
	ZSSEditor.isiPad = (navigator.userAgent.match(/iPad/i) != null);
	if (ZSSEditor.isiPad) {
		$(document.body).addClass('ipad_body');
	}
	ZSSEditor.isAndroid = (navigator.userAgent.match(/Android/i) != null);
	if (ZSSEditor.isAndroid) {
		$(document.body).addClass('android');
		ZSSEditor.usingActiveMonitor = false; // Just send selection-changed and selection-styles when the menu shows.
	}
	else {
		Maleskine.loadStatus.interface = true; // iOS needn't JS-Interface
	}

	if (!ZSSEditor.isiPhone && !ZSSEditor.isiPad && !ZSSEditor.isAndroid) {
		isUsingInsideApp = false;
	}

	document.execCommand('insertBrOnReturn', false, false);
	document.execCommand('defaultParagraphSeparator', false, this.defaultParagraphSeparator);

	var editor = $('.field').each(function() {
		var node = $(this);
		var editableField = new ZSSField(node);
		var editableFieldId = node.attr('id');

		ZSSEditor.editableFields[editableFieldId] = editableField;
		ZSSEditor.callback("callback-new-field", "id=" + editableFieldId);
	});

	document.addEventListener("selectionchange", function(e) {
		// Auto Focus On Editor
		var sel = getSelection();
		if (sel.rangeCount > 0) {
			var range = sel.getRangeAt(0);
			var node = range.commonAncestorContainer;
			if (!node.classList || !node.classList.contains('field')) {
				var parent = $(node).parents('.field');
				if (parent.length === 0) {
					node = range.startContainer.childNodes[range.startOffset];
					if (node) {
						if (!node.classList || !node.classList.contains('field')) {
							parent = $(node).parents('.field');
							if (isMarkdown) {
								Maleskine._contentMD.focus();
							}
							else {
								Maleskine._contentRT.focus();
							}
							AndroidDelegate.showKeyboard();
						}
					}
				}
			}
		}

		ZSSEditor.currentEditingLink = null;
		// DRM: only do something here if the editor has focus.  The reason is that when the
		// selection changes due to the editor loosing focus, the focusout event will not be
		// sent if we try to load a callback here.
		if (editor.is(":focus")) {
			// On Android 4.4, set the cursor on ImageCaption after deleted the line after ImagePackage.
			if (ZSSEditor.isAndroid) {
				sel = getSelection();
				if (sel.rangeCount > 0) {
					range = sel.getRangeAt(0);
					node = range.startContainer;
					if (node.nodeName && node.nodeName.toLowerCase() === 'div' && node.classList && node.classList.contains('image-package')) {
						$(node).find('.image-caption-input').focus();
					}
				}
			}
			ZSSEditor.backupRange();
			ZSSEditor.selectionChangedCallback();
			ZSSEditor.sendEnabledStyles(e);
		}
	}, false);

	// Wordage Control
	if (!ZSSEditor.eventListeners.showWordage) Maleskine.hideWordage();
}; //end

// MARK: - Debugging logs

ZSSEditor.logMainElementSizes = function() {
	if (!ZSSEditor.isAndroid) return;

	msg = 'Window [w:' + $(window).width() + '|h:' + $(window).height() + ']';
	this.log(msg);

	var msg = encodeURIComponent('Viewport [w:' + window.innerWidth + '|h:' + window.innerHeight + ']');
	this.log(msg);

	msg = encodeURIComponent('Body [w:' + $(document.body).width() + '|h:' + $(document.body).height() + ']');
	this.log(msg);

	msg = encodeURIComponent('HTML [w:' + $('html').width() + '|h:' + $('html').height() + ']');
	this.log(msg);

	msg = encodeURIComponent('Document [w:' + $(document).width() + '|h:' + $(document).height() + ']');
	this.log(msg);
};

// MARK: - Viewport Refreshing

ZSSEditor.refreshVisibleViewportSize = function() {
	$(document.body).css('min-height', window.innerHeight + 'px');
	$('#zss_field_content').css('min-height', (window.innerHeight - $('#zss_field_content').position().top) + 'px');
};

// MARK: - Fields

ZSSEditor.focusFirstEditableField = function() {
	// $('div[contenteditable=true]:first').focus();
};
ZSSEditor.getField = function(fieldId) {
	var field = this.editableFields[fieldId];

	return field;
};
ZSSEditor.getFocusedField = function() {
	if (ZSSEditor.focusedField) return ZSSEditor.focusedField;

	var currentField = $(this.closerParentNodeWithName('.field'));
	if (!currentField) return null;

	var currentFieldId = currentField.attr('id');
	return this.editableFields[currentFieldId];
};

// MARK: - Logging

ZSSEditor.log = function(msg) {
	// In iOS, don't waste the communication-iframe resources.
	if (ZSSEditor.eventListeners.log) {
		ZSSEditor.callback('callback-log', 'msg=' + msg);
	}
};

// MARK: - Callbacks

ZSSEditor.domLoadedCallback = function() {
	ZSSEditor.callback("callback-dom-loaded");
};
ZSSEditor.selectionChangedCallback = function (forceSend) {
	if (!ZSSEditor.eventListeners.selectionChanged) return;

	if (ZSSEditor.selectionChangedRequest) clearTimeout(ZSSEditor.selectionChangedRequest);
	if (forceSend) {
		ZSSEditor.selectionChangedTask();
	}
	else {
		var self = this;
		ZSSEditor.selectionChangedRequest = setTimeout(function () {
			ZSSEditor.selectionChangedTask.call(self);
		}, ZSSEditor.eventBufferInterval);
	}
};
ZSSEditor.selectionChangedRequest = null;
ZSSEditor.selectionChangedTask = function () {
	var joinedArguments = ZSSEditor.getJoinedFocusedFieldIdAndCaretArguments();
	// Add Selection Length
	var sel = getSelection(), range, hasRange;
	if (sel.rangeCount === 0) {
		hasRange = 0;
	}
	else {
		range = sel.getRangeAt(0);
		if (range.startContainer === range.endContainer && range.startOffset === range.endOffset) hasRange = 0;
		else hasRange = 1;
	}
	joinedArguments = joinedArguments + defaultCallbackSeparator + 'hasSelection=' + hasRange;
	// End
	ZSSEditor.callback('callback-selection-changed', joinedArguments);
};
ZSSEditor.isCommandEnabled = function(commandName) {
	return document.queryCommandState(commandName);
};
ZSSEditor.sendEnabledStyles = function(e, force) {
	if (!ZSSEditor.usingActiveMonitor && force !== true && e !== true) return;

	if (ZSSEditor.sendEnabledStylesRequest) clearTimeout(ZSSEditor.sendEnabledStylesRequest);
	if (force === true || e === true) {
		ZSSEditor.sendEnabledStylesTask(e);
	}
	else {
		var self = this;
		ZSSEditor.sendEnabledStylesRequest = setTimeout(function () {
			ZSSEditor.sendEnabledStylesTask.call(self, e);
		}, ZSSEditor.eventBufferInterval);
	}
};
ZSSEditor.sendEnabledStylesRequest = null;
ZSSEditor.sendEnabledStylesTask = function (e) {
	if (isMarkdown) {
		ZSSEditor.stylesCallback(Maleskine.getCurrentMarkdownStyle());
		return;
	}

	var items = [];

	var focusedField; // Debug : Select image from blur directly will cause error.
	if (window.getSelection().rangeCount > 0) {
		focusedField = ZSSEditor.getFocusedField();
		if (!focusedField) return;
		focusedField = focusedField.wrappedObject.attr('id');
		ZSSEditor.lastFocusedFieldId = focusedField;
	}
	else {
		focusedField = ZSSEditor.lastFocusedFieldId;
	}

	if (!focusedField.hasNoStyle) {
		// Find all relevant parent tags
		var parentTags = ZSSEditor.parentTags();

		for (var i = 0; i < parentTags.length; i++) {
			var currentNode = parentTags[i];

			if (currentNode.nodeName.toLowerCase() == 'a') {
				ZSSEditor.currentEditingLink = currentNode;

				var title = encodeURIComponent(currentNode.text);
				var href = encodeURIComponent(currentNode.href);

				items.push('islink');
				items.push('link-title:' + title);
				items.push('link:' + href);
			}
		}

		if (ZSSEditor.isCommandEnabled('bold')) {
			items.push('bold');
		}
		if (ZSSEditor.isCommandEnabled('createLink')) {
			items.push('createlink');
		}
		if (ZSSEditor.isCommandEnabled('italic')) {
			items.push('italic');
		}
		if (ZSSEditor.isCommandEnabled('subscript')) {
			items.push('subscript');
		}
		if (ZSSEditor.isCommandEnabled('superscript')) {
			items.push('superscript');
		}
		if (ZSSEditor.isCommandEnabled('strikeThrough')) {
			items.push('strikethrough');
		}
		if (ZSSEditor.isCommandEnabled('underline')) {
			var isUnderlined = false;

			// DRM: 'underline' gets highlighted if it's inside of a link... so we need a special test
			// in that case.
			if (!ZSSEditor.currentEditingLink) {
				items.push('underline');
			}
		}
		if (ZSSEditor.isCommandEnabled('insertOrderedList')) {
			items.push('orderedlist');
		}
		if (ZSSEditor.isCommandEnabled('insertUnorderedList')) {
			items.push('unorderedlist');
		}
		if (ZSSEditor.isCommandEnabled('insertHorizontalRule')) {
			items.push('hrule');
		}

		if (ZSSEditor.usingIndentAndJustify) {
			if (ZSSEditor.isCommandEnabled('justifyCenter')) {
				items.push('justifycenter');
			}
			if (ZSSEditor.isCommandEnabled('justifyFull')) {
				items.push('justifyfull');
			}
			if (ZSSEditor.isCommandEnabled('justifyLeft')) {
				items.push('justifyleft');
			}
			if (ZSSEditor.isCommandEnabled('justifyRight')) {
				items.push('justifyright');
			}
		}

		var formatBlock = document.queryCommandValue('formatBlock');
		if (formatBlock.length > 0) {
			items.push(formatBlock.toLowerCase());
		}

		var t, nodeName = null, hasImageInfo = false, caption;

		// Use jQuery to figure out those that are not supported
		if (!!e && !!e.target) {
			nodeName = e.target.nodeName.toLowerCase();
			t = $(e.target);
		}

		if (!nodeName || nodeName === '#document') {
			var selection = window.getSelection();
			if (selection.rangeCount > 0) {
				t = $(selection.getRangeAt(0).commonAncestorContainer);
			}
			else {
				t = $(ZSSEditor.lastFocusedFieldId);
			}
			if (t.length > 0) {
				if (t[0].nodeType == 3) {
					t = t.parent();
				}
				nodeName = t[0].nodeName.toLowerCase();
			}
			else {
				nodeName = null;
			}
		}

		if (nodeName !== null) {
			if (ZSSEditor.usingColorSetting) {
				// Background Color
				try
				{
					var bgColor = t.css('backgroundColor');
					if (bgColor && bgColor.length != 0 && bgColor != 'rgba(0, 0, 0, 0)' && bgColor != 'rgb(0, 0, 0)' && bgColor != 'transparent') {
						items.push('backgroundcolor');
					}
				}
				catch(e)
				{
					// DRM: I had to add these stupid try-catch blocks to solve an issue with t.css throwing
					// exceptions for no reason.
				}

				// Text Color
				try
				{
					var textColor = t.css('color');
					if (textColor && textColor.length != 0 && textColor != 'rgba(0, 0, 0, 0)' && textColor != 'rgb(0, 0, 0)' && textColor != 'transparent') {
						items.push('textcolor');
					}
				}
				catch(e)
				{
					// DRM: I had to add these stupid try-catch blocks to solve an issue with t.css throwing
					// exceptions for no reason.
				}
			}

			// Blockquote
			if (nodeName === 'blockquote' || t.parents('blockquote').length > 0) {
				items.push('indent');
			}

			// Code
			if (nodeName === 'code' || t.parents('code').length > 0) {
				items.push('code');
			}

			// Image -- It's useless is either iOS or Android
			if (!ZSSEditor.isAndroid && nodeName === 'img') {
				ZSSEditor.currentEditingImage = t[0];
				items.push('isimage');
				items.push('image:' + t.attr('src'));
				caption = t.parents('.image-package').find('.image-caption').html();
				items.push('image-alt:' + caption);
				items.push('image-id:' + t.attr('name'));
				if (ZSSEditor.currentEditingImage.classList.contains('failed')) {
					items.push('image-status:3');
				}
				else if (ZSSEditor.currentEditingImage.classList.contains('uploading')) {
					items.push('image-status:2');
				}
				else {
					items.push('image-status:1');
				}
				hasImageInfo = true;
			}
		}
		if (!ZSSEditor.isAndroid && ZSSEditor.currentEditingImage && !hasImageInfo) {
			items.push('isimage');
			items.push('image:' + ZSSEditor.currentEditingImage.src);
			t = $(ZSSEditor.currentEditingImage);
			caption = t.parents('.image-package').find('.image-caption').html();
			items.push('image-alt:' + caption);
			items.push('image-id:' + t.attr('name'));
			if (ZSSEditor.currentEditingImage.classList.contains('failed')) {
				items.push('image-status:3');
			}
			else if (ZSSEditor.currentEditingImage.classList.contains('uploading')) {
				items.push('image-status:2');
			}
			else {
				items.push('image-status:1');
			}
		}
	}

	ZSSEditor.stylesCallback(items);
};

ZSSEditor.callback = function(callbackScheme, callbackPath) {
	var url =  callbackScheme + ":";

	if (callbackPath) {
		url = url + callbackPath;
	}

	if (isUsingInsideApp) {
		ZSSEditor.callbackThroughIFrame(url);
	} else {
		console.log(url);
	}
};
/**
 *  @brief      Executes a callback by loading it into an IFrame.
 *  @details    The reason why we're using this instead of window.location is that window.location
 *              can sometimes fail silently when called multiple times in rapid succession.
 *              Found here:
 *              http://stackoverflow.com/questions/10010342/clicking-on-a-link-inside-a-webview-that-will-trigger-a-native-ios-screen-with/10080969#10080969
 *
 *  @param      url     The callback URL.
 *
 *  @description 原本的方案是每次创建一个iframe，通过url来给iOS传递事件与参数。但由于每次创建iframe并移除会导致dom-tree改变从而影响undomanager，现在使用同时开10个iframe备用，轮流调用这十个iframe来传递参数。
 */
ZSSEditor.callbackThroughIFrame = function(url) {
	if (ZSSEditor.delegatorPool === null) {
		var iframe = document.createElement("IFRAME");
		iframe.setAttribute("src", url);

		// IMPORTANT: the IFrame was showing up as a black box below our text.  By setting its borders
		// to be 0px transparent we make sure it's not shown at all.
		//
		// REF BUG: https://github.com/wordpress-mobile/WordPress-iOS-Editor/issues/318
		//
		iframe.style.cssText = "border: 0px transparent;";

		document.documentElement.appendChild(iframe);
		iframe.parentNode.removeChild(iframe);
		iframe = null;
	}
	else {
		ZSSEditor.delegatorRequest(url);
	}
};
ZSSEditor.stylesCallback = function(stylesArray) {
	var stylesString = '';

	if (stylesArray.length > 0) {
		stylesString = stylesArray.join(defaultCallbackSeparator);
	}

	ZSSEditor.callback("callback-selection-style", stylesString);
};

// MARK: - Selection

ZSSEditor.backupRange = function(){
	ZSSEditor.currentSelection.update();
};
ZSSEditor.restoreRange = function(){
	ZSSEditor.currentSelection.restore();
};

ZSSEditor.getSelectedText = function() {
	var selection = window.getSelection();

	return selection.toString();
};
ZSSEditor.getCaretArguments = function() {
	var caretInfo = this.getYCaretInfo();

	this.caretArguments[0] = 'yOffset=' + caretInfo.y;
	this.caretArguments[1] = 'height=' + caretInfo.height;

	return this.caretArguments;
};
ZSSEditor.lastFocusedFieldId = ""; // Debug : Select image from blur directly will cause error.
ZSSEditor.getJoinedFocusedFieldIdAndCaretArguments = function() {
	var joinedArguments = ZSSEditor.getJoinedCaretArguments();
	var focusedField; // Debug : Select image from blur directly will cause error.
	if (window.getSelection().rangeCount > 0) {
		focusedField = ZSSEditor.getFocusedField();
		if (!focusedField) return joinedArguments;
		focusedField = focusedField.wrappedObject.attr('id');
		ZSSEditor.lastFocusedFieldId = focusedField;
	}
	else {
		focusedField = ZSSEditor.lastFocusedFieldId;
	}
	var idArgument = "id=" + focusedField;

	joinedArguments = idArgument + defaultCallbackSeparator + joinedArguments;

	return joinedArguments;
};
ZSSEditor.getJoinedCaretArguments = function() {
	var caretArguments = this.getCaretArguments();
	var joinedArguments = this.caretArguments.join(defaultCallbackSeparator);

	return joinedArguments;
};
ZSSEditor.getYCaretInfo = function() {
	var y = 0, height = 0;
	var sel = window.getSelection();
	if (sel.rangeCount) {
		var range = sel.getRangeAt(0);
		var needsToWorkAroundNewlineBug = (range.startOffset == 0 || range.getClientRects().length == 0);

		// PROBLEM: iOS seems to have problems getting the offset for some empty nodes and return
		// 0 (zero) as the selection range top offset.
		//
		// WORKAROUND: To fix this problem we just get the node's offset instead.
		if (needsToWorkAroundNewlineBug) {
			var closerParentNode = ZSSEditor.closerParentNode();

			var fontSize = $(closerParentNode).css('font-size');
			var lineHeight = Math.floor(parseInt(fontSize.replace('px','')) * 1.5);

			// PROBLEM: if insert horitenal line, the closerParentNode will be the editor zss_field_content itself,
			// then the yOffset will be wrong.
			//
			// WORKAROUND: use window.scrollY instead of offsetTop;
			if (closerParentNode.id === 'zss_field_content') {
				y = window.scrollY;
			}
			else {
				y = closerParentNode.offsetTop;
			}
			height = lineHeight;
		}
		else {
			if (range.getClientRects) {
				var rects = range.getClientRects();
				if (rects.length > 0) {
					// PROBLEM: some iOS versions differ in what is returned by getClientRects()
					// Some versions return the offset from the page's top, some other return the
					// offset from the visible viewport's top.
					//
					// WORKAROUND: see if the offset of the body's top is ever negative.  If it is
					// then it means that the offset we have is relative to the body's top, and we
					// should add the scroll offset.
					var addsScrollOffset = document.body.getClientRects()[0].top < 0;

					if (addsScrollOffset) {
						y = document.body.scrollTop;
					}

					y += rects[0].top;
					height = rects[0].height;
				}
				else {
					y = window.scrollY
				}
			}
			else {
				y = window.scrollY;
			}
		}
	}
	else {
		y = window.scrollY;
	}

	this.caretInfo.y = y;
	this.caretInfo.height = height;

	return this.caretInfo;
};

// MARK: - Default paragraph separator

ZSSEditor.defaultParagraphSeparatorTag = function() {
	return '<' + this.defaultParagraphSeparator + '>';
};

// MARK: - Styles

// Control
ZSSEditor.undo = function() {
	document.execCommand('undo', false, null);
	ZSSEditor.sendEnabledStyles();
};
ZSSEditor.redo = function() {
	document.execCommand('redo', false, null);
	ZSSEditor.sendEnabledStyles();
};

// Fonts
ZSSEditor.setBold = function() {
	if (isMarkdown) {
		Maleskine.triggerBold();
	}
	else {
		document.execCommand('bold', false, null);
	}
	ZSSEditor.sendEnabledStyles(true);
};
ZSSEditor.setItalic = function() {
	if (isMarkdown) {
		Maleskine.triggerItalic();
	}
	else {
		document.execCommand('italic', false, null);
	}
	ZSSEditor.sendEnabledStyles(true);
};
ZSSEditor.setUnderline = function() {
	if (isMarkdown) {
		Maleskine.triggerUnderline();
	}
	else {
		document.execCommand('underline', false, null);
	}
	ZSSEditor.sendEnabledStyles(true);
};
ZSSEditor.setStrikeThrough = function() {
	if (isMarkdown) {
		Maleskine.triggerStrike();
	}
	else {
		var commandName = 'strikeThrough';
		var isDisablingStrikeThrough = ZSSEditor.isCommandEnabled(commandName);

		document.execCommand(commandName, false, null);

		// DRM: WebKit has a problem disabling strikeThrough when the tag <del> is used instead of
		// <strike>.  The code below serves as a way to fix this issue.
		//
		var mustHandleWebKitIssue = (isDisablingStrikeThrough
									&& ZSSEditor.isCommandEnabled(commandName));

		if (mustHandleWebKitIssue) {
			var troublesomeNodeNames = ['del'];

			var selection = window.getSelection();
			var range = selection.getRangeAt(0).cloneRange();

			var container = range.commonAncestorContainer;
			var nodeFound = false;
			var textNode = null;

			while (container && !nodeFound) {
				nodeFound = (container
							&& container.nodeType == document.ELEMENT_NODE
							&& troublesomeNodeNames.indexOf(container.nodeName.toLowerCase()) > -1);

				if (!nodeFound) {
					container = container.parentElement;
				}
			}

			if (container) {
				var newObject = $(container).replaceWith(container.innerHTML);

				var finalSelection = window.getSelection();
				var finalRange = selection.getRangeAt(0).cloneRange();

				finalRange.setEnd(finalRange.startContainer, finalRange.startOffset + 1);

				ZSSEditor.currentSelection.setRange(finalRange);
			}
		}
	}
	ZSSEditor.sendEnabledStyles(true);
};
ZSSEditor.setSubscript = function() {
	if (isMarkdown) {
		Maleskine.triggerSubscript();
	}
	else {
		document.execCommand('subscript', false, null);
	}
	ZSSEditor.sendEnabledStyles(true);
};
ZSSEditor.setSuperscript = function() {
	if (isMarkdown) {
		Maleskine.triggerSuperscript();
	}
	else {
		document.execCommand('superscript', false, null);
	}
	ZSSEditor.sendEnabledStyles(true);
};

// Paragraph
ZSSEditor.removeFormating = function() {
	if (isMarkdown) return;
	document.execCommand('removeFormat', false, null);
	ZSSEditor.sendEnabledStyles();
};
ZSSEditor.setParagraph = function() {
	if (isMarkdown) return;
	var formatTag = "p";
	var formatBlock = document.queryCommandValue('formatBlock');

	if (formatBlock.length > 0 && formatBlock.toLowerCase() == formatTag) {
		document.execCommand('formatBlock', false, this.defaultParagraphSeparatorTag());
	} else {
		document.execCommand('formatBlock', false, '<' + formatTag + '>');
	}

	ZSSEditor.sendEnabledStyles();
};
ZSSEditor.setBlockquote = function() {
	if (isMarkdown) {
		Maleskine.triggerBlockquote();
	}
	else {
		var formatTag = "blockquote";
		var formatBlock = document.queryCommandValue('formatBlock');

		if (formatBlock.length > 0 && formatBlock.toLowerCase() == formatTag) {
			document.execCommand('formatBlock', false, this.defaultParagraphSeparatorTag());
		} else {
			document.execCommand('formatBlock', false, '<' + formatTag + '>');
		}
	}
	ZSSEditor.sendEnabledStyles(true);
};
ZSSEditor.setHeading = function(heading) {
	if (isMarkdown) {
		Maleskine.triggerHeader(heading);
	}
	else {
		var formatTag = heading;
		var formatBlock = document.queryCommandValue('formatBlock');

		if (formatBlock.length > 0 && formatBlock.toLowerCase() == formatTag) {
			document.execCommand('formatBlock', false, this.defaultParagraphSeparatorTag());
		} else {
			document.execCommand('formatBlock', false, '<' + formatTag + '>');
		}
	}
	ZSSEditor.sendEnabledStyles(true);
};
ZSSEditor.setOrderedList = function() {
	if (isMarkdown) return;
	document.execCommand('insertOrderedList', false, null);
	ZSSEditor.sendEnabledStyles();
};
ZSSEditor.setUnorderedList = function() {
	if (isMarkdown) return;
	document.execCommand('insertUnorderedList', false, null);
	ZSSEditor.sendEnabledStyles();
};

ZSSEditor.setHorizontalRule = function() {
	if (isMarkdown) {
		Maleskine.triggerHRule();
	}
	else {
		document.execCommand('insertHorizontalRule', false, null);
		document.execCommand('insertHTML', false, '<p><br></p>');
	}
	ZSSEditor.sendEnabledStyles(true);
};

if (ZSSEditor.usingIndentAndJustify) {

ZSSEditor.setJustifyCenter = function() {
	if (isMarkdown) return;
	document.execCommand('justifyCenter', false, null);
	ZSSEditor.sendEnabledStyles();
};
ZSSEditor.setJustifyFull = function() {
	if (isMarkdown) return;
	document.execCommand('justifyFull', false, null);
	ZSSEditor.sendEnabledStyles();
};
ZSSEditor.setJustifyLeft = function() {
	if (isMarkdown) return;
	document.execCommand('justifyLeft', false, null);
	ZSSEditor.sendEnabledStyles();
};
ZSSEditor.setJustifyRight = function() {
	if (isMarkdown) return;
	document.execCommand('justifyRight', false, null);
	ZSSEditor.sendEnabledStyles();
};

ZSSEditor.setIndent = function() {
	if (isMarkdown) return;
	document.execCommand('indent', false, null);
	ZSSEditor.sendEnabledStyles();
};
ZSSEditor.setOutdent = function() {
	if (isMarkdown) return;
	document.execCommand('outdent', false, null);
	ZSSEditor.sendEnabledStyles();
};

}

if (ZSSEditor.usingColorSetting) {

ZSSEditor.setTextColor = function(color) {
	if (isMarkdown) return;
	ZSSEditor.restoreRange();
	document.execCommand("styleWithCSS", null, true);
	document.execCommand('foreColor', false, color);
	document.execCommand("styleWithCSS", null, false);
	ZSSEditor.sendEnabledStyles();
	// document.execCommand("removeFormat", false, "foreColor"); // Removes just foreColor
};
ZSSEditor.setBackgroundColor = function(color) {
	if (isMarkdown) return;
	ZSSEditor.restoreRange();
	document.execCommand("styleWithCSS", null, true);
	document.execCommand('hiliteColor', false, color);
	document.execCommand("styleWithCSS", null, false);
	ZSSEditor.sendEnabledStyles();
};

}

// Needs addClass method

ZSSEditor.insertLink = function(url, title) {
	ZSSEditor.restoreRange();
	if (isMarkdown) {
		ZSSEditor.insertHTML('[' + title + '](' + url + ')');
	}
	else {
		var sel = document.getSelection();
		if (sel.rangeCount) {
			ZSSEditor.insertHTML('<a href="' + url + '" target="_blank">' + title + '</a>');
		}
	}
};
ZSSEditor.updateLink = function(url, title) {
	ZSSEditor.restoreRange();
	if (isMarkdown) return;
	else {
		var currentLinkNode = ZSSEditor.lastTappedNode;
		if (currentLinkNode) {
			var range = document.createRange();
			range.selectNode(currentLinkNode);
			ZSSEditor.currentSelection.setRange(range);
			ZSSEditor.insertHTML('<a href="' + url + '" target="_blank">' + title + '</a>');
		}
	}
};
ZSSEditor.unlink = function() {
	ZSSEditor.restoreRange();
	if (isMarkdown) return;
	else {
		var currentLinkNode = ZSSEditor.lastTappedNode;
		if (currentLinkNode) {
			var range = document.createRange();
			range.selectNode(currentLinkNode);
			ZSSEditor.currentSelection.setRange(range);
			document.execCommand('unlink', false);
			this.sendEnabledStyles();
		}
	}
};
ZSSEditor.quickLink = function() {
	ZSSEditor.restoreRange();
	if (isMarkdown) return;
	var sel = document.getSelection();
	var link_url = "";
	var test = new String(sel);
	var mailregexp = new RegExp("^(.+)(\@)(.+)$", "gi");
	if (test.search(mailregexp) == -1) {
		checkhttplink = new RegExp("^http\:\/\/", "gi");
		if (test.search(checkhttplink) == -1) {
			checkanchorlink = new RegExp("^\#", "gi");
			if (test.search(checkanchorlink) == -1) {
				link_url = "http://" + sel;
			} else {
				link_url = sel;
			}
		} else {
			link_url = sel;
		}
	} else {
		checkmaillink = new RegExp("^mailto\:", "gi");
		if (test.search(checkmaillink) == -1) {
			link_url = "mailto:" + sel;
		} else {
			link_url = sel;
		}
	}

	var html_code = '<a href="' + link_url + '">' + sel + '</a>';
	ZSSEditor.insertHTML(html_code);
};

// MARK: - Images

ZSSEditor.MarkdownImageObject = function (imageID) {
	this.id = imageID;
	this.local = '';
	this.remote = '';
	this.display = '';
	this.state = 0; // 0: ready; 1: uploading; 2: uploaded; 3: failed
	this.progress = 0;
	this.markdown = '';
	this.message = '';

	Maleskine.imageCaches[imageID] = this;
};
ZSSEditor.MarkdownImageObject.prototype.updateMarkdown = function () {
	if (this.state === 0) {
		this.markdown = '![图片上传中…](' + this.local + ')';
	}
	else if (this.state === 1) {
		this.markdown = '![图片上传中…　　' + this.progress + '%](' + this.local + ')';
	}
	else if (this.state === 2) {
		this.markdown = '![图片发自简书App](' + this.remote + ')';
	}
	else if (this.state === 3) {
		this.markdown = '![' + this.message + '](' + this.local + ')';
	}
};
ZSSEditor.MarkdownImageObject.prototype.updateImageContent = function (editor, url) {
	ZSSEditor.MarkdownImageObject.replace(editor, url, this.markdown);
};
ZSSEditor.MarkdownImageObject.prototype.remove = function (editor, url) {
	ZSSEditor.MarkdownImageObject.replace(editor, url, '');
};
ZSSEditor.MarkdownImageObject.replace = function (editor, url, markdown) {
	var content = editor.value;
	var newLen = markdown.length;
	var location = 0;
	var found = true;
	while (found) {
		found = false;
		content.replace(/!\[.*?\]\((.*?)\)/i, function (match, image, pos) {
			var len = match.length;
			image = image.trim();
			found = true;
			location += pos;
			if (image === url) {
				editor.selectionStart = location;
				editor.selectionEnd = location + len;
				document.execCommand('insertHTML', false, markdown);
				location += newLen;
			}
			else {
				location += len;
			}
			content = content.substring(pos + len, content.length);
		});
	}
};

ZSSEditor.updateImage = function(url, alt) {
	ZSSEditor.restoreRange();

	if (isMarkdown) return;

	var image = ZSSEditor.currentEditingImage;

	if (image || image.length || image.length > 0) {
		if (!image.jQuery) image = $(image);
		image.attr('src', url);
		if (!alt || !alt.length || alt.trim().length === 0) alt = '&nbsp;'; // For iOS line-height bug.
		var pack = image.parents('.image-package');
		pack.find('.image-caption').html(alt);
		pack.find('.image-caption-input').val(alt);
	}
	ZSSEditor.sendEnabledStyles();
};
ZSSEditor.jumpAfterImage = function () {
	ZSSEditor.restoreRange();
	var selection = window.getSelection();
	if (selection.rangeCount > 0) {
		var range = selection.getRangeAt(0);
		var node = $(range.startContainer);
		var pack;
		if (node.is('.image-package')) {
			pack = node;
		}
		else {
			pack = node.parents('.image-package');
		}
		if (pack.length > 0) {
			node = pack[0];
			range.setStartAfter(node);
			range.setEndAfter(node);
			ZSSEditor.currentSelection.setRange(range);
			pack = $("<p>&nbsp;</p>")[0];
			range.insertNode(pack);
			range.selectNodeContents(pack);
			ZSSEditor.currentSelection.setRange(range);
		}
	}
};
ZSSEditor.insertImage = function(url, alt, display_url, slug, width, height) {
	ZSSEditor.restoreRange();
	if (isMarkdown) {
		ZSSEditor.insertHTML('![' + alt + '](' + url + ')');
	}

	else {
		var data_width = !!width ? (' data-width="' + width + '"') : '';
		var data_height = !!height ? (' data-height="' + height + '"') : '';
		var data_slug = !!slug ? (' data-image-slug="' + slug + '"') : '';
		if (!alt || !alt.length || alt.trim().length === 0) alt = '图片发自简书App'; // For iOS line-height bug.
		var html;
		if (!!display_url) {
			html = hiddenChar + '<div class="image-package currentImage">' + hiddenChar + '<img src="' + display_url + '"' + data_slug + data_width + data_height + ' data-original-src="' + url + '" />' + hiddenChar + '<br>' + hiddenChar + '<div class="image-caption">' + alt + '</div>' + hiddenChar + '<input class="image-caption-input" />' + hiddenChar + '</div>';
		}
		else {
			html = hiddenChar + '<div class="image-package currentImage">' + hiddenChar + '<img src="' + url + '"' + data_slug + data_width + data_height + ' />' + hiddenChar + '<br>' + hiddenChar + '<div class="image-caption">' + alt + '</div>' + hiddenChar + '<input class="image-caption-input" />' + hiddenChar + '</div>';
		}

		ZSSEditor.jumpAfterImage();
		this.insertHTML(html);
		ZSSEditor.jumpAfterImage();
		ZSSEditor.insertHTML('');
		this.sendEnabledStyles();

		// Set ContentEditable
		var node = $('div.currentImage');
		node.find('.image-caption').attr('contenteditable', 'false');
		node.find('.image-caption-input').val(alt);
		node.attr('contenteditable', false).removeClass('currentImage');
	}
};
/**
 *  @brief      Inserts a local image URL.  Useful for images that need to be uploaded.
 *  @details    By inserting a local image URL, we can make sure the image is shown to the user
 *              as soon as it's selected for uploading.  Once the image is successfully uploaded
 *              the application should call replaceLocalImageWithRemoteImage().
 *
 *  @param      imageNodeIdentifier     This is a unique ID provided by the caller.  It exists as
 *                                      a mechanism to update the image node with the remote URL
 *                                      when replaceLocalImageWithRemoteImage() is called.
 *  @param      localImageUrl           The URL of the local image to display.  Please keep in mind
 *                                      that a remote URL can be used here too, since this method
 *                                      does not check for that.  It would be a mistake.
 */
ZSSEditor.insertLocalImage = function(imageNodeIdentifier, localImageUrl) {
	ZSSEditor.restoreRange();
	if (isMarkdown) {
		var mdi = new ZSSEditor.MarkdownImageObject(imageNodeIdentifier);
		mdi.local = localImageUrl;
		mdi.updateMarkdown();
		ZSSEditor.insertHTML(mdi.markdown);
	}

	else {
		var progressIdentifier = 'progress_' + imageNodeIdentifier;
		var imageContainerIdentifier = 'img_container_' + imageNodeIdentifier;
		var imgContainerStart = '<div id="' + imageContainerIdentifier+'" class="img_container image-package currentImage" contenteditable="false" data-failed="Tap to try again!">';
		var imgContainerEnd = '</div>';
		var progress = '<progress id="' + progressIdentifier+'" value=0  class="wp_media_indicator"></progress>';
		var image = '<img name="' + imageNodeIdentifier + '" src="' + localImageUrl + '" class="uploading" alt="" />';
		var caption = '<div class="image-caption" contenteditable="false">上传中，请稍候…</div>';
		var input = '<input class="image-caption-input" value="上传中，请稍候…" />';
		var html = imgContainerStart + hiddenChar + progress + hiddenChar + image + hiddenChar + '<br>' + hiddenChar + caption + hiddenChar + input + hiddenChar + imgContainerEnd;
		html = hiddenChar + html + hiddenChar + '<p></p>';

		ZSSEditor.jumpAfterImage();
		this.insertHTML(html);
		ZSSEditor.jumpAfterImage();
		ZSSEditor.insertHTML('');
		this.sendEnabledStyles();

		// Set ContentEditable
		var node = $('div.currentImage');
		node.attr('contenteditable', 'false');
		node.find('.image-caption').attr('contenteditable', 'false');
		node.removeClass('currentImage');
	}
};
/**
 *  @brief      Replaces a local image URL with a remote image URL.  Useful for images that have
 *              just finished uploading.
 *  @details    The remote image can be available after a while, when uploading images.  This method
 *              allows for the remote URL to be loaded once the upload completes.
 *
 *  @param      imageNodeIdentifier     This is a unique ID provided by the caller.  It exists as
 *                                      a mechanism to update the image node with the remote URL
 *                                      when replaceLocalImageWithRemoteImage() is called.
 *  @param      remoteImageUrl          The URL of the remote image to display.
 */
ZSSEditor.replaceLocalImageWithRemoteImage = function(imageNodeIdentifier, remoteImageUrl, displayUrl, slug) {
	ZSSEditor.restoreRange();
	if (isMarkdown) {
		var mdi = Maleskine.imageCaches[imageNodeIdentifier];
		mdi.remote = remoteImageUrl;
		mdi.display = displayUrl;
		mdi.state = 2;
		mdi.updateMarkdown();
		mdi.updateImageContent(Maleskine.content()[0], mdi.local);
	}

	else {
		var imageNode = $(document.getElementsByName(imageNodeIdentifier));
		if (imageNode.length == 0) {
			return;
		}

		// For Image Params
		if (remoteImageUrl.match(/^http:\/\/(upload-images\.jianshu\.io\/upload_images\/|jianshu-(dev\.u|staging)\.qiniudn\.com\/)/i)) {
			if (remoteImageUrl.indexOf('?') > 0) remoteImageUrl = remoteImageUrl.split('?')[0]; // Remove params, if image's from our pic-bed.
		}
		if (!displayUrl) {
			displayUrl = remoteImageUrl + Maleskine.imagePostfix; // If not display_url
		}
		//when we decide to put the final url we can remove this from the node.
		imageNode.removeAttr('alt');
		imageNode.removeAttr('class');
		imageNode.attr('data-original-src', remoteImageUrl);
		imageNode.attr('data-src', displayUrl);
		imageNode.attr('src', displayUrl);
		if (!!slug && !!slug.length && slug.length > 0) {
			imageNode.attr('data-image-slug', slug);
		}

		if (ZSSEditor.eventListeners.input) {
			var joinedArguments = ZSSEditor.getJoinedFocusedFieldIdAndCaretArguments();
			ZSSEditor.callback("callback-input", joinedArguments);
			Maleskine.onContentChanged();
		}

		// Set Cursor
		Maleskine.content().focus();
		var selection = window.getSelection();
		if (selection.rangeCount > 0) {
			var range = selection.getRangeAt(0);
			var node = $(imageNode).parents('.image-package').find('.image-caption-input')[0];
			node.focus();
			range.selectNode(node);
			ZSSEditor.currentSelection.setRange(range);
			node.focus();
			node.selectionStart = node.value.length;
			node.selectionEnd = node.value.length;
		}
	}
};
/**
 *  @brief      Update the progress indicator for the image identified with the value in progress.
 *
 *  @param      imageNodeIdentifier This is a unique ID provided by the caller.
 *  @param      progress    A value between 0 and 100 indicating the progress on the image.
 */
ZSSEditor.setProgressOnImage = function(imageNodeIdentifier, progress) {
	if (isMarkdown) {
		var mdi = Maleskine.imageCaches[imageNodeIdentifier];
		mdi.progress = progress;
		mdi.state = 1;
		mdi.updateMarkdown();
		mdi.updateImageContent(Maleskine.content()[0], mdi.local);
	}

	else {
		var imageNode = $(document.getElementsByName(imageNodeIdentifier));
		if (imageNode.length == 0){
			return;
		}
		var container = imageNode.parents('.image-package');
		var imageProgressNode = container.find('progress');
		if (progress >= 100){
			imageProgressNode.remove();
			var pack = container.removeAttr('id').removeClass('img_container').removeAttr('data-failed');
			pack.find('.image-caption').html('图片发自简书App'); // &nbsp; for iOS line-height bug.
			pack.find('.image-caption-input').val('图片发自简书App'); // &nbsp; for iOS line-height bug.
		}
		else if (imageProgressNode.length > 0) {
			imageProgressNode.attr("value", progress / 100);
		}
	}
};
/**
 *  @brief      Marks the image as failed to upload
 *
 *  @param      imageNodeIdentifier     This is a unique ID provided by the caller.
 *  @param      message                 A message to show to the user, overlayed on the image
 */
ZSSEditor.markImageUploadFailed = function(imageNodeIdentifier, message) {
	ZSSEditor.restoreRange();
	if (isMarkdown) {
		var mdi = Maleskine.imageCaches[imageNodeIdentifier];
		mdi.message = message;
		mdi.state = 3;
		mdi.updateMarkdown();
		mdi.updateImageContent(Maleskine.content()[0], mdi.local);
	}

	else {
		var imageNode = $(document.getElementsByName(imageNodeIdentifier));
		if (imageNode.length == 0){
			return;
		}

		var sizeClass = '';
		if ( imageNode[0].width > 480 && imageNode[0].height > 240 ) {
			sizeClass = "largeFail";
		} else if ( imageNode[0].width < 100 || imageNode[0].height < 100 ) {
			sizeClass = "smallFail";
		}

		imageNode.removeClass("uploading");
		imageNode.addClass('failed');

		var imageContainerNode = imageNode.parents('.image-package');
		if(imageContainerNode.length != 0){
			imageContainerNode.attr("data-failed", message);
			imageContainerNode.addClass('failed');
			imageContainerNode.addClass(sizeClass);
		}

		var imageProgressNode = imageContainerNode.find('progress');
		if (imageProgressNode.length != 0){
			imageProgressNode.addClass('failed');
		}
	}
};
/**
 *  @brief      Unmarks the image as failed to upload
 *
 *  @param      imageNodeIdentifier     This is a unique ID provided by the caller.
 */
ZSSEditor.unmarkImageUploadFailed = function(imageNodeIdentifier) {
	ZSSEditor.restoreRange();
	if (isMarkdown) {
		var mdi = Maleskine.imageCaches[imageNodeIdentifier];
		mdi.progress = 0;
		mdi.state = 1;
		mdi.updateMarkdown();
		mdi.updateImageContent(Maleskine.content()[0], mdi.local);
	}

	else {
		var imageNode = $(document.getElementsByName(imageNodeIdentifier));
		if (imageNode.length != 0){
			imageNode.removeClass('failed');
			imageNode.addClass('uploading');
		}

		var imageContainerNode = imageNode.parents('.image-package');
		if(imageContainerNode.length != 0){
			imageContainerNode.removeAttr("data-failed");
			imageContainerNode.removeClass('failed');
		}

		var imageProgressNode = imageContainerNode.find('progress');
		if (imageProgressNode.length != 0){
			imageProgressNode.removeClass('failed');
		}
	}
};
/**
 *  @brief      Remove the image from the DOM.
 *
 *  @param      imageNodeIdentifier     This is a unique ID provided by the caller.
 */
ZSSEditor.removeImage = function(imageNodeIdentifier) {
	if (!imageNodeIdentifier) {
		ZSSEditor.removeCurrentImage();
		return;
	}
	ZSSEditor.restoreRange();
	if (isMarkdown) {
		var mdi = Maleskine.imageCaches[imageNodeIdentifier];
		if (!mdi) {
			ZSSEditor.removeCurrentImage();
			return;
		}
		mdi.state = -1;
		mdi.remove(Maleskine.content()[0], mdi.local);
	}

	else {
		var imageNode = $(document.getElementsByName(imageNodeIdentifier));
		if (imageNode.length === 0) {
			ZSSEditor.removeCurrentImage();
			return;
		}
		var imagePack = imageNode.parents('.image-package');
		imagePack.attr('contenteditable', true);
		imagePack.find('.image-caption').attr('contenteditable', true);
		var selection = getSelection();
		var range = selection.getRangeAt(0);
		range.selectNode(imagePack[0]);
		ZSSEditor.currentSelection.setRange(range);
		document.execCommand('insertHTML', false, '');
		document.execCommand('formatBlock', false, 'p');
		this.sendEnabledStyles();
	}
};
ZSSEditor.removeCurrentImage = function (url) {
	ZSSEditor.restoreRange();
	if (isMarkdown) return;
	if (!ZSSEditor.currentEditingImage) return;
	var image = $(ZSSEditor.currentEditingImage);
	var selection = window.getSelection(), range;
	if (image.length === 0) {
		if (selection.rangeCount <= 0) return;
		range = selection.getRangeAt(0);
		image = $(range.commonAncestorContainer);
		if (!image.is('img')) {
			if (!image.is('.image-package')) image = image.parents('.image-package');
			if (image.length === 0) return;
			image = image.find('img');
		}
		if (image.length === 0) return;
	}

	// in iOS, can't parse complicated url
	ZSSEditor.currentEditingImage = null;
	var imagePack = image.parents('.image-package');
	imagePack.attr('contenteditable', true);
	imagePack.find('.image-caption').attr('contenteditable', true);
	selection = getSelection();
	range = selection.getRangeAt(0);
	range.selectNode(imagePack[0]);
	ZSSEditor.currentSelection.setRange(range);
	document.execCommand('insertHTML', false, '');
	document.execCommand('formatBlock', false, 'p');
	this.sendEnabledStyles();
};
ZSSEditor.cancelRemoveCurrentImage = function (url) {
	ZSSEditor.restoreRange();
	if (isMarkdown) return;
	var image = $(ZSSEditor.currentEditingImage);
	var selection = window.getSelection(), range;
	if (image.length === 0) {
		if (selection.rangeCount <= 0) return;
		range = selection.getRangeAt(0);
		image = $(range.commonAncestorContainer);
		if (!image.is('img')) {
			if (!image.is('.image-package')) image = image.parents('.image-package');
			if (image.length === 0) return;
			image = image.find('img');
		}
		if (image.length === 0) return;
	}

	// in iOS, can't parse complicated url
	ZSSEditor.currentEditingImage = null;
};

/*
 * Insert Video
 */
ZSSEditor.insertVideo = function (video_url, preview_url, description) {
	ZSSEditor.restoreRange();
	if (isMarkdown) {
		return;
	}

	if (!doesVideoURLAvailable(video_url)) return;

	var width = $(window).width() - 52; // 52 is the padding
	if (width > 480) width = 480;
	else width = Math.round(width);
	var height = Math.round(width / 6 * 5); // 5/6 is the ratio
	var player = video_maker(video_url, width, height);

	var html = hiddenChar;
	html += '<div class="video-package currentVideo" data-video-url="' + video_url + '" data-preview-url="' + preview_url + '">';
	html += hiddenChar;
	html += player;
	html += hiddenChar;
	html += '<br>';
	html += hiddenChar;
	html += '<div class="video-description">';
	html += hiddenChar;
	html += description;
	html += hiddenChar;
	html += '</div>';
	html += hiddenChar;
	html += '<input class="video-description-input" />';
	html += hiddenChar;
	html += '</div>';
	html += hiddenChar;

	ZSSEditor.jumpAfterImage();
	this.insertHTML(html);
	ZSSEditor.jumpAfterImage();
	ZSSEditor.insertHTML('');
	this.sendEnabledStyles();

	// Set ContentEditable
	player = $('div.currentVideo');
	player.find('div.video-description').attr('contenteditable', false);
	player.find('div.video-description-input').val(description);
	player.attr('contenteditable', false).removeClass('currentVideo');
};

ZSSEditor.insertHTML = function(html) {
	document.execCommand('insertHTML', false, html);
	this.sendEnabledStyles();
};

// MARK: - Parent nodes & tags

ZSSEditor.closerParentNode = function() {
	var parentNode = null;
	var selection = window.getSelection();
	var range = selection.getRangeAt(0).cloneRange();

	// For Input
	var currentNode;
	if (range.startContainer.nodeType === document.ELEMENT_NODE && range.startContainer === range.endContainer && range.startOffset === range.endOffset) {
		currentNode = range.startContainer.childNodes[range.startOffset];
		if (!currentNode || !currentNode.nodeType || currentNode.nodeType !== document.ELEMENT_NODE) {
			currentNode = range.commonAncestorContainer;
		}
	}
	else {
		currentNode = range.commonAncestorContainer;
	}

	while (currentNode) {
		if (currentNode.nodeType == document.ELEMENT_NODE) {
			parentNode = currentNode;

			break;
		}

		currentNode = currentNode.parentElement;
	}

	return parentNode;
};

ZSSEditor.closerParentNodeStartingAtNode = function(nodeName, startingNode) {
	nodeName = nodeName.toLowerCase();

	if (!!startingNode.jquery) { // For jQuery-Object.
		startingNode = startingNode[0];
	}

	var parentNode = null;
	var currentNode = startingNode,parentElement;

	while (currentNode) {
		if (currentNode.nodeName == document.body.nodeName) {
			break;
		}

		if (currentNode.nodeName.toLowerCase() == nodeName
			&& currentNode.nodeType == document.ELEMENT_NODE) {
			parentNode = currentNode;

			break;
		}

		currentNode = currentNode.parentElement;
	}

	return $(parentNode);
};

ZSSEditor.closerParentNodeWithName = function(nodeName) {
	var selection = window.getSelection();
	var range = selection.getRangeAt(0).cloneRange();
	var currentNode = $(range.commonAncestorContainer);

	if (currentNode.is(nodeName)) return currentNode[0];
	var parentNode = currentNode.parents(nodeName);
	if (parentNode.length > 0) return parentNode[0];
	return null;
};

ZSSEditor.parentTags = function() {
	var parentTags = [];
	var selection = window.getSelection();
	var range, currentNode;

	if (selection.rangeCount > 0) {
		range = selection.getRangeAt(0);
		currentNode = range.commonAncestorContainer;
	}
	else {
		currentNode = document.getElementById(ZSSEditor.lastFocusedFieldId);
	}

	while (currentNode) {

		if (currentNode.nodeName == document.body.nodeName) {
			break;
		}

		if (currentNode.nodeType == document.ELEMENT_NODE) {
			parentTags.push(currentNode);
		}

		currentNode = currentNode.parentElement;
	}

	return parentTags;
};

// MARK: - ZSSField Constructor

function ZSSField(wrappedObject) {
	this.wrappedObject = wrappedObject;
	this.hasNoStyle = wrappedObject[0].hasAttribute('nostyle');
	this.IMERunning = false;
	this.bindListeners();
};

ZSSField.prototype.bindListeners = function() {
	var thisObj = this, ui = this.wrappedObject;

	var isTitle = (ui[0] === Maleskine.title()[0]);
	var isMarkdown = (ui[0] === Maleskine._contentMD[0]);

	ui.bind('tap',   function(e) { thisObj.handleTapEvent(e); });
	ui.bind('focus', function(e) { thisObj.handleFocusEvent(e); });
	ui.bind('blur',  function(e) { thisObj.handleBlurEvent(e); });
	if (isTitle) {
		if (ZSSEditor.isAndroidHighLevel || !ZSSEditor.isAndroid) {
			ui.bind('keydown', function(e) { thisObj.handleKeyDownEventForTitle(e); });
		}
	}
	else {
		if (ZSSEditor.isAndroidHighLevel || !ZSSEditor.isAndroid) {
			ui.bind('keydown', function(e) { thisObj.handleKeyDownEvent(e); });
		}
		ui.bind('compositionstart', function(e) { thisObj.handleComposingStartEvent(e); });
		ui.bind('compositionend',   function(e) { thisObj.handleComposingEndEvent(e); });
	}
	if (isMarkdown) {
		ui.bind('input', function(e) { thisObj.handleInputEventForMarkdown(e); thisObj.handleInputEvent(e); });
	}
	else if (isTitle) {
		ui.bind('input', function(e) { thisObj.handleInputEventForTitle(e); thisObj.handleInputEvent(e); });
	}
	else {
		ui.bind('input', function(e) { thisObj.handleInputEventForImageCaption(e); thisObj.handleInputEvent(e); });
	}
	ui.bind('paste', function(e) { thisObj.handlePasteEvent(e); });

	ui.bind('input', thisObj.handleEMOJI);
};

// MARK: - Handle event listeners

ZSSField.prototype.handleBlurEvent = function(e) {
	ZSSEditor.backupRange();
	ZSSEditor.focusedField = null;
	if (ZSSEditor.eventListeners.blur) this.callback("callback-focus-out");
};
ZSSField.prototype.handleFocusEvent = function(e) {
	ZSSEditor.backupRange();
	ZSSEditor.focusedField = this;

	// IMPORTANT: this is the only case where checking the current focus will not work.
	// We sidestep this issue by indicating that the field is about to gain focus.

	if (ZSSEditor.eventListeners.focus) this.callback("callback-focus-in");
	// SelectionChangedCallback will be call in document's selectionChanged event, and this event will be fired when foucs occurs.
	// ZSSEditor.selectionChangedCallback(); // Error when click image or something from blur directly.
};

ZSSField.prototype.handleKeyDownEvent = function(e) {
	if (this.IMERunning) return;

	var self = this.wrappedObject, elem = self[0];

	// IMPORTANT: without this code, we can have text written outside of paragraphs...
	if (ZSSEditor.closerParentNode() == elem) {
		document.execCommand('formatBlock', false, 'p');
	}

	if (e.keyCode !== 8 && e.keyCode !== 13) return;

	var selection = window.getSelection();
	if (selection.rangeCount < 1) {
		self.focus();
		e.preventDefault();
		e.stopPropagation();
		return;
	}

	var range = selection.getRangeAt(0), target = $(range.startContainer);

	// For ImageCaption
	if (e.keyCode === 8) {
		var offset = range.startOffset;
		var didInPackage = target.is('.image-package') || target.is('.video-package') || (target.parents('.image-package').length > 0) ||  (target.parents('.video-package').length > 0);
		var isCaption, caption, didInCaption;
		if (didInPackage) {
			isCaption = target.is('.image-caption') || target.is('.video-description');
			if (isCaption) {
				caption = target;
			}
			else {
				caption = target.parents('.image-caption');
				if (caption.length === 0) {
					caption = target.parents('.video-description');
				}
			}
			didInCaption = caption.length > 0;
			if (didInCaption) {
				if (Maleskine.isHeadOfCaption(caption, target)) {
					if (offset === 0) {
						e.preventDefault();
						e.stopPropagation();
					}
					else if (offset === 1 && caption.text().length === 1) {
						document.execCommand('insertHTML', false, '&nbsp;');
						var r = document.createRange();
						r.setStart(range.startContainer, 1);
						r.setEnd(range.startContainer, 1);
						ZSSEditor.currentSelection.setRange(r);
					}
				}
			}
		}
	}
	else if (e.keyCode === 13) {
		var pack;
		var didInPackage;
		if (target.is('.image-package')) {
			pack = target;
			didInPackage = true;
		}
		else if (target.is('.video-package')) {
			pack = target;
			didInPackage = true;
		}
		else {
			pack = target.parents('.image-package');
			if (pack.length === 0) pack = target.parents('.video-package');
			if (pack.length > 0) {
				didInPackage = true;
			}
		}
		if (didInPackage) {
			Maleskine.getAndroidEnter();

			e.preventDefault();
			e.stopPropagation();
		}
	}
};
ZSSField.prototype.handleKeyDownEventForTitle = function(e) {
	if (this.IMERunning) return;

	if (e.keyCode === 13) {
		Maleskine.content().focus();
		e.preventDefault();
		e.stopPropagation();
	}
};
ZSSField.prototype.handleComposingStartEvent = function(e) {
	this.IMERunning = true;
};
ZSSField.prototype.handleComposingEndEvent = function(e) {
	this.IMERunning = false;
};
ZSSField.prototype.handleInputEvent = function(e) {
	// IMPORTANT: we want the placeholder to come up if there's no text, so we clear the field if
	// there's no real content in it.  It's important to do this here and not on keyDown or keyUp
	// as the field could become empty because of a cut or paste operation as well as a key press.
	// This event takes care of all cases.
	if (ZSSEditor.eventListeners.input) {
		var joinedArguments = ZSSEditor.getJoinedFocusedFieldIdAndCaretArguments();
		// ZSSEditor.callback('callback-selection-changed', joinedArguments);
		this.callback("callback-input", joinedArguments);
		Maleskine.onContentChanged();
	}
};
ZSSField.prototype.handleInputEventForImageCaption = function(e) {
	// Auto Resize Image-Caption
	var sel = getSelection();
	if (sel.rangeCount < 1) return;
	var range = sel.getRangeAt(0);
	var elem = range.startContainer.childNodes[range.startOffset];
	if (!elem || !elem.nodeName) return;
	if (elem.nodeName.toLowerCase() === 'input' && (elem.classList.contains('image-caption-input') || elem.classList.contains('video-description-input'))) {
		var caption = elem.parentElement.querySelector('div.image-caption');
		if (!caption) caption = elem.parentElement.querySelector('div.video-description');
		caption.innerText = elem.value;
		var height = caption.getBoundingClientRect().height;
		if (height < 42) height = 42;
		var old_height = elem._height || 42;
		if (height !== old_height) {
			elem.style.height = height + 'px';
			elem._height = height;
		}
	}
};
ZSSField.prototype.handleInputEventForTitle = function (e) {
	var title = Maleskine._title.text();
	if (title.length === 0) {
		Maleskine._titleResizer.html(ZSSEditor.titlePlaceholder);
		Maleskine._titleResizer[0].style.visibility = 'visible';
	}
	else {
		Maleskine._titleResizer.html(title);
		Maleskine._titleResizer[0].style.visibility = 'hidden';
	}
};
ZSSField.prototype.handleInputEventForMarkdown = function (e) {
	var obj = this.wrappedObject, ui = this.wrappedObject[0];
	if (ui.scrollHeight > ui.getBoundingClientRect().height) obj.height(ui.scrollHeight + 100);
};
ZSSField.prototype.handlePasteEvent = function(e) {
	// 安卓的WebView可以获得paste事件，但无法获取paste数据。
	if (ZSSEditor.isAndroid) {
		AndroidDelegate.onPaste();
	}
	else {
		e = e.originalEvent;
		var content = e.clipboardData.getData('Text');
		Maleskine.getPaste(content);
	}
	e.preventDefault();
	e.stopPropagation();
};
ZSSField.prototype.handleTapEvent = function(e) {
	var targetNode = e.target;

	if (ZSSEditor.eventListeners.input) {
		setTimeout(function() { ZSSEditor.callback('callback-tap');}, 550);
	}

	if (targetNode) {

		ZSSEditor.lastTappedNode = targetNode;

		if (targetNode.nodeName.toLowerCase() == 'a') {
			var arguments = [
								'url=' + encodeURIComponent(targetNode.href),
								'title=' + encodeURIComponent(targetNode.innerHTML)
							];

			var joinedArguments = arguments.join(defaultCallbackSeparator);

			var thisObj = this;

			// WORKAROUND: force the event to become sort of "after-tap" through setTimeout()
			//
			if (ZSSEditor.eventListeners.selectionChanged) setTimeout(function() { thisObj.callback('callback-link-tap', joinedArguments);}, 550);
		}

		else if (targetNode.nodeName.toLowerCase() == 'img') {
			// Format and flag the image as selected.
			ZSSEditor.currentEditingImage = targetNode;

			// Get Selection
			if (ZSSEditor.isAndroid) {
				var items = [];
				if (targetNode) {
					items.push('isimage');
					items.push('image:' + targetNode.src);
					var t = $(targetNode);
					caption = t.parents('.image-package').find('.image-caption').html();
					items.push('image-alt:' + caption);
					items.push('image-id:' + t.attr('name'));
					if (targetNode.classList.contains('failed')) {
						items.push('image-status:3');
					}
					else if (targetNode.classList.contains('uploading')) {
						items.push('image-status:2');
					}
					else {
						items.push('image-status:1');
					}
				}
				if (ZSSEditor.sendEnabledStylesRequest) clearTimeout(ZSSEditor.sendEnabledStylesRequest);
				ZSSEditor.stylesCallback(items);
			}

			// If the image is uploading, or is a local image do not select it.
			if ( targetNode.classList.contains('uploading') || targetNode.classList.contains('failed') ) {
				this.sendImageTappedCallback( targetNode );
				return;
			}

			// If we're not currently editing just return. No need to apply styles
			// or acknowledge the tap
			if ( this.wrappedObject.attr('contenteditable') != "true" ) {
				return;
			}

			// Is the tapped image the image we're editing?
			if ( targetNode == ZSSEditor.currentEditingImage ) {
				this.sendImageTappedCallback( targetNode );
				return;
			}

			// If there is a selected image, deselect it. A different image was tapped.
			if ( !ZSSEditor.currentEditingImage ) {
				this.sendImageTappedCallback( targetNode );
			}

			return;
		}

		else if (targetNode.classList.contains('image-package')) {
			if (ZSSEditor.isAndroid) {
				var items = [];
				if (targetNode) {
					items.push('isimage');
					var t = $(targetNode);
					var img = t.find('img');
					items.push('image:' + img.attr('src'));
					items.push('image-alt:' + t.find('image-caption').html());
					items.push('image-id:' + img.attr('name'));
				}
				if (ZSSEditor.sendEnabledStylesRequest) clearTimeout(ZSSEditor.sendEnabledStylesRequest);
				ZSSEditor.stylesCallback(items);
			}
			else {
				targetNode.querySelector('input').focus();
				if (ZSSEditor.eventListeners.focus) this.callback("callback-focus-in");
				if (getSelection().rangeCount === 0) {
					ZSSEditor.currentSelection.isTextarea = true;
					ZSSEditor.currentSelection.startContainer = targetNode;
					ZSSEditor.currentSelection.endContainer = targetNode;
					if (targetNode.selectionStart > targetNode.selectionEnd) {
						ZSSEditor.currentSelection.startOffset = targetNode.selectionEnd;
						ZSSEditor.currentSelection.endOffset = targetNode.selectionStart;
					}
					else {
						ZSSEditor.currentSelection.startOffset = targetNode.selectionStart;
						ZSSEditor.currentSelection.endOffset = targetNode.selectionEnd;
					}
				}
				else {
					ZSSEditor.backupRange();
				}
				ZSSEditor.selectionChangedCallback();
				ZSSEditor.sendEnabledStyles();
			}
		}

		else if (targetNode.classList.contains('video-package')) {
			if (ZSSEditor.isAndroid) {
				if (ZSSEditor.sendEnabledStylesRequest) clearTimeout(ZSSEditor.sendEnabledStylesRequest);
			}
			else {
				targetNode.querySelector('input').focus();
				if (ZSSEditor.eventListeners.focus) this.callback("callback-focus-in");
				if (getSelection().rangeCount === 0) {
					ZSSEditor.currentSelection.isTextarea = true;
					ZSSEditor.currentSelection.startContainer = targetNode;
					ZSSEditor.currentSelection.endContainer = targetNode;
					if (targetNode.selectionStart > targetNode.selectionEnd) {
						ZSSEditor.currentSelection.startOffset = targetNode.selectionEnd;
						ZSSEditor.currentSelection.endOffset = targetNode.selectionStart;
					}
					else {
						ZSSEditor.currentSelection.startOffset = targetNode.selectionStart;
						ZSSEditor.currentSelection.endOffset = targetNode.selectionEnd;
					}
				}
				else {
					ZSSEditor.backupRange();
				}
				ZSSEditor.selectionChangedCallback();
				ZSSEditor.sendEnabledStyles();
			}
		}

		else if (targetNode.classList.contains('image-caption-input')) {
			if (ZSSEditor.eventListeners.focus) this.callback("callback-focus-in");
			if (getSelection().rangeCount === 0) {
				ZSSEditor.currentSelection.isTextarea = true;
				ZSSEditor.currentSelection.startContainer = targetNode;
				ZSSEditor.currentSelection.endContainer = targetNode;
				if (targetNode.selectionStart > targetNode.selectionEnd) {
					ZSSEditor.currentSelection.startOffset = targetNode.selectionEnd;
					ZSSEditor.currentSelection.endOffset = targetNode.selectionStart;
				}
				else {
					ZSSEditor.currentSelection.startOffset = targetNode.selectionStart;
					ZSSEditor.currentSelection.endOffset = targetNode.selectionEnd;
				}
			}
			else {
				ZSSEditor.backupRange();
			}
			ZSSEditor.selectionChangedCallback();
			ZSSEditor.sendEnabledStyles();
		}

		else if (targetNode.classList.contains('video-description-input')) {
			if (ZSSEditor.eventListeners.focus) this.callback("callback-focus-in");
			if (getSelection().rangeCount === 0) {
				ZSSEditor.currentSelection.isTextarea = true;
				ZSSEditor.currentSelection.startContainer = targetNode;
				ZSSEditor.currentSelection.endContainer = targetNode;
				if (targetNode.selectionStart > targetNode.selectionEnd) {
					ZSSEditor.currentSelection.startOffset = targetNode.selectionEnd;
					ZSSEditor.currentSelection.endOffset = targetNode.selectionStart;
				}
				else {
					ZSSEditor.currentSelection.startOffset = targetNode.selectionStart;
					ZSSEditor.currentSelection.endOffset = targetNode.selectionEnd;
				}
			}
			else {
				ZSSEditor.backupRange();
			}
			ZSSEditor.selectionChangedCallback();
			ZSSEditor.sendEnabledStyles();
		}

		else if (targetNode.className.indexOf('edit-overlay') != -1 || targetNode.className.indexOf('edit-content') != -1) {
			this.sendImageTappedCallback( ZSSEditor.currentEditingImage );
			return;
		}

		if (ZSSEditor.currentEditingImage) {
			ZSSEditor.currentEditingImage = null;
		}
	}
};
ZSSField.prototype.handleEMOJI = function (e) {
	if (ZSSField.prototype.handleEMOJI.level > 0) return;

	var RANGE_LENGTH = 100, NODE_RANGE = 5;
	var node, content, pro, sel, post, rep, changed, start, end, i, selection, range;

	if (isMarkdown) {
		node = Maleskine._contentMD[0];
		content = node.value;
		start = node.selectionStart - RANGE_LENGTH;
		if (start < 0) start = 0;
		end = node.selectionEnd + RANGE_LENGTH;
		if (end > content.length) end = content.length;
		pro = content.substring(start, node.selectionStart);
		sel = content.substring(node.selectionStart, node.selectionEnd);
		post = content.substring(node.selectionEnd, end);
		rep = pro.replace(Maleskine.RegEx.EMOJI, '');
		changed = rep.length !== pro.length;
		pro = rep;
		rep = sel.replace(Maleskine.RegEx.EMOJI, '');
		changed = changed || (rep.length !== sel.length);
		sel = rep;
		rep = post.replace(Maleskine.RegEx.EMOJI, '');
		changed = changed || (rep.length !== post.length);
		post = rep;
		if (changed) {
			node.selectionStart = start;
			node.selectionEnd = end;
			content = pro + sel + post;
			// 整理为TextArea可接受且不用转义的形式
			content = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
			ZSSField.prototype.handleEMOJI.level ++;
			document.execCommand('insertHTML', false, content);
			ZSSField.prototype.handleEMOJI.level --;
			node.selectionStart = start + pro.length;
			node.selectionEnd = start + pro.length + sel.length;
		}
	}
	else {
		selection = getSelection();
		if (selection.rangeCount <= 0) return;
		sel = selection.getRangeAt(0);
		rep = sel.endContainer;
		post = ['input', 'textarea'].indexOf(rep.nodeName.toLowerCase()) >= 0;
		if (post) {
			start = rep.selectionEnd;
			end = rep.selectionEnd;
		}
		else {
			start = sel.endOffset;
			end = sel.endOffset;
		}
		sel = $(rep);
		content = sel.parent();
		while (!content.is(Maleskine._contentRT) && !content.is(Maleskine._title) && !content.is('body')) {
			sel = content;
			content = sel.parent();
		}
		content = sel[0];
		node = [];
		for (i = 0; i < NODE_RANGE; i++) {
			content = content.previousSibling;
			if (content) node.push(content);
			else break;
		}
		content = sel[0];
		for (i = 0; i < NODE_RANGE; i++) {
			content = content.nextSibling;
			if (content) node.push(content);
			else break;
		}
		sel = sel[0]; // sel, start, end为当前所在节点及节点内位置
		range = document.createRange();
		node.map(function (node) {
			if (node.nodeType === 3) {
				removeEMOJI(node, selection, range);
			}
			else {
				getAllTextNodes(node).map(function (node) {
					removeEMOJI(node, selection, range);
				});
			}
		});
		pre = (rep.textContent || rep.value || '').length;
		changed = false;
		getAllTextNodes(sel).map(function (node) {
			var hasChanged = removeEMOJI(node, selection, range);
			changed = changed || hasChanged;
		});
		if (changed) {
			pre = pre - (rep.textContent || rep.value || '').length;
			if (post) {
				rep.focus();
				rep.selectionStart = start - pre;
				rep.selectionEnd = end - pre;
			}
			else {
				range.setStart(rep, start - pre);
				range.setEnd(rep, end - pre);
				selection.removeAllRanges();
				selection.addRange(range);
			}
		}
	}
};
ZSSField.prototype.handleEMOJI.level = 0;
function getAllTextNodes (node, result) {
	if (!result) result = [];
	[].map.call(node.childNodes, function (node) {
		if (node.nodeType === 3) {
			result.push(node);
			return;
		}
		var name = node.nodeName.toLowerCase();
		if (name === 'input' || name === 'textarea') {
			result.push(node);
			return;
		}
		getAllTextNodes(node, result);
	});
	return result;
}
function removeEMOJI (node, selection, range) {
	var content, newContent;
	content = node.textContent || node.value || '';
	newContent = content.replace(Maleskine.RegEx.EMOJI, '');
	if (newContent.length === content.length) return false; // 如果没有EMOJI
	// 替换掉含有EMOJI的内容
	if (node.nodeType === 3) {
		if (!range) range = document.createRange();
		range.selectNode(node);
		if (!selection) selection = getSelection();
		selection.removeAllRanges();
		selection.addRange(range);
	}
	else {
		node.selectionStart = 0;
		node.selectionEnd = content.length;
	}
    ZSSField.prototype.handleEMOJI.level ++;
    document.execCommand('insertHTML', false, newContent);
    if (newContent.length === 0) { // 修复内容为空时，键入EMOJI表情光标消失
        focusContent();
    }
	ZSSField.prototype.handleEMOJI.level --;

	return true;
}

function focusContent() {
    window.setTimeout(function() {
        var div = document.getElementById('zss_field_content');
        var sel, range;
        range = document.createRange();
        range.selectNodeContents(div);
        range.collapse(false);
        sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }, 1);
}

ZSSField.prototype.sendImageTappedCallback = function( imageNode ) {
	if (isMarkdown) return; // Don't do anything in Markdown Mode.

	var imageId = "";
	if (imageNode.hasAttribute('name')) {
		imageId = imageNode.name;
	}
	var arguments = [
						'id=' + encodeURIComponent(imageId),
						'url=' + encodeURIComponent(imageNode.src)
					];

	var joinedArguments = arguments.join(defaultCallbackSeparator);

	var thisObj = this;

	var container = imageNode.parentElement;
	if (container.className.indexOf('img_container') >= 0) {
		// WORKAROUND: force the event to become sort of "after-tap" through setTimeout()
		// [TODO] Why We Need This???
		//
		if (ZSSEditor.eventListeners.selectionChanged) setTimeout(function() {thisObj.callback('callback-image-tap', joinedArguments);}, 0);
	}
	else {
		if (ZSSEditor.eventListeners.selectionChanged) thisObj.callback('callback-image-tap', joinedArguments);
	}
};

// MARK: - Callback Execution

ZSSField.prototype.callback = function(callbackScheme, callbackPath) {
	var url = callbackScheme + ":";

	url = url + "id=" + this.wrappedObject.attr('id');

	if (callbackPath) {
		url = url + defaultCallbackSeparator + callbackPath;
	}

	if (isUsingInsideApp) {
		ZSSEditor.callbackThroughIFrame(url);
	} else {
		console.log(url);
	}
};

// MARK: - Focus

ZSSField.prototype.isFocused = function() {
	return this.wrappedObject.is(':focus');
};

// MARK: - Editing

ZSSField.prototype.enableEditing = function () {
	var self = this.wrappedObject;
	self.attr('contenteditable', true);
	if (self.text().replace(/\s+/, '').length === 0 && self.attr('id') === 'zss_field_title') {
		self.html('&nbsp;');
	}

	if (!ZSSEditor.focusedField) {
		ZSSEditor.focusFirstEditableField();
	}
};

ZSSField.prototype.disableEditing = function () {
	// IMPORTANT: we're blurring the field before making it non-editable since that ensures
	// that the iOS keyboard is dismissed through an animation, as opposed to being immediately
	// removed from the screen.

	this.wrappedObject.attr('contenteditable', false);
};

// MARK: - i18n

if (ZSSEditor.usingI8N) {

ZSSField.prototype.isRightToLeftTextEnabled = function() {
	var textDir = this.wrappedObject.attr('dir');
	var isRTL = (textDir != "undefined" && textDir == 'rtl');
	return isRTL;
};
ZSSField.prototype.enableRightToLeftText = function(isRTL) {
	var textDirectionString = isRTL ? "rtl" : "ltr";
	this.wrappedObject.attr('dir', textDirectionString);
	this.wrappedObject.css('direction', textDirectionString);
};

}

// MARK: - HTML contents

ZSSField.prototype.isEmpty = function() {
	var text = this.text();
	var isEmpty = text.replace(/\s/gi, '').length === 0;
	return isEmpty;
};

ZSSField.prototype.getHTML = function() {
	var html = this.wrappedObject.html();
	// html = ZSSEditor.removeVisualFormatting(html);
	return html
};

ZSSField.prototype.strippedHTML = function() {
	return this.wrappedObject.text();
};

ZSSField.prototype.setHTML = function(html) {
	var self = this.wrappedObject;

	// Set Title
	if (self.is(Maleskine.title())) {
		Maleskine.setTitle(html);
	}
	// Set Content
	else if (self.is(Maleskine.content())) {
		Maleskine.setContent(html);
	}
};

// Jianshu Plugins
var Maleskine = {};

// For Android
Maleskine.loadStatus = {
	page: false,
	interface: false,
	check: function () {
		if (Maleskine.loadStatus.page && Maleskine.loadStatus.interface) {
			ZSSEditor.delegatorRequest("init:init");
		}
	}
};

// Save Local-Image-URL for show Remote-Image in Preview Mode.
Maleskine.imageCaches = {};

Maleskine._contentRT = null;
Maleskine._contentMD = null;
Maleskine.content = function () {
	if (isMarkdown) {
		return Maleskine._contentMD;
	}
	else {
		return Maleskine._contentRT;
	}
};
Maleskine._title = null;
Maleskine.title = function () {
	return Maleskine._title;
};
Maleskine._container = $('<div></div>');

Maleskine.imagePostfix = '?imageMogr2/auto-orient/strip|imageView2/2/w/1240';

// [TODO] Useless now
Maleskine.getLastNode = function (node) {
	if (!node.childNodes || node.nodeName === '#text') return node;
	node = node.childNodes;
	node = node[node.length - 1];
	return Maleskine.getLastNode(node);
};
Maleskine.isHeadOfCaption = function (target, current) {
	if (target.is(current)) return true;
	var parent = current.parent();
	if (parent.is(target)) {
		if (target[0].childNodes[0] === current[0]) {
			return true;
		}
		else {
			return false;
		}
	}
	else {
		return Maleskine.isHeadOfCaption(target, parent);
	}
};

// Markdown Block and Style
Maleskine.MarkdownBlock = {
	bold: { use: false, start: -1, end: -1, tag: '' },
	italic: { use: false, start: -1, end: -1, tag: '' },
	strike: { use: false, start: -1, end: -1, tag: '' },
	code: { use: false, start: -1, end: -1, tag: '' },
	under: { use: false, start: -1, end: -1, tag: '' },
	sub: { use: false, start: -1, end: -1, tag: '' },
	sup: { use: false, start: -1, end: -1, tag: '' },
	big: { use: false, start: -1, end: -1, tag: '' },
	small: { use: false, start: -1, end: -1, tag: '' },

	link: { use: false, start: -1, end: -1, mid: -1, tag: '', title: '', url: '' },
	image: { use: false, start: -1, end: -1, mid: -1, tag: '', caption: '', url: '' },
	hrule: { use: false, start: -1, end: -1, tag: '' },

	codeblock: { use: false, start: -1, end: -1, tag: '' },
	blockquote: { use: false, start: -1, end: -1, tag: '' },
	header1: { use: false, start: -1, end: -1, tag: '' },
	header2: { use: false, start: -1, end: -1, tag: '' },
	header3: { use: false, start: -1, end: -1, tag: '' },
	header4: { use: false, start: -1, end: -1, tag: '' },
	header5: { use: false, start: -1, end: -1, tag: '' },
	header6: { use: false, start: -1, end: -1, tag: '' },
};
Maleskine.MarkdownBlock._clearStyle = function (style_name) {
	var style = Maleskine.MarkdownBlock[style_name];
	style.use = false;
	style.start = -1;
	style.end = -1;
	style.tag = '';
};
Maleskine.MarkdownBlock._setStyle = function (style_name, start, end, tag) {
	var style = Maleskine.MarkdownBlock[style_name];
	if (style.use) {
		if (start > style.start) {
			style.start = start;
			style.end = end;
			style.tag = tag;
		}
	}
	else {
		style.use = true;
		style.start = start;
		style.end = end;
		style.tag = tag;
	}
};
Maleskine.getCurrentMarkdownStyle = function () {
	var editor = Maleskine._contentMD[0];
	var content = editor.value, start = editor.selectionStart, end = editor.selectionEnd;
	if (start > end) {
		start = start + end;
		end = start - end;
		start = start - end;
	}
	var bra = content.substring(0, start);
	var ket = content.substring(end, content.length);
	var mid = content.substring(start, end);
	var pro = bra.match(/(^|\n\s*\n)([^\n]+?\n)*[^\n]*?$/), post;
	if ((bra + mid).match(/\n$/)) {
		post = ket.match(/^([^\n]+?\n)*[^\n]*?($|\n\s*\n)/);
	}
	else {
		post = ket.match(/^\n?([^\n]+?\n)*[^\n]*?($|\n\s*\n)/);
	}
	if (pro) pro = pro[0].replace(pro[1], '');
	else pro = bra;
	pro = pro.replace(/^\n+/, '');
	if (post) post = post[0].replace(post[2], '');
	else post = ket;
	post = post.replace(/\n+$/, '');

	var styles = [];

	// Clear
	Object.keys(Maleskine.MarkdownBlock).map(function (target) {
		Maleskine.MarkdownBlock._clearStyle(target);
	});
	Maleskine.MarkdownBlock.link.mid = -1;
	Maleskine.MarkdownBlock.link.title = '';
	Maleskine.MarkdownBlock.link.url = '';
	Maleskine.MarkdownBlock.image.mid = -1;
	Maleskine.MarkdownBlock.image.caption = '';
	Maleskine.MarkdownBlock.image.url = '';

	Maleskine.getMarkdownCodeBlock(bra, ket, mid, pro, post);
	// Don't Use Any Style in Pre-Code
	if (Maleskine.MarkdownBlock.codeblock.use) {
		styles.push('codeblock');
	}
	// Use Other Styles
	else {

	Maleskine.getMarkdownBold(bra, ket, mid, pro, post);
	if (Maleskine.MarkdownBlock.bold.use) styles.push('bold');
	Maleskine.getMarkdownItalic(bra, ket, mid, pro, post);
	if (Maleskine.MarkdownBlock.italic.use) styles.push('italic');
	Maleskine.getMarkdownStrikethrough(bra, ket, mid, pro, post);
	if (Maleskine.MarkdownBlock.strike.use) styles.push('strikethrough');
	Maleskine.getMarkdownCode(bra, ket, mid, pro, post);
	if (Maleskine.MarkdownBlock.code.use) styles.push('code');
	Maleskine.getMarkdownUnder(bra, ket, mid, pro, post);
	if (Maleskine.MarkdownBlock.under.use) styles.push('underline');
	Maleskine.getMarkdownSub(bra, ket, mid, pro, post);
	if (Maleskine.MarkdownBlock.sub.use) styles.push('subscript');
	Maleskine.getMarkdownSup(bra, ket, mid, pro, post);
	if (Maleskine.MarkdownBlock.sup.use) styles.push('supscript');
	Maleskine.getMarkdownBig(bra, ket, mid, pro, post);
	if (Maleskine.MarkdownBlock.big.use) styles.push('big');
	Maleskine.getMarkdownSmall(bra, ket, mid, pro, post);
	if (Maleskine.MarkdownBlock.small.use) styles.push('small');

	Maleskine.getMarkdownLinkAndImage(bra, ket, mid, pro, post);
	if (Maleskine.MarkdownBlock.link.use) {
		styles.push('islink');
		styles.push('link-title:' + Maleskine.MarkdownBlock.link.title);
		styles.push('link:' + Maleskine.MarkdownBlock.link.url);
	}
	if (Maleskine.MarkdownBlock.image.use) {
		styles.push('isimage');
		styles.push('image-alt:' + Maleskine.MarkdownBlock.image.caption);
		styles.push('image:' + Maleskine.MarkdownBlock.image.url);
		if (Maleskine.MarkdownBlock.image.tag === '![]') {
			Object.keys(Maleskine.imageCaches).some(function (imgInfo) {
				imgInfo = Maleskine.imageCaches[imgInfo];
				if (imgInfo.local === Maleskine.MarkdownBlock.image.url || imgInfo.remote === Maleskine.MarkdownBlock.image.url) {
					styles.push('image-id:' + imgInfo.id);
					if (imgInfo.state === 0 || imgInfo.state === 1) {
						styles.push('image-status:2');
					}
					else if (imgInfo.state === 3) {
						styles.push('image-status:3');
					}
					else {
						styles.push('image-status:1');
					}
				}
			});
		}
		else {
			styles.push('image-status:1');
		}
	}
	Maleskine.getMarkdownHRule(bra, ket, mid, pro, post);
	if (Maleskine.MarkdownBlock.hrule.use) styles.push('hrule');

	Maleskine.getMarkdownBlockquote(bra, ket, mid, pro, post);
	if (Maleskine.MarkdownBlock.blockquote.use) styles.push('blockquote');
	Maleskine.getMarkdownHeader1(bra, ket, mid, pro, post);
	if (Maleskine.MarkdownBlock.header1.use) styles.push('h1');
	Maleskine.getMarkdownHeader2(bra, ket, mid, pro, post);
	if (Maleskine.MarkdownBlock.header2.use) styles.push('h2');
	Maleskine.getMarkdownHeader3(bra, ket, mid, pro, post);
	if (Maleskine.MarkdownBlock.header3.use) styles.push('h3');
	Maleskine.getMarkdownHeader4(bra, ket, mid, pro, post);
	if (Maleskine.MarkdownBlock.header4.use) styles.push('h4');
	Maleskine.getMarkdownHeader5(bra, ket, mid, pro, post);
	if (Maleskine.MarkdownBlock.header5.use) styles.push('h5');
	Maleskine.getMarkdownHeader6(bra, ket, mid, pro, post);
	if (Maleskine.MarkdownBlock.header6.use) styles.push('h6');

	}

	return styles;
};
Maleskine.getMarkdownWithHTMLTag = function (html_tag, style_name, bra, ket, mid, pro, post) {
	html_tag = html_tag.toLowerCase();
	var part;
	var reg = new RegExp('^(<\/?' + html_tag + '>)+', 'i');
	part = mid.match(reg);
	if (!!part) {
		bra = bra + part[0];
		mid = mid.substring(part[0].length, mid.length);
	}
	ket = mid + ket;

	var found = false, tag_found = 0, start = 0;
	// reg = new RegExp('<(\/?)' + html_tag + '[ >]', 'gi');
	reg = new RegExp('(<' + html_tag + '[ >]|<\/' + html_tag + '>|\/ ?>)', 'gi');
	bra.replace(reg, function (match, nouse, pos) {
		match = match.toLowerCase();
		if (match.indexOf('<' + html_tag) === 0) {
			tag_found ++;
		}
		else {
			tag_found --;
		}
		start = pos;
	});

	if (tag_found > 0) found = true;

	if (!found) {
		return;
	}

	var tail, end;
	found = false;
	ket.replace(reg, function (match, nouse, pos) {
		if (found) return;
		if (match.indexOf('<' + html_tag) === 0) {
			tag_found ++;
		}
		else {
			tag_found --;
		}
		if (tag_found === 0) {
			found = true;
			end = pos;
			tail = match.length;
		}
	});
	if (found) {
		end = bra.length + end + tail;
	}
	else {
		end = bra.length + ket.length;
	}
	Maleskine.MarkdownBlock._setStyle(style_name, start, end, '<' + html_tag + '>');
};
Maleskine.getMarkdownParagraphStyle = function (head, tail, style_name, tag, bra, ket, mid, pro, post) {
	var hasHead = false, hasTail = false, content = pro + mid + post, reg;

	if (head) {
		reg = content.match(head);
		if (reg) hasHead = true;
	}
	else {
		hasHead = true;
	}

	if (tail) {
		reg = content.match(tail);
		if (reg) hasTail = true;
	}
	else {
		hasTail = true;
	}

	if (hasHead && hasTail) {
		Maleskine.MarkdownBlock._setStyle(style_name, bra.length - pro.length, bra.length + mid.length + post.length, tag);
	}
};
Maleskine.getMarkdownLineStyle = function (head, tail, style_name, tag, bra, ket, mid, pro, post) {
	var pro_prime = pro.match(/(^|\n).*?$/), post_prime = post.match(/^.*?(\n|$)/);
	if (pro_prime) pro_prime = pro_prime[0].replace(pro_prime[1], '');
	else pro_prime = pro;
	if (post_prime) post_prime = post_prime[0].replace(post_prime[1], '');
	else post_prime = post;

	Maleskine.getMarkdownParagraphStyle(head, tail, style_name, tag, bra, ket, mid, pro_prime, post_prime);
};
Maleskine.getMarkdownBold = function (bra, ket, mid, pro, post) {
	var style_name = 'bold';
	Maleskine.getMarkdownBoldMD(bra, ket, mid, pro, post);
	Maleskine.getMarkdownWithHTMLTag('b', style_name, bra, ket, mid, pro, post);
	Maleskine.getMarkdownWithHTMLTag('strong', style_name, bra, ket, mid, pro, post);
};
Maleskine.getMarkdownBoldMD = function (bra, ket, mid, pro, post) {
	var part;
	part = mid.match(/^(\*|_)+/i);
	if (!!part) {
		pro = pro + part[0];
		bra = bra + part[0];
		mid = mid.substring(part[0].length, mid.length);
	}
	post = mid + post;

	var content = pro + post, match;
	content = content.replace(/ +$/, '');
	match = content.match(/^(\*{3,}|_{3,})$/);
	if (!!match) return;

	var found = false, star_found = false, slash_found = false, tag = '', start = 0;
	pro.replace(/(\\*)(\*\*|__)/gi, function (match, cancel, bold_tag, pos) {
		cancel = cancel.length;
		bold_tag = bold_tag.toLowerCase();
		if (bold_tag === '**') {
			if (cancel - Math.floor(cancel / 2) * 2 > 0) return;
			star_found = !star_found;
			tag = bold_tag;
		}
		else if (bold_tag === '__') {
			if (cancel - Math.floor(cancel / 2) * 2 > 0) return;
			if (pos > 0) {
				var prefix = pro.substring(pos - 1, pos);
				if (prefix.match(/\b/)) return;
			}
			slash_found = !slash_found;
			tag = bold_tag;
		}
		start = pos + cancel;
	});
	if (star_found) found = true;
	if (slash_found) found = true;

	if (!found) {
		return;
	}

	var reg, tail, end;
	if (tag === '**') {
		reg = /([^\\](?:\\\\)*)\*\*/;
		tail = 2;
	}
	else if (tag === '__') {
		reg = /([^\\](?:\\\\)*)__/;
		tail = 2;
	}
	found = false;
	post.replace(reg, function (match, other, pos) {
		if (found) return;
		found = true;
		end = pos + other.length;
	});
	if (found) {
		Maleskine.MarkdownBlock._setStyle('bold', bra.length - pro.length + start, bra.length + end + tail, tag);
	}
	else {
		Maleskine.MarkdownBlock._setStyle('bold', bra.length - pro.length + start, bra.length + post.length, tag);
	}
};
Maleskine.getMarkdownItalic = function (bra, ket, mid, pro, post) {
	var style_name = 'italic';
	Maleskine.getMarkdownItalicMD(bra, ket, mid, pro, post);
	Maleskine.getMarkdownWithHTMLTag('i', style_name, bra, ket, mid, pro, post);
	Maleskine.getMarkdownWithHTMLTag('em', style_name, bra, ket, mid, pro, post);
};
Maleskine.getMarkdownItalicMD = function (bra, ket, mid, pro, post) {
	var part;
	part = mid.match(/^(\*|_)+/i);
	if (!!part) {
		pro = pro + part[0];
		bra = bra + part[0];
		mid = mid.substring(part[0].length, mid.length);
	}
	post = mid + post;

	var content = pro + post, match;
	content = content.replace(/ +$/, '');
	match = content.match(/^(\*{3,}|_{3,})$/);
	if (!!match) return;

	var found = false, star_found = false, slash_found = false, tag = '', start = 0;
	pro.replace(/(\\*|\n\s*)(\*\*?|__?|<\/?i>|<\/?em>)( *)/gi, function (match, cancel, italic_tag, space, pos) {
		italic_tag = italic_tag.toLowerCase();
		var is_slash = (cancel.indexOf('\\') >= 0);
		cancel = cancel.length;
		var is_even = (cancel - Math.floor(cancel / 2) * 2 === 0);
		if (italic_tag === '**' || italic_tag === '__') {
			if (is_slash) {
				if (is_even) return;
				pos ++;
				italic_tag = italic_tag.substring(0, 1);
				if (italic_tag === '*') star_found = !star_found;
				else slash_found = !slash_found;
			}
			else {
				return;
			}
		}
		else if (italic_tag === '*') {
			if (is_slash) {
				if (!is_even) return;
			}
			else {
				if (space.length > 0) return;
			}
			star_found = !star_found;
		}
		else if (italic_tag === '_') {
			if (is_slash) {
				if (!is_even) return;
			}
			if (pos > 0) {
				var prefix = pro.substring(pos - 1, pos);
				if (prefix.match(/\b/)) return;
			}
			slash_found = !slash_found;
		}
		tag = italic_tag;
		start = pos + cancel;
	});
	if (star_found) found = true;
	if (slash_found) found = true;

	if (!found) {
		return;
	}

	var reg, tail, end;
	if (tag === '*') {
		reg = /([^\\](?:\\\\)*)\*(?:[^\*]|$)/;
		tail = 1;
	}
	else if (tag === '_') {
		reg = /([^\\](?:\\\\)*)_(?:[^_]|$)/;
		tail = 1;
	}
	found = false;
	post.replace(reg, function (match, other, pos) {
		if (found) return;
		found = true;
		end = pos + other.length;
	});
	if (found) {
		Maleskine.MarkdownBlock._setStyle('italic', bra.length - pro.length + start, bra.length + end + tail, tag);
	}
	else {
		Maleskine.MarkdownBlock._setStyle('italic', bra.length - pro.length + start, bra.length + post.length, tag);
	}
};
Maleskine.getMarkdownStrikethrough = function (bra, ket, mid, pro, post) {
	var style_name = 'strike';
	Maleskine.getMarkdownStrikethroughMD(bra, ket, mid, pro, post);
	Maleskine.getMarkdownWithHTMLTag('del', style_name, bra, ket, mid, pro, post);
	Maleskine.getMarkdownWithHTMLTag('strike', style_name, bra, ket, mid, pro, post);
};
Maleskine.getMarkdownStrikethroughMD = function (bra, ket, mid, pro, post) {
	var part;
	part = mid.match(/^~+/i);
	if (!!part) {
		pro = pro + part[0];
		bra = bra + part[0];
		mid = mid.substring(part[0].length, mid.length);
	}
	post = mid + post;

	var found = false, start = 0;
	pro.replace(/(\\*)~~/gi, function (match, cancel, pos) {
		cancel = cancel.length;
		if (cancel - Math.floor(cancel / 2) * 2 > 0) return;
		found = !found;
		start = pos + cancel;
	});

	if (!found) {
		return;
	}

	var reg = /([^\\](?:\\\\)*)~~/, tail = 2, end;
	found = false;
	post.replace(reg, function (match, other, pos) {
		if (found) return;
		found = true;
		end = pos + other.length;
	});
	if (found) {
		Maleskine.MarkdownBlock._setStyle('strike', bra.length - pro.length + start, bra.length + end + tail, '~~');
	}
	else {
		Maleskine.MarkdownBlock._setStyle('strike', bra.length - pro.length + start, bra.length + post.length, '~~');
	}
};
Maleskine.getMarkdownCode = function (bra, ket, mid, pro, post) {
	var style_name = 'code';
	Maleskine.getMarkdownCodeMD(bra, ket, mid, pro, post);
	Maleskine.getMarkdownWithHTMLTag('code', style_name, bra, ket, mid, pro, post);
};
Maleskine.getMarkdownCodeMD = function (bra, ket, mid, pro, post) {
	var part;
	part = mid.match(/^`+/i);
	if (!!part) {
		pro = pro + part[0];
		bra = bra + part[0];
		mid = mid.substring(part[0].length, mid.length);
	}
	post = mid + post;

	var found = false, start = 0;
	pro.replace(/(\\*)(`+)/gi, function (match, cancel, code_tag, pos) {
		cancel = cancel.length;
		code_tag = code_tag.toLowerCase();
		if (code_tag.length === 1) {
			if (cancel - Math.floor(cancel / 2) * 2 > 0) return;
			found = !found;
		}
		else {
			found = !found;
		}
		start = pos + cancel;
	});

	if (!found) {
		return;
	}

	var reg = /([^\\](?:\\\\)*)`/, tail = 1, end;
	found = false;
	post.replace(reg, function (match, other, pos) {
		if (found) return;
		found = true;
		end = pos + other.length;
	});
	if (found) {
		Maleskine.MarkdownBlock._setStyle('code', bra.length - pro.length + start, bra.length + end + tail, '`');
	}
	else {
		Maleskine.MarkdownBlock._setStyle('code', bra.length - pro.length + start, bra.length + post.length, '`');
	}
	return true;
};
Maleskine.getMarkdownUnder = function (bra, ket, mid, pro, post) {
	var style_name = 'under';
	Maleskine.getMarkdownWithHTMLTag('u', style_name, bra, ket, mid, pro, post);
};
Maleskine.getMarkdownSub = function (bra, ket, mid, pro, post) {
	var style_name = 'sub';
	Maleskine.getMarkdownWithHTMLTag('sub', style_name, bra, ket, mid, pro, post);
};
Maleskine.getMarkdownSup = function (bra, ket, mid, pro, post) {
	var style_name = 'sup';
	Maleskine.getMarkdownWithHTMLTag('sup', style_name, bra, ket, mid, pro, post);
};
Maleskine.getMarkdownBig = function (bra, ket, mid, pro, post) {
	var style_name = 'big';
	Maleskine.getMarkdownWithHTMLTag('big', style_name, bra, ket, mid, pro, post);
};
Maleskine.getMarkdownSmall = function (bra, ket, mid, pro, post) {
	var style_name = 'small';
	Maleskine.getMarkdownWithHTMLTag('small', style_name, bra, ket, mid, pro, post);
};
Maleskine.getMarkdownLinkAndImage = function (bra, ket, mid, pro, post) {
	var content = bra + mid + ket, link, caption;

	Maleskine.getMarkdownLinkAndImageMD(bra, ket, mid, pro, post);
	// HTML Link
	Maleskine.getMarkdownWithHTMLTag('a', 'link', bra, ket, mid, pro, post);
	if (Maleskine.MarkdownBlock.link.use && Maleskine.MarkdownBlock.link.tag === '<a>') {
		link = content.substring(Maleskine.MarkdownBlock.link.start, Maleskine.MarkdownBlock.link.end);
		caption = link.match(/ href=('|")(.*?)\1/i);
		if (!caption) {
			Maleskine.MarkdownBlock.link.url = '';
		}
		else {
			Maleskine.MarkdownBlock.link.url = caption[2];
		}
		caption = link.match(/>(.*?)<\/a>$/i);
		if (!caption) {
			Maleskine.MarkdownBlock.link.title = '';
		}
		else {
			Maleskine.MarkdownBlock.link.title = caption[1];
		}
	}
	// HTML Image
	Maleskine.getMarkdownWithHTMLTag('img', 'image', bra, ket, mid, pro, post);
	if (Maleskine.MarkdownBlock.image.use && Maleskine.MarkdownBlock.image.tag === '<img>') {
		link = content.substring(Maleskine.MarkdownBlock.image.start, Maleskine.MarkdownBlock.image.end);
		caption = link.match(/ src=('|")(.*?)\1/i);
		if (!caption) {
			Maleskine.MarkdownBlock.image.url = '';
		}
		else {
			Maleskine.MarkdownBlock.image.url = caption[2];
		}
		caption = link.match(/ alt=('|")(.*?)\1/i);
		if (!caption) {
			Maleskine.MarkdownBlock.image.caption = '';
		}
		else {
			Maleskine.MarkdownBlock.image.caption = caption[2];
		}
	}
};
Maleskine.getMarkdownLinkAndImageMD = function (bra, ket, mid, pro, post) {
	var part;
	var reg = /^[\[\(]+/;
	part = mid.match(reg);
	if (!!part) {
		pro = pro + part[0];
		bra = bra + part[0];
		mid = mid.substring(part[0].length, mid.length);
	}
	post = mid + post;

	var pair_ready = [], pair_almost = [], pair_blank = [], pair_round = [], pair_link = [], pair_image = [];
	var start = bra.length - pro.length, part_length = pro.length, len = pro.length - 1;
	pro.replace(/(\!?\[|\]\(|\)|\]|\()/g, function (match, nouse, pos) {
		if (match === '[') {
			pair_ready.push({
				type: 1,
				start: pos,
				mid: -1,
				end: -1
			});
		}
		else if (match === '![') {
			pair_ready.push({
				type: 2,
				start: pos,
				mid: -1,
				end: -1
			});
		}
		else if (match === ']') {
			nouse = pair_ready.pop();
			nouse.type = 0;
			nouse.end = pos;
			pair_blank.push(nouse);
		}
		else if (match === '](') {
			nouse = pair_ready.pop();
			nouse.mid = pos;
			pair_almost.push(nouse);
		}
		else if (match === '(') {
			pair_almost.push({
				type: 0,
				start: pos,
				mid: -1,
				end: -1
			});
		}
		else if (match === ')') {
			nouse = pair_almost.pop();
			nouse.end = pos;
			if (nouse.type === 0) {
				pair_round.push(nouse);
			}
			else if (nouse.type === 1) {
				pair_link.push(nouse);
			}
			else if (nouse.type === 2) {
				pair_image.push(nouse);
			}
		}
	});
	if (pair_ready.length === 0 && pair_almost.length === 0) {
		return;
	}

	var pair_selected = null, context = pro + post;

	// Check Inside Round Pair
	if (pair_almost.length > 0) {
		pair_selected = pair_almost.pop();
		while (pair_selected && pair_selected.type === 0) {
			pair_selected = pair_almost.pop();
		}
		if (!pair_selected) {
			return;
		}
	}
	if (!!pair_selected) {
		len = post.indexOf(')');
		if (len < 0) {
			return;
		}
		else {
			if (pair_selected.type === 1) {
				Maleskine.MarkdownBlock._setStyle('link', start + pair_selected.start, bra.length + len + 1, '[]');
				Maleskine.MarkdownBlock.link.mid = bra.length + pair_selected.mid + 1;
				Maleskine.MarkdownBlock.link.title = context.substring(pair_selected.start + 1, pair_selected.mid);
				Maleskine.MarkdownBlock.link.url = context.substring(pair_selected.mid + 2, part_length + len);
			}
			else {
				Maleskine.MarkdownBlock._setStyle('image', start + pair_selected.start, bra.length + len + 1, '![]');
				Maleskine.MarkdownBlock.image.mid = bra.length + pair_selected.mid + 1;
				Maleskine.MarkdownBlock.image.caption = context.substring(pair_selected.start + 2, pair_selected.mid);
				Maleskine.MarkdownBlock.image.url = context.substring(pair_selected.mid + 2, part_length + len);
			}
			return;
		}
	}

	// Inside Square Pair
	var found = false;
	post.replace(/(\!?\[|\]\(|\)|\]|\()/g, function (match, nouse, pos) {
		if (found) return;
		if (match === '[' || match === '![') {
			pair_ready.push({
				type: 0,
				start: pos,
				mid: -1,
				end: -1
			});
		}
		else if (match === ']') {
			nouse = pair_ready.pop();
			nouse.type = 0;
			nouse.end = pos;
			pair_blank.push(nouse);
		}
		else if (match === '](') {
			nouse = pair_ready.pop();
			nouse.mid = pos;
			pair_almost.push(nouse);
		}
		else if (match === '(') {
			pair_almost.push({
				type: 0,
				start: pos,
				mid: -1,
				end: -1
			});
		}
		else if (match === ')') {
			nouse = pair_almost.pop();
			nouse.end = pos;
			if (nouse.type === 0) {
				pair_round.push(nouse);
			}
			else if (nouse.type === 1) {
				pair_selected = nouse;
				found = true;
			}
			else if (nouse.type === 2) {
				pair_selected = nouse;
				found = true;
			}
		}
	});
	if (found) {
		if (pair_selected.type === 1) {
			Maleskine.MarkdownBlock._setStyle('link', start + pair_selected.start, bra.length + pair_selected.end + 1, '[]');
			Maleskine.MarkdownBlock.link.mid = bra.length + pair_selected.mid + 1;
			Maleskine.MarkdownBlock.link.title = context.substring(pair_selected.start + 1, part_length + pair_selected.mid);
			Maleskine.MarkdownBlock.link.url = context.substring(part_length + pair_selected.mid + 2, part_length + pair_selected.end);
		}
		else {
			Maleskine.MarkdownBlock._setStyle('image', start + pair_selected.start, bra.length + pair_selected.end + 1, '![]');
			Maleskine.MarkdownBlock.image.mid = bra.length + pair_selected.mid + 1;
			Maleskine.MarkdownBlock.image.caption = context.substring(pair_selected.start + 2, part_length + pair_selected.mid);
			Maleskine.MarkdownBlock.image.url = context.substring(part_length + pair_selected.mid + 2, part_length + pair_selected.end);
		}
		return;
	}
	else {
		return;
	}
};
Maleskine.getMarkdownHRule = function (bra, ket, mid, pro, post) {
	var style_name = 'hrule';

	var content = pro + mid + post, match;
	match = content.match(/^( *[-*_]){3,} *$/);
	if (match) {
		Maleskine.MarkdownBlock._setStyle(style_name, bra.length - pro.length, bra.length + mid.length + post.length, '----');
	}
};
Maleskine.getMarkdownCodeBlock = function (bra, ket, mid, pro, post) {
	var style_name = 'codeblock';
	Maleskine.getMarkdownCodeBlockMD(bra, ket, mid, pro, post); // /^ *(`{3,}|~{3,}) *(\S+)? *\n([\s\S]+?)\s*\1 *(?:\n+|$)/
	Maleskine.getMarkdownLineStyle(/^ {4,}[^\n(\* )(+ )(\- )(\d+\. )][^\n]+/, null, style_name, '    ', bra, ket, mid, pro, post);
	Maleskine.getMarkdownWithHTMLTag('pre', style_name, bra, ket, mid, pro, post);
};
Maleskine.getMarkdownCodeBlockMD = function (bra, ket, mid, pro, post) {
	var part;
	part = mid.match(/^[`~ \S\n]+/i);
	if (!!part) {
		bra = bra + part[0];
		mid = mid.substring(part[0].length, mid.length);
	}
	ket = mid + ket;

	var found = false, start = 0, tag, tag_char;
	bra.replace(/(^|\n)(`{3,}|~{3,}) *\S*? *\n/gi, function (match, head, code_tag, pos) {
		if (code_tag.indexOf('~') === 0) {
			if (!!match.replace(code_tag, '').match(/^\n{2,}/)) return;
		}
		head = head.length;
		found = !found;
		start = pos + head;
		tag = code_tag;
	});

	if (!found) {
		return;
	}

	var reg = new RegExp('(' + tag.substring(0, 1) + '{3,}) *(\\n|$)', ''), tail, end;
	found = false;
	ket.replace(reg, function (match, code_tag, nouse, pos) {
		if (found) return;
		found = true;
		end = pos;
		tail = code_tag.length;
	});
	if (found) {
		Maleskine.MarkdownBlock._setStyle('codeblock', start, bra.length + end + tail, tag);
	}
	else {
		Maleskine.MarkdownBlock._setStyle('codeblock', start, bra.length + ket.length, tag);
	}
	return true;
};
Maleskine.getMarkdownBlockquote = function (bra, ket, mid, pro, post) {
	var style_name = 'blockquote';
	var start = pro.lastIndexOf('\n>'), end;
	if (start < 0) {
		if (pro.substring(0, 1) === '>') start = 0;
	}
	else {
		start += 1;
	}
	if (start >= 0) {
		start += bra.length - pro.length;
		end = post.indexOf('\n\n');
		if (end < 0) {
			end = post.length;
		}
		end += bra.length + mid.length;
		Maleskine.MarkdownBlock._setStyle(style_name, start, end, '>');
	}
	Maleskine.getMarkdownWithHTMLTag('blockquote', style_name, bra, ket, mid, pro, post);
};
Maleskine.getMarkdownHeader1 = function (bra, ket, mid, pro, post) {
	var style_name = 'header1';
	Maleskine.getMarkdownLineStyle(/^#[^#]/, null, style_name, '#', bra, ket, mid, pro, post);
	Maleskine.getMarkdownParagraphStyle(null, /\n={4,}[ \t\r]*$/, style_name, '====', bra, ket, mid, pro, post);
	Maleskine.getMarkdownWithHTMLTag('h1', style_name, bra, ket, mid, pro, post);
};
Maleskine.getMarkdownHeader2 = function (bra, ket, mid, pro, post) {
	var style_name = 'header2';
	Maleskine.getMarkdownLineStyle(/^#{2}[^#]/, null, style_name, '##', bra, ket, mid, pro, post);
	Maleskine.getMarkdownParagraphStyle(null, /\n-{4,}[ \t\r]*$/, style_name, '----', bra, ket, mid, pro, post);
	Maleskine.getMarkdownWithHTMLTag('h2', style_name, bra, ket, mid, pro, post);
};
Maleskine.getMarkdownHeader3 = function (bra, ket, mid, pro, post) {
	var style_name = 'header3';
	Maleskine.getMarkdownLineStyle(/^#{3}[^#]/, null, style_name, '###', bra, ket, mid, pro, post);
	Maleskine.getMarkdownWithHTMLTag('h3', style_name, bra, ket, mid, pro, post);
};
Maleskine.getMarkdownHeader4 = function (bra, ket, mid, pro, post) {
	var style_name = 'header4';
	Maleskine.getMarkdownLineStyle(/^#{4}[^#]/, null, style_name, '####', bra, ket, mid, pro, post);
	Maleskine.getMarkdownWithHTMLTag('h4', style_name, bra, ket, mid, pro, post);
};
Maleskine.getMarkdownHeader5 = function (bra, ket, mid, pro, post) {
	var style_name = 'header5';
	Maleskine.getMarkdownLineStyle(/^#{5}[^#]/, null, style_name, '#####', bra, ket, mid, pro, post);
	Maleskine.getMarkdownWithHTMLTag('h5', style_name, bra, ket, mid, pro, post);
};
Maleskine.getMarkdownHeader6 = function (bra, ket, mid, pro, post) {
	var style_name = 'header6';
	Maleskine.getMarkdownLineStyle(/^#{6}[^#]/, null, style_name, '######', bra, ket, mid, pro, post);
	Maleskine.getMarkdownWithHTMLTag('h6', style_name, bra, ket, mid, pro, post);
};

Maleskine.selectMarkdownStyle = function (style) {
	var editor = Maleskine._contentMD[0];
	editor.selectionStart = style.start;
	editor.selectionEnd = style.end;
};
var selectCurrentParagraph = function (isLine) {
	var editor = Maleskine._contentMD[0];
	var content = editor.value;
	var part, start, end, offset;
	part = content.substring(0, editor.selectionStart);
	if (isLine) {
		part = part.lastIndexOf('\n');
		offset = 1;
	}
	else {
		part = part.lastIndexOf('\n\n');
		offset = 2;
	}
	if (part < 0) {
		start = 0;
	}
	else {
		start = part + offset;
	}
	part = content.substring(editor.selectionEnd, content.length);
	if (isLine) part = part.indexOf('\n');
	else part = part.indexOf('\n\n');
	if (part < 0) {
		end = content.length;
	}
	else {
		end = part + editor.selectionEnd;
	}
	editor.selectionStart = start;
	editor.selectionEnd = end;
	return content.substring(editor.selectionStart, editor.selectionEnd);
}
Maleskine.triggerMarkdownStyle = function (style, trigger, isSelectParagraph) {
	var editor = Maleskine._contentMD[0];
	if (style.use) {
		Maleskine.selectMarkdownStyle(style);
	}
	// Select Paragraph
	else {
		if (isSelectParagraph === 1) {
			selectCurrentParagraph();
		}
		else if (isSelectParagraph === 2) {
			selectCurrentParagraph(true);
		}
	}
	// End
	var content = editor.value, start = editor.selectionStart, selection = { start: 0, end: 0};
	content = content.substring(start, editor.selectionEnd);
	content = trigger(content, style, selection);
	// We can't insert HTML tag into textarea directly
	var parts;
	if (!content.match(/[<>]/)) {
		document.execCommand("insertHTML", false, content);
	}
	else {
		parts = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
		document.execCommand("insertHTML", false, parts);
	}
	// End
	editor.selectionStart = start + selection.start;
	editor.selectionEnd = start + selection.end;
};
var triggerBold = function (content, style, selection) {
	if (style.use) {
		if (style.tag === '**' || style.tag === '__') {
			content = content.replace(/^(\*\*|__)/, '').replace(/(\*\*|__)$/, '');
		}
		else if (style.tag === '<b>') {
			content = content.replace(/^<b.*?>/, '').replace(/<\/b.*?>$/i, '');
		}
		else if (style.tag === '<strong>') {
			content = content.replace(/^<strong.*?>/, '').replace(/<\/strong.*?>$/i, '');
		}
		selection.start = 0;
		selection.end = content.length;
	}
	else {
		selection.start = 2;
		selection.end = content.length + 2;
		content = '**' + content + '**';
	}
	return content;
}
Maleskine.triggerBold = function () {
	Maleskine.triggerMarkdownStyle(Maleskine.MarkdownBlock.bold, triggerBold);
};
var triggerItalic = function (content, style, selection) {
	if (style.use) {
		if (style.tag === '*' || style.tag === '_') {
			content = content.replace(/^(\*|_)/, '').replace(/(\*|_)$/, '');
		}
		else if (style.tag === '<i>') {
			content = content.replace(/^<i.*?>/, '').replace(/<\/i.*?>$/i, '');
		}
		else if (style.tag === '<em>') {
			content = content.replace(/^<em.*?>/, '').replace(/<\/em.*?>$/i, '');
		}
		selection.start = 0;
		selection.end = content.length;
	}
	else {
		selection.start = 1;
		selection.end = content.length + 1;
		content = '*' + content + '*';
	}
	return content;
}
Maleskine.triggerItalic = function () {
	Maleskine.triggerMarkdownStyle(Maleskine.MarkdownBlock.italic, triggerItalic);
};
var triggerStrike = function (content, style, selection) {
	if (style.use) {
		if (style.tag === '~~') {
			content = content.replace(/^~~/, '').replace(/~~$/, '');
		}
		else if (style.tag === '<del>') {
			content = content.replace(/^<del.*?>/, '').replace(/<\/del.*?>$/i, '');
		}
		else if (style.tag === '<strike>') {
			content = content.replace(/^<strike.*?>/, '').replace(/<\/strike.*?>$/i, '');
		}
		selection.start = 0;
		selection.end = content.length;
	}
	else {
		selection.start = 2;
		selection.end = content.length + 2;
		content = '~~' + content + '~~';
	}
	return content;
}
Maleskine.triggerStrike = function () {
	Maleskine.triggerMarkdownStyle(Maleskine.MarkdownBlock.strike, triggerStrike);
};
var triggerUnderline = function (content, style, selection) {
	if (style.use) {
		content = content.replace(/^<u.*?>/, '').replace(/<\/u.*?>$/i, '');
		selection.start = 0;
		selection.end = content.length;
	}
	else {
		selection.start = 3;
		selection.end = content.length + 3;
		content = '<u>' + content + '</u>';
	}
	return content;
}
Maleskine.triggerUnderline = function () {
	Maleskine.triggerMarkdownStyle(Maleskine.MarkdownBlock.under, triggerUnderline);
};
var triggerCode = function (content, style, selection) {
	if (style.use) {
		if (style.tag === '`') {
			content = content.replace(/^`/, '').replace(/`$/, '');
		}
		else if (style.tag === '<code>') {
			content = content.replace(/^<code.*?>/, '').replace(/<\/code.*?>$/i, '');
		}
		selection.start = 0;
		selection.end = content.length;
	}
	else {
		selection.start = 1;
		selection.end = content.length + 1;
		content = '`' + content + '`';
	}
	return content;
}
Maleskine.triggerCode = function () {
	Maleskine.triggerMarkdownStyle(Maleskine.MarkdownBlock.code, triggerCode);
};
var triggerSubscript = function (content, style, selection) {
	if (style.use) {
		content = content.replace(/^<sub.*?>/, '').replace(/<\/sub.*?>$/i, '');
		selection.start = 0;
		selection.end = content.length;
	}
	else {
		selection.start = 5;
		selection.end = content.length + 5;
		content = '<sub>' + content + '</sub>';
	}
	return content;
}
Maleskine.triggerSubscript = function () {
	Maleskine.triggerMarkdownStyle(Maleskine.MarkdownBlock.sub, triggerSubscript);
};
var triggerSuperscript = function (content, style, selection) {
	if (style.use) {
		content = content.replace(/^<sup.*?>/, '').replace(/<\/sup.*?>$/i, '');
		selection.start = 0;
		selection.end = content.length;
	}
	else {
		selection.start = 5;
		selection.end = content.length + 5;
		content = '<sup>' + content + '</sup>';
	}
	return content;
}
Maleskine.triggerSuperscript = function () {
	Maleskine.triggerMarkdownStyle(Maleskine.MarkdownBlock.sup, triggerSuperscript);
};
var triggerBig = function (content, style, selection) {
	if (style.use) {
		content = content.replace(/^<big.*?>/, '').replace(/<\/big.*?>$/i, '');
		selection.start = 0;
		selection.end = content.length;
	}
	else {
		selection.start = 5;
		selection.end = content.length + 5;
		content = '<big>' + content + '</big>';
	}
	return content;
}
Maleskine.triggerBig = function () {
	Maleskine.triggerMarkdownStyle(Maleskine.MarkdownBlock.big, triggerBig);
};
var triggerSmall = function (content, style, selection) {
	if (style.use) {
		content = content.replace(/^<small.*?>/, '').replace(/<\/small.*?>$/i, '');
		selection.start = 0;
		selection.end = content.length;
	}
	else {
		selection.start = 7;
		selection.end = content.length + 7;
		content = '<small>' + content + '</small>';
	}
	return content;
}
Maleskine.triggerSmall = function () {
	Maleskine.triggerMarkdownStyle(Maleskine.MarkdownBlock.small, triggerSmall);
};
var triggerHRule = function (content, style, selection) {
	if (style.use) {
		content = '';
	}
	else {
		var editor = Maleskine._contentMD[0];
		var context = editor.value;
		var part, i, len;
		content = '----\n';
		part = context.substring(0, editor.selectionStart);
		part = part.match(/\n*$/)[0].length;
		len = part;
		for (i = len; i < 2; i ++) {
			content = '\n' + content;
		}
		part = context.substring(editor.selectionEnd, context.length);
		part = part.match(/^\n*/)[0].length;
		len = part;
		for (i = len; i < 2; i ++) {
			content = content + '\n';
		}
		selection.start = content.indexOf('-');
		selection.end = selection.start + 4;
	}
	return content;
}
Maleskine.triggerHRule = function () {
	Maleskine.triggerMarkdownStyle(Maleskine.MarkdownBlock.hrule, triggerHRule);
	var editor = Maleskine._contentMD[0];
	if (editor.selectionStart !== editor.selectionEnd) {
		var context = editor.value.substring(editor.selectionStart, editor.selectionEnd);
		var start = editor.selectionStart;
		editor.selectionStart = start + context.indexOf('-');
		editor.selectionEnd = start + context.lastIndexOf('-') + 1;
	}
};
var triggerBlockquote = function (content, style, selection) {
	if (style.use) {
		if (style.tag === '>') {
			content = content.replace(/^>/, '');
		}
		else if (style.tag === '<blockquote>') {
			content = content.replace(/^<blockquote.*?>/, '').replace(/<\/blockquote.*?>$/i, '');
		}
		selection.start = 0;
		selection.end = content.length;
	}
	else {
		selection.start = 1;
		selection.end = content.length + 1;
		content = '>' + content;
	}
	return content;
}
Maleskine.triggerBlockquote = function () {
	var style = Maleskine.MarkdownBlock.blockquote;
	clearMarkdownParagraphStylesExcept(style);
	Maleskine.triggerMarkdownStyle(style, triggerBlockquote, 1);
};
var triggerHeader1 = function (content, style, selection) {
	if (style.use) {
		if (style.tag === '#') {
			content = content.replace(/^# */, '');
		}
		else if (style.tag === '====') {
			content = content.replace(/\n=+$/, '');
		}
		else if (style.tag === '<h1>') {
			content = content.replace(/^<h1.*?>/, '').replace(/<\/h1.*?>$/i, '');
		}
		selection.start = 0;
		selection.end = content.length;
	}
	else {
		selection.start = 2;
		selection.end = content.length + 2;
		content = '# ' + content;
	}
	return content;
}
var triggerHeader2 = function (content, style, selection) {
	if (style.use) {
		if (style.tag === '##') {
			content = content.replace(/^## */, '');
		}
		else if (style.tag === '----') {
			content = content.replace(/\n-+$/, '');
		}
		else if (style.tag === '<h2>') {
			content = content.replace(/^<h2.*?>/, '').replace(/<\/h2.*?>$/i, '');
		}
		selection.start = 0;
		selection.end = content.length;
	}
	else {
		selection.start = 3;
		selection.end = content.length + 3;
		content = '## ' + content;
	}
	return content;
}
var triggerHeader3 = function (content, style, selection) {
	if (style.use) {
		if (style.tag === '###') {
			content = content.replace(/^#{3} */, '');
		}
		else if (style.tag === '<h3>') {
			content = content.replace(/^<h3.*?>/, '').replace(/<\/h3.*?>$/i, '');
		}
		selection.start = 0;
		selection.end = content.length;
	}
	else {
		selection.start = 4;
		selection.end = content.length + 4;
		content = '### ' + content;
	}
	return content;
}
var triggerHeader4 = function (content, style, selection) {
	if (style.use) {
		if (style.tag === '####') {
			content = content.replace(/^#{4} */, '');
		}
		else if (style.tag === '<h4>') {
			content = content.replace(/^<h4.*?>/, '').replace(/<\/h4.*?>$/i, '');
		}
		selection.start = 0;
		selection.end = content.length;
	}
	else {
		selection.start = 5;
		selection.end = content.length + 5;
		content = '#### ' + content;
	}
	return content;
}
var triggerHeader5 = function (content, style, selection) {
	if (style.use) {
		if (style.tag === '#####') {
			content = content.replace(/^#{5} */, '');
		}
		else if (style.tag === '<h5>') {
			content = content.replace(/^<h5.*?>/, '').replace(/<\/h5.*?>$/i, '');
		}
		selection.start = 0;
		selection.end = content.length;
	}
	else {
		selection.start = 6;
		selection.end = content.length + 6;
		content = '##### ' + content;
	}
	return content;
}
var triggerHeader6 = function (content, style, selection) {
	if (style.use) {
		if (style.tag === '######') {
			content = content.replace(/^#{6} */, '');
		}
		else if (style.tag === '<h6>') {
			content = content.replace(/^<h6.*?>/, '').replace(/<\/h6.*?>$/i, '');
		}
		selection.start = 0;
		selection.end = content.length;
	}
	else {
		selection.start = 7;
		selection.end = content.length + 7;
		content = '###### ' + content;
	}
	return content;
}
Maleskine.triggerHeader = function (level) {
	var style;
	if (level === 1 || level === 'h1') {
		var style = Maleskine.MarkdownBlock.header1;
		clearMarkdownParagraphStylesExcept(style);
		Maleskine.triggerMarkdownStyle(style, triggerHeader1, 2);
	}
	else if (level === 2 || level === 'h2') {
		var style = Maleskine.MarkdownBlock.header2;
		clearMarkdownParagraphStylesExcept(style);
		Maleskine.triggerMarkdownStyle(style, triggerHeader2, 2);
	}
	else if (level === 3 || level === 'h3') {
		var style = Maleskine.MarkdownBlock.header3;
		clearMarkdownParagraphStylesExcept(style);
		Maleskine.triggerMarkdownStyle(style, triggerHeader3, 2);
	}
	else if (level === 4 || level === 'h4') {
		var style = Maleskine.MarkdownBlock.header4;
		clearMarkdownParagraphStylesExcept(style);
		Maleskine.triggerMarkdownStyle(style, triggerHeader4, 2);
	}
	else if (level === 5 || level === 'h5') {
		var style = Maleskine.MarkdownBlock.header5;
		clearMarkdownParagraphStylesExcept(style);
		Maleskine.triggerMarkdownStyle(style, triggerHeader5, 2);
	}
	else if (level === 6 || level === 'h6') {
		var style = Maleskine.MarkdownBlock.header6;
		clearMarkdownParagraphStylesExcept(style);
		Maleskine.triggerMarkdownStyle(style, triggerHeader6, 2);
	}
};
var clearMarkdownParagraphStylesExcept = function (except_style) {
	if (Maleskine.MarkdownBlock.blockquote !== except_style && Maleskine.MarkdownBlock.blockquote.use) Maleskine.triggerBlockquote();
	if (Maleskine.MarkdownBlock.header1 !== except_style && Maleskine.MarkdownBlock.header1.use) Maleskine.triggerHeader(1);
	if (Maleskine.MarkdownBlock.header2 !== except_style && Maleskine.MarkdownBlock.header2.use) Maleskine.triggerHeader(2);
	if (Maleskine.MarkdownBlock.header3 !== except_style && Maleskine.MarkdownBlock.header3.use) Maleskine.triggerHeader(3);
	if (Maleskine.MarkdownBlock.header4 !== except_style && Maleskine.MarkdownBlock.header4.use) Maleskine.triggerHeader(4);
	if (Maleskine.MarkdownBlock.header5 !== except_style && Maleskine.MarkdownBlock.header5.use) Maleskine.triggerHeader(5);
	if (Maleskine.MarkdownBlock.header6 !== except_style && Maleskine.MarkdownBlock.header6.use) Maleskine.triggerHeader(6);
}

// Video
var video_maker = function (url, width, height) {
	if (url.indexOf('../../') === 0) {
		if (url.indexOf('../../video?') === 0) {
			url = url.substring(12, url.length);
			if (url.indexOf('player=bilibili') === 0) {
				url = url.substring(16, url.length);
				fid = url.match(/fid=(\w+)\&/);
				if (!!fid) {
					url = url.substring(fid[0].length, url.length);
					fid = fid[1];
					if (url.substring(0, 4) === 'vid=') {
						url = url.substring(4, url.length);
						vid = url.match(/\/(\w+)\.mp4/);
						vid = !!vid ? vid[1] : fid;
						player = '<div class="video-player player">';
						player += '<video width="' + width + '" height="' + height + '" preload="auto" controls="true">';
						player += '<source src="' + url + '" type="video/mp4">';
						player += '<object type="application/x-shockwave-flash" data="http://static.hdslb.com/play.swf" class="flash" style="width:' + width + 'px; height:' + height + 'px;">';
						player += '<param name="bgcolor" value="#ffffff">';
						player += '<param name="allowfullscreeninteractive" value="true">';
						player += '<param name="allowfullscreen" value="true">';
						player += '<param name="quality" value="high">';
						player += '<param name="allowscriptaccess" value="always">';
						player += '<param name="wmode" value="direct">';
						player += '<param name="flashvars" value="cid=' + vid + '&aid=' + fid + '">';
						player += '</object>';
						player += '</video>';
						player += '</div>';
					}
				}
			}
		}
	}
	else {
		player = '<iframe class="player" src="' + url + '" height="' + height + '" width="' + width + '" frameborder=0 allowfullscreen style="width:' + width + 'px; height:' + height + 'px;"></iframe>'
	}
	if (!player) player = '<div class="video-placeholder">Let\'s Rock!</div>';
	return player;
};
var doesVideoURLAvailable = function (url) {
	if (url.indexOf('../../') === 0) return true;
	// check = /^https?:\/\/[\w\.]*?\.((?:youku|tudou|qq|bilibili)\.com|acfun\.tv)\//i;
	check = /^https?:\/\/[\w\.]*?\.(?:youku|tudou|qq|bilibili)\.com\//i;
	return !!(url.match(check));
};

// End

Maleskine.getWordage = function(no_send) {
	var content, wordage;

	if (isMarkdown) {
		content = Maleskine.getMarkdownContent();
		content = content.replace(Maleskine.RegEx.HTML_TAGS, ' ');
        // content = content.replace(Maleskine.RegEx.MARKDOWN.HEADERS, ' ');
        // content = content.replace(Maleskine.RegEx.MARKDOWN.BLOCKQUOTES, ' ');
        // content = content.replace(Maleskine.RegEx.MARKDOWN.HRULERS, '$2');
        content = content.replace(Maleskine.RegEx.MARKDOWN.LISTS, ' ');
        content = content.replace(Maleskine.RegEx.MARKDOWN.EMPHASIS, '$2');
        content = content.replace(Maleskine.RegEx.MARKDOWN.IMAGES, '$1 ');
        content = content.replace(Maleskine.RegEx.MARKDOWN.LINKS, '$1 ');
        // content = content.replace(Maleskine.RegEx.MARKDOWN.COPYRIGHT, ' ');
        content = content.replace(Maleskine.RegEx.MARKDOWN.QUICK_LINKS, '$1 ');
        content = content.replace(Maleskine.RegEx.MARKDOWN.ADDITION_URL, '');
		content = content.match(Maleskine.RegEx.WORDS);
		if (content) {
			wordage = content.length;
		}
		else {
			wordage = 0;
		}
	}
	else {
		content = Maleskine.getRichtextContent().replace(/\s+/, ' ');
		wordage = content.length;
		if (wordage > 0) {
			content = content.replace(Maleskine.RegEx.HTML_TAGS, ' ');
			content = content.replace(Maleskine.RegEx.ADDITIONAL_HTML_TAG, ' ');
			content = content.replace(Maleskine.RegEx.SYMBOLS, ' ');
			content = content.match(Maleskine.RegEx.WORDS);
			if (content) {
				wordage = content.length;
			}
			else {
				wordage = 0;
			}
		}
	}

	if (ZSSEditor.isAndroid && !no_send) {
		AndroidDelegate.onGetWordage(wordage);
	}
	return wordage;
};
Maleskine.getImageStates = function () {
	var content = Maleskine.content();
	var result = {loaded: [], loading: [], failed: []};
	var images;

	if (isMarkdown) {
		content = content.val();
		images = {loaded: [], loading: [], failed: [], map: {}};
		Object.keys(Maleskine.imageCaches).map(function (id) {
			var info = Maleskine.imageCaches[id];
			if (info.state === 2) {
				images.loaded.push(info.remote);
			}
			else if (info.state === 3) {
				images.failed.push(info.local);
				images.map[info.local] = id;
			}
			else {
				images.loading.push(info.local);
				images.map[info.local] = id;
			}
		});

		content = content.replace(/!\[.*?\]\((.*?)\)/gmi, function (match, url) {
			if (images.loading.indexOf(url) >= 0) {
				result.loading.push(images.map[url]);
			}
			else if (images.failed.indexOf(url) >= 0) {
				result.failed.push(images.map[url]);
			}
			else {
				result.loaded.push(url);
			}
			return match;
		});
	}
	else {
		images = content.find('img');
		images.each(function (index, img) {
			var url = img.getAttribute('data-original-src');
			if (!url) url = img.src;
			var id = img.getAttribute('name');
			if (!id) id = url;


			if (img.classList.contains('failed')) {
				result.failed.push(id);
			}
			else if (img.classList.contains('uploading')) {
				result.loading.push(id);
			}
			else {
				result.loaded.push(url);
			}
		});
	}


	if (ZSSEditor.isAndroid) {
		AndroidDelegate.onGetImageStatus(JSON.stringify(result.loaded), JSON.stringify(result.loading), JSON.stringify(result.failed));
	}

	return JSON.stringify(result);
};

Maleskine.setTitle = function (title) {
	var node = Maleskine.title();
	node.text(title);
	ZSSField.prototype.handleInputEventForTitle();
};
Maleskine.getTitle = function () {
	var title = Maleskine.title().text().trim();
	if (ZSSEditor.isAndroid) AndroidDelegate.getTitle(title);
	return title;
};
Maleskine.setContent = function (content) {
	var node = Maleskine.content();

	if (isMarkdown) {
		node.val(content);
		node.height(node[0].scrollHeight + 100);
		$('#zss_field_content').attr('contenteditable', false);
	}
	else {
		node.html(content + '<p><br></p>');

		// For iOS line-height bug.
		// ContentEditable for deletion
		node.find('.image-package').each(function (index, pack) {
			pack = $(pack);
			pack.attr('contenteditable', false);
			var caption = pack.find('.image-caption');
			var input = $('<input class="image-caption-input">');
			var title = caption.text().trim();
			caption.attr('contenteditable', false);
			input.val(title);
			caption.after(input);
		});
		// End

		// For Video-Package
		var width = $(window).width() - 52; // 52 is the padding
		if (width > 480) width = 480;
		else width = Math.round(width);
		var height = Math.round(width / 6 * 5); // 5/6 is the ratio
		node.find('.video-package').each(function (indexk, pack) {
			pack = $(pack).attr('contenteditable', false);
			var description = pack.find('div.video-description');
			var input = $('<input class="video-description-input">');
			var title = description.text().trim();
			description.attr('contenteditable', false);
			input.val(title);
			description.after(input);
			var url = pack.attr('data-video-url');
			if (!(url && doesVideoURLAvailable(url))) {
				pack.remove();
				return;
			}
			var player = $(video_maker(url, width, height));
			$(pack.children()[0]).before(player);
		});
		// End

		node.attr('contenteditable', true);
	}

	// Update Content Placeholder
	Maleskine.updateContentPlaceholder();

	// Update Wordage
	var wordage = Maleskine.getWordage(true);
	Maleskine.wordageUI.html('共 ' + wordage + ' 字');
};
Maleskine.getContent = function () {
	if (isMarkdown) {
		return Maleskine.getMarkdownContent();
	}
	else {
		return Maleskine.getRichtextContent();
	}
};
Maleskine.getRichtextContent = function () {
	var content = Maleskine.content().html();
	var container = Maleskine._container;
	container.html(content);
	// Normalize Image Packages
	container.find('.image-package').each(function (index, pack) {
		pack = $(pack);
		pack.attr('class', 'image-package').removeAttr('contenteditable').removeAttr('id');
		var img = pack.find('img');
		var src = img.attr('data-src') || '';
		if (src.length < 1) {
			src = img.attr('src') || '';
		}
		if (src.length == 0) { // Remove if no image.
			pack.remove();
		}
		else { // Create clean image-package.
			var caption = pack.find('.image-caption').text().replace(/\n/g, '').trim();
			pack.html('<img src="' + src + '"><br><div class="image-caption">' + caption + '</div>');
		}
	});
	// For Video-Package
	container.find('.video-package').each(function (index, pack) {
		pack = $(pack).removeAttr('contenteditable');
		var url = pack.attr('data-video-url');
		if (url && doesVideoURLAvailable(url)) {
			pack.find('.player').remove();
			pack.find('div').each(function (i, div) {
				div = $(div);
				if (i === 0) {
					div.addClass('video-description');
					div.removeAttr('contenteditable');
				}
				else {
					div.remove();
				}
			});
		}
		else {
			pack.remove();
		}
	});
	// Remove Class of Paragraph
	container.find('p').each(function (index, link) {
		link = $(link);
		link.removeAttr('class').removeAttr('style');
	});
	// Normalize Links
	container.find('a').each(function (index, link) {
		link = $(link);
		link.attr('target', '_blank').removeAttr('style').removeAttr('class');
	});
	// Remove custom styles
	container.find(Maleskine.RegEx.ALLOWTAGS.join(', ')).each(function (index, target) {
		target = $(target);
		target.removeAttr('style');
		if (target[0].nodeName.toLowerCase() !== 'div') target.removeAttr('class');
	});
	content = container.html();
	container.html('');
	// Remove Invalid Tags
	content = content.replace(/<(\/?)(.*?)>/gi, function (match, isEnd, tag) {
		tag = tag.trim();
		if (tag.indexOf(' ') > 0) tag = tag.split(' ')[0]
		tag = tag.toLowerCase();
		if (Maleskine.RegEx.ALLOWTAGS.indexOf(tag) < 0) {
			return '';
		}
		return match;
	});
	// Remove Empty Lines in Head or Tail
	content = content.replace(/^\s*(<p>(\s|<br\/?>)*<\/p>\s*)*/i, '').replace(/\s*(<p>(\s|<br\/?>)*<\/p>\s*)*$/i, '');
	content = content.replace(/&nbsp;/g, ' ').trim().replace(/  /g, ' &nbsp;').trim().replace(/&amp;/g, '&');

	// Remove Emoji
	content = content.replace(Maleskine.RegEx.EMOJI, '');

	if (ZSSEditor.isAndroid) AndroidDelegate.getContent(content);
	return content;
};
Maleskine.getMarkdownContent = function () {
	var content = Maleskine.content().val();

	// Remove Emoji
	content = content.replace(Maleskine.RegEx.EMOJI, '');

	if (ZSSEditor.isAndroid) AndroidDelegate.getContent(content);
	return content;
};

Maleskine.setRichTextMode = function () {
	if (!isMarkdown) return;
	Maleskine.content().val('');
	Maleskine.content().height(0);
	isMarkdown = false;
	$(document.body).removeClass('markdown_mode').removeClass('preview_mode');
	$('#zss_field_title').attr('contenteditable', true);
	$('#zss_field_content').attr('contenteditable', true);
	Maleskine.content().html('');
	isPreview = false;
};
Maleskine.setMarkdownMode = function () {
	if (isMarkdown) return;
	Maleskine.content().html('');
	isMarkdown = true;
	$(document.body).addClass('markdown_mode').removeClass('preview_mode');
	$('#zss_field_title').attr('contenteditable', true);
	$('#zss_field_content').attr('contenteditable', false);
	Maleskine.content().val('');
	Maleskine.content().height(0);
	isPreview = false;
};
Maleskine.enterPreviewMode = function () {
	if (isPreview) return;
	$(document.body).addClass('preview_mode');
	$('#zss_field_title').attr('contenteditable', false);
	$('#zss_field_content').attr('contenteditable', false);
	if (isMarkdown) {
		var content = Maleskine.getMarkdownContent();
		Object.keys(Maleskine.imageCaches).map(function (imageInfo) {
			imageInfo = Maleskine.imageCaches[imageInfo];
			var localURL = imageInfo.local;
			var remoteURL = imageInfo.remote;
			var displayURL = imageInfo.display;
			if (remoteURL.length < 1 || displayURL.length < 1) return;
			localURL = '(' + localURL + ')';
			remoteURL = '(' + remoteURL + ')';
			displayURL = '(' + displayURL + ')';
			var found;
			if (remoteURL !== localURL) {
				found = content.indexOf(remoteURL);
				while (found >= 0) {
					content = content.replace(remoteURL, localURL);
					found = content.indexOf(remoteURL);
				}
			}
			if (displayURL !== localURL) {
				found = content.indexOf(displayURL);
				while (found >= 0) {
					content = content.replace(displayURL, localURL);
					found = content.indexOf(displayURL);
				}
			}
		});
		$('#zss_field_content').html(tamarked(content));
	}
	isPreview = true;
};
Maleskine.exitPreviewMode = function () {
	if (!isPreview) return;
	$(document.body).removeClass('preview_mode');
	$('#zss_field_title').attr('contenteditable', true);
	if (isMarkdown) {
		$('#zss_field_content').html('');
	}
	else {
		$('#zss_field_content').attr('contenteditable', true);
	}
	isPreview = false;
};

Maleskine.setEditorAsNightMode = function () {
	document.querySelector('html').classList.add('reader-night-mode');
};
Maleskine.setEditorAsDayMode = function () {
	document.querySelector('html').classList.remove('reader-night-mode');
};
Maleskine.showWordage = function () {
	ZSSEditor.eventListeners.showWordage = true;
	Maleskine.wordageUI.show();
	Maleskine.title().css({'margin-top':'18px'});
};
Maleskine.hideWordage = function () {
	ZSSEditor.eventListeners.showWordage = false;
	Maleskine.wordageUI.hide();
	Maleskine.title().css({'margin-top':'0px'});
};

Maleskine.wordageUI = $('<div class="wordage">共 0 字</dvi>');
Maleskine.wordageRequestShow = null;
Maleskine.wordageRequestSend = null;
Maleskine.wordageRequestInterval = 500;
Maleskine.wordageRequestTaskShow = function () {
	var wordage = Maleskine.getWordage(true);
	Maleskine.wordageUI.html('共 ' + wordage + ' 字');
	Maleskine.wordageUI.addClass('show');
};
Maleskine.updateContentPlaceholder = function () {
	// 设置内容的输入提示
	var content = '', reg = /^[ \n\t\r]*|[ \n\t\r]*$/g;
	var multiLine = false;
	if (isMarkdown) {
		content = Maleskine.content().val();
		multiLine = !!content.match(/\n/);
		content = content.replace(reg, '');
	}
	else {
		content = Maleskine.content().html();
		multiLine = !!content.match(/<hr/);
		if (!multiLine) {
			multiLine = content.match(/<p[ >]/g);
			if (multiLine) {
				multiLine = multiLine.length > 1;
			}
			else {
				multiLine = false;
			}
		}
		content = Maleskine.content().text().replace(reg, '');
	}
	if (content.length === 0 && !multiLine) {
		Maleskine._contentResizer.html(ZSSEditor.contentPlaceholder);
		Maleskine._contentResizer[0].style.visibility = 'visible';
	}
	else {
		Maleskine._contentResizer.html('');
		Maleskine._contentResizer[0].style.visibility = 'hidden';
	}
}
Maleskine.onContentChanged = function () {
	Maleskine.updateContentPlaceholder();
	if (!ZSSEditor.eventListeners.sendWordage && !ZSSEditor.eventListeners.showWordage) return;
	if (ZSSEditor.eventListeners.sendWordage) {
		if (Maleskine.wordageRequestSend) clearTimeout(Maleskine.wordageRequestSend);
		Maleskine.wordageRequestSend = setTimeout(Maleskine.getWordage, Maleskine.wordageRequestInterval);
	}
	if (ZSSEditor.eventListeners.showWordage) {
		if (Maleskine.wordageRequestShow) clearTimeout(Maleskine.wordageRequestShow);
		Maleskine.wordageRequestShow = setTimeout(Maleskine.wordageRequestTaskShow, Maleskine.wordageRequestInterval);
	}
};

// For Android 4.4 Bug: KeyCode in KeyDown and KeyUp is always 0 in WebView
Maleskine.getAndroidEnter = function () {
	var selection = getSelection();
	if (selection.rangeCount === 0) return;
	var range = selection.getRangeAt(0);
	var target = range.commonAncestorContainer;
	if (!target.nodeName || (target.nodeName === '#text')) {
		target = target.parentElement;
	}
	// 如果在标题中
	var children, node;
	if (Maleskine._title.is(target)) {
		selection.selectAllChildren(Maleskine._title[0]);
		document.execCommand('insertHTML', false, Maleskine._title.text().replace(/^\s+|\s+$/g, ''));
		if (isMarkdown) {
			Maleskine.content().focus();
		}
		else {
			children = Maleskine.content().children();
			node = $(children[0]);
			if (node.is('.image-package')) {
				node = node.find('.image-caption-input');
			}
			else if (node.is('.video-package')) {
				node = node.find('.video-description');
			}
			node = node[0];
			children = node.childNodes[0];
			if (children) node = children;
			range.setStart(node, 0);
			range.setEnd(node, 0);
			selection.removeAllRanges();
			selection.addRange(range);
		}
	}
	// 如果在body上
	else if (target === document.body) {
		// document.execCommand('undo', false, null);
		if (isMarkdown) {
			Maleskine.content().focus();
		}
		else {
			children = Maleskine.content().children();
			node = $(children[0]);
			if (node.is('.image-package')) {
				node = node.find('.image-caption-input');
			}
			else if (node.is('.video-package')) {
				node = node.find('.video-description');
			}
			node.focus();
		}
	}
	// 判断是否在图片标题中
	else {
		target = range.startContainer.childNodes[range.startOffset];
		if (!target || !target.nodeName) return;
		if (target.nodeName.toLowerCase() === 'input' && (target.classList.contains('image-caption-input') || target.classList.contains('video-description-input'))) {
			target = $(target).parents('.image-package');
			if (target.length === 0) target = $(target).parents('.video-package');
			var elem = target.next();
			if (elem.length > 0 && !(elem[0].classList.contains('image-package') || elem[0].classList.contains('video-package'))) {
				range.setStart(elem[0], 0);
				range.setEnd(elem[0], 0);
				ZSSEditor.currentSelection.setRange(range);
			}
			else {
				target = target[0];
				range.setStartAfter(target);
				range.setEndAfter(target);
				ZSSEditor.currentSelection.setRange(range);
				elem = $("<p>&nbsp;</p>")[0];
				range.insertNode(elem);
				range.selectNodeContents(elem);
				ZSSEditor.currentSelection.setRange(range);
				ZSSEditor.insertHTML('');
			}
		}
	}
};
// For Android Bug: Can't get or change content in paste directly in JS
Maleskine.getPaste = function (content) {
	content = content.replace(Maleskine.RegEx.EMOJI, ''); // Remove all EMOJIs
	if (!isMarkdown) {
		content = content.split('\n');
		var node = content.shift();
		document.execCommand('insertHTML', false, node);
		content.map(function (node) {
			if (node.length < 1) node = '<br>';
			document.execCommand('insertHTML', false, hiddenChar + '<p>' + node + '</p>');
		});
		ZSSEditor.sendEnabledStyles();
	}
	else {
		ZSSEditor.insertHTML(content);
	}

	if (ZSSEditor.eventListeners.input) {
		var joinedArguments = ZSSEditor.getJoinedFocusedFieldIdAndCaretArguments();
		ZSSEditor.callback("callback-input", joinedArguments);
		Maleskine.onContentChanged();
	}
};

// End

//TEST
Maleskine.isMarkdown = function () {
	return isMarkdown;
};

Maleskine.RegEx = {
	HTML_TAGS: /<\/?(a|abbr|address|area|article|aside|audio|b|base|bdi|bdo|blockquote|body|br|button|canvas|caption|cite|code|col|colgroup|command|data|datagrid|datalist|dd|del|details|dfn|div|dl|dt|em|embed|eventsource|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hgroup|hr|html|i|iframe|img|input|ins|kbd|font|keygen|label|legend|li|link|mark|map|menu|meta|meter|nav|noscript|object|ol|optgroup|option|output|p|param|pre|progress|q|ruby|rp|rt|s|samp|script|section|select|small|source|span|strong|style|sub|summary|sup|table|tbody|td|textarea|tfoot|th|thead|time|title|tr|track|u|ul|var|video|wbr).*?\/?>/gmi,

	MARKDOWN: {
		HEADERS: /(^#+)|(^[-=]+$)/mg,
		EMPHASIS: /(\*+|_+|~+|`)(.+?)(\1)/mg,
		BLOCKQUOTES: /^\s*(>+|`{3,})\s*/mg,
		LISTS: /^\s*(-|\*|\+|\d+\.)\s+/mg,
		HRULERS: /^(\*\s{0,3}\*\s{0,3}\*|-\s{0,3}-\s{0,3}-|_\s{0,3}_\s{0,3}_)[\s\*]*$/mg,
		IMAGES: /!\[(.*?)\](\(.*?\)| *\[.*?\])/mg,
		LINKS: /\[(.*?)\](\(.*?\)| *\[.*?\])/mg,
		QUICK_LINKS: /<(.*)>/mg,
		COPYRIGHT: /&copy;/ig,
		ADDITION_URL: /^\s*\[.*?\]:.*$/mg,
	},

	SYMBOLS: /[\?,\.;:'"`!=\+\*\\\/_~<>\(\)\[\]\{\}\|@#\$\%\^\&－＋＝—？！／、《》【】｛｝（）×｀～＠＃￥％…＆&｜“”‘’；：，。·〈〉〖〗［］「」『』　]/g,

	WORDS: /(\w+\s*|[\u4e00-\u9fa5])/g,

	ADDITIONAL_HTML_TAG: /(&nbsp;|&copy;)+/g,

	EMAIL: /^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/,

	// AVAILABLE_VIDEO_URL: /^https?:\/\/[\w\.]*?\.((?:youku|tudou|qq|bilibili)\.com|acfun\.tv)\//i,
	AVAILABLE_VIDEO_URL: /^https?:\/\/[\w\.]*?\.((?:youku|tudou|bilibili)\.com|acfun\.tv)\//i,

	ALLOWTAGS: ['blockquote', 'pre', 'code', 'p', 'div', 'ul', 'ol', 'li', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'a', 'b', 'i', 'u', 'del', 'strike', 'strong', 'em'],

	EMOJI: /([\ud83c\ud83d].|[\ue001-\ue536].|[\udde6-\uddff].|.\u20e3|[\u203c\u2049\u2122\u2139\u2194-\u21AA\u231A\u231B\u23E9-\u23F3\u25AA-\u261D\u263A\u2648-\u267F\u2693-\u26FD\u2934\u2935\u2B05-\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299])/g,
};