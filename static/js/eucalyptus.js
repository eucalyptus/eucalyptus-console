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
  // global variable
  if (! $.eucaData){
	$.eucaData = {};
  }
  var support_url = '';
  var admin_url = '';
  var initData = '';
  var redirected = false;
  $(document).ready(function() {
    if (! isValidIPv4Address(location.hostname)) // hostname is given
      initData = "action=init&host="+location.hostname;
    else
      initData = "action=init";

    $.when( // this is to synchronize a chain of ajax calls 
      $.ajax({
        type:"POST",
        data:initData,
        dataType:"json",
        async:"false", // async option deprecated as of jQuery 1.8
        success: function(out, textStatus, jqXHR){ 
          eucalyptus.i18n({'language':out.language});
          eucalyptus.help_login({'language':out.language}); // loads help files
          support_url = out.support_url;
          admin_url = out.admin_url;
          require(['app'], function(app) {
            app.aws.aws_login_enabled = (out.aws_login_enabled == 'true');
            if (app.aws.aws_login_enabled) {
              app.aws.session_duration = out.aws_session_duration;
              // set up default region
              app.aws.region = out.aws_def_region;
            }
          });
          if(out.ipaddr && out.ipaddr.length>0 && isValidIPv4Address(out.ipaddr)){
            var newLocation = '';
            if(location.port && location.port > 0)
              newLocation = location.protocol + '//' + out.ipaddr + ':' + location.port; 
            else 
              newLocation = location.protocol + '//' + out.ipaddr; 
            location.href = newLocation;
            redirected = true;
          }
        },
        error: function(jqXHR, textStatus, errorThrown){
          notifyError($.i18n.prop('server_unavailable'));
          logout();
        }
      })).done(function(out){
        if(redirected)
          return;

        // check browser's version
        var supportedBrowser = false;
        if ($.browser.mozilla && parseInt($.browser.version, 10) > 14) {
           supportedBrowser = true;
        } else if (Object.hasOwnProperty.call(window, "ActiveXObject") && !window.ActiveXObject && parseInt($.browser.version, 10) > 8) {
           // this test is for IE 
           supportedBrowser = true;
        } else if ($.browser.webkit) {
          userAgent = navigator.userAgent.toLowerCase();
          rwebkit = new RegExp("webkit/([0-9]+)");
          res = rwebkit.exec(userAgent);
          if (res && res[1] > 535)
            supportedBrowser = true;
        }
        if (!supportedBrowser)
          alert($.i18n.map.unsupported_browser);

        setupAjax(30000);
        // check cookie
        if ($.cookie('session-id')) {
          $.ajax({ type:"POST",
            data:"action=session&_xsrf="+$.cookie('_xsrf'),
            dataType:"json",
            async:"false",
            success: function(out, textStatus, jqXHR){
              $.extend($.eucaData, {'g_session':out.global_session, 'u_session':out.user_session});
              if (out.user_session.host_override && out.user_session.host_override.indexOf("amazonaws.com") > -1) {
                require(['app'], function(app) { app.aws.aws_account = true; });
              }
              eucalyptus.main($.eucaData);
            },
            error: function(jqXHR, textStatus, errorThrown){
              logout();
            }
          });
        } else{
          var $main = $('html body').find('.euca-main-outercontainer .inner-container');
          $main.login({ 'support_url' : support_url, 'admin_url' : admin_url, doLogin : function(evt, args) {
            require(['app'], function(app) {
              params = '';
              if (args.param.access_key) {
                // assemble request for aws type login
                // build params
                params = params+"AWSAccessKeyId="+args.param.access_key;
                params = params+"&Action=GetSessionToken";
                params = params+"&DurationSeconds="+app.aws.session_duration;
                params = params+"&SignatureMethod=HmacSHA256";
                params = params+"&SignatureVersion=2";
                params = params+"&Timestamp="+encodeURIComponent(new Date().toISOString().substring(0, 19)+"Z");
                params = params+"&Version=2011-06-15";
                // sign request
                var string_to_sign = "POST\nsts.amazonaws.com\n/\n"+params;
                var hash = CryptoJS.HmacSHA256(string_to_sign, args.param.secret_key);
                var signature = hash.toString(CryptoJS.enc.Base64);
                var encoded = encodeURIComponent(signature);
                params = params+"&Signature="+encoded;
                params = "action=awslogin&_xsrf="+$.cookie('_xsrf')+"&package="+toBase64(params);
              }
              else {
                // assemble parameters for normal eucalyptus type login
                var tok = args.param.account+':'+args.param.username+':'+args.param.password;
                var hash = toBase64(tok);
                var remember = (args.param.remember)?"yes":"no";

                params = "action=login&remember="+remember+"&_xsrf="+$.cookie('_xsrf')+"&Authorization="+hash;
              }
              $.ajax({
                type:"POST",
                data:params,
                beforeSend: function (xhr) { 
                  $main.find('#euca-main-container').append(
                     $('<div>').addClass('spin-wheel').append( 
                      $('<img>').attr('src','images/dots32.gif'))); // spinwheel
                   $main.find('#euca-main-container').show();
                },
                dataType:"json",
                async: false,
                success: function(out, textStatus, jqXHR) {
                  setupAjax(out.global_session.ajax_timeout);
                  $.extend($.eucaData, {'g_session':out.global_session, 'u_session':out.user_session});
                  require(['app'], function(app) {
                    if (args.param.access_key) {
                      app.aws.aws_account = true;
                    } else {
                      app.aws.aws_account = undefined;
                    }
                  });
                  args.onSuccess($.eucaData); // call back to login UI
                },
                error: function(jqXHR, textStatus, errorThrown){
                  var $container = $('html body').find(DOM_BINDING['main']);
                  $container.children().detach(); // remove spinwheel
                  args.onError(errorThrown);
                }
              });
             })
           }
         });
       } // end of else
    }); // end of done
  }); // end of document.ready
})(jQuery,
   window.eucalyptus ? window.eucalyptus : window.eucalyptus = {});
