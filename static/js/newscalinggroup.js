/*************************************************************************
 * Copyright 2009-2012 Eucalyptus Systems, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; version 3 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see http://www.gnu.org/licenses/.
 *
 * Please contact Eucalyptus Systems, Inc., 6755 Hollister Ave., Goleta
 * CA 93117, USA or visit http://www.eucalyptus.com/licenses/ if you need
 * additional information or have any questions.
 ************************************************************************/

(function($, eucalyptus) {
  $.widget('eucalyptus.newscalinggroup', $.eucalyptus.eucawidget, {
    options : { },
    _init : function() {
      var thisObj = this;
      $(thisObj.element).unbind();
      $('html body').eucadata('setDataNeeds', ['launchconfigs', 'availabilityzones', 'balancers', 'scalingpolicies']);
      require(['views/newscalinggroup/index'], function(WizardFactory) {
        var View = WizardFactory(thisObj.options);
        var view = new View({el: thisObj.element});
      	view.render();
        //if(thisObj.options.image != null) {
        //  view.jump(1);
        //}
        var scalingHelp = $('#scaling-wizard-help');
        //launcherHelp.load();
        thisObj._addHelp(scalingHelp);
        thisObj.options.launchConfigName = null;
        thisObj.options.launchconfig = null;
      });
    },
    
     _addHelp : function(help){
      var thisObj = this;
      var $target = $('.wizard-wrapper');
      $('#scaling-wizard-header div.help-link a').click( function(evt){
        thisObj._flipToHelp(evt,{content: help_scaling.dialog_add_content, url: help_scaling.dialog_add_content_url}, $target, false);
      });
      return $('#scaling-wizard-header');
    },

    _create : function() { 
    },

    _destroy : function() {
    },

    _expandCallback : function(row){ 
       var $wrapper = $('');
      return $wrapper;
    },

/**** Public Methods ****/
    close: function() {
      cancelRepeat(tableRefreshCallback);
      this._super('close');
    },
/**** End of Public Methods ****/
  });
})
(jQuery, window.eucalyptus ? window.eucalyptus : window.eucalyptus = {});
