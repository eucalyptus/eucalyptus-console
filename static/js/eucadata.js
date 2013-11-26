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
  $.widget('eucalyptus.eucadata', $.eucalyptus.eucawidget, {
    options : {  
      refresh_interval_sec : REFRESH_INTERVAL_SEC,
      max_refresh_attempt : 3,
      endpoints: [{name:'summarys'},
                  {name:'instances'},
                  {name:'images'},
                  {name:'allimages'},
                  {name:'amazonimages'},
                  {name:'volumes'},
                  {name:'snapshots'},
                  {name:'addresses'},
                  {name:'keypairs'},
                  {name:'sgroups'},
                  {name:'availabilityzones'},
                  {name:'tags'},
                  {name:'loadbalancers'},
                  {name:'scalinggrps'},
                  {name:'scalinginsts'},
                  {name:'scalingpolicys'},
                  {name:'launchconfigs'},
                  {name:'metrics'},
                  {name:'alarms'},
                  {name:'astags'}
      ], 
    },
    _data : {summarys:[], instances:null, images:null, allimages:null, amazonimages:null, volumes:null, snapshots:null, addresses:null, keypairs:null, sgroups:null, availabilityzones:null, tags:null, balancers: null, scalinggrps: null, scalinginsts: null, scalingpolicys: null, launchconfigs: null, metrics: null, alarms: null, astags: null},
    _callbacks : {}, 
    _listeners : {},
    _init : function(){ },
    _numPending : 0,
    _enabled : true,
    _errorCode : null, // the http status code of the latest response
    _data_needs : null, // if this is set, only resources listed will be fetched from the proxy
    _call_errors : 0,
    _create : function(){
      var thisObj = this;
      
      $.each(thisObj.options.endpoints, function(idx, ep){
        var name = ep.name;

        // add setup backbone collections in endpoints array
        if (ep.name != null) {
          require(['underscore', 'app'], function(_, app) {
            ep.model = app.data[ep.name];

            var doUpdate = function() {
              //console.log('EUCADATA', name, ep.model.length);
              if (name.indexOf('images') == -1) {
                thisObj._data[name] = {
                  lastupdated: new Date(),
                  results: ep.model.toJSON()
                }
              }
              else {
                thisObj._data[name] = {
                  lastupdated: new Date(),
                  results: []
                }
              }
              // SPECIAL CASE FOR AWS/EUCALYPTUS BEHAVIOR MATCHING - GUI-90 11/05/13
              if( name === "scalinggrps" ){
                  ep.model.each(function(m){
                      if(m.get('Status') === "Delete in progress"){
                         console.log("Delete-In-Progress Scaling Group: " + m.get('name'));
                         ep.model.remove(m);
                      }
                  }); 
              }

              if(thisObj._listeners[name] && thisObj._listeners[name].length >0) {
                $.each(thisObj._listeners[name], function (idx, callback){
                  callback['callback'].apply(thisObj);
                });
              }
            }
            ep.model.on('sync reset change add remove', _.debounce(doUpdate, 100, false));

            // set up callback for timer which updates model if necessary
            thisObj._callbacks[name] = {callback: function(){
              if(!thisObj._enabled || thisObj.countPendingReq() > MAX_PENDING_REQ ) {
                return;
              }
              if (thisObj._data_needs && thisObj._data_needs.indexOf(ep.name) == -1) {
                return;
              }
              if (ep.model == undefined) {
                return;
              }
              if (ep.enabled == false) {
                return;
              }
              var thisEp = ep;
              ep.model.fetch({merge: true, add: true, remove: true,
                              //success: function(col, resp, options) {
                              //  col.trigger('initialized');
                              //},
                              error:function(textStatus, jqXHR, options) {
                                thisObj._errorCode = jqXHR.status;
                                thisObj._numPending--;
                                if (jqXHR.status === 503) {
                                  // set this to prevent further fetches
                                  thisEp.enabled = false;
                                  // set this to keep "getStatus()" happy.
                                  thisObj._data[name] = [];
                                  return;
                                }
                                if(thisObj._data[name]){
                                  var last = thisObj._data[name]['lastupdated'];
                                  var now = new Date();
                                  var elapsedSec = Math.round((now-last)/1000);             
                                  if((jqXHR.status === 401 || jqXHR.status === 403)  ||
                                     (elapsedSec > thisObj.options.refresh_interval_sec*thisObj.options.max_refresh_attempt)){
                                    delete thisObj._data[name];
                                    thisObj._data[name] = null;
                                  }
                                  if(thisObj.getStatus() !== 'online'){
                                    errorAndLogout(thisObj._errorCode);
                                  }
                                  if (jqXHR.status === 504) {
                                    notifyError($.i18n.prop('data_load_timeout'));
                                  }
                                }
                              }});
            }, repeat: null};

            // init the collections
            ep.model.reset([]);
          });
        }
      });
      // ping each API endpoint to get it initialized
      $.each(['/ec2', '/monitor', '/autoscaling', '/elb'], function(idx, api) {
        $.ajax({url: api+"?Action=init", timeout: 5000,
                async:"true", data:"_xsrf="+$.cookie('_xsrf') });
      });

      // calculate proper URL for push endpoint
      var url = document.URL;
      var protocol = 'http';
      if (url.indexOf('https') > -1) {
        protocol = 'https';
      }
      var host_port = url.substring(url.indexOf('://')+3);
      host_port = host_port.substring(0, host_port.indexOf('/'));
      var push_socket = new SockJS(protocol + '://' + host_port + '/push', {
          protocols_whitelist: [
              'websocket', 'xdr-streaming', 'xhr-streaming', 'xdr-polling', 'xhr-polling', 'jsonp-polling'
          ]
      });
      console.log('PUSH>>> established connection');
      var allimg_endpoint = $.grep(this.options.endpoints, function(e){
                                        return e.name == 'allimages'; })[0];
      var amzimg_endpoint = $.grep(this.options.endpoints, function(e){
                                        return e.name == 'amazonimages'; })[0];
      var amazonlogin = false;
      require(['app'], function(app) { amazonlogin = (app.aws.aws_account !== undefined); });
      push_socket.onmessage = function(evt) {
        var res = $.parseJSON(evt.data);
        console.log('PUSH>>>'+res);
        // first, check for expired session
        if (res.indexOf('session_expired') > -1) {
          errorAndLogout(401);  // this triggers session timeout message
        }
        // then, special handling if we're on the dashboard, so we request summary
        // instead of each individual resource update
        else if (thisObj._data_needs && thisObj._data_needs.indexOf('summarys') > -1) {
          thisObj._callbacks['summarys'].callback();
          if (res.indexOf('availabilityzones') > -1) {
            thisObj._callbacks['availabilityzones'].callback();
          }
        }
        // handle all normal push notifications
        else {
          for (var i=0; i<res.length; i++) {
            if (res[i] == 'allimages') {
              // don't refresh the model if it wasn't ever fetched
              if (amazonlogin && allimg_endpoint.model.length == 0 && !allimg_endpoint.model.needsFetching) {
                continue;
              }
            }
            else if (res[i] == 'amazonimages') {
              // don't refresh the model if it wasn't ever fetched
              if (amzimg_endpoint.model.length == 0 && !amzimg_endpoint.model.needsFetching) {
                continue;
              }
            }
            thisObj._callbacks[res[i]].callback();
          }
        }
      };
      push_socket.onerror = function(error) {
        console.log("PUSH>>> error occurred! "+error);
      };
    }, 
    _destroy : function(){
    },
     
/***** Public Methods *****/
    // e.g., get(instance, id);
    get : function(resource){
      var thisObj = this;
      if(thisObj._data[resource])
        return thisObj._data[resource].results;
      else
        return null;
    },

    countPendingReq : function(){
      var thisObj = this;
      return thisObj._numPending;
    }, 

    addCallback : function(resource, source, callback){
      var thisObj = this;
      if (typeof(callback) === "function"){
        if(!thisObj._listeners[resource])
          thisObj._listeners[resource] = [];
        var duplicate = false;
        for (i=0; i<thisObj._listeners[resource].length; i++){
          var cb = thisObj._listeners[resource][i];
          if(cb['src'] === source){ 
            duplicate = true; 
            break; 
          }
        }
        if(!duplicate)
          thisObj._listeners[resource].push({src:source, callback: callback});
      }
    },
    
    removeCallback : function(resource, source){
      var thisObj = this;
      if (! thisObj._listeners[resource] || thisObj._listeners[resource].length <=0)
        return;
      var toDelete = -1;
      for (i=0; i< thisObj._listeners[resource].length; i++){
        var cb = thisObj._listeners[resource][i];
        if (cb['src'] === source) {
          toDelete = i;
          break;
        }
      }
      if(toDelete>=0)
        thisObj._listeners[resource].splice(toDelete, 1);
    },

    refresh : function(resource){
      var thisObj = this;
      if(thisObj._callbacks[resource])
        thisObj._callbacks[resource].callback.apply(this); 
    },

    setDataNeeds : function(resources){
        this._data_needs = resources;
        var thisObj = this;
        var datalist = [];
        _.each(thisObj.options.endpoints, function(ep) {
          if (ep.name != 'summarys') {
              if (resources.indexOf(ep.name) > -1) {
                datalist.push(ep.name);
              }
          }
        });
        setDataInterest(datalist, this._setCallError);
    },

    // this can be used to set any additional param, including filters
    setDataFilter : function(resource, filters){
        var thisObj = this;
        $.each(this.options.endpoints, function(idx, ep){
            if (resource == ep.name) {
                ep.params = filters;
                thisObj.refresh(ep.name);
            }
        });
    },

    // called when non fetch proxy call fails to track these events
    _setCallError : function(){
      this._call_errors++;
      if (this._call_errors > 2) {
        errorAndLogout(thisObj._errorCode);
      }
    },

    // status: online, offline, error
    getStatus : function(){
      var thisObj = this;
      var status = 'online';
      var numOff = 0;
      $.each(thisObj._data, function(resource, data){
        if(!data)
          numOff++;
      });
      if(numOff >= 2) 
        status='offline';

      return status;
    },

    disable : function(){
      this._enabled = false;
    },

    enable : function(){
      this._enabled = true;
    },

    isEnabled : function(){
      return this._enabled;
    }
/**************************/ 
  });
})
(jQuery, window.eucalyptus ? window.eucalyptus : window.eucalyptus = {});
