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
  $.widget('eucalyptus.header', {
    options : {
       logoUrl : 'images/eucalyptus_top.png',
       show_logo : true,
       show_navigation : false,
       show_help : false,
       show_user : false,
       show_search : false,
    },
    _init : function(){
       var widget = this;
       require(['app'], function(app) {
         widget.element.show();
         widget.element.children().each(function(idx) {
           if ($(this).attr('id')==='euca-navigator'){
             if(widget.options.show_navigation)
               $(this).show();
             else
               $(this).hide();
           }
           if ($(this).attr('id')=='euca-regions'){
             if(app.aws.aws_account)
               $(this).show(); 
             else
               $(this).hide();
           }
           if ($(this).attr('id')==='euca-user'){
             if(widget.options.show_user){
               $(this).show();
             }
             else
               $(this).hide();
           }
           if ($(this).attr('id')==='euca-help'){
             if(widget.options.show_help){
               $(this).show();
             }
             else
               $(this).hide();
           }
           if ($(this).attr('id')=='euca-search'){
             if(widget.options.show_search)
               $(this).show(); 
             else
               $(this).hide();
           }
         });
       });
    },

    _create : function(){
       var thisObj = this;
       require(['app'], function(app) {
         thisObj.element.find('a#euca-logo').click(function(e){
           location.hash = '';
           location.reload();
         });

         // regions area
         if(app.aws.aws_account) {
           app.data.regions.fetch({
             success: function(col, resp, options) {
               // build regions i18n list from collection
               var regions = {};
               $.each(resp, function(idx) {
                 var name = resp[idx].name;
                 var key = name.replace('-', '_').replace('-', '_');
                 regions[name] = {text:app.msg('region_'+key+'_name')+' ('+app.msg('region_'+key+'_loc')+')',
                                  value:name,
                                  endpoint:resp[idx].endpoint};
                 if (name == app.aws.region) {
                   thisObj._setRegion(resp[idx].endpoint, function() {
                     console.log("set default region: "+resp[idx].endpoint);
                   });
                 }
               });
               // build menu structure (yea, rivets, but the whole header should change sometime
               var $reg_menus = $('<ul>');
               $.each(regions, function(k, v){
                 $('<li>').append(
                   $('<a>').attr('href','#').text(v.text).click(function(e,src){
                     if(src!=='triggered')
                        app.aws.region = v.value;
                        console.log("selected region: "+v.endpoint);
                        thisObj._setRegion(v.endpoint, function() {
                          console.log("changed region: "+v.endpoint);
                          var $regTitle = thisObj.element.find('#region-title');
                          var regSelected = app.aws.region.replace('-', '_').replace('-', '_');
                          $regTitle.text(app.msg('region_'+regSelected+'_loc'));
                          $.cookie('aws.region', app.aws.region);
                          // clear public data sets so they get pulled again
                          // re-fetch if they had data already
                          var reload = app.data.allimages.length > app.data.images.length;
                          app.data.allimages.reset([]);
                          if (reload) { app.data.allimages.fetch(); }
                          var reload = app.data.amazonimages.length > 0;
                          app.data.amazonimages.reset([]);
                          if (reload) { app.data.amazonimages.fetch(); }
                        });

                       //thisObj._trigger('select',e, {selected:k, options:v.options});
                    })).appendTo($reg_menus);
               });
               var $regArea = thisObj.element.find('#euca-regions');
               var regSelected = app.aws.region.replace('-', '_').replace('-', '_');
               var menu_title = app.msg('region_'+regSelected+'_loc');
               $regArea.append(
                 $('<ul>').addClass('header-nav').addClass(' header-nav').append(
                   $('<li>').append("<span id='region-logo'>")
                     .append($('<a>').attr('href','#').attr('id', 'region-title').text(menu_title).click(function(evt, src){
                       $regArea.find('.header-nav ul').slideToggle('fast');
                       $regArea.toggleClass('toggle-on');
                       $('html body').trigger('click', 'reg');
                       if ($regArea.hasClass('toggle-on'))
                         $('html body').eucaevent('add_click', 'reg', evt);
                       else
                         $('html body').eucaevent('del_click', 'reg');
                       return false;
                     }),
                     $reg_menus)));
                 $regArea.insertAfter($('#euca-user'));
             }
           });
         }

         //user area
         var user_menus = {'help':{text:menu_help, options:KEEP_VIEW}};
         if (app.aws.aws_account == undefined || app.aws.aws_account == false) {
           user_menus['changepwd'] = {text:menu_user_changepwd, options:KEEP_VIEW};
         }
         user_menus['aboutcloud'] = {text:menu_user_aboutcloud, options:KEEP_VIEW};
         user_menus['logout'] = {text:menu_user_logout};

         var uname = $.eucaData.u_session['username'] + '@' + $.eucaData.u_session['account'];
         if ($.eucaData.u_session['fullname']) {
           uname = $.eucaData.u_session['fullname'];
         }
         var $userArea = thisObj.element.find('#euca-user');
        
         var $user_menus = $('<ul>');
         $.each(user_menus, function(k, v){
           $('<li>').append(
             $('<a>').attr('href','#').text(v.text).click(function(e,src){
               if(src!=='triggered')
                 thisObj._trigger('select',e, {selected:k, options:v.options});
              })).appendTo($user_menus);
         });
   
         $userArea.append(
           $('<ul>').addClass('header-nav').append(
             $('<li>').append(
               $('<a>').attr('href','#').text(uname).click(function(evt, src){
                 $userArea.find('.header-nav ul').slideToggle('fast');
                 $userArea.toggleClass('toggle-on');
                 $('html body').trigger('click', 'user');
                 if ($userArea.hasClass('toggle-on'))
                   $('html body').eucaevent('add_click', 'user', evt);
                 else
                   $('html body').eucaevent('del_click', 'user');
                 return false;
               }),
               $user_menus)));

          // event handlers
          var $navigator = $('#euca-navigator');
          $navigator.click(function (evt, src){
            $('#euca-explorer').slideToggle('fast'); 
            $navigator.toggleClass('toggle-on');
            $('html body').trigger('click','navigator');
            if ($navigator.hasClass('toggle-on')){
              $('html body').find('.euca-explorer-container .inner-container').explorer('onSlide');
              $('html body').eucaevent('add_click', 'navigator', evt);
            }
            else
              $('html body').eucaevent('del_click', 'navigator');
            return false;
          });
      })
    },
   

    _destroy : function(){
    },

    _setRegion : function(endpoint, callback){
      data = "&_xsrf="+$.cookie('_xsrf')+"&Region.Endpoint="+endpoint;
      $.ajax({
        type: 'POST',
        url: '/ec2?Action=SetRegion',
        data:data,
        dataType:"json",
        success: function(data, textStatus, jqXHR) {
          callback();
        }
      });
    }
  });    
})(jQuery,
   window.eucalyptus ? window.eucalyptus : window.eucalyptus = {});
