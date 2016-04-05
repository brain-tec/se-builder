/**
 * Data structure describing a Selenium 1/2 locator. The "values" property maps different ways of
 * locating an element to the values used to do so. (For example, mapping
 * builder.locator.methods.id to "searchField".) The "preferredMethod" property specifies which
 * method should be used.
 */

builder.locator = {};

/**
 * Available types of locator, to be used as keys. Use eg builder.locator.methods.xpath to refer to
 * the idea of an xpath locator.
 */
builder.locator.methods = {
  id:         {toString: function() { return "id"; }},
  name:       {toString: function() { return "name"; }},
  link:       {toString: function() { return "link"; }},
  css:        {toString: function() { return "css"; }},
  xpath:      {toString: function() { return "xpath"; }},
  dom:        {toString: function() { return "dom"; }},
  identifier: {toString: function() { return "identifier"; }},
  openerp70:  {toString: function() { return "openerp70"; }}
};

builder.locator.methods.id[builder.selenium1] = "id";
builder.locator.methods.id[builder.selenium2] = "id";
builder.locator.methods.name[builder.selenium1] = "name";
builder.locator.methods.name[builder.selenium2] = "name";
builder.locator.methods.link[builder.selenium1] = "link";
builder.locator.methods.link[builder.selenium2] = "link text";
builder.locator.methods.css[builder.selenium1] = "css";
builder.locator.methods.css[builder.selenium2] = "css selector";
builder.locator.methods.xpath[builder.selenium1] = "xpath";
builder.locator.methods.xpath[builder.selenium2] = "xpath";
builder.locator.methods.dom[builder.selenium1] = "dom";
builder.locator.methods.identifier[builder.selenium1] = "identifier";
builder.locator.methods.openerp70[builder.selenium2] = "openerp70";

builder.locator.methodForName = function(seleniumVersion, name) {
  for (var k in builder.locator.methods) {
    if (builder.locator.methods[k][seleniumVersion] === name) {
      return builder.locator.methods[k];
    }
  }
  return null;
};

/**
 * @param The preferred location method (one of builder.locator.methods).
 * @param Map of locator methods to appropriate values.
 */
builder.locator.Locator = function(preferredMethod, preferredAlternative, values) {
  this.preferredMethod = preferredMethod;
  this.preferredAlternative = preferredAlternative || 0;
  this.values = values || {};
  this.__originalElement = null;
};

builder.locator.Locator.prototype = {
  /** @return Name of the locator's preferred location method for the given version. */
  getName: function(selVersion) { return this.preferredMethod[selVersion]; },
  /** @return Value of the preferred method. */
  getValue: function()    {
    if (this.values[this.preferredMethod]) {
      if (this.preferredAlternative >= this.values[this.preferredMethod].length) {
        return "";
      }
      return this.values[this.preferredMethod][this.preferredAlternative] || "";
    } else {
      return "";
    }
  },
  /** @return The same locator with the given preferred method. */
  withPreferredMethod: function(preferredMethod, preferredAlternative) {
    var l2 = new builder.locator.Locator(preferredMethod, preferredAlternative || 0);
    for (var t in this.values) { l2.values[t] = this.values[t].slice(0); }
  },
  /** @return Whether the locator has a value for the given locator method. */
  supportsMethod: function(method) {
    if (this.values[method] && this.values[method].length > 0) { return true; } else { return false; }
  },
  /** @return Get the value for the given method. */
  getValueForMethod: function(method, alternative) {
    alternative = alternative || 0;
    if (this.values[method]) {
      if (alternative >= this.values[method].length) {
        return "";
      }
      return this.values[method][alternative] || "";
    } else {
      return "";
    }
  },
  /** @return Whether the given locator has the same preferred method with the same value. */
  probablyHasSameTarget: function(l2) {
    if (this.__originalElement && l2.__originalElement) {
      return this.__originalElement == l2.__originalElement;
    }
    return this.preferredMethod === l2.preferredMethod && this.getValue() === l2.getValue();
  }
};

builder.locator.empty = function() {
  return new builder.locator.Locator(builder.locator.methods.id);
};

builder.locator.getNodeNbr = function(current) {
  var childNodes = current.parentNode.childNodes;
  var total = 0;
  var index = -1;
  for (var i = 0; i < childNodes.length; i++) {
    var child = childNodes[i];
    if (child.nodeName == current.nodeName) {
      if (child == current) {
        index = total;
      }
      total++;
    }
  }
  return index;
};

builder.locator.prevHighlightMethod = null;
builder.locator.prevHighlightValue = null;
builder.locator.prevHighlightOriginalStyle = null;

builder.locator.deHighlight = function(callback) {
  if (!builder.locator.prevHighlightMethod) { callback(); return; }
  if (builder.getScript().seleniumVersion == builder.selenium1) {
    var win = window.bridge.getRecordingWindow();
    var node = new MozillaBrowserBot(win).findElementBy(builder.locator.prevHighlightMethod[builder.selenium1], builder.locator.prevHighlightValue, win.document, win);
    if (node) {
      node.style.border = builder.locator.prevHighlightOriginalStyle;
    }
    builder.locator.prevHighlightMethod = null;
    callback();
  } else {
    function done() {
      builder.selenium2.playback.shutdown();
      builder.locator.prevHighlightMethod = null;
      callback();
    }
    builder.selenium2.playback.startSession(function() {
      builder.selenium2.playback.execute('findElement', {using: builder.locator.prevHighlightMethod[builder.selenium2], value: builder.locator.prevHighlightValue}, function(result) {
        builder.selenium2.playback.execute('executeScript', { 'script': "arguments[0].setAttribute('style', '" + builder.locator.prevHighlightOriginalStyle + "');", 'args': [result.value] }, done, done);
      }, done);
    });
  }
};

builder.locator.highlight = function(method, value) {
  bridge.focusRecordingTab();
  builder.locator.deHighlight(function() {
    builder.locator.prevHighlightMethod = method;
    builder.locator.prevHighlightValue = value;
    if (builder.getScript().seleniumVersion == builder.selenium1) {
      var win = window.bridge.getRecordingWindow();
      var node = new MozillaBrowserBot(win).findElementBy(method[builder.selenium1], value, win.document, win);
      if (node) {
        builder.locator.prevHighlightOriginalStyle = node.style.border;
        node.style.border = "2px solid red";
      }
    } else {
      builder.selenium2.playback.startSession(function() {
        builder.selenium2.playback.execute('findElement', {using: method[builder.selenium2], value: value}, function(result) {
          builder.selenium2.playback.execute('getElementAttribute', {id: result.value.ELEMENT, name: 'style'}, function(result2) {
            builder.locator.prevHighlightOriginalStyle = result2.value;
            builder.selenium2.playback.execute('executeScript', { 'script': "arguments[0].setAttribute('style', 'border: 2px solid red;');", 'args': [result.value] }, builder.selenium2.playback.shutdown(), builder.selenium2.playback.shutdown);
          }, builder.selenium2.playback.shutdown);
        }, builder.selenium2.playback.shutdown);
      });
    }
  });
};

builder.locator.getCSSSubPath = function(e) {
  var css_attributes = ['id', 'name', 'class', 'type', 'alt', 'title', 'value'];
  for (var i = 0; i < css_attributes.length; i++) {
    var attr = css_attributes[i];
    var value = e.getAttribute(attr);
    if (value) {
      if (attr == 'id')
        return '#' + value;
      if (attr == 'class')
        return e.nodeName.toLowerCase() + '.' + value.replace(" ", ".").replace("..", ".");
      return e.nodeName.toLowerCase() + '[' + attr + '="' + value + '"]';
    }
  }
  if (builder.locator.getNodeNbr(e)) {
    return e.nodeName.toLowerCase() + ':nth-of-type(' + builder.locator.getNodeNbr(e) + ')';
  } else {
    return e.nodeName.toLowerCase();
  }
};

function mainMenu(element){
	return "MainMenu('" + jQuery.trim(jQuery(element).attr('data-menu')) + "')";
}

function secondaryMenu(element){

	level = 0;

	try {
		level = jQuery(element).parents().filter('.oe_secondary_submenu').length;

	}catch(e){
		if(!e instanceof NSNullPointerException){
			throw e;
		}
	}

	return "SubMenu(" + level + "', '" + jQuery.trim(jQuery(element).attr('data-menu')) + "')";

}

function mainContent(element){
	return "mainContent()";
}

function sidebar(element){
	return "sidebar()";
}

function inWindow(element){
	return "inWindow()." + mainContent(element);
}

function openerp70(values, element){

  console.log(element);

	// MainMenu 9.0 EE
  if(jQuery(element).closest('a.o_menu_toggle').length || jQuery(element).hasClass('o_menu_toggle')){
		values[builder.locator.methods.openerp70] = ["BackToMainMenu"];
		return builder.locator.methods.openerp70;
	}

	// MainMenu 9.0 EE
  if(jQuery(element).closest('div.o_application_switcher').length && jQuery(element).parent().has('a.o_action_app')){
		value = jQuery.trim(jQuery(element).parent().attr('data-menu'));
		values[builder.locator.methods.openerp70] = ["MainMenu    " + value];
		return builder.locator.methods.openerp70;
	}

	// MainMenu 8.0 click in A-tag
    if(jQuery(element).parents('#oe_main_menu_placeholder').length && jQuery(element).hasClass('oe_menu_toggler')){
		value = jQuery.trim(jQuery(element).attr('data-menu'));
		values[builder.locator.methods.openerp70] = ["MainMenu    " + value];
		return builder.locator.methods.openerp70;
	}

	// MainMenu 8.0 click in SPAN-tag
    if(jQuery(element).parents('#oe_main_menu_placeholder').length && jQuery(element).hasClass('oe_menu_text')){
		value = jQuery.trim(jQuery(element).parent().attr('data-menu'));
		values[builder.locator.methods.openerp70] = ["MainMenu    " + value];
		return builder.locator.methods.openerp70;
	}

	// MainMenu 7.0
	if(jQuery(element).parents('.oe_menu').length){
		value = jQuery.trim(jQuery(element).parent().attr('data-menu'));
		values[builder.locator.methods.openerp70] = ["MainMenu    " + value];
		return builder.locator.methods.openerp70;
	}

	// SubMenu 9.0 EE
    if(jQuery(element).context.tagName.toLowerCase() == 'a'
      && jQuery(element).attr('data-bt-testing-sub-menu_id')){
		value = jQuery.trim(jQuery(element).attr('data-bt-testing-sub-menu_id'));
		values[builder.locator.methods.openerp70] = ["SubMenu    " + value];
		return builder.locator.methods.openerp70;
	}

	// SubSubMenu 9.0 EE
  if(jQuery(element).closest('a[class*=o_menu_entry_lvl_]').length){
		value = jQuery.trim(jQuery(element).closest('a[class*=o_menu_entry_lvl_]').attr('data-menu'));
		values[builder.locator.methods.openerp70] = ["SubSubMenu    " + value];
		return builder.locator.methods.openerp70;
	}

	// SubSubMenu 9.0 EE
  /*
  if(jQuery(element).closest('a.o_menu_entry_lvl_3').length){
		value = jQuery.trim(jQuery(element).closest('a.o_menu_entry_lvl_3').attr('data-menu'));
		values[builder.locator.methods.openerp70] = ["SubSubMenu    " + value];
		return builder.locator.methods.openerp70;
	}
	*/


	// SubMenu 8.0 click in A-tag
  if(jQuery(element).parents('div.oe_secondary_menus_container').length && jQuery(element).hasClass('oe_menu_leaf')){
		value = jQuery.trim(jQuery(element).attr('data-menu'));
		values[builder.locator.methods.openerp70] = ["SubMenu    " + value];
		return builder.locator.methods.openerp70;
	}

	// SubMenu 8.0 click in SPAN-tag
  if(jQuery(element).parents('div.oe_secondary_menus_container').length && jQuery(element).hasClass('oe_menu_text')){
		value = jQuery.trim(jQuery(element).parent().attr('data-menu'));
		values[builder.locator.methods.openerp70] = ["SubMenu    " + value];
		return builder.locator.methods.openerp70;
	}

	// SubMenu 7.0
	if(jQuery(element).hasClass('oe_menu_text')){
		value = jQuery.trim(jQuery(element).parent().attr('data-menu'));
		values[builder.locator.methods.openerp70] = ["SubMenu2    " + value];
		return builder.locator.methods.openerp70;
	}

 	// Radio 9.0EE
	if(jQuery(element).context.tagName.toLowerCase() == 'input'
		&& element.type.toLowerCase() == 'radio'){
    [model, isX2Many] = getModel90EE(element);
		name = jQuery(element).attr('data-bt-testing-name');
		value = jQuery(element).attr('value');
    var keyword = isX2Many ? 'X2Many-Radio' : 'Radio';
		values[builder.locator.methods.openerp70] = [keyword + "\t" + model + "\t" + name + "\t" + value];
		return builder.locator.methods.openerp70;
	}

 	// Radio 9.0EE
	if(jQuery(element).context.tagName.toLowerCase() == 'input'
		&& element.type.toLowerCase() == 'radio'){
    [model, isX2Many] = getModel90EE(element);
		name = jQuery(element).attr('data-bt-testing-name');
		value = jQuery(element).attr('value');
    var keyword = isX2Many ? 'X2Many-Radio' : 'Radio';
		values[builder.locator.methods.openerp70] = [keyword + "\t" + model + "\t" + name + "\t" + value];
		return builder.locator.methods.openerp70;
	}

  // Open SidebarAction 9.0 EE
	if(jQuery(element).context.tagName.toLowerCase() == 'a'
          && jQuery(element).hasClass('dropdown-toggle')
          && jQuery(element).parents('div.o_cp_sidebar').length) {
      // Ignored this click, print empty line
      console.log("Open SidebarAction 9.0 EE");
      return builder.locator.methods.openerp70;
  }

  // Open SidebarAction
	if(jQuery(element).context.tagName.toLowerCase() == 'button'
          && jQuery(element).hasClass('oe_dropdown_toggle')) {
      // Ignored this click, print empty line
      return builder.locator.methods.openerp70;
  }

	// Execute SidebarAction 9.0 EE
	if(jQuery(element).context.tagName.toLowerCase() == 'a'
          && jQuery(element).parents('div.o_cp_sidebar').length) {
      var type = jQuery(element).attr('data-bt-type');
      var id = jQuery(element).attr('data-bt-id');
      if(id === ''){
        type = jQuery(element).closest('div.o_dropdown').attr('data-bt-type');
        id = jQuery(element).attr('data-index');
      }
      // if values, otherwise print empty line
      if(type && id) {
        values[builder.locator.methods.openerp70] = ["SidebarAction\t" + type + "\t" + id];
      }
      return builder.locator.methods.openerp70;
    }

  // The blue arrow on the right side of a many2one
  // Many2One-External 9.0 EE (element==button, so must before button)
	if(jQuery(element).context.tagName.toLowerCase() == 'button'
      && jQuery(element).closest('div.o_form_field_many2one').length){
    var model = jQuery(element).closest('div.o_form_field_many2one').find(':input[data-bt-testing-model_name]').attr('data-bt-testing-model_name');
    var field = jQuery(element).closest('div.o_form_field_many2one').find(':input[data-bt-testing-model_name]').attr('data-bt-testing-name');
		value = jQuery.trim(jQuery(element).attr('data-view-type'));
		values[builder.locator.methods.openerp70] = ["Many2One-External\t" + model + "\t" + field];
		return builder.locator.methods.openerp70;
	}


  // ChangeView 9.0 EE (element==button, so must before button)
	if(jQuery(element).closest('div.o_cp_switch_buttons').length){
		value = jQuery.trim(jQuery(element).attr('data-view-type'));
		values[builder.locator.methods.openerp70] = ["ChangeView    " + value];
		return builder.locator.methods.openerp70;
	}

	// Button 9.0 EE
	if(jQuery(element).context.tagName.toLowerCase() == 'button'){
		var model = jQuery(element).attr('data-bt-testing-model_name');
		var value = jQuery.trim(jQuery(element).attr('data-bt-testing-name'));
    // When we really have no information, we take the css classes
    if(value === ''){
      value = jQuery.trim(jQuery(element).attr('class'));
		  values[builder.locator.methods.openerp70] = ["Button\tclass=" + value];
    } else {
      values[builder.locator.methods.openerp70] = ["Button\tmodel=" + model + "\tbutton_name=" + value];
    }
		return builder.locator.methods.openerp70;
	}

	// Button 7.0, 8.0
	if(jQuery(element).context.tagName.toLowerCase() == 'button'){
		model = jQuery(element).attr('data-bt-testing-model_name');
		value = jQuery.trim(jQuery(element).attr('data-bt-testing-name'));
		values[builder.locator.methods.openerp70] = ["Button    " + model + "\t" + value];
		return builder.locator.methods.openerp70;
	}

	// NewOne2Many 90 EE
	if(jQuery(element).context.tagName.toLowerCase() == 'a'
		&& jQuery(element).parents('.o_form_field_x2many_list_row_add').length){
		var o_x2m_control_panel = jQuery(element).closest('div.o_view_manager_content').find('div.o_x2m_control_panel');
		model = o_x2m_control_panel.attr('data-bt-testing-model_name');
		name = o_x2m_control_panel.attr('data-bt-testing-name');
		values[builder.locator.methods.openerp70] = ["NewOne2Many    " + model + "\t" + name];
		return builder.locator.methods.openerp70;
	}

	// NewOne2Many
	if(jQuery(element).context.tagName.toLowerCase() == 'a'
		&& (jQuery(element).parents('.oe_form_field_one2many_list_row_add').length ||
        jQuery(element).parents('.oe_form_field_many2many_list_row_add').length)){
		var oe_view_manager = jQuery(element).closest('div.oe_view_manager');
		model = oe_view_manager.attr('data-bt-testing-model_name');
		name = oe_view_manager.attr('data-bt-testing-name');
		values[builder.locator.methods.openerp70] = ["NewOne2Many    " + model + "\t" + name];
		return builder.locator.methods.openerp70;
	}

	// ChangeView 8.0
	if(jQuery(element).parents('.oe_view_manager_switch').length){
		value = jQuery.trim(jQuery(element).attr('data-view-type'));
		values[builder.locator.methods.openerp70] = ["ChangeView    " + value];
		return builder.locator.methods.openerp70;
	}

	// NotebookPage
	if(jQuery(element).context.tagName.toLowerCase() == 'a'
		&& jQuery(element).hasClass('ui-tabs-anchor')){
		value = jQuery(element).attr('data-bt-testing-original-string');
		values[builder.locator.methods.openerp70] = ["NotebookPage    " + value];
		return builder.locator.methods.openerp70;
	}

	// Many2OneSelect (writing), 90 EE
	if(jQuery(element).context.tagName.toLowerCase() == 'input'
		&& jQuery(element).parents('.o_form_field_many2one').length){
    [model, isX2Many] = getModel90EE(element);
		name = jQuery(element).attr('data-bt-testing-name');
		value = jQuery.trim(jQuery(element).text());
    var keyword = isX2Many ? 'X2Many-Many2OneSelect' : 'Many2OneSelect';
		values[builder.locator.methods.openerp70] = [keyword + "\t" + model + "\t" + name];
		return builder.locator.methods.openerp70;
	}


	// Many2OneSelect (writing), 7.0, 8.0
	if(jQuery(element).context.tagName.toLowerCase() == 'input'
		&& jQuery(element).parents('.oe_form_field_many2one').length){
		model = jQuery(element).attr('data-bt-testing-model_name');
		name = jQuery(element).attr('data-bt-testing-name');
		value = jQuery.trim(jQuery(element).text());
		values[builder.locator.methods.openerp70] = ["Many2OneSelect    " + model + "\t" + name];
		return builder.locator.methods.openerp70;
	}

	// Many2OneSelect (clicking)
	if(jQuery(element).context.tagName.toLowerCase() == 'img'
		&& jQuery(element).parents('.oe_form_field_many2one').length){
		values[builder.locator.methods.openerp70] = ["ERROR: Please check the documentation how to record Many2One fields"];
		return builder.locator.methods.openerp70;
	}

	// TagsNew
	if(jQuery(element).context.tagName.toLowerCase() == 'textarea'
		&& jQuery(element).parents('.oe_tags').length){
		[model, isX2Many] = getModel90EE(element);
		name = jQuery(element).attr('data-bt-testing-name');
		value = jQuery.trim(jQuery(element).text());
    var keyword = isX2Many ? 'X2Many-TagsNew' : 'TagsNew';
		values[builder.locator.methods.openerp70] = [keyword + "\t" + model + "\t" + name + "\t" + value];
		return builder.locator.methods.openerp70;
	}

	// TagsRemove
	if(jQuery(element).context.tagName.toLowerCase() == 'a'
		&& jQuery(element).attr('class').toLowerCase() == 'text-remove'
		&& jQuery(element).parents('.oe_tags').length){
		[model, isX2Many] = getModel90EE(element);
		name = jQuery(element).attr('data-bt-testing-name');
		value = jQuery.trim(jQuery(element).siblings('span.text-label').text());
    var keyword = isX2Many ? 'X2Many-TagsRemove' : 'TagsRemove';
		values[builder.locator.methods.openerp70] = [keyword + "\t" + model + "\t" + name + "\t" + value];
		return builder.locator.methods.openerp70;
	}

	// Tags (Just a click => do nothing)
	if(jQuery(element).context.tagName.toLowerCase() == 'div'
		&& jQuery(element).hasClass('text-tags')
		&& jQuery(element).parents('.oe_tags').length){
		[model, isX2Many] = getModel90EE(element);
		name = jQuery(element).attr('data-bt-testing-name');
		value = jQuery.trim(jQuery(element).siblings('span.text-label').text());
    var keyword = isX2Many ? 'X2Many-TagsRemove' : 'TagsRemove';
		values[builder.locator.methods.openerp70] = [keyword + "\t" + model + "\t" + name];
		return builder.locator.methods.openerp70;
	}

	// Checkbox
	if(jQuery(element).context.tagName.toLowerCase() == 'input'
		&& element.type.toLowerCase() == 'checkbox'){
		[model, isX2Many] = getModel90EE(element);
		name = jQuery(element).attr('data-bt-testing-name');
		value = jQuery.trim(jQuery(element).val());
    var keyword = isX2Many ? 'X2Many-Checkbox' : 'Checkbox';
		values[builder.locator.methods.openerp70] = [keyword + "\t" + model + "\t" + name];
		return builder.locator.methods.openerp70;
	}

	// Date
	if(jQuery(element).context.tagName.toLowerCase() == 'input'
		&& jQuery(element).parents('.oe_datepicker_root').length){
		[model, isX2Many] = getModel90EE(element);
		name = jQuery(element).attr('data-bt-testing-name');
		value = jQuery.trim(jQuery(element).val());
    var keyword = isX2Many ? 'X2Many-Date' : 'Date';
		values[builder.locator.methods.openerp70] = [keyword + "\t" + model + "\t" + name];
		return builder.locator.methods.openerp70;
	}

	// Char
	if(jQuery(element).context.tagName.toLowerCase() == 'input'
		&& jQuery(element).attr('type').toLowerCase() == 'text'){
		[model, isX2Many] = getModel90EE(element);
		name = jQuery(element).attr('data-bt-testing-name');
		value = jQuery.trim(jQuery(element).val());
    var keyword = isX2Many ? 'X2Many-Char' : 'Char';
		values[builder.locator.methods.openerp70] = [keyword + "\t" + model + "\t" + name];
		return builder.locator.methods.openerp70;
	}

	// Float
	if(jQuery(element).context.tagName.toLowerCase() == 'input'
		&& jQuery(element).parents('.oe_form_field_float').length){
    [model, isX2Many] = getModel90EE(element);
    name = jQuery(element).attr('data-bt-testing-name');
		value = jQuery.trim(jQuery(element).val());
    var keyword = isX2Many ? 'X2Many-Float' : 'Float';
		values[builder.locator.methods.openerp70] = [keyword + "\t" + model + "\t" + name];
		return builder.locator.methods.openerp70;
	}

	// Text 9.0 EE
	if(jQuery(element).prop("tagName").toLowerCase() == 'textarea'
		&& jQuery(element).hasClass('o_form_textarea')){

    [model, isX2Many] = getModel90EE(element);
		name = jQuery(element).attr('data-bt-testing-name');
    var keyword = isX2Many ? 'X2Many-Text' : 'Text';
		values[builder.locator.methods.openerp70] = [keyword + "\t" + model + "\t" + name];
		return builder.locator.methods.openerp70;
	}

	// Text
	if(jQuery(element).context.tagName.toLowerCase() == 'textarea'
		&& jQuery(element).parents('.oe_form_field_text').length){
    [model, isX2Many] = getModel90EE(element);
		name = jQuery(element).attr('data-bt-testing-name');
		value = jQuery.trim(jQuery(element).val());
		values[builder.locator.methods.openerp70] = [keyword + "\t" + model + "\t" + name];
		return builder.locator.methods.openerp70;
	}

  // Select From List 9.0 "Temporal"
  if(jQuery(element).context.tagName.toLowerCase() == 'option'
    && jQuery(element).parents('select').length){
    value = jQuery(element).attr('value');
    name = jQuery(element).closest('select').attr('data-bt-testing-name');
    model = jQuery(element).closest('select').attr('data-bt-testing-model_name');
    values[builder.locator.methods.openerp70] = ["Select-Option\t" + model + "\t" + name + "\t" + value];
    return builder.locator.methods.openerp70;
  }

	// One2ManySelectRecord (must be before ListView)
	if(jQuery(element).context.tagName.toLowerCase() == 'td'
            && jQuery(element).parents('div.oe_form_field_one2many').length
            && jQuery(element).hasClass('oe_list_field_cell')
            && jQuery(element).parents('table.oe_list_content').length){

      var one2manyElement = jQuery(element).closest('div.oe_view_manager')

      var model = one2manyElement.attr('data-bt-testing-model_name');
      var field = one2manyElement.attr('data-bt-testing-name');
      var submodel = one2manyElement.attr('data-bt-testing-submodel_name');

      var recordValue = '';
      jQuery.each(jQuery(element).closest('tr').find('td.oe_list_field_cell'), function(index, value){
        recordValue += "\t" + jQuery(value).attr('data-field') + '=' + jQuery(value).text()
      });
      values[builder.locator.methods.openerp70] = ["One2ManySelectRecord\t" + model + "\t" + field + "\t" + submodel + "\t" + recordValue];
      return builder.locator.methods.openerp70;
	}

	// TODO: Select ListView 9.0
	if(jQuery(element).context.tagName.toLowerCase() == 'td'
            && jQuery(element).parents('table.o_list_view').length){

      model = jQuery(element).attr('data-bt-testing-model_name');
      var recordValue = '';

      // TODO: has child with attribute data-field
      jQuery.each(jQuery(element).closest('tr').find('td[data-field]'), function(index, value){
        console.log("#" + jQuery(value).text() + "#");
        if(jQuery(value).text().trim()) {
          recordValue += "\t" + jQuery(value).attr('data-field') + '=' + jQuery(value).text().replace(/\\n/g, "\\\\n").replace(/\r?\n/g, "\\n")
        }
      });
      values[builder.locator.methods.openerp70] = ["SelectListView\t" + model + "\t" + recordValue];
      return builder.locator.methods.openerp70;
	}

	// Select ListView 8.0
	if(jQuery(element).context.tagName.toLowerCase() == 'td'
            && jQuery(element).hasClass('oe_list_field_cell')
            && jQuery(element).parents('table.oe_list_content').length){

      model = jQuery(element).attr('data-bt-testing-model_name');
      var recordValue = '';

      jQuery.each(jQuery(element).closest('tr').find('td.oe_list_field_cell'), function(index, value){
        recordValue += "\t" + jQuery(value).attr('data-field') + '=' + jQuery(value).text()
      });
      values[builder.locator.methods.openerp70] = ["SelectListView\t" + model + "\t" + recordValue];
      return builder.locator.methods.openerp70;
	}

	// SidebarAction
	if(jQuery(element).hasClass('oe_sidebar_action_a')) {

      var type = jQuery(element).attr('data-bt-type');
      var id = jQuery(element).attr('data-bt-id');
      values[builder.locator.methods.openerp70] = ["SidebarAction\t" + type + "\t" + id];
      return builder.locator.methods.openerp70;
    }


	values[builder.locator.methods.openerp70] = ["No match: "+jQuery(element).context.tagName+'#'+jQuery(element).parents()+'='+jQuery(element).text()];
	if(builder.locator.methods.openerp70.indexOf("No match: TD#")>-1)
		return
	return builder.locator.methods.openerp70;
}


/**
 * Generates a best-guess locator from an element.
 * @param element The element to create a locator for
 * @param applyTextTransforms Whether to apply CSS text-transforms for link texts, which is what
 *        Webdriver wants but Selenium 1 doesn't.
 * @return A locator
 */
builder.locator.fromElement = function(element, applyTextTransforms) {
  var values = {};
  var preferredMethod = null;

  // FIXME: This function needs a lot more thought, for example the "value" property is much
  // more useful for type="submit".
  // TODO: set locator.frame to be a locator to the frame containing the element

  // Locate by ID
  var id = element.getAttribute('id');
  if (id) {
    values[builder.locator.methods.id] = [id];
    values[builder.locator.methods.css] = ["#" + id];
    if (findNode("id", id) === element) {
      preferredMethod = builder.locator.methods.id;
    }
  }

  // Locate by name
  var name = element.getAttribute('name');
  if (name) {
    values[builder.locator.methods.name] = [name];
    if (!preferredMethod && findNode("name", name) === element) {
      preferredMethod = builder.locator.methods.name;
    }
  }

  // Locate by link text
  if ((element.tagName.toUpperCase() === "A") ||
      (element.parentNode.tagName && element.parentNode.tagName.toUpperCase() === "A"))
  {
    var el = element.tagName.toUpperCase() === "A" ? element : element.parentNode;
    var link = removeHTMLTags(el.innerHTML);
    if (link) {
      values[builder.locator.methods.link] = [applyTextTransforms ? removeHTMLTags(getCorrectCaseText(el)): link];
      if (!preferredMethod && findNode("link", link) === el) {
        preferredMethod = builder.locator.methods.link;
      }
    }
  }

  // Locate by CSS
  var current = element;
  var sub_path = builder.locator.getCSSSubPath(element);
  while (findNode("css", sub_path) != element && current.nodeName.toLowerCase() != 'html') {
    sub_path = builder.locator.getCSSSubPath(current.parentNode) + ' > ' + sub_path;
    current = current.parentNode;
  }
  if (findNode("css", sub_path) == element) {
    if (values[builder.locator.methods.css]) {
      values[builder.locator.methods.css].push(sub_path);
    } else {
      values[builder.locator.methods.css] = [sub_path];
    }
    if (!preferredMethod) {
      preferredMethod = builder.locator.methods.css;
    }
  }

  // Locate by XPath
  var xpath = getHtmlXPath(element);
  if (xpath) {
    // Contrary to the XPath spec, Selenium requires the "//" at the start, even for paths that
    // don't start at the root.
    xpath = (xpath.substring(0, 2) !== "//" ? ("/" + xpath) : xpath);
    values[builder.locator.methods.xpath] = [xpath];
    if (!preferredMethod) {
      preferredMethod = builder.locator.methods.xpath;
    }
  }

  // Locate by XPath
  var fullxpath = getFullXPath(element);
  if (fullxpath && xpath != fullxpath) {
    if (values[builder.locator.methods.xpath]) {
      values[builder.locator.methods.xpath].push(fullxpath);
    } else {
      values[builder.locator.methods.xpath] = [fullxpath];
    }
    if (!preferredMethod) {
      preferredMethod = builder.locator.methods.xpath;
    }
  }

  // Locate by class
  var className = element.getAttribute('class');
  if (className && !values[builder.locator.methods.css]) {
    values[builder.locator.methods.css] = [element.tagName.toLowerCase() + "." + className.replace(/ .*/, '')];
    if (!preferredMethod) {
      preferredMethod = builder.locator.methods.css;
    }
  }

  preferredMethod = openerp70(values, element);

  var loc = new builder.locator.Locator(preferredMethod, 0, values);
  loc.__originalElement = element;
  return loc;
};

// Helper functions:
function getModel90EE(element) {
  var o_x2m_control_panel = jQuery(element).closest('div.o_view_manager_content.o_form_field').find('div.o_x2m_control_panel');
  console.log("o_x2m_control_panel", o_x2m_control_panel);
  var isX2Many = false;
  var model = jQuery(element).attr('data-bt-testing-model_name');
  if (o_x2m_control_panel.length) {
    isX2Many = true;
    model = o_x2m_control_panel.attr('data-bt-testing-submodel_name');
  }
  return [model, isX2Many];
}

/** The DOM type enum of an Element node, as opposed to eg an attribute or text. */
var ELEMENT_NODE_TYPE = 1;

function getFullXPath(node) {
  if (node.nodeName !== "body" && node.nodeName !== "html" && node.parentNode &&
      node.parentNode.nodeName.toLowerCase() !== "body")
  {
    return getFullXPath(node.parentNode) + "/" + getChildSelector(node);
  } else {
    return "//" + getChildSelector(node);
  }
}

/**
 * Gets the XPath bit between two /s for normal elements.
 * @param node The DOM node whose XPath selector to find
 */
function getChildSelector(node) {
  // Figure out the index of this node amongst its siblings.
  var count = 1;
  var sibling = node.previousSibling;
  while (sibling) {
    if (sibling.nodeType === ELEMENT_NODE_TYPE && sibling.nodeName === node.nodeName) {
      count++;
    }
    sibling = sibling.previousSibling;
  }
  if (count === 1) {
    // This may be the only node of its name, which would make for simpler XPath.
    var onlyNode = true;
    sibling = node.nextSibling;
    while (sibling) {
      if (sibling.nodeType === ELEMENT_NODE_TYPE && sibling.nodeName === node.nodeName) {
        onlyNode = false;
        break;
      }
      sibling = sibling.nextSibling;
    }
    if (onlyNode) {
      return node.nodeName.toLowerCase();
    }
  }

  // It's not the only node, so use the count.
  return node.nodeName.toLowerCase() + "[" + count + "]";
}

/**
 * Get the Xpath to the given node, using HTML-specific attributes.
 * @param node The DOM node whose XPath we want
 * @param doc The document the node is in
 */
function getMyXPath(node, doc) {
  // We try a variety of approaches here:
  var nodeName = node.nodeName.toLowerCase();

  // If the node has an ID unique in the document, select by ID.
  if (node.id && doc.getElementById(node.id) === node) {
    return "//" + nodeName + "[@id='" + node.id + "']";
  }

  // If the node has a class unique in the document, select by class.
  var className = node.className;
  // The XPath syntax to match one class name out of many is atrocious.
  if (className && className.indexOf(' ') === -1 &&
      doc.getElementsByClassName(className).length === 1)
  {
    return "//" + nodeName + "[@class='" + className + "']";
  }

  // If the node is a label for a field - whose ID we assume is unique, use that.
  if (nodeName === "label" && node.hasAttribute('for')) {
    return "//label[@for='" + node.getAttribute('for') + "']";
  }

  // If the node has a parent node which isn't the body, try the next node up.
  // If the node is a "body" or "html" element, recursing further up leads to trouble -
  // so we give up and just return a child selector. Multiple bodies or htmls are the sign of
  // deeply disturbed HTML, so we can be OK with giving up at this point.
  if (nodeName !== "body" && nodeName !== "html" && node.parentNode &&
      node.parentNode.nodeName.toLowerCase() !== "body")
  {
    return getMyXPath(node.parentNode, doc) + "/" + getChildSelector(node);
  } else {
    return "//" + getChildSelector(node);
  }
}

/**
 * Get an Xpath to a node using our knowledge of HTML.
 * Uses label[@for=] classnames, and textContent in addition to tagnames and ids.
 */
function getHtmlXPath(node) {
  var nodeName = node.nodeName.toLowerCase();
  // If we're clicking on the raw "html" area, which is possible if we're clicking below the
  // body for some reason, just return the path to "html".
  if (nodeName === "html") {
    return "//html";
  }
  var parent = getMyXPath(node.parentNode, window.bridge.getRecordingWindow().document);

  if (parent.indexOf("']") > -1) {

    var text = node.textContent;
    // Escape ' characters.
    text = text.replace(/[']/gm, "&quot;");

    // Attempt to key on the text content of the node for extra precision.
    if (text && text.length < 30) {
      var win = window.bridge.getRecordingWindow();
      var attempt = parent.substr(0, parent.indexOf("']") + 2) + "//" + nodeName;
      // If the text contains whitespace characters that aren't spaces, we convert any
      // runs of whitespace into single spaces and trim off the ends, then use the
      // XPath normalize-space command to ensure it will get matched correctly. Otherwise
      // links with eg newlines in them won't work.
      if (hasNonstandardWhitespace(text)) {
        attempt = attempt + "[normalize-space(.)='" +
            builder.normalizeWhitespace(text) + "']";
      } else {
        // (But if we can get away without it, do so!)
        attempt = attempt + "[.='" + text + "']";
      }
      // Check this actually works.
      if (new MozillaBrowserBot(win).findElementBy("xpath", attempt, win.document, win) === node) {
        return attempt;
      }
    }
  }

  return parent + "/" + getChildSelector(node);
}

/** Whether the given text has non-space (0x20) whitespace). */
function hasNonstandardWhitespace(text) {
  return !(/^[ \S]*$/.test(text));
}

/**
 * Uses the given locator to find the node it identifies.
 */
function findNode(locatorType, locator) {
  var win = window.bridge.getRecordingWindow();
  return new MozillaBrowserBot(win).findElementBy(locatorType, locator, win.document, win);
}

/** Function from global.js in Windmill, licensed under Apache 2.0. */
function removeHTMLTags(str){
  str = str.replace(/&(lt|gt);/g, function (strMatch, p1) {
    return (p1 === "lt") ? "<" : ">";
  });
  var strTagStrippedText = str.replace(/<\/?[^>]+(>|$)/g, "");
  strTagStrippedText = strTagStrippedText.replace(/&nbsp;/g,"");
  return strTagStrippedText.trim();
}

// From http://stackoverflow.com/questions/2332811/capitalize-words-in-string
String.prototype.capitalize = function() {
    return this.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
};

var transforms = {"uppercase": "toUpperCase", "lowercase": "toLowerCase", "capitalize": "capitalize", "none": "toString"};

/** Given an element, returns its text with CSS text-transforms applies. */
function getCorrectCaseText(el, style) {
  try {
    style = jQuery(el).css('text-transform');
  } catch (e) {}
  style = transforms[style] ? style : "none";
  if (el.nodeType == 3) {
    return el.textContent[transforms[style]]();
  }
  var bits = [];
  for (var i = 0; i < el.childNodes.length; i++) {
    bits.push(getCorrectCaseText(el.childNodes[i], style));
  }
  return bits.join("");
}



if (builder && builder.loader && builder.loader.loadNextMainScript) { builder.loader.loadNextMainScript(); }
