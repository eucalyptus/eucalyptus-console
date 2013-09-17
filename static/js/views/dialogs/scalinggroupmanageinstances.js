define([
    './eucadialogview', 
    'underscore',
    'app', 
    'text!./scalinggroupmanageinstances.html',
    'models/scalinginst',
    'views/searches/scalinginst'
  ], 
  function(EucaDialogView, _, app, tpl, ScalingInst, Search) {
    return EucaDialogView.extend({
      initialize: function(args) {
        var self = this;
        var me = this;
        this.template = tpl;
        this.model = args.model.at(0);
        this.changelog = {}; 

        // health state label choices
        this.model.set('healthstates', new Backbone.Collection([{state: 'Healthy'}, {state: 'Unhealthy'}]));
        
        var clone = this.model.clone();
        var instances = new Backbone.Collection();

        _.each(clone.get('instances'), function(inst, i) {
          var si = new ScalingInst(inst);
          si.initial_health_state = si.get('health_status');
          instances.add(si);
        });
        //clone.set('instances', instances);


        this.scope = {
          help: {title: null, content: help_scaling.dialog_manage_instances, url: help_scaling.dialog_manage_instances_url, pop_height: 600},
          width: 800,
          sgroup: clone,

          status: function(obj) {
          },

          submitButton: new Backbone.Model({
            id: 'button-dialog-scalingmanageinst-save',
            disabled: false, //!this.model.isValid(),
            click: function() {
              if(self.scope.submitButton.get('disabled') == true) return;

              // delete some
              var toDelete = self.scope.instances.where({'_deleted': true});
              if (toDelete.length > 0) {
                delete_ids = _.map(toDelete, function(inst) { return inst.id; });
                doMultiAction(delete_ids, self.scope.instances,
                            function(model, options) {
                              // Calling sync so that model doesn't to away, then come back
                              // with "terminating" state.
                              model.sync('delete', model, options);
                            },
                            'manage_scaling_group_terminate_progress', 'manage_scaling_group_terminate_success', 'manage_scaling_group_terminate_error',
                            function(response) {
                              if (response.results && response.results.activity_id) {
                                return; // all good
                              } else {
                                return undefined_error;
                              }
                            });
              }

              // look for changed models to update
              self.scope.instances.each( function( targetModel ) {
                if(self.changelog[targetModel.cid]) {
                  var id = targetModel.get('instance_id');
                  targetModel.save({}, {
                    success: function(model, response, options){
                      if(model != null){
                        notifySuccess(null, $.i18n.prop('manage_scaling_group_set_health_success', id));
                      }else{
                        notifyError($.i18n.prop('manage_scaling_group_set_health_error', id), undefined_error);
                      }
                    },
                    error: function(model, jqXHR, options){
                      notifyError($.i18n.prop('manage_scaling_group_set_health_error', id), getErrorMessage(jqXHR));
                    }
                  });
                }
              });
              self.stopListening();
              self.close();
            }
          }),

          cancelButton: {
            id: 'button-dialog-scalingmanageinst-cancel',
            click: function() {
              self.stopListening();
              self.close();
            }
          },

          delete: function(e, obj) {
            e.stopPropagation();
            obj.instance.set("_deleted", true);
          },

          undoDelete: function(e, obj) {
            e.stopPropagation();
            obj.instance.unset("_deleted");
          },

          switchToQScale: function() {
            var col = new Backbone.Collection();
            col.add(self.model);
            var qs = app.dialog('quickscaledialog', col);
            self.stopListening();
            self.close();
          },

          search: new Search(instances),
        };

        this.scope.instances = this.scope.search.filtered;
        this.scope.search.filtered.on('add remove change sync reset', function() {
          /* self.render() isn't working here - 
           * 'self' becomes an instance of 'Window' in
           * eucadialogview for some reason */
          self.rivetsView.sync();        
        });

        this.listenTo(this.scope.instances, 'change:health_status', function(m) {
          if (m.changed.health_status != m.initial_health_state) {
            this.changelog[m.cid] = m.changed;  
          } else {
            delete this.changelog[m.cid];
          }
        });

        this._do_init();
      },

    });
});
