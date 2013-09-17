define([
   'underscore',
   './eucadialogview',
   'text!./edittags.html!strip',
   'backbone',
   'models/tag',
   'sharedtags'
], function(_, EucaDialogView, template, Backbone, Tag, SharedTags) {
    return EucaDialogView.extend({
        initialize : function(args) {
            var self = this;
            this.template = template;
            var invalid_tags = new Backbone.Collection();

            this.scope = {
                model: args.model.clone(),

				        help: {
                  title: null, 
                  content: help_edittags.dialog_content, 
                  url: help_edittags.dialog_content_url, 
                  pop_height: 600
                },

                cancelButton: {
                    id: 'button-dialog-edittags-cancel',
                    click: function() {
                       self.close();
                       self.stopListening();
                    }
                },

                confirmButton: new Backbone.Model({
                  disabled: false,
                  id: 'button-dialog-edittags-save',
                  click: function() {
                    if (this.get('disabled') == true) return;
                    self.scope.model.trigger('confirm', false, {
                      saveoptions: {
                         success:
                          function(data, textStatus, jqXHR){
                            if ( data.get('results') ) {
                              notifySuccess(null, $.i18n.prop('tag_create_success', DefaultEncoder().encodeForHTML(data.get('name')), data.get('res_id')));
                            } else {
                              notifyError($.i18n.prop('tag_create_error', DefaultEncoder().encodeForHTML(data.get('name')), data.get('res_id')), undefined_error);
                            } 
                          },
                         error:
                           function(jqXHR, textStatus, errorThrown){
                             notifyError($.i18n.prop('tag_create_error', DefaultEncoder().encodeForHTML(data.get('name')), data.get('res_id')), getErrorMessage(jqXHR));
                 
                           }
                      },
                      deleteoptions: {
                        success:
                          function(data, textStatus, jqXHR){
                            if ( textStatus.results ) {
                              notifySuccess(null, $.i18n.prop('tag_delete_success', DefaultEncoder().encodeForHTML(data.get('name')), data.get('res_id')));
                            } else {
                              notifyError($.i18n.prop('tag_delete_error', DefaultEncoder().encodeForHTML(data.get('name')), data.get('res_id')), undefined_error);
                            }
                          },
                        error:
                          function(data, jqXHR, errorThrown){
                            notifyError($.i18n.prop('tag_delete_error', DefaultEncoder().encodeForHTML(data.get('name')), data.get('res_id')), getErrorMessage(jqXHR));

                          }
                      }
                    });
                    self.close();
                    self.stopListening();
                  }
                }),

            },

            this.scope.tagDisplay = new Backbone.Model();
            this.scope.model.tagDisplay = this.scope.tagDisplay;

            // listen for invalid tag events, don't enable button until they're fixed.
            this.listenTo(self.scope.model, 'validation_change', function(model) {
              if(model.get('tag_is_invalid') == true) {
                invalid_tags.add(model);
              } else {
                invalid_tags.remove(model);
              }
            });

            // disable submit button when in edit mode - EUCA-7068
            this.listenTo(self.scope.model, 'editmode', function() {
              self.scope.confirmButton.set('disabled', true);
            });
            this.listenTo(self.scope.model, 'cleanmode', function() {
              self.scope.confirmButton.set('disabled', false);
            });

            this._do_init();
        },
	});
});
