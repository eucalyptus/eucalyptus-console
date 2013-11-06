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
  $.widget('eucalyptus.dashboard', $.eucalyptus.eucawidget, {
    options : { },
    _init : function() {
      var $tmpl = $('html body div.templates').find('#dashboardTmpl').clone();       
      var $wrapper = $($tmpl.render($.extend($.i18n.map, help_dashboard)));
      var $dashboard = $wrapper.children().first();
      var $help = $wrapper.children().last();
      this._setZoneSelection($dashboard.find('#dashboard-content .instances'));
      this._setTotals($dashboard.find('#dashboard-content .instances'),
                         $dashboard.find('#dashboard-content .storage'),
                         $dashboard.find('#dashboard-content .netsec'));
      var $wrapper = $('<div>').addClass('dashboard-wrapper');
      $dashboard.appendTo($wrapper);
      $wrapper.appendTo(this.element);
      this._addHelp($help);
      $('html body').eucadata('setDataNeeds', ['summarys', 'instances', 'volumes', 'snapshots', 'sgroups', 'keypairs', 'addresses', 'availabilityzones', 'scalinginsts']);
    },

    _create : function() { 
    },

    _destroy : function() { },
    
    // initiate ajax call-- describe-instances
    // attach spinning wheel until we refresh the content with the ajax response
    _setZoneSelection : function($instObj) {
      var thisObj = this;
      var $az=$instObj.find('#dashboard-instance-az select');

      require(['app'], function(app) {
        app.data.availabilityzones.on('reset change add remove sync', function(){
          var results = app.data.availabilityzones
          var arrayAz = [];
          results.each(function(zone) {
             var azName = zone.get('name');
             arrayAz.push(azName);
          });
          var sorted = sortArray(arrayAz);
          $az.find('.temporal').remove();
          $.each(sorted, function(idx, azName){
            var newOption = $('<option>').addClass('temporal').attr('value', azName).text(azName);
            if (app.data.summarys.params !== undefined) {
              if (azName == app.data.summarys.params.AvailabilityZone) {
                newOption.attr('selected', 'yes')
              }
            }
            $az.append(newOption);
          });
        });
      });

      // update the display
      $az.change( function (e) {
        thisObj._resetInstances($instObj);
      }); 
    },

    _setBusy : function(div) {
      // don't set this if there is already an image set
      if (div.children()[0].nodeName == 'SPAN') {
        div.prepend($('<img>').attr('src','images/dots32.gif'));
      }
    },

    _resetInstances : function($instObj){
      $instObj.find('#dashboard-instance-running div span').text('');
      $instObj.find('#dashboard-instance-stopped div span').text('');
      $instObj.find('#dashboard-scaling-groups div span').text('');
      this._setBusy($instObj.find('#dashboard-instance-running div'));
      this._setBusy($instObj.find('#dashboard-instance-stopped div'));
      this._setBusy($instObj.find('#dashboard-scaling-groups div'));
      // set filter on eucadata for summary
      var az=$instObj.find('#dashboard-instance-az select').val();
      require(['app'], function(app) {
        if (az == 'all') {
          app.data.summarys.params = undefined;
        } else {
          app.data.summarys.params = {AvailabilityZone: az};
        }
        app.data.summarys.fetch();
      });
    },

    _setTotals : function($instObj, $storageObj, $netsecObj){
      var thisObj = this;
      // set busy indicators while loading
      this._setBusy($instObj.find('#dashboard-instance-running div'));
      this._setBusy($instObj.find('#dashboard-instance-stopped div'));
      this._setBusy($instObj.find('#dashboard-scaling-groups div'));
      this._setBusy($storageObj.find('#dashboard-storage-volume'));
      this._setBusy($storageObj.find('#dashboard-storage-snapshot'));
//      this._setBusy($storageObj.find('#dashboard-storage-buckets'));
//      this._setBusy($netsecObj.find('#dashboard-netsec-load-balancer'));
      this._setBusy($netsecObj.find('#dashboard-netsec-sgroup'));
      this._setBusy($netsecObj.find('#dashboard-netsec-eip'));
      this._setBusy($netsecObj.find('#dashboard-netsec-keypair'));


      // configure navigation links
      $instObj.find('#dashboard-instance-launch a').click( function(e) {
        var $container = $('html body').find(DOM_BINDING['main']);
        $container.maincontainer("changeSelected", e, {selected:'launcher'});
        $('html body').trigger('click', 'navigator:launcher');
        return false;
      });
      $instObj.find('#dashboard-instance-running').wrapAll(
        $('<a>').attr('href','#').click( function(evt){
          var az=$instObj.find('#dashboard-instance-az select').val();
          var filter = {state_filter:'running'};
          if (az != 'all') filter.az_filter = az;
          thisObj._trigger('select', evt, {selected:'instance', filter:filter});
          $('html body').trigger('click', 'navigator:instance');
          return false;
        }));
      $instObj.find('#dashboard-instance-stopped').wrapAll(
        $('<a>').attr('href','#').click( function(evt){
            thisObj._trigger('select', evt, {selected:'instance', filter:'stopped'});
            $('html body').trigger('click', 'navigator:instance');
            return false;
      }));
      $instObj.find('#dashboard-scaling-groups').wrapAll(
        $('<a>').attr('href','#').click( function(evt){
            thisObj._trigger('select', evt, {selected:'scaling'});
            $('html body').trigger('click', 'navigator:scaling');
            return false;
      }));
      $storageObj.find('#dashboard-storage-volume').wrapAll(
        $('<a>').attr('href','#').click( function(evt){
          thisObj._trigger('select', evt, {selected:'volume'});
          $('html body').trigger('click', 'navigator:volume');
          return false;
      }));
      $storageObj.find('#dashboard-storage-snapshot').wrapAll(
        $('<a>').attr('href','#').click( function(evt){
          thisObj._trigger('select', evt, {selected:'snapshot'});
          $('html body').trigger('click', 'navigator:snapshot');
          return false;
      }));
/*
      $storageObj.find('#dashboard-storage-buckets').wrapAll(
        $('<a>').attr('href','#').click( function(evt){
          thisObj._trigger('select', evt, {selected:'bucket'});
          $('html body').trigger('click', 'navigator:bucket');
          return false;
      }));
      $netsecObj.find('#dashboard-netsec-load-balancer').wrapAll(
        $('<a>').attr('href','#').click( function(evt){
          thisObj._trigger('select', evt, {selected:'balancing'});
          $('html body').trigger('click', 'navigator:balancing');
          return false;
      }));
*/
      $netsecObj.find('#dashboard-netsec-sgroup').wrapAll(
        $('<a>').attr('href','#').click( function(evt){
          thisObj._trigger('select', evt, {selected:'sgroup'});
          $('html body').trigger('click', 'navigator:sgroup');
          return false;
      }));
      $netsecObj.find('#dashboard-netsec-eip').wrapAll(
        $('<a>').attr('href','#').click( function(evt){
          thisObj._trigger('select', evt, {selected:'eip'});
          $('html body').trigger('click', 'navigator:eip');
          return false;
      }));
      $netsecObj.find('#dashboard-netsec-keypair').wrapAll(
        $('<a>').attr('href','#').click( function(evt){
          thisObj._trigger('select', evt, {selected:'keypair'});
          $('html body').trigger('click', 'navigator:keypair');
          return false;
      }));
      thisObj._reloadSummaries($instObj, $storageObj, $netsecObj);
    },

    _reloadSummaries : function($instObj, $storageObj, $netsecObj){
      var thisObj = this;
      $('html body').eucadata('addCallback', 'summarys', 'dashboard-summary', function(){

        var az=$instObj.find('#dashboard-instance-az select').val();

        var results = describe('summarys')[0];
        // remove busy indicators when data arrives
        if (results.inst_running > -1) {
          $instObj.find('#dashboard-instance-running div img').remove();
          $instObj.find('#dashboard-instance-running span').text(results.inst_running);
        }
        if (results.inst_stopped > -1) {
          $instObj.find('#dashboard-instance-stopped div img').remove();
          $instObj.find('#dashboard-instance-stopped span').text(results.inst_stopped);
        }
        if (results.scalinginsts > -1) {
          $instObj.find('#dashboard-scaling-groups div img').remove();
          $instObj.find('#dashboard-scaling-groups span').text(results.scalinginsts);
        }
        if (results.volume > -1) {
          $storageObj.find('#dashboard-storage-volume img').remove();
          $storageObj.find('#dashboard-storage-volume span').text(results.volume);
        }
        if (results.snapshot > -1) {
          $storageObj.find('#dashboard-storage-snapshot img').remove();
          $storageObj.find('#dashboard-storage-snapshot span').text(results.snapshot);
        }
//      $storageObj.find('#dashboard-storage-buckets img').remove();
//      $netsecObj.find('#dashboard-netsec-load-balancer img').remove();
//      $storageObj.find('#dashboard-storage-buckets span').text(0);
//      $netsecObj.find('#dashboard-netsec-load-balancer span').text(0);
        if (results.sgroup > -1) {
          $netsecObj.find('#dashboard-netsec-sgroup img').remove();
          $netsecObj.find('#dashboard-netsec-sgroup span').text(results.sgroup);
        }
        if (results.addresses > -1) {
          $netsecObj.find('#dashboard-netsec-eip img').remove();
          $netsecObj.find('#dashboard-netsec-eip span').text(results.addresses);
        }
        if (results.keypair > -1) {
          $netsecObj.find('#dashboard-netsec-keypair img').remove();
          $netsecObj.find('#dashboard-netsec-keypair span').text(results.keypair);
        }

	  });
    },

    _addHelp : function(help){
      var thisObj = this;
      var $header = this.element.find('.box-header');
      $header.find('span').append(
          $('<div>').addClass('help-link').append(
            $('<a>').attr('href','#').text('?').click( function(evt){
              thisObj._flipToHelp(evt, {content:help, url: help_dashboard.landing_content_url} ); 
            })));
      return $header;
    },

    close: function() {
      $('html body').eucadata('removeCallback', 'summarys', 'dashboard-summary');
      this._super('close');
    }
  });
})(jQuery,
   window.eucalyptus ? window.eucalyptus : window.eucalyptus = {});
