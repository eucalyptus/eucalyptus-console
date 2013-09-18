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
  $.widget('eucalyptus.launchconfig', $.eucalyptus.eucawidget, {
    options : { },
    baseTable : null,
    tableWrapper : null,
    releaseDialog : null,
    allocateDialog : null,
    associateDialog : null,
    disassociateDialog : null,
    associateBtnId : 'launchconfig-associate-btn',

    _init : function() {
      var thisObj = this;
      var $tmpl = $('html body').find('.templates #launchConfigTblTmpl').clone();
      var $wrapper = $($tmpl.render($.extend($.i18n.map, help_scaling)));
      var $launchConfigTable = $wrapper.children().first();
      var $launchConfigHelp = $wrapper.children().last();

      this.baseTable = $launchConfigTable;
      this.tableWrapper = $launchConfigTable.eucatable_bb({
        id : 'launchconfig', // user of this widget should customize these options,
        data_deps: ['launchconfigs', 'scalinggrps', 'groups'],
        hidden: thisObj.options['hidden'],
        dt_arg : {
          "sAjaxSource": 'launchconfig',
        },
        text : {
          header_title : launch_config_h_title,
          create_resource : launch_config_create,
          resource_found : 'launch_config_found',
          resource_search : launch_config_search,
          resource_plural : launch_config_plural,
        },
        menu_actions : function(args){ 
          return thisObj._createMenuActions();
        },
        context_menu_actions : function(row) {
          return thisObj._createMenuActions();
        },
        menu_click_create : function (args) { thisObj._createAction() },
        help_click : function(evt) {
          thisObj._flipToHelp(evt, {content: help_scaling.launchconfig_landing_content, url: help_scaling.launchconfig_landing_content_url});
        }
      });
    },

    _create : function() { 
      var thisObj = this;
    },

    _createAction : function() {
      window.location = '#newlaunchconfig';
    },

    _destroy : function() {
    },

    _createMenuActions : function() {
      var thisObj = this;
      selectedLaunchConfig = thisObj.baseTable.eucatable_bb('getSelectedRows', 1);
      var itemsList = {};

      (function(){
        itemsList['create'] = { "name": launch_config_action_create_scaling_group, callback: function(key, opt) {;}, disabled: function(){ return true;} }
        itemsList['delete'] = { "name": launch_config_action_delete, callback: function(key, opt) {;}, disabled: function(){ return true;} }
      })();

      if ( selectedLaunchConfig.length === 1) {
        var $container = $('html body').find(DOM_BINDING['main']);
        itemsList['create'] = {"name":launch_config_action_create_scaling_group, callback: function(key, opt){ $container.maincontainer("changeSelected", null, {selected:'newscalinggroup', options:{'launchconfig': selectedLaunchConfig}}); }}
      }
      if ( selectedLaunchConfig.length >= 1) {
        itemsList['delete'] = {"name":launch_config_action_delete, callback: function(key, opt){
          var scaling_groups = describe('scalinggrps');
          var in_use = false;
          var groups = [];
          _.each(selectedLaunchConfig, function(configName) {
            _.find(scaling_groups, function(group) {
              if (group.launch_config_name == configName) {
                in_use = true;
                groups.push({config:configName, group:group.name});
              }
            });
          });
          if (in_use == true) {
            // construct list of lc names + sg names?
            thisObj._dialogAction('deletelaunchconfig2', groups);
          }
          else {
            thisObj._dialogAction('deletelaunchconfig', selectedLaunchConfig);
          }
        }}
      }

      return itemsList;
    },

    _dialogAction: function(dialog, selectedLaunchConfig) {
        require(['views/dialogs/' + dialog], function(dialog) {
            new dialog({items: selectedLaunchConfig});
        });
    }
  });
})
(jQuery, window.eucalyptus ? window.eucalyptus : window.eucalyptus = {});
