define([
  './eucadialogview',
  'text!./delete_loadbalancer_dialog.html!strip',
  'models/loadbalancer',
  'app',
  'backbone',
], function(EucaDialogView, template, Loadbalancer, App, Backbone) {
  return EucaDialogView.extend({

    createIdNameTagString: function(resource_id, name_tag){
      var this_string = resource_id;
      if( name_tag != null ){
        this_string += " (" + name_tag + ")";
      }
      return this_string;
    },

    findNameTag: function(model){
      var nameTag = null;
      model.get('tags').each(function(tag){
        if( tag.get('name').toLowerCase() == 'name' ){
          nameTag = tag.get('value');
        };
      });
      return nameTag;
    },

    initialize : function(args) {
      var self = this;
      this.template = template;
      var loadbalancer_list = [];
      _.each(args.items, function(lbid){
        var nameTag = self.findNameTag(App.data.load_balancers.get(lbid));
        loadbalancer_list.push(self.createIdNameTagString(vid, addEllipsis(nameTag, 15)));   // DISPLAY ONLY
      });

      this.scope = {
        status: '',
        loadbalancers: loadbalancer_list,
		help: {title: null, content: help_loadbalancer.dialog_delete_content, url: help_loadbalancer.dialog_delete_content_url, pop_height: 600},

        cancelButton: {
          id: 'button-dialog-deleteloadbalancer-cancel',
          click: function() {
            self.close();
          }
        },
        deleteButton: {
          id: 'button-dialog-deleteloadbalancer-delete',
          click: function() {
              doMultiAction(args.items, App.data.volumes,
                            function(model, options) {
                              //options['wait'] = true;
                              //model.destroy(options);
                              // Calling sync so that model doesn't to away, then come back
                              // with "deleting" state. freaks out the users. EUCA-6915
                              model.sync('delete', model, options);
                            },
                            'loadbalancer_delete_progress', 'loadbalancer_delete_done', 'loadbalancer_delete_fail');
              self.close();
          }
        },
      }
      this._do_init();
    },
  });
});
