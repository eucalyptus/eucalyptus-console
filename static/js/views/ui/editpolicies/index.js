define([
   'underscore',
   'text!./template.html!strip',
   'backbone',
   'app',
   'models/scalingpolicy'
], function(_, template, Backbone, app, Policy) {
    return Backbone.View.extend({
        // these values are used as defaults on the model (to match what's in the drop downs by default)
        defaults: {action:'SCALEDOWNBY', measure:'instances'},
        initialize : function(args) {
            var self = this;

            this.template = template;
            var model = args.model;

            var scalingGroup = model.get('scalingGroup')
            var available = model.get('available');
            var selected = model.get('selected');
            var getId = model.get('getId')
            var getValue = model.get('getValue')

            // populate display form of values on existing models
            selected.each(function(model) {
              self.addDisplay(model);
            });

            var scope;
            scope = new Backbone.Model({
                // can't use alarms that already have 5 actions (or policies) associated
                alarms: new Backbone.Collection(app.data.alarm.reject(
                          function(alarm){ return (alarm.get('alarm_actions').length == 5); })),
                available: available,
                selected: selected,
                error: model.get('error'),
                toAdd: new Policy(self.defaults),

                getId: function() {
                    return getId(this.item);
                },

                getValue: function() {
                    return getValue(this.item);
                },

                add: function(element, scope) {
                    var toAdd = scope.get('toAdd');
                    toAdd.set('as_name', self.model.get('as_name')); // TODO: set in already added ones too.
                    toAdd.set('alarm_model', scope.get('alarms').findWhere({name: toAdd.get('alarm')}));
                    if(!toAdd.isValid(true)) return;
                    self.addDisplay(toAdd);
                    console.log("added policy: "+JSON.stringify(toAdd));
                    selected.push(toAdd);
                    scope.set('toAdd', new Policy(self.defaults));
                    scope.get('toAdd').on('change:amount change:action change:measure change:alarm_model', self.compute, self);
                    scope.get('toAdd').on('validated', self.setErrors, scope);
                    self.render();
                    console.log('add - selected:', selected);
                },

                delete: function(e, scope) {
                  e.stopPropagation();
                  scope.item.set("_deleted", true);
                },

                undoDelete: function(e, obj) {
                  e.stopPropagation();
                  obj.item.unset("_deleted");
                },


                createAlarm: function(element, scope) {
                    app.dialog('create_alarm', { scalingGroup: scalingGroup });
                }
            }); // end of scope

            scope.get('toAdd').on('change:amount change:action change:measure change:alarm_model', self.compute, self);
            scope.get('toAdd').on('validated', self.setErrors, scope);

            this.$el.html(template);
            this.rview = rivets.bind(this.$el, scope);

            scope.get('available').on('sync', function() {
                console.log('SYNC');
                self.render();
            });

            app.data.alarm.on('sync', function() { self.render(); });
            app.data.alarm.fetch();

            app.data.alarm.on('add', function(added) {
              scope.get('toAdd').set('alarm', added.get('name')); 
            });
        },

       // compute values to make a valid model
       // cope.get('toAdd').on('change:amount change:action change:measure change:alarm_model', 
       compute: function(policy) {
          console.log("computing other values of policy: "+JSON.stringify(policy));
          var amount = +policy.get('amount');
          var action = policy.get('action');
          if(action == 'SCALEDOWNBY') {
            amount *= -1;
          }
          policy.set('scaling_adjustment', ""+amount);
          
          if(policy.get('measure') == 'percent') {
            policy.set('adjustment_type', 'PercentChangeInCapacity');
          } else {
            if(action == 'SETSIZE') {
              policy.set('adjustment_type', 'ExactCapacity');
            } else {
              policy.set('adjustment_type', 'ChangeInCapacity');
            }
          }

          // get the alarm model for this policy
          //if(policy.get('alarm_model') && policy.get('alarm_model').hasChanged()) {
          if(policy.get('alarm_model') && policy.get('alarm_model')) {
            this.model.get('alarms').add(policy.get('alarm_model'));
            policy.unset('alarm_model', {silent:true});
          } 
        }, 

        // adjust parameters in passed in policy models to match input form
        // reversing what happens in compute above when models are set
        // this code is duplicated in the scaling group expando (vews/expando/scaling.js)
        addDisplay: function(model) {
          if(model.get('adjustment_type') == 'PercentChangeInCapacity') {
            model.set('measure', $.i18n.prop('create_scaling_group_policy_measure_percent'));
          } else {
            model.set('measure', $.i18n.prop('create_scaling_group_policy_measure_instance'));
          }

          if(model.get('adjustment_type') == 'ExactCapacity') {
            model.set('action', 'SETSIZE');
            model.set('amount', model.get('scaling_adjustment'));
          } else {
            if(model.get('scaling_adjustment') < 0) {
              model.set('action', 'SCALEDOWNBY');
              model.set('amount', model.get('scaling_adjustment') * -1);
            } else {
              model.set('action', 'SCALEUPBY');
              model.set('amount', model.get('scaling_adjustment'));
            }
          }

          var disp_action = '';
          switch (model.get('action')) {
            case 'SCALEUPBY': disp_action = 'create_scaling_group_policy_action_scale_up'; break;
            case 'SCALEDOWNBY': disp_action = 'create_scaling_group_policy_action_scale_down'; break;
            case 'SETSIZE': disp_action = 'create_scaling_group_policy_action_set_size'; break;
          }
          model.set('display_action', $.i18n.prop(disp_action));

          if(model.get('alarms')) {
            model.set('alarm_name', model.get('alarms')[0].name);
          }
        },

        setErrors: function(valid, model, errors) {
          var scope = this;
          scope.get('error').clear();
          _.each(errors, function(val, key) {
            scope.get('error').set(key, val);
          });
        },


        render : function() {
          this.rview.sync();
          return this;
        }
    });
});
