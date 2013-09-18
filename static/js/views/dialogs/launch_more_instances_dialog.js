define([
  './eucadialogview',
  'text!./launch_more_instances_dialog.html!strip',
  '../shared/advanced',
  'models/instance',
   'models/tag',
  '../shared/model/advancedmodel',
  '../shared/model/blockmaps',
  'app'
], function(EucaDialogView, template, advanced, Instance, Tag, AdvModel, BlockMaps, app) {
  return EucaDialogView.extend({
    initialize : function(args) {
      var self = this;
      this.template = template;

      var instance = app.data.instances.get(args.model);
      var image = app.data.images.get(instance.get('image_id'));
      var platform = image.get('platform');
      var imgName = inferImage(image.get('location'), image.get('description'), platform);
      this.advancedModel = new AdvModel();
      this.blockMaps = new BlockMaps();

      this.scope = new Backbone.Model({
        width: 750,
        instance: instance,
        image: image,
        imgName: imgName,
        platform: getImageName(imgName),
        newInstance: new Instance(),

        error: new Backbone.Model({}),

        help: {title: null, content: help_instance.dialog_launchmore_content, url: help_instance.dialog_launchmore_content_url, pop_height: 600},

        cancelButton: {
          id: 'button-dialog-launchmore-cancel',
          click: function() {
            self.close();
            self.cleanup();
          }
        },

        createButton: new Backbone.Model({
          id: 'btn-launch-more',
          disabled: false,
          click: function() {
            // validate
            // save
            self.advancedModel.finish(self.scope.get('newInstance'));
            self.blockMaps.finish(self.scope.get('newInstance'));
            self.scope.get('newInstance').save({}, {
              overrideUpdate: true,
              success: function(model, response, options){
                if(model != null){
                  var name = model.get('id');
                  notifySuccess(null, $.i18n.prop('instance_run_success', name)); 
                }else{
                  notifyError($.i18n.prop('instance_run_error'), undefined_error);
                }
              },
              error: function(model, jqXHR, options){
                notifyError($.i18n.prop('instance_run_error'), getErrorMessage(jqXHR));
              }
            });
            self.close();
            self.cleanup();
          }
        }),
        toggleAdvanced: function() {
          var adv_div = self.$el.find('#launch-more-advanced-contents')
          adv_div.attr('style', adv_div.is(':visible')?'display: none':'display: inline');
          self.$el.dialog("option", "position", "center");
        },

        fireChange: function(e) {
          $(e.target).change();
        }

      });

      this.scope.get('newInstance').set('image_id', this.scope.get('image').get('id'));
      this.scope.get('newInstance').set('instance_type', this.scope.get('instance').get('instance_type'));
      var placement = this.scope.get('instance').get('placement');
      if (placement == undefined) {
        placement = this.scope.get('instance').get('_placement').zone;
      }
      this.scope.get('newInstance').set('placement', placement);
      this.scope.get('newInstance').set('key_name', this.scope.get('instance').get('key_name'));
      this.scope.get('newInstance').set('group_name', this.scope.get('instance').get('group_name'));
      this.scope.get('newInstance').set('min_count', '1');
      this.scope.get('newInstance').set('max_count', '1');
      var tagSet = this.scope.get('instance').get('tags').clone(clean=true, exclude=function(t) {
            var name = t.get('name');
            return (name == 'Name' || name.substr(0, 4) == 'euca' || name.substr(0, 3) == 'aws');
          });
      this.scope.get('newInstance').set('tags', tagSet);

      var adv_page = new advanced({model: this.advancedModel, blockMaps: this.blockMaps, hidePrivate: true, removeTitle: true});

      self.scope.get('newInstance').on('change', function() {
        self.scope.get('error').clear();
        var msg = self.scope.get('newInstance').validate();
        if (msg != undefined) {
          self.scope.get('error').set("name", msg.max_count);
        }
      }),

      this.scope.get('newInstance').on('validated', function() {
        self.scope.get('createButton').set('disabled', !self.scope.get('newInstance').isValid());
        self.render();
      });

      this._do_init();

      self.$el.find('#launch-more-advanced-contents').append(adv_page.$el);
    },
    cleanup: function() {
      // undo validation overrides -  they leak into other dialogs
    },
  });
});
