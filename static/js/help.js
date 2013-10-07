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
  eucalyptus.help = function(args){
    language = args['language']; 
    try{
      // use the first to determine which language we should load for the app
      language = load(help_keypair, language);
      load(help_volume, language);
      load(help_sgroup, language);
      load(help_instance, language);
      load(help_snapshot, language);
      load(help_image, language);
      load(help_scaling, language);
      load(help_balancing, language);
      load(help_eip, language);
      load(help_launcher, language);
      load(help_dashboard, language);
      load(help_about, language);
      load(help_edittags, language);
      load(help_alarm, language);
      load(help_enter_custom_metric, language);
    }catch(e){
      ;
    }
  },
  eucalyptus.help_login = function(args) {
    try{
      language = args['language']; 
      language = load(help_login, language);
      load(help_changepwd, language);
    }catch(e){ 
      ;
    }
  }
})(jQuery, 
   window.eucalyptus ? window.eucalyptus : window.eucalyptus = {});

function getLandingHelpHeader(args){
  var $helpHeader = $('<div>').addClass('euca-table-header').append(
                     $('<div>').addClass('help-link').append(
                       $('<a>').attr('href','#').html('&nbsp;')));
  return $helpHeader;
}

function load(helpObj, language){
  var lang = language;
  try{
    helpObj.load({language:language});
  }catch(e){
    try{
      // try the root of the language
      lang = language.substr(0, language.indexOf('_'));
      helpObj.load({language:lang});
    }catch(e){
      // now try english
      lang = 'en';
      helpObj.load({language:lang});
    }
  }
  return lang;
}

function loadHtml(url, handler){
    $.ajax(url, {
        type:"GET",
        data:"",
        dataType:"html",
        async:false, // async option deprecated as of jQuery 1.8
        success: function (data){ 
          handler(data);
        },
        error : function (){
          throw "static html files not found";
        }
    });
}

var help_dashboard = {
   load : function(arg){
    help_dashboard.landing_content_url = 'help/'+arg.language+'/console_dashboard.html',
    loadHtml(help_dashboard.landing_content_url, function(data){help_dashboard.landing_content=data})
   },
   landing_content_url : '', 
   landing_content: ''
}
var help_keypair = {
  load : function(arg){
    help_keypair.landing_content_url = 'help/'+arg.language+'/console_manage_keypairs.html';
    help_keypair.dialog_add_content_url = 'help/'+arg.language+'/console_create_keypair.html';
    help_keypair.dialog_delete_content_url = 'help/'+arg.language+'/console_delete_keypair.html';
    help_keypair.dialog_import_content_url = 'help/'+arg.language+'/console_import_keypair.html';
    loadHtml(help_keypair.landing_content_url , function(data){help_keypair.landing_content=data})
    loadHtml(help_keypair.dialog_add_content_url, function(data){help_keypair.dialog_add_content=data})
    loadHtml(help_keypair.dialog_delete_content_url, function(data){help_keypair.dialog_delete_content=data})
    loadHtml(help_keypair.dialog_import_content_url, function(data){help_keypair.dialog_import_content=data})
  },
  landing_content: '',
  landing_content_url: '',
  dialog_add_content: '',
  dialog_add_content_url: '',
  dialog_delete_content: '',
  dialog_delete_content_url: '',
  dialog_import_content: '',
  dialog_import_content_url: '',

};

var help_image = {
  load : function(arg){
    help_image.landing_content_url = 'help/'+arg.language+'/console_manage_images.html';
    loadHtml(help_image.landing_content_url, function(data){help_image.landing_content=data})
  },
  landing_content:'',
  landing_content_url: '',
};

var help_snapshot = {
  load : function(arg){
    help_snapshot.landing_content_url = 'help/'+arg.language+'/console_manage_snapshots.html';
    help_snapshot.dialog_create_content_url = 'help/'+arg.language+'/console_create_snapshot.html';
    help_snapshot.dialog_delete_content_url  = 'help/'+arg.language+'/console_delete_snapshot.html';
    help_snapshot.dialog_register_content_url  = 'help/'+arg.language+'/console_register_snapshot_as_image.html';
    loadHtml(help_snapshot.landing_content_url, function(data){help_snapshot.landing_content=data})
    loadHtml(help_snapshot.dialog_create_content_url, function(data){help_snapshot.dialog_create_content=data})
    loadHtml(help_snapshot.dialog_register_content_url, function(data){help_snapshot.dialog_register_content=data})
    loadHtml(help_snapshot.dialog_delete_content_url, function(data){help_snapshot.dialog_delete_content=data})
  },
  landing_content: '',
  landing_content_url: '',
  dialog_delete_content: '',
  dialog_delete_content_url: '',
  dialog_create_content: '',
  dialog_create_content_url: '',
  dialog_register_content: '',
  dialog_register_content_url: '',
};

var help_eip = {
  load : function(arg){
    help_eip.landing_content_url = 'help/'+arg.language+'/console_manage_eips.html';
    help_eip.dialog_allocate_content_url = 'help/'+arg.language+'/console_allocate_eip.html';
    help_eip.dialog_release_content_url = 'help/'+arg.language+'/console_release_eip.html';
    help_eip.dialog_associate_content_url = 'help/'+arg.language+'/console_associate_eip.html';
    help_eip.dialog_disassociate_content_url = 'help/'+arg.language+'/console_disassociate_eip.html';
    loadHtml(help_eip.landing_content_url, function(data){help_eip.landing_content=data})
    loadHtml(help_eip.dialog_allocate_content_url, function(data){help_eip.dialog_allocate_content=data})
    loadHtml(help_eip.dialog_release_content_url, function(data){help_eip.dialog_release_content=data})
    loadHtml(help_eip.dialog_associate_content_url, function(data){help_eip.dialog_associate_content=data})
    loadHtml(help_eip.dialog_disassociate_content_url, function(data){help_eip.dialog_disassociate_content=data})
  },
  landing_content: '',
  landing_content_url: '',
  dialog_release_content: '',
  dialog_release_content_url: '',
  dialog_allocate_content: '',
  dialog_allocate_content_url: '',
  dialog_associate_content: '',
  dialog_associate_content_url: '',
  dialog_disassociate_content: '' ,
  dialog_disassociate_content_url: '' 
};

var help_volume = {
  load : function(arg){
    help_volume.landing_content_url = 'help/'+arg.language+'/console_manage_volumes.html';
    help_volume.dialog_add_content_url = 'help/'+arg.language+'/console_create_volume.html';
    help_volume.dialog_attach_content_url = 'help/'+arg.language+'/console_attach_volume.html';
    help_volume.dialog_detach_content_url = 'help/'+arg.language+'/console_detach_volume.html';
    help_volume.dialog_delete_content_url = 'help/'+arg.language+'/console_delete_volumes.html';

    loadHtml(help_volume.landing_content_url, function(data){help_volume.landing_content=data})
    loadHtml(help_volume.dialog_add_content_url, function(data){help_volume.dialog_add_content=data})
    loadHtml(help_volume.dialog_attach_content_url, function(data){help_volume.dialog_attach_content=data})
    loadHtml(help_volume.dialog_detach_content_url, function(data){help_volume.dialog_detach_content=data})
    loadHtml(help_volume.dialog_delete_content_url, function(data){help_volume.dialog_delete_content=data})
  },
  landing_content: '',
  landing_content_url: '',
  dialog_add_content: '',
  dialog_add_content_url: '',
  dialog_attach_content: '',
  dialog_attach_content_url: '',
  dialog_detach_content: '',
  dialog_detach_content_url: '',
  dialog_delete_content:  '',
  dialog_delete_content_url:  '' 
};

var help_sgroup = {
  load : function(arg){
    help_sgroup.landing_content_url = 'help/'+arg.language+'/console_manage_security_groups.html';
    help_sgroup.dialog_add_content_url = 'help/'+arg.language+'/console_create_security_group.html';
    help_sgroup.dialog_edit_content_url = 'help/'+arg.language+'/console_edit_security_group.html';
    help_sgroup.dialog_delete_content_url = 'help/'+arg.language+'/console_delete_security_group.html';
    
    loadHtml(help_sgroup.landing_content_url, function(data){help_sgroup.landing_content=data})
    loadHtml(help_sgroup.dialog_add_content_url, function(data){help_sgroup.dialog_add_content=data})
    loadHtml(help_sgroup.dialog_edit_content_url, function(data){help_sgroup.dialog_edit_content=data})
    loadHtml(help_sgroup.dialog_delete_content_url, function(data){help_sgroup.dialog_delete_content=data})
    

  },
  landing_content: '',
  landing_content_url: '',
  dialog_add_content: '',
  dialog_add_content_url: '',
  dialog_edit_content: '',
  dialog_edit_content_url: '',
  dialog_delete_content:'', 
  dialog_delete_content_url:'', 
}

var help_instance = {
  load : function(arg){
    help_instance.landing_content_url = 'help/'+arg.language+'/console_manage_instances.html';
    help_instance.dialog_reboot_content_url = 'help/'+arg.language+'/console_reboot_instances.html';
    help_instance.dialog_stop_content_url = 'help/'+arg.language+'/console_stop_instances.html';
    help_instance.dialog_terminate_content_url = 'help/'+arg.language+'/console_terminate_instances.html';
    help_instance.dialog_launchmore_content_url = 'help/'+arg.language+'/console_launch_more_instances.html';

    loadHtml(help_instance.landing_content_url, function(data){help_instance.landing_content=data})
    loadHtml(help_instance.dialog_reboot_content_url, function(data){help_instance.dialog_reboot_content=data})
    loadHtml(help_instance.dialog_stop_content_url, function(data){help_instance.dialog_stop_content=data})
    loadHtml(help_instance.dialog_terminate_content_url, function(data){help_instance.dialog_terminate_content=data})
    loadHtml(help_instance.dialog_launchmore_content_url, function(data){help_instance.dialog_launchmore_content=data})
  },
  landing_content: '',
  landing_content_url: '',
  dialog_reboot_content: '',
  dialog_reboot_content_url: '',
  dialog_stop_content: '',
  dialog_stop_content_url: '',
  dialog_terminate_content: '',
  dialog_terminate_content_url: '',
  dialog_launchmore_content: '',
  dialog_launchmore_content_url: '',
}

var help_scaling = {
  load : function(arg){
    help_scaling.landing_content_url = 'help/'+arg.language+'/console_manage_scaling_groups.html';
    help_scaling.dialog_add_content_url = 'help/'+arg.language+'/console_create_scaling_group.html';
    help_scaling.dialog_delete_content_url = 'help/'+arg.language+'/console_delete_scaling_group.html';
    help_scaling.dialog_quick_scale_url = 'help/'+arg.language+'/console_quick_scale.html';
    help_scaling.dialog_manage_instances_url = 'help/'+arg.language+'/console_manage_scaling_group_instances.html';
    help_scaling.launchconfig_wizard_content_url = 'help/'+arg.language+'/console_create_launch_config.html';
    help_scaling.create_launchconfig_from_instance_content_url = 'help/'+arg.language+'/console_create_launch_config_from_instance.html';
    help_scaling.delete_launchconfig_content_url = 'help/'+arg.language+'/console_delete_launch_config.html';
    help_scaling.edit_scalinggroup_content_url = 'help/'+arg.language+'/console_edit_scaling_group.html';
    help_scaling.launchconfig_landing_content_url = 'help/'+arg.language+'/console_manage_launch_configs.html';

    loadHtml(help_scaling.landing_content_url, function(data){help_scaling.landing_content=data})
    loadHtml(help_scaling.dialog_add_content_url, function(data){help_scaling.dialog_add_content=data})
    loadHtml(help_scaling.dialog_delete_content_url, function(data){help_scaling.dialog_delete_content=data})
    loadHtml(help_scaling.dialog_manage_instances_url, function(data){help_scaling.dialog_manage_instances=data})
    loadHtml(help_scaling.dialog_quick_scale_url, function(data){help_scaling.dialog_quick_scale_content=data})
    loadHtml(help_scaling.launchconfig_wizard_content_url, function(data) {help_scaling.launchconfig_wizard_content=data})
    loadHtml(help_scaling.create_launchconfig_from_instance_content_url, function(data) {help_scaling.create_launchconfig_from_instance_content=data})
    loadHtml(help_scaling.delete_launchconfig_content_url, function(data) {help_scaling.delete_launchconfig_content=data})
    loadHtml(help_scaling.edit_scalinggroup_content_url, function(data) {help_scaling.edit_scalinggroup_content=(data)})
    loadHtml(help_scaling.launchconfig_landing_content_url, function(data) {help_scaling.launchconfig_landing_content=(data)})


  },
  landing_content: '',
  landing_content_url: '',
  dialog_add_content: '',
  dialog_add_content_url: '',
  dialog_delete_content: '',
  dialog_delete_content_url: '',
  dialog_quick_scale_url: ''
}

var help_balancing = {
  load : function(arg){
    help_balancing.landing_content_url = 'help/'+arg.language+'/console_manage_balancing.html',
    loadHtml(help_balancing.landing_content_url, function(data){help_balancing.landing_content=data})
  },
  landing_content_url: '',
  landing_content: '',
}

var help_about = {
  load : function(arg){
    help_about.dialog_content_url = 'help/'+arg.language+'/console_about.html';
    loadHtml(help_about.dialog_content_url, function(data){help_about.dialog_content=data})
  },
  dialog_content: '',
  dialog_content_url: '',
}

var help_login = {
  load : function(arg){
    help_login.dialog_content_url = 'help/'+arg.language+'/console_login.html';
    loadHtml(help_login.dialog_content_url, function(data){help_login.dialog_content=data})
  },
  dialog_content: '',
  dialog_content_url: '',
}

var help_changepwd = {
  load : function(arg){
    help_changepwd.dialog_content_url = 'help/'+arg.language+'/console_change_password.html';
    loadHtml(help_changepwd.dialog_content_url, function(data){help_changepwd.dialog_content=data})
  },
  dialog_content: '',
  dialog_content_url: '',
}

var help_launcher = {
  load : function(arg) {
    help_launcher.landing_content_url = 'help/'+arg.language+'/console_create_instances.html';
    loadHtml(help_launcher.landing_content_url, function(data){help_launcher.landing_content=data})
  },
  landing_content: '',
  landing_content_url: '',
}

var help_edittags = {
  load : function(arg){
    help_edittags.dialog_content_url = 'help/'+arg.language+'/console_add_edit_tags.html';
    loadHtml(help_edittags.dialog_content_url, function(data){help_edittags.dialog_content=data})
  },
  dialog_content: '',
  dialog_content_url: '',
}

var help_alarm = {
  load : function(arg){
    help_alarm.dialog_content_url = 'help/'+arg.language+'/console_create_alarm.html';
    loadHtml(help_alarm.dialog_content_url, function(data){help_alarm.dialog_content=data})
  },
  dialog_content: '',
  dialog_content_url: '',
}

var help_enter_custom_metric = {
  load : function(arg){
    help_enter_custom_metric.dialog_content_url = 'help/'+arg.language+'/console_enter_custom_metric.html';
    loadHtml(help_enter_custom_metric.dialog_content_url, function(data){help_enter_custom_metric.dialog_content=data})
  },
  dialog_content: '',
  dialog_content_url: '',
}

